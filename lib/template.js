import Utils from './utils'
import {isGitUrl, isBinaryFile} from './helpers'
import W from 'when'
import node from 'when/node'
import which from 'which'
import path from 'path'
import yaml from 'js-yaml'
import minimatch from 'minimatch'
import lodash from 'lodash'
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
 * Register CoffeeScript `init` file in template can be either CoffeeScript or
 * JavaScript.
 */

require('coffee-script/register')

/*
 * Given a Sprout instance and a name, returns a Template instance.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - Name of template
 * @param {String} src (optional) - Path or URL to source. Only required for
 * `template.save`.
 * @return {Function} - Template instance.
 */
class Template {

  constructor (sprout, name, src) {
    this.sprout = sprout
    this.name = name
    this.path = path.join(sprout.path, name)
    this.root = path.join(this.path, 'root')
    this.generators = path.join(this.path, 'generators')

    /*
     * If `src` is set, use `isGitURL` helper to determine whether `src` is a
     * local path or a remote URL.
     */
    if (src) {
      this.src = src
      this.isRemote = isGitUrl(src)
    }
  }

  /*
   * Saves `template.src` to `template.path`
   * @return {Promise} - promise for Template instance.
   */
  save () {
    return W.resolve().then(_ => {
      // TODO name: ensureGitInstall
      // Check if git is installed
      if (!which.sync('git')) {
        throw new Error('you need to have git installed')
      }

      // TODO name: validateSource
      // Check if `src` (path or URL) is provided.
      if (!this.src) { throw new Error('no source provided') }

      // If source is local, make sure path exists.
      if (!this.isRemote && !fs.existsSync(this.src)) {
        throw new Error(`there is no sprout template located at ${this.src}`)
      }

      // If source is local, make sure it's a git repo.
      if (!this.isRemote && !fs.existsSync(path.join(this.src, '.git'))) {
        throw new Error(`${this.src} is not a git repository`)
      }

      // TODO name: ensureInternetConnectionIfRemote
      // TODO is this needed? could replace with timeout
      // If source is remote, try to resolve google.com to make sure internet
      // connection exists.
      if (this.isRemote) {
        return dns.resolve('google.com').catch(function () {
          throw new Error('make sure that you are connected to the internet!')
        })
      }
    }).then(_ => {
      // TODO: name: removeTemplate
      // Remove existing template with the same name.
      return this.remove()
    }).then(_ => {
      // TODO: name: moveSourceToSproutPath
      // If source is remote, clone into path. If source is local, symlink
      // to sprout's path.
      if (this.isRemote) {
        this.sprout.emit('cmd', `git clone ${this.src} ${this.path}`)
        return exec(`git clone --recursive ${this.src} ${this.path}`)
      }

      return fs.symlinkAsync(this.src, this.path)
    }).then(_ => {
      // TODO: name: validateTemplate
      // Anything occuring beyond this point which throws an error should
      // trigger the removal of the template directory!
      return W.resolve().then(_ => {
        // Check for init.js or init.coffee.
        if (!fs.existsSync(path.join(this.path, 'init.js')) && !fs.existsSync(path.join(this.path, 'init.coffee'))) {
          throw new Error('neither init.coffee nor init.js exist in this template')
        }

        // Check for root path.
        if (!fs.existsSync(this.root)) {
          throw new Error('root path doesn\'t exist in template')
        }
      }).catch((error) => {
        // Remove template directory if Sprout created it and an error is
        // thrown.
        return rimraf(this.path).then(_ => { throw error })
      })
    }).yield(this)
  }

  /*
   * Initialize template and save to `target`
   * @param {String} target - The path to save the template to.
   * @return {Promise} - Promise for Template instance.
   */
  init (target, opts = {}) {
    // TODO: validate options with joi
    var utils = new Utils(this.path, target)
    var config = {}
    var branch
    var init

    return this.update().then(_ => {
      // TODO name: validateTarget
      // If root directory doesn't exist in template, pass an error.
      // TODO: remove this, checked already in `save`.
      if (!fs.existsSync(this.root)) {
        throw new Error(`root path doesn't exist in ${this.name}`)
      }

      // If target not passed, throw an error.
      // TODO: remove this, validate with joi
      if (!target) { throw new Error('target path required') }

      // If target directory exists, throw an error.
      if (fs.existsSync(target)) { throw new Error(`${target} already exists`) }
    }).then(_ => {
      // TODO name: handleBranchOrTagOption
      // If tag or version option passed, store current branch.
      if (opts.tag || opts.branch) {
        this.sprout.emit('cmd', 'git rev-parse --abbrev-ref HEAD', this.path)
        return exec('git rev-parse --abbrev-ref HEAD', { cwd: this.path }).spread((stdout) => { branch = stdout })
      }
    }).then(_ => {
      // TODO name: handleBranchOrTagOption
      // If branch option passed, attempt to checkout to specified branch
      if (opts.branch && branch) {
        this.sprout.emit('cmd', 'git branch --list', this.path)
        return exec('git branch --list', { cwd: this.path })
          .spread((stdout) => {
            if (!stdout) { return true }
            const branches = lodash.compact(stdout.replace(/[\*]?\ +/g, '').split('\n'))
            if (lodash.includes(branches, opts.branch)) {
              this.sprout.emit('cmd', `git checkout ${opts.branch}`, this.path)
              return exec(`git checkout ${opts.branch}`, { cwd: this.path })
            }
          })
      }
    }).then(_ => {
      // TODO name: handleBranchOrTagOption
      // If tag option passed, attempt to checkout to specified tag
      if (opts.tag && branch) {
        return exec('git tag --list', { cwd: this.path }).spread((stdout) => {
          if (stdout) {
            const tags = lodash.compact(stdout.split('\n'))
            if (lodash.includes(tags, opts.tag)) {
              return exec(`git checkout tags/${opts.tag}`, { cwd: this.path })
            }
          }
          throw new Error(`tag '${opts.tag}' does not exist`)
        })
      }
    }).then(_ => {
      // TODO name: createTargetDirectory
      // Create the target directory.
      this.sprout.emit('msg', `creating target directory: ${target}`)
      return fs.mkdir(target)
    }).then(_ => {
      // TODO name: installDependenciesIfPresent
      // Install npm dependencies, if present. Eventually, this should work with
      // package managers other than npm.
      if (fs.existsSync(path.join(this.path, 'package.json'))) {
        this.sprout.emit('msg', 'installing npm dependencies')
        return exec('npm install', { cwd: this.path })
      }
    }).then(_ => {
      // Anything occuring beyond this point which throws an error should
      // trigger the removal of target directory!
      return W.resolve().then(_ => {
        // TODO name: loadConfigFile
        // Check for init.js.  If init.js doesn't exist, confirm that
        // init.coffee exists. Require init once this is determined.
        const initCoffee = path.join(this.path, 'init.coffee')
        const initJS = path.join(this.path, 'init.js')
        let initPath

        if (fs.existsSync(initJS)) {
          initPath = initJS
        } else if (fs.existsSync(initCoffee)) {
          initPath = initCoffee
        } else {
          throw new Error('neither init.coffee nor init.js exist')
        }

        this.sprout.emit('msg', 'requiring ' + initPath)
        init = require(initPath)
      }).then(_ => {
        // TODO name: runBeforeHook
        // Run before hook if present.
        if (init.before) {
          this.sprout.emit('msg', 'running before hook')
          return W(init.before(utils, config))
        }
      }).then(_ => {
        // TODO name: mergeConfig
        // Merge in all known values for config.
        lodash.assign(config, init.defaults, opts.locals)

        // If a config path is set, pull out its values and merge into config.
        if (opts.config) {
          this.sprout.emit('msg', `merging config: ${opts.config}`)
          try {
            lodash.assign(config, /\.json$/.test(opts.config) ? require(opts.config)
              : yaml.safeLoad(fs.readFileSync(opts.config, 'utf8')))
          } catch (error) {
            throw new Error(`could not open configuration file ${opts.config}`)
          }
        }

        // TODO name: runPrompts
        // If questionnaire function exists, run it to get answers.
        if (lodash.isFunction(opts.questionnaire) && lodash.isArray(init.configure)) {
          // Run questionnaire, omitting keys already set in config return
          // answers merged with config values.
          this.sprout.emit('msg', 'running questionnaire function')
          return opts.questionnaire(init.configure, lodash.keys(config))
            .then((answers) => { return lodash.assign(config, answers) })
        }
      }).then(_ => {
        // TODO name: copyTemplateToTarget
        // Copy all files in root to target.
        this.sprout.emit('msg', 'copying files in root to target')
        return ncp(this.root, target)
      }).then(_ => {
        // TODO name: runBeforeRenderHook
        // Run beforeRender hook if present.
        if (init.beforeRender) {
          this.sprout.emit('msg', 'running beforeRender hook')
          return W(init.beforeRender(utils, config))
        }
      }).then(_ => {
        // TODO name: readTemplateFiles
        // Read target directory.
        this.sprout.emit('msg', 'reading target directory')
        return readdirp({
          root: target,
          directoryFilter: ['!.git', '!node_modules']
        })
      }).then(result => {
        // TODO name: removeIgnoredFiles
        // Remove ignored files.
        const files = lodash.filter(result.files, (file) => {
          if (init.ignore) {
            init.ignore = lodash.isArray(init.ignore) ? init.ignore
              : [init.ignore]
            for (var i = 0; i < init.ignore.length; i++) {
              if (minimatch(file.path, init.ignore[i])) {
                return false
              }
            }
          }
          return true
        })

        // TODO name: writeTemplateFiles
        // Write all files with our Utils class.
        return W.map(files, file => {
          this.sprout.emit('msg', `reading ${file.fullPath}`)

          // If the file is not a binary, render it.
          if (!isBinaryFile(file.fullPath)) {
            this.sprout.emit('msg', `reading ${file.fullPath}`)
            return utils.target.read(file.path).then(output => {
              this.sprout.emit('msg', `writing ${file.fullPath}`)
              return utils.target.write(file.path, output, config)
            })
          }
        })
      }).then(_ => {
        // TODO name: runAfterHook
        // Run after hook if present.
        if (init.after) {
          this.sprout.emit('msg', 'running after hook')
          return W(init.after(utils, config))
        }
      }).then(_ => {
        // TODO name: checkoutBranchIfNecessary
        // If original branch is stored, checkout to said branch.
        if (branch) {
          this.sprout.emit('cmd', `git checkout ${branch}`, this.path)
          return exec(`git checkout ${branch}`, { cwd: this.path })
        }
      }).catch(error => {
        // TODO name: removeTargetDirectory
        // Remove target directory if Sprout created it and an error is
        // thrown.
        return rimraf(target).then(_ => { throw error })
      })
    }).yield(this)
  }

  /*
   * Update template source.
   * @return {Promise} - Promise for Template instance.
   */
  update () {
    // Confirm template is a git repository. If not, throw an error.
    if (!fs.existsSync(path.join(this.path, '.git'))) {
      return W.reject(new Error(`${this.name} is not a git repository`))
    }

    // If remote origin exists, run `git remote update` to update the
    // repository.
    this.sprout.emit('msg', 'updating template')
    this.sprout.emit('cmd', 'git remote', this.path)

    return exec('git remote', { cwd: this.path }).then(stdout => {
      if (!stdout[0]) { return true }
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
  run (target, generator, args) {
    return W.resolve().then(_ => {
      // TODO: replace with joi validation, name validateArgs
      // If target not passed, throw an error.
      if (!target) { throw new Error('target path required') }

      // If target directory doesn't exist, throw an error.
      if (!fs.existsSync(target)) {
        throw new Error(`${target} does not exist`)
      }

      // If generator name isn't passed, throw an error.
      if (!generator) { throw new Error('generator name required') }

      // TODO name: validateGenerator
      // Check for {generator}.js.  If {generator}.js doesn't exist, confirm
      // that {name}.coffee exists. Require {generator}.js or {generator}.coffee
      // once this is determined.
      const generatorCoffee = path.join(this.generators, `${generator}.coffee`)
      const generatorJs = path.join(this.generators, `${generator}.js`)
      let generatorPath

      if (fs.existsSync(generatorJs)) {
        generatorPath = generatorJs
      } else if (fs.existsSync(generatorCoffee)) {
        generatorPath = generatorCoffee
      } else {
        throw new Error(`'${generator}' is not a generator in this template`)
      }

      this.sprout.emit('msg', `requiring '${generator}' generator`)
      return require(generatorPath)
    }).then(generator => {
      // TODO name: executeGenerator
      // Create a Utils instance where the `src` and `target` are both the
      // target directory.
      var utils = new Utils(this.path, target)

      // Add `utils` as the first object in our `args` array.
      var args
      (args = lodash.isArray(args) ? args : []).unshift(utils)

      // Call the generator, pass the Utils instance and the arguments.
      this.sprout.emit('msg', `running ${generator} generator`)
      return generator.apply(null, args)
    }).yield(this)
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

    return fs.lstatAsync(this.path).then(stat => {
      if (stat.isSymbolicLink()) { return fs.unlink(this.path) }
      return rimraf(this.path)
    }).yield(this)
  }
}

module.exports = Template
