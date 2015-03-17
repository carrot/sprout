var Promise = require('bluebird')
  , which = require('which')
  , path = require('path')
  , _ = require('lodash')
  , ejs = require('ejs')
  , underscoreString = require('underscore.string')
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
     * If `src` is set, use RegExp to determine
     * whether `src` is a local path or a remote
     * URL.
     */

    if (src) {
      this.src = src;
      this.isRemote = /(?:[A-Za-z0-9]+@|https?:\/\/)[A-Za-z0-9.]+(?::|\/)[A-Za-z0-9\/]+(?:\.git)?/.test(src);
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
        , config;
      return this.update().then(
        function () {

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
                return reject(new Error('neither init.coffee nor init.js exist.'));
              }

              return resolve(init);

            }
          ).then(
            function () {

              /*
               * Run before hook if present.
               */

              if (init.before) {
                return new Promise(
                  function (resolve, reject) {
                    return init.before(target, resolve, reject);
                  }
                )
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
               * Merge in all options and underscore.string.
               */

              config = _.extend(
                {},
                init.defaults || {},
                options.locals || {},
                answers || {},
                { S: underscoreString }
              );

              /*
               * Copy all file in root to target.
               */

              return ncp(self.root, target);

            }
          ).then(
            function () {

              /*
               * Run beforeRender hook if present.
               */

              if (init.beforeRender) {
                return new Promise(
                  function (resolve, reject) {
                    return init.beforeRender(target, config, resolve, reject);
                  }
                )
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
               * Write all files with EJS replaced.
               */

              return Promise.map(result.files,
                function (file) {
                  try {
                    return fs.writeFileAsync(file.fullPath, ejs.render(fs.readFileSync(file.fullPath, 'utf8'), config));
                  } catch (error) {
                    throw new Error('ejs error in ' + file.path);
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
                return new Promise(
                  function (resolve, reject) {
                    return init.after(target, config, resolve, reject);
                  }
                )
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
           * If template is simply a symbolic link,
           * run fs.unlink.  Otherwise, rm -rf the
           * path.
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