var Utils = require('./utils')
  , helpers = require('./helpers')
  , Promise = require('bluebird')
  , which = require('which')
  , path = require('path')
  , yaml = require('js-yaml')
  , minimatch = require('minimatch')
  , _ = require('lodash')
  , rimraf = Promise.promisify(require('rimraf'))
  , exec = Promise.promisify(require('child_process').exec)
  , readdirp = Promise.promisify(require('readdirp'))
  , ncp = Promise.promisify(require('ncp').ncp)
  , fs = Promise.promisifyAll(require('fs'))
  , dns = Promise.promisifyAll(require('dns'));

/*
 * Register CoffeeScript; `init` file in template
 * can be either CoffeeScript or JavaScript.
 */

require('coffee-script/register');

module.exports = (function () {

  /*
   * Given a Sprout instance and a name, returns a
   * Template instance.
   * @param {Function} sprout - Sprout instance.
   * @param {String} name - Name of template
   * @param {String} src (optional) - Path or URL to source.  Only required for `template.save`.
   * @return {Function} - Template instance.
   */

  var Template = function (sprout, name, src) {
    this.sprout = sprout;
    this.emitter = sprout.emitter;
    this.name = name;
    this.path = path.join(sprout.path, name);
    this.root = path.join(this.path, 'root');
    this.generators = path.join(this.path, 'generators');

    /*
     * If `src` is set, use `isGitURL` helper to
     * determine whether `src` is a local path or
     * a remote URL.
     */

    if (src) {
      this.src = src;
      this.isRemote = helpers.isGitURL(src);
    }

  }

  Template.prototype = {

    /*
     * Saves `template.src` to `template.path`
     * @return {Promise} - promise for Template instance.
     */

    save: function () {
      var self = this;
      return new Promise(
        function (resolve, reject) {

          var command;

          /*
           * Check if `src` (path or URL) is provided.
           */

          if (!self.src) {
            return reject(new Error('no source provided'));
          }

          /*
           * Check if git is installed
           */

          if (!which.sync('git')) {
            return reject(new Error('you need to have git installed'));
          }

          return resolve();
        }
      ).then(
        function () {
          if (self.isRemote) {

            /*
             * If source is remote, try to resolve
             * google.com to make sure internet
             * connection exists.
             */

            return dns.resolveAsync('google.com').catch(
              function () {
                throw new Error('make sure that you are connected to the internet!');
              }
            );

          }

          /*
           * If source is local, make
           * sure path exists.
           */

          if (!fs.existsSync(self.src)) {
            throw new Error('there is no sprout template located at ' + self.src);
          }

          /*
           * If source is local, make
           * sure it's a git repo.
           */

          if (!fs.existsSync(path.join(self.src, '.git'))) {
            throw new Error(self.src + ' is not a git repository');
          }

        }
      ).then(
        function () {

          /*
           * Remove existing template with the
           * same name.
           */

          return self.remove();

        }
      ).then(
        function () {

          /*
           * If source is remote, clone into
           * path. If source is local, symlink
           * to sprout's path.
           */

          if (self.isRemote) {
            self.emitter.emit('cmd', 'git clone ' + self.src + ' ' + self.path);
            return exec('git clone --recursive ' + self.src + ' ' + self.path);
          }

          return fs.symlinkAsync(self.src, self.path);

        }
      ).then(
        function () {

          /* Anything occuring beyond this point which
           * throws an error should trigger the removal
           * of the template directory!
           */

          return new Promise(
            function (resolve, reject) {

              /*
               * Check for init.js or init.coffee.
               */

              if (!fs.existsSync(path.join(self.path, 'init.js'))
                && !fs.existsSync(path.join(self.path, 'init.coffee'))) {
                return reject(new Error('neither init.coffee nor init.js exist in this template'));
              }

              /*
               * Check for root path.
               */

              if (!fs.existsSync(self.root)) {
                return reject(new Error('root path doesn\'t exist in template'));
              }

              return resolve();

            }
          ).catch(
            function (error) {

              /*
               * Remove tenokate directory if
               * Sprout created it and an
               * error is thrown.
               */

              return rimraf(self.path).then(
                function () {
                  throw error;
                }
              )

            }
          )

        }
      ).return(this);
    },

    /*
     * Initialize template and save to `target`
     * param {String} target - The path to save the template to.
     * @return {Promise} - Promise for Template instance.
     */

    init: function (target, options) {
      var self = this
        , options = (options || {})
        , utils = new Utils(self.path, target)
        , config = {}
        , branch
        , init;
      return this.update().then(
        function () {

          /*
           * If root directory doesn't exist
           * in template, pass an error.
           */

          if (!fs.existsSync(self.root)) {
            throw new Error('root path doesn\'t exist in ' + self.name);
          }

          /*
           * If target not passed,
           * throw an error.
           */

          if (!target) {
            throw new Error('target path required');
          }

          /*
           * If target directory exists,
           * throw an error.
           */

          if (fs.existsSync(target)) {
            throw new Error(target + ' already exists');
          }

        }
      ).then(
        function () {

          /* If tag or version option passed,
           * store current branch.
           */

          if (options.tag || options.branch) {
            self.emitter.emit('cmd', 'git rev-parse --abbrev-ref HEAD', self.path);
            return exec('git rev-parse --abbrev-ref HEAD', { cwd: self.path }).spread(
              function (stdout) {
                branch = stdout;
              }
            )
          }

        }
      ).then(
        function () {

          /* If branch option passed,
           * attempt to checkout to
           * specified branch
           */

          if (options.branch && branch) {
            self.emitter.emit('cmd', 'git branch --list', self.path);
            return exec('git branch --list', { cwd: self.path }).spread(
              function (stdout) {
                var branches;
                if (stdout) {
                  branches = _.compact(stdout.replace(/[\*]?\ +/g, '').split('\n'));
                  if (_.contains(branches, options.branch)) {
                    self.emitter.emit('cmd', 'git checkout ' + options.branch, self.path);
                    return exec('git checkout ' + options.branch, { cwd: self.path });
                  }
                }
              }
            )
          }

        }
      ).then(
        function () {

          /* If tag option passed,
           * attempt to checkout to
           * specified tag
           */

          if (options.tag && branch) {
            return exec('git tag --list', { cwd: self.path }).spread(
              function (stdout) {
                var tags;
                if (stdout) {
                  tags = _.compact(stdout.split('\n'));
                  if (_.contains(tags, options.tag)) {
                    return exec('git checkout tags/' + options.tag, { cwd: self.path });
                  }
                }
                throw new Error('tag `' + options.tag + '` does not exist');
              }
            )
          }

        }
      ).then(
        function () {

          /*
           * Create the target directory.
           */

          self.emitter.emit('msg', 'creating target directory: ' + target);
          return fs.mkdirAsync(target);

        }
      ).then(
        function () {

          /*
           * Install npm dependencies, if present.
           * Eventually, this should work with
           * package managers other than npm.
           */

          var pkg = path.join(self.path, 'package.json');
          if (fs.existsSync(pkg)) {
            self.emitter.emit('msg', 'installing npm dependencies');
            return exec('npm install', { cwd: self.path });
          }

        }

      ).then(
        function () {

          /* Anything occuring beyond this point which
           * throws an error should trigger the removal
           * of target directory!
           */

          return new Promise(
            function (resolve, reject) {

              /*
               * Check for init.js.  If init.js doesn't
               * exist, confirm that init.coffee exists.
               * Require init once this is determined.
               */

              var initCoffee = path.join(self.path, 'init.coffee')
                , initJS = path.join(self.path, 'init.js')
                , initPath;

              if (fs.existsSync(initJS)) {
                initPath = initJS;
              } else if (fs.existsSync(initCoffee)) {
                initPath = initCoffee;
              } else {
                return reject(new Error('neither init.coffee nor init.js exist'));
              }

              try {
                self.emitter.emit('msg', 'requiring ' + initPath);
                init = require(initPath);
              } catch (error) {
                return reject(error);
              }

              return resolve();

            }
          ).then(
            function () {

              /*
               * Run before hook if present.
               */

              if (init.before) {
                self.emitter.emit('msg', 'running before hook');
                return Promise.method(init.before)(utils, config);
              }

            }
          ).then(
            function () {

              /*
               * Merge in all known
               * values for config.
               */

              _.extend(config, init.defaults, options.locals);

              /*
               * If a config path is set,
               * pull out its values and
               * merge into config.
               */

              if (options.config) {
                self.emitter.emit('msg', 'merging config: ' + options.config);
                try {
                   _.extend(config, /\.json$/.test(options.config) ? require(options.config)
                     : yaml.safeLoad(fs.readFileSync(options.config, 'utf8')));
                 } catch (error) {
                   throw new Error('could not open configuration file ' + options.config);
                 }
               }

              /*
               * If questionnaire function exists,
               * run it to get answers.
               */

              if (_.isFunction(options.questionnaire) && _.isArray(init.configure)) {

                /*
                 * Run questionnaire, omitting keys
                 * already set in config; return
                 * answers merged with config values.
                 */

                self.emitter.emit('msg', 'running questionnaire function');
                return options.questionnaire(init.configure, _.keys(config)).then(
                  function (answers) {
                    return _.extend(config, answers);
                  }
                );

              }

            }
          ).then(
            function () {

              /*
               * Copy all files in root to target.
               */

              self.emitter.emit('msg', 'copying files in root to target');
              return ncp(self.root, target);

            }
          ).then(
            function () {

              /*
               * Run beforeRender hook if present.
               */

              if (init.beforeRender) {
                self.emitter.emit('msg', 'running beforeRender hook');
                return Promise.method(init.beforeRender)(utils, config);
              }

            }
          ).then(
            function () {

              /*
               * Read target directory.
               */

              self.emitter.emit('msg', 'reading target directory');
              return readdirp({
                root: target,
                directoryFilter: ['!.git', '!node_modules']
              });

            }
          ).then(
            function (result) {

              /*
               * Remove ignored files.
               */

              var files = _.filter(result.files,
                function (file) {
                  if (init.ignore) {
                    init.ignore = _.isArray(init.ignore) ? init.ignore
                      : [init.ignore];
                    for (var i=0; i<init.ignore.length; i++) {
                      if (minimatch(file.path, init.ignore[i])) {
                        return false;
                      }
                    }
                  }
                  return true;
                }
              )

              /*
               * Write all files with our Utils class.
               */

              return Promise.map(files,
                function (file) {
                  self.emitter.emit('msg', 'reading ' + file.fullPath);

                  /*
                   * If the file is not a binary, render it.
                   */

                  if (!helpers.isBinaryFile(file.fullPath)) {

                    self.emitter.emit('msg', 'reading ' + file.fullPath);
                    return utils.target.read(file.path).then(
                      function (output) {
                        self.emitter.emit('msg', 'writing ' + file.fullPath);
                        return utils.target.write(file.path, output, config);
                      }
                    )

                  }

                }
              )

            }
          ).then(
            function () {

              /*
               * Run after hook if present.
               */

              if (init.after) {
                self.emitter.emit('msg', 'running after hook');
                return Promise.method(init.after)(utils, config);
              }

            }
          ).then(
            function () {

              /*
               * If original branch is stored,
               * checkout to said branch.
               */

              if (branch) {
                self.emitter.emit('cmd', 'git checkout ' + branch, self.path);
                return exec('git checkout ' + branch, { cwd: self.path });
              }

            }
          ).catch(
            function (error) {

              /*
               * Remove target directory if
               * Sprout created it and an
               * error is thrown.
               */

              return rimraf(target).then(
                function () {
                  throw error;
                }
              );

            }
          );

        }
      ).return(this);
    },

    /*
     * Update template source.
     * @return {Promise} - Promise for Template instance.
     */

    update: function () {
      var self = this;
      return new Promise(
        function (resolve, reject) {

          /*
           * Confirm template is a git
           * repository. If not, throw
           * an error.
           */

          if (!fs.existsSync(path.join(self.path, '.git'))) {
            return reject(new Error(self.name + ' is not a git repository'));
          }

          return resolve();

        }
      ).then(
        function () {

          /*
           * If remote origin exists, run `git remote update`
           * to update the repository.
           */

          self.emitter.emit('msg', 'updating template');
          self.emitter.emit('cmd', 'git remote', self.path);

          return exec('git remote', { cwd: self.path }).then(
            function (stdout) {
              var origin;
              if (stdout[0]) {
                origin = _.trim(stdout[0]);
                self.emitter.emit('cmd', 'git pull ' + origin + ' HEAD', self.path);
                return exec('git pull ' + origin + ' HEAD', { cwd: self.path });
              }
            }
          )

        }
      ).return(this);
    },

    /*
     * Run a template generator in the specified target.
     * @param {String} target - the target path.
     * @param {String} name - the name of the generator to use.
     * @param
     * @return {Promise} - Promise for Template instance.
     */

    run: function (target, generator, args) {
      var self = this;
      return new Promise(
        function (resolve, reject) {

          /*
           * If target not passed,
           * throw an error.
           */

          if (!target) {
            return reject(new Error('target path required'));
          }

          /*
           * If target directory doesn't exist,
           * throw an error.
           */

          if (!fs.existsSync(target)) {
            return reject(new Error(target + ' does not exist'));
          }

          /*
           * If generator name isn't
           * passed, throw an error.
           */

          if (!generator) {
            return reject(new Error('generator name required'));
          }

          /*
           * Check for {generator}.js.  If {generator}.js
           * doesn't exist, confirm that {name}.coffee exists.
           * Require {generator}.js or {generator}.coffee once
           * this is determined.
           */

          var generatorCoffee = path.join(self.generators, generator + '.coffee')
            , generatorJs = path.join(self.generators, generator + '.js')
            , generatorPath;

          if (fs.existsSync(generatorJs)) {
            generatorPath = generatorJs;
          } else if (fs.existsSync(generatorCoffee)) {
            generatorPath = generatorCoffee;
          } else {
            return reject(new Error('`' + generator + '` is not a generator in this template'));
          }

          try {
            self.emitter.emit('msg', 'requiring `' + generator + '` generator');
            return resolve(require(generatorPath));
          } catch (error) {
            return reject(error);
          }

        }
      ).then(
        function (generator) {

          /*
           * Create a Utils instance where
           * the `src` and `target` are both
           * the target directory.
           */

          var utils = new Utils(self.path, target);

          /*
           * Add `utils` as the first object
           * in our `args` array.
           */

          (args = _.isArray(args) ? args : []).unshift(utils);

          /*
           * Call the generator; pass
           * the Utils instance and the
           * arguments.
           */

          self.emitter.emit('msg', 'running `' + generator + '` generator');
          return generator.apply(null, args);

        }
      ).return(this);
    },

    /*
     * Delete the template.
     * @return {Promise} - Promise for Template instance.
     */

    remove: function () {
      var self = this;
      return new Promise(
        function (resolve, reject) {

          /*
           * Resolve if path does not
           * exist.
           */

          if (!fs.existsSync(self.path)) {
            return resolve();
          }

          /*
           * rm -rf the path.
           */

          self.emitter.emit('msg', 'removing template');

          lstat = fs.lstatSync(self.path);
          if (lstat.isSymbolicLink()) {
            return resolve(fs.unlinkAsync(self.path));
          }
          return resolve(rimraf(self.path));

        }
      ).return(this);
    }
  }

  return Template;

}.call(this));
