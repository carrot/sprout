var Utils = require('./utils')
  , helpers = require('./helpers')
  , Promise = require('bluebird')
  , which = require('which')
  , path = require('path')
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
    this.name = name;
    this.path = path.join(sprout.path, name);
    this.root = path.join(this.path, 'root');

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
            return exec('git clone ' + self.src + ' ' + self.path);
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
        , branch
        , config;
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
            return exec('git branch --list', { cwd: self.path }).spread(
              function (stdout) {
                var branches;
                if (stdout) {
                  branches = _.compact(stdout.replace(/[\*]?\ +/g, '').split('\n'));
                  if (_.contains(branches, options.branch)) {
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

          return fs.mkdirAsync(target);

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
               * Check for init.coffee.  If init.coffee doesn't
               * exist, assume init is to located at init.js.
               * Require init once this is determined.
               */

              var initCoffee = path.join(self.path, 'init.coffee')
                , initJS = path.join(self.path, 'init.js')
                , initPath = fs.existsSync(initCoffee) ? initCoffee : initJS;

              try {
                init = require(initPath);
              } catch (_) {
                return reject(new Error('neither init.coffee nor init.js exist'));
              }

              return resolve(init);

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
                return exec('npm install', { cwd: self.path });
              }

            }
          ).then(
            function () {

              /*
               * Run before hook if present.
               */

              if (init.before) {
                return Promise.method(init.before)(utils);
              }

            }
          ).then(
            function () {

              /*
               * If questionnaire function exists,
               * run it to get answers.
               */

              if (_.isFunction(options.questionnaire) && _.isObject(init.configure)) {
                return options.questionnaire(init.configure, _.keys(options.locals));
              }

            }
          ).then(
            function (answers) {

              /*
               * Merge in all options.
               */

              config = _.extend(
                {},
                init.defaults || {},
                options.locals || {},
                answers || {}
              )

              /*
               * Copy all files in root to target.
               */

              return ncp(self.root, target);

            }
          ).then(
            function () {

              /*
               * Run beforeRender hook if present.
               */

              if (init.beforeRender) {
                return Promise.method(init.beforeRender)(utils, config);
              }

            }
          ).then(
            function () {

              /*
               * Read target directory.
               */

              return readdirp({ root: target });

            }
          ).then(
            function (result) {

              /*
               * Write all files with our Utils class.
               */

              return Promise.map(result.files,
                function (file) {
                  return utils.read(file.fullPath).then(
                    function (output) {
                      return utils.write(file.fullPath, output, config);
                    }
                  )
                }
              )

            }
          ).then(
            function () {

              /*
               * Run after hook if present.
               */

              if (init.after) {
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

          return exec('git remote', { cwd: self.path }).then(
            function (stdout) {
              if (stdout[0]) {
                return exec('git pull', { cwd: self.path });
              }
            }
          )

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
