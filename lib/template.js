import Utils from './utils'
import {isGitUrl, isBinaryFile} from './helpers'
import W from 'when'
import node from 'when/node'
import which from 'which'
import path from 'path'
import yaml from 'js-yaml'
import minimatch from 'minimatch'
import lodash from 'lodash'
import Joi from 'joi'
import _rimraf from 'rimraf'
import _readdirp from 'readdirp'
import _fs from 'fs'
import _dns from 'dns'
import {exec as _exec} from 'child_process'
import {ncp as _ncp} from 'ncp'

const rimraf = node.lift(_rimraf)
const exec = node.lift(_exec)
const readdirp = node.lift(_readdirp)
const ncp = node.lift(_ncp)
const fs = node.liftAll(_fs, (pfs, lifted, name) => {
  pfs[`${name}Async`] = lifted
  return pfs
})
const dns = node.liftAll(_dns)

/*
 * Given a Sprout instance and a name, returns a Template instance.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - Name of template
 * @param {String} src (optional) - Path or URL to source. Only required for
 * `template.save`.
 * @return {Function} - Template instance.
 */
class Template {

  constructor (_options) {
    const schema = Joi.object().keys({
      sprout: Joi.any().required(),
      name: Joi.string().required(),
      src: Joi.string(),
      rootFolderName: Joi.string().default('root'),
      generatorsFolderName: Joi.string().default('generators')
    })

    let options = Joi.validate(_options, schema)
    if (options.error) { throw options.error }
    options = options.value

    this.sprout = options.sprout
    this.name = options.name
    this.path = path.join(this.sprout.path, this.name)
    this.rootPath = path.join(this.path, options.rootFolderName)
    this.generatorsPath = path.join(this.path, options.generatorsFolderName)
    this.src = options.src
    if (this.src) { this.isRemote = isGitUrl(this.src) }
  }

  /*
   * Saves `template.src` to `template.path`
   * @return {Promise} - promise for Template instance.
   */
  save () {
    return W.resolve().with(this)
      .then(ensureGitInstall)
      .then(validateSource)
      .then(ensureInternetConnection)
      .then(removeTemplate)
      .then(moveSourceToSproutPath)
      .yield(this)
  }

  /*
   * Initialize template and save to `target`
   * @param {String} target - The path to save the template to.
   * @return {Promise} - Promise for Template instance.
   */
  init (target, opts = {}) {
    const utils = new Utils(this.path, target)
    const schema = Joi.object().keys({
      locals: Joi.object().default({}),
      tag: Joi.string(),
      branch: Joi.string(),
      configPath: Joi.string(),
      questionnaire: Joi.func()
    })

    Joi.assert(target, Joi.string().required().label('target'))

    return node.call(Joi.validate, opts, schema).with(this)
      .then((res) => { opts = res })
      .then(this.update.bind(this))
      .then(validateTemplate)
      .then(validateTarget.bind(this, target))
      .then(handleBranchOrTagOption.bind(this, opts))
      .then(createTargetDirectory.bind(this, target))
      .then(installDependenciesIfPresent)
      .then(() => {
        return W.resolve().with(this)
        .then(loadConfigFile)
        .then(runBeforeHook.bind(this, utils))
        .then(mergeConfig.bind(this, opts))
        .then(runPrompts.bind(this, opts))
        .then(copyTemplateToTarget.bind(this, target))
        .then(runBeforeRenderHook.bind(this, utils))
        .then(readTemplateFiles.bind(this, target))
        .then(removeIgnoredFiles)
        .then(writeTemplateFiles.bind(this, utils))
        .then(runAfterHook.bind(this, utils))
        .then(checkoutBranchIfPresent.bind(this, this.currentBranch))
        .catch((err) => { return rimraf(target).then(() => { throw err }) })
      }).yield(this)
  }

  /*
   * Update template source.
   * @return {Promise} - Promise for Template instance.
   */
  update () {
    // Confirm template is a git repository. If not, don't type to update.
    if (!fs.existsSync(path.join(this.path, '.git'))) {
      return W.resolve(this)
    }

    // If remote origin exists, run `git remote update` to update the
    // repository.
    this.sprout.emit('msg', 'updating template')
    this.sprout.emit('cmd', 'git remote', this.path)

    return exec('git remote', { cwd: this.path }).then((stdout) => {
      if (!stdout[0]) { return }
      const origin = lodash.trim(stdout[0])
      this.sprout.emit('cmd', `git pull ${origin} HEAD`, this.path)
      return exec(`git pull ${origin} HEAD`, { cwd: this.path })
    }).yield(this)
  }

  /*
   * Run a template generator in the specified target.
   * @param {String} target - the target path.
   * @param {String} name - the name of the generator to use.
   * @param {Object} args - arguments to be passed to the generator
   * @return {Promise} - Promise for Template instance.
   */
  run (target, generator, _args) {
    let args = { target: target, generator: generator, generatorArgs: _args }
    const schema = Joi.object().keys({
      target: Joi.string().required(),
      generator: Joi.string().required(),
      generatorArgs: Joi.array().single().default([])
    })

    return node.call(Joi.validate, args, schema)
      .then((res) => { args = res })
      .then(() => {
        if (!fs.existsSync(target)) {
          throw new Error(`${target} does not exist`)
        }
      })
      .then(validateGenerator.bind(this, args.generator))
      .then(executeGenerator.bind(this, args.target, args.generatorArgs))
      .yield(this)
  }

  /*
   * Delete the template.
   * @return {Promise} - Promise for Template instance.
   */
  remove () {
    // Resolve if path does not exist.
    if (!fs.existsSync(this.path)) { return W.resolve(this) }

    // rm -rf the path.
    this.sprout.emit('msg', 'removing template')

    return fs.lstatAsync(this.path).then((stat) => {
      if (stat.isSymbolicLink()) { return fs.unlink(this.path) }
      return rimraf(this.path)
    }).yield(this)
  }
}

//
// Utility Functions
//

function ensureGitInstall () {
  // Check if git is installed
  if (!which.sync('git')) {
    throw new Error('you need to have git installed')
  }
}

function validateSource () {
  if (!this.src) { throw new Error('no source provided') }

  if (!this.isRemote && !fs.existsSync(this.src)) {
    throw new Error(`there is no sprout template located at ${this.src}`)
  }

  if (!this.isRemote && !fs.existsSync(path.join(this.src, '.git'))) {
    throw new Error(`${this.src} is not a git repository`)
  }
}

// TODO is this needed? could replace with timeout
function ensureInternetConnection () {
  if (!this.isRemote) { return }
  return dns.resolve('google.com').catch(() => {
    throw new Error('make sure that you are connected to the internet!')
  })
}

function removeTemplate () {
  return this.remove()
}

function moveSourceToSproutPath () {
  if (this.isRemote) {
    this.sprout.emit('cmd', `git clone ${this.src} ${this.path}`)
    return exec(`git clone --recursive ${this.src} ${this.path}`)
  }

  return fs.symlinkAsync(this.src, this.path)
}

function validateTemplate () {
  if (!fs.existsSync(path.join(this.path, 'init.js'))) {
    throw new Error('init.js does not exist in this template')
  }

  if (!fs.existsSync(this.rootPath)) {
    throw new Error('root path does not exist in template')
  }
}

function validateTarget (target) {
  if (fs.existsSync(target)) { throw new Error(`${target} already exists`) }
}

function handleBranchOrTagOption (opts) {
  if (!(opts.tag || opts.branch)) { return }

  this.sprout.emit('cmd', 'git rev-parse --abbrev-ref HEAD', this.path)

  return exec('git rev-parse --abbrev-ref HEAD', { cwd: this.path })
    .spread((stdout) => { this.currentBranch = stdout })
    .then(checkoutBranchIfPresent.bind(this, opts.branch))
    .then(checkoutTagIfPresent.bind(this, opts.tag))
}

function checkoutBranchIfPresent (branch) {
  if (!branch) { return }
  this.sprout.emit('cmd', `git checkout ${branch}`, this.path)
  return exec(`git checkout ${branch}`, { cwd: this.path })
}

function checkoutTagIfPresent (tag) {
  if (!tag) { return }
  this.sprout.emit('cmd', `git checkout tags/${tag}`, this.path)
  return exec(`git checkout tags/${tag}`, { cwd: this.path })
}

function createTargetDirectory (target) {
  this.sprout.emit('msg', `creating target directory: ${target}`)
  return fs.mkdir(target)
}

function installDependenciesIfPresent () {
  if (!fs.existsSync(path.join(this.path, 'package.json'))) { return }
  this.sprout.emit('msg', 'installing npm dependencies')
  return exec('npm install --production', { cwd: this.path })
}

function loadConfigFile () {
  const initPath = path.join(this.path, 'init.js')

  this.sprout.emit('msg', `requiring and validating ${initPath}`)

  const schema = Joi.object().keys({
    before: Joi.func(),
    configure: Joi.array().items(Joi.object()),
    beforeRender: Joi.func(),
    after: Joi.func(),
    ignore: Joi.array().single(),
    defaults: Joi.object()
  })

  const result = Joi.validate(require(initPath), schema)
  if (result.error) { throw result.error }

  this.init = result.value
}

function runBeforeHook (utils) {
  if (this.init.before) {
    this.sprout.emit('msg', 'running before hook')
    return W(this.init.before(utils, this.config))
  }
}

function mergeConfig (opts) {
  this.config = {}

  // Merge in all known values for config.
  lodash.assign(this.config, this.init.defaults, opts.locals)

  // If a config path is set, pull out its values and merge into config.
  if (opts.configPath) {
    this.sprout.emit('msg', `merging config: ${opts.configPath}`)
    let externalConfig

    if (/\.json$/.test(opts.configPath)) {
      externalConfig = require(opts.configPath)
    } else {
      externalConfig = yaml.safeLoad(fs.readFileSync(opts.configPath, 'utf8'))
    }

    lodash.assign(this.config, externalConfig)
  }
}

// If questionnaire function exists, run it to get answers.
// Omitting keys already set in config return answers merged with config values.
function runPrompts (opts) {
  if (opts.questionnaire && this.init.configure) {
    this.sprout.emit('msg', 'running questionnaire function')
    const unansweredConfig = lodash.filter(this.init.configure, (q) => {
      return !lodash.includes(lodash.keys(this.config), q.name)
    })
    return opts.questionnaire(unansweredConfig)
      .then((answers) => { return lodash.assign(this.config, answers) })
  }
}

function copyTemplateToTarget (target) {
  this.sprout.emit('msg', 'copying files in root to target')
  return ncp(this.rootPath, target)
}

function runBeforeRenderHook (utils) {
  if (this.init.beforeRender) {
    this.sprout.emit('msg', 'running beforeRender hook')
    return W(this.init.beforeRender(utils, this.config))
  }
}

function readTemplateFiles (target) {
  this.sprout.emit('msg', 'reading target directory')
  return readdirp({
    root: target,
    directoryFilter: ['!.git', '!node_modules']
  })
}

function removeIgnoredFiles (result) {
  return lodash.filter(result.files, (file) => {
    if (this.init.ignore) {
      this.init.ignore = Array.prototype.concat(this.init.ignore)
      for (var i = 0; i < this.init.ignore.length; i++) {
        if (minimatch(file.path, this.init.ignore[i])) {
          return false
        }
      }
    }
    return true
  })
}

function writeTemplateFiles (utils, files) {
  return W.map(files, (file) => {
    this.sprout.emit('msg', `reading ${file.fullPath}`)

    if (!isBinaryFile(file.fullPath)) {
      this.sprout.emit('msg', `reading ${file.fullPath}`)
      return utils.target.read(file.path).then((output) => {
        this.sprout.emit('msg', `writing ${file.fullPath}`)
        return utils.target.write(file.path, output, this.config)
      })
    }
  })
}

function runAfterHook (utils) {
  if (this.init.after) {
    this.sprout.emit('msg', 'running after hook')
    return W(this.init.after(utils, this.config))
  }
}

function validateGenerator (generator) {
  const generatorPath = path.join(this.generatorsPath, `${generator}.js`)

  if (!fs.existsSync(generatorPath)) {
    throw new Error(`'${generator}' is not a generator in this template`)
  }

  this.sprout.emit('msg', `requiring '${generator}' generator`)
  return require(generatorPath)
}

function executeGenerator (target, args, generator) {
  const utils = new Utils(this.path, target)

  args = lodash.isArray(args) ? args : []
  args.unshift(utils)

  // Call the generator, pass the Utils instance and the arguments.
  this.sprout.emit('msg', `running ${generator} generator`)
  return generator.apply(null, args)
}

module.exports = Template
