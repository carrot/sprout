import Utils from './utils'
import {isGitUrl, isBinaryFile} from './helpers'
import Promise from 'bluebird'
import which from 'which'
import path from 'path'
import yaml from 'js-yaml'
import minimatch from 'minimatch'
import _ from 'lodash'
import _rimraf from 'rimraf'
import _readdirp from 'readdirp'
import _fs from 'fs'
import _dns from 'dns'
import {exec as _exec} from 'child_process'
import {ncp as _ncp} from 'ncp'

const rimraf = Promise.promisify(_rimraf)
const exec = Promise.promisify(_exec)
const readdirp = Promise.promisify(_readdirp)
const ncp = Promise.promisify(_ncp)
const fs = Promise.promisifyAll(_fs)
const dns = Promise.promisifyAll(_dns)

/*
 * Register CoffeeScript `init` file in template
 * can be either CoffeeScript or JavaScript.
 */

require('coffee-script/register')

/*
 * Given a Sprout instance and a name, returns a
 * Template instance.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - Name of template
 * @param {String} src (optional) - Path or URL to source.  Only required for `template.save`.
 * @return {Function} - Template instance.
 */
class Template {

  constructor (sprout, name, src) {
    this.sprout = sprout
    this.emitter = sprout.emitter
    this.name = name
    this.path = path.join(sprout.path, name)
    this.root = path.join(this.path, 'root')
    this.generators = path.join(this.path, 'generators')

    /*
     * If `src` is set, use `isGitURL` helper to
     * determine whether `src` is a local path or
     * a remote URL.
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
    return new Promise((resolve, reject) => {
      // Check if `src` (path or URL) is provided.
      if (!this.src) { return reject(new Error('no source provided')) }

      // Check if git is installed
      if (!which.sync('git')) {
        return reject(new Error('you need to have git installed'))
      }

      return resolve()
    }).then(() => {
      // If source is remote, try to resolve google.com to make sure internet
      // connection exists.
      if (this.isRemote) {
        return dns.resolveAsync('google.com').catch(function () {
          throw new Error('make sure that you are connected to the internet!')
        })
      }

      // If source is local, make sure path exists.
      if (!fs.existsSync(this.src)) {
        throw new Error(`there is no sprout template located at ${this.src}`)
      }

      // If source is local, make sure it's a git repo.
      if (!fs.existsSync(path.join(this.src, '.git'))) {
        throw new Error(this.src + ' is not a git repository')
      }
    }).then(() => {
      // Remove existing template with the same name.
      return this.remove()
    }).then(() => {
      // If source is remote, clone into path. If source is local, symlink
      // to sprout's path.
      if (this.isRemote) {
        this.emitter.emit('cmd', `git clone ${this.src} ${this.path}`)
        return exec(`git clone --recursive ${this.src} ${this.path}`)
      }

      return fs.symlinkAsync(this.src, this.path)
    }).then(() => {
      // Anything occuring beyond this point which throws an error should
      // trigger the removal of the template directory!
      return new Promise((resolve, reject) => {
        // Check for init.js or init.coffee.
        if (!fs.existsSync(path.join(this.path, 'init.js')) && !fs.existsSync(path.join(this.path, 'init.coffee'))) {
          return reject(new Error('neither init.coffee nor init.js exist in this template'))
        }

        // Check for root path.
        if (!fs.existsSync(this.root)) {
          return reject(new Error('root path doesn\'t exist in template'))
        }

        return resolve()
      }).catch((error) => {
        // Remove tenokate directory if Sprout created it and an error is
        // thrown.
        return rimraf(this.path).then(() => { throw error })
      })
    }).return(this)
  }

  /*
   * Initialize template and save to `target`
   * param {String} target - The path to save the template to.
   * @return {Promise} - Promise for Template instance.
   */

  init (target, opts) {
    var options = (opts || {})
    var utils = new Utils(this.path, target)
    var config = {}
    var branch
    var init
    return this.update().then(() => {
      // If root directory doesn't exist in template, pass an error.
      if (!fs.existsSync(this.root)) {
        throw new Error(`root path doesn't exist in ${this.name}`)
      }

      // If target not passed, throw an error.
      if (!target) { throw new Error('target path required') }

      // If target directory exists, throw an error.
      if (fs.existsSync(target)) { throw new Error(`${target} already exists`) }
    }).then(() => {
      // If tag or version option passed, store current branch.
      if (options.tag || options.branch) {
        this.emitter.emit('cmd', 'git rev-parse --abbrev-ref HEAD', this.path)
        return exec('git rev-parse --abbrev-ref HEAD', { cwd: this.path }).spread((stdout) => { branch = stdout })
      }
    }).then(() => {
      // If branch option passed, attempt to checkout to specified branch
      if (options.branch && branch) {
        this.emitter.emit('cmd', 'git branch --list', this.path)
        return exec('git branch --list', { cwd: this.path }).spread((stdout) => {
          var branches
          if (stdout) {
            branches = _.compact(stdout.replace(/[\*]?\ +/g, '').split('\n'))
            if (_.contains(branches, options.branch)) {
              this.emitter.emit('cmd', `git checkout ${options.branch}`, this.path)
              return exec(`git checkout ${options.branch}`, { cwd: this.path })
            }
          }
        })
      }
    }).then(() => {
      // If tag option passed, attempt to checkout to specified tag
      if (options.tag && branch) {
        return exec('git tag --list', { cwd: this.path }).spread((stdout) => {
          var tags
          if (stdout) {
            tags = _.compact(stdout.split('\n'))
            if (_.contains(tags, options.tag)) {
              return exec(`git checkout tags/${options.tag}`, { cwd: this.path })
            }
          }
          throw new Error(`tag '${options.tag}' does not exist`)
        })
      }
    }).then(() => {
      // Create the target directory.
      this.emitter.emit('msg', `creating target directory: ${target}`)
      return fs.mkdirAsync(target)
    }).then(() => {
      // Install npm dependencies, if present. Eventually, this should work with
      // package managers other than npm.
      var pkg = path.join(this.path, 'package.json')
      if (fs.existsSync(pkg)) {
        this.emitter.emit('msg', 'installing npm dependencies')
        return exec('npm install', { cwd: this.path })
      }
    }).then(() => {
      // Anything occuring beyond this point which throws an error should
      // trigger the removal of target directory!
      return new Promise((resolve, reject) => {
        // Check for init.js.  If init.js doesn't exist, confirm that
        // init.coffee exists. Require init once this is determined.
        var initCoffee = path.join(this.path, 'init.coffee')
        var initJS = path.join(this.path, 'init.js')
        var initPath

        if (fs.existsSync(initJS)) {
          initPath = initJS
        } else if (fs.existsSync(initCoffee)) {
          initPath = initCoffee
        } else {
          return reject(new Error('neither init.coffee nor init.js exist'))
        }

        try {
          this.emitter.emit('msg', 'requiring ' + initPath)
          init = require(initPath)
        } catch (error) {
          return reject(error)
        }

        return resolve()
      }).then(() => {
        // Run before hook if present.
        if (init.before) {
          this.emitter.emit('msg', 'running before hook')
          return Promise.method(init.before)(utils, config)
        }
      }).then(() => {
        // Merge in all known values for config.
        _.extend(config, init.defaults, options.locals)

        // If a config path is set, pull out its values and merge into config.
        if (options.config) {
          this.emitter.emit('msg', `merging config: ${options.config}`)
          try {
            _.extend(config, /\.json$/.test(options.config) ? require(options.config)
              : yaml.safeLoad(fs.readFileSync(options.config, 'utf8')))
          } catch (error) {
            throw new Error(`could not open configuration file ${options.config}`)
          }
        }

        // If questionnaire function exists, run it to get answers.
        if (_.isFunction(options.questionnaire) && _.isArray(init.configure)) {
          // Run questionnaire, omitting keys already set in config return
          // answers merged with config values.
          this.emitter.emit('msg', 'running questionnaire function')
          return options.questionnaire(init.configure, _.keys(config))
            .then((answers) => { return _.extend(config, answers) })
        }
      }).then(() => {
        // Copy all files in root to target.
        this.emitter.emit('msg', 'copying files in root to target')
        return ncp(this.root, target)
      }).then(() => {
        // Run beforeRender hook if present.
        if (init.beforeRender) {
          this.emitter.emit('msg', 'running beforeRender hook')
          return Promise.method(init.beforeRender)(utils, config)
        }
      }).then(() => {
        // Read target directory.
        this.emitter.emit('msg', 'reading target directory')
        return readdirp({
          root: target,
          directoryFilter: ['!.git', '!node_modules']
        })
      }).then((result) => {
        // Remove ignored files.
        var files = _.filter(result.files, (file) => {
          if (init.ignore) {
            init.ignore = _.isArray(init.ignore) ? init.ignore
              : [init.ignore]
            for (var i = 0; i < init.ignore.length; i++) {
              if (minimatch(file.path, init.ignore[i])) {
                return false
              }
            }
          }
          return true
        })

        // Write all files with our Utils class.
        return Promise.map(files, (file) => {
          this.emitter.emit('msg', `reading ${file.fullPath}`)

          // If the file is not a binary, render it.
          if (!isBinaryFile(file.fullPath)) {
            this.emitter.emit('msg', 'reading ' + file.fullPath)
            return utils.target.read(file.path).then((output) => {
              this.emitter.emit('msg', 'writing ' + file.fullPath)
              return utils.target.write(file.path, output, config)
            })
          }
        })
      }).then(() => {
        // Run after hook if present.
        if (init.after) {
          this.emitter.emit('msg', 'running after hook')
          return Promise.method(init.after)(utils, config)
        }
      }).then(() => {
        // If original branch is stored, checkout to said branch.
        if (branch) {
          this.emitter.emit('cmd', `git checkout ${branch}`, this.path)
          return exec(`git checkout ${branch}`, { cwd: this.path })
        }
      }).catch((error) => {
        // Remove target directory if Sprout created it and an error is
        // thrown.
        return rimraf(target).then(() => { throw error })
      })
    }).return(this)
  }

  /*
   * Update template source.
   * @return {Promise} - Promise for Template instance.
   */
  update () {
    return new Promise((resolve, reject) => {
      // Confirm template is a git repository. If not, throw an error.
      if (!fs.existsSync(path.join(this.path, '.git'))) {
        return reject(new Error(`${this.name} is not a git repository`))
      }

      return resolve()
    }).then(() => {
      // If remote origin exists, run `git remote update` to update the
      // repository.
      this.emitter.emit('msg', 'updating template')
      this.emitter.emit('cmd', 'git remote', this.path)

      return exec('git remote', { cwd: this.path }).then((stdout) => {
        var origin
        if (stdout[0]) {
          origin = _.trim(stdout[0])
          this.emitter.emit('cmd', 'git pull ' + origin + ' HEAD', this.path)
          return exec('git pull ' + origin + ' HEAD', { cwd: this.path })
        }
      })
    }).return(this)
  }

  /*
   * Run a template generator in the specified target.
   * @param {String} target - the target path.
   * @param {String} name - the name of the generator to use.
   * @param
   * @return {Promise} - Promise for Template instance.
   */
  run (target, generator, args) {
    return new Promise((resolve, reject) => {
      // If target not passed, throw an error.
      if (!target) {
        return reject(new Error('target path required'))
      }

      // If target directory doesn't exist, throw an error.
      if (!fs.existsSync(target)) {
        return reject(new Error(target + ' does not exist'))
      }

      // If generator name isn't passed, throw an error.
      if (!generator) {
        return reject(new Error('generator name required'))
      }

      // Check for {generator}.js.  If {generator}.js doesn't exist, confirm
      // that {name}.coffee exists. Require {generator}.js or {generator}.coffee
      // once this is determined.
      var generatorCoffee = path.join(this.generators, generator + '.coffee')
      var generatorJs = path.join(this.generators, generator + '.js')
      var generatorPath

      if (fs.existsSync(generatorJs)) {
        generatorPath = generatorJs
      } else if (fs.existsSync(generatorCoffee)) {
        generatorPath = generatorCoffee
      } else {
        return reject(new Error(`'${generator}' is not a generator in this template`))
      }

      try {
        this.emitter.emit('msg', `requiring '${generator}' generator`)
        return resolve(require(generatorPath))
      } catch (error) {
        return reject(error)
      }
    }).then((generator) => {
      // Create a Utils instance where the `src` and `target` are both the
      // target directory.
      var utils = new Utils(this.path, target)

      // Add `utils` as the first object in our `args` array.
      var args
      (args = _.isArray(args) ? args : []).unshift(utils)

      // Call the generator pass the Utils instance and the arguments.
      this.emitter.emit('msg', `running ${generator} generator`)
      return generator.apply(null, args)
    }).return(this)
  }

  /*
   * Delete the template.
   * @return {Promise} - Promise for Template instance.
   */
  remove () {
    return new Promise((resolve, reject) => {
       // Resolve if path does not exist.
      if (!fs.existsSync(this.path)) { return resolve() }

      // rm -rf the path.
      this.emitter.emit('msg', 'removing template')

      var lstat = fs.lstatSync(this.path)
      if (lstat.isSymbolicLink()) {
        return resolve(fs.unlinkAsync(this.path))
      }
      return resolve(rimraf(this.path))
    }).return(this)
  }
}

module.exports = Template
