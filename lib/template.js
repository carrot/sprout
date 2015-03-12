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

          return fs.existsAsync(self.src).then(
            function (exists) {
              if (!exists) {
                throw new Error('there is no sprout template located at ' + self.src)
              }
            }
          )

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

          command = self.isRemote ? ('git clone ' + self.src + ' ' + self.path)
            : ('ln -s ' + self.src + ' ' + self.path);

          return exec(command);

        }
      ).return(self);
    },

    /*
     * Initialize template and save to `target`
     * param {String} target - The path to save the template to.
     * @return {Promise} - Promise for Template instance.
     */

    init: function (target, options) {
      var self = this
        , options = (options || {})
        , overrides = (options.overrides || {})
        , locals
        , init;
      return this.update().then(
        function () {

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
            throw new Error('neither init.coffee nor init.js exist.');
          }

          /*
           * Run before hook if present.
           */

          if (init.before) {
            return init.before();
          }

        }
      ).then(
        function () {

          /*
           * If target directory exists,
           * throw an error.
           */

          return fs.existsAsync(target).catch(
            function (error) {
              throw new Error(target + ' already exists');
            }
          )

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

          var paths;

          /*
           * If questionnaire function exists,
           * run it to get answers.
           */

          if (_.isFunction(options.questionnaire) && _.isObject(init.configure)) {
            return options.questionnaire(init.configure, _.keys(overrides));
          }

        }
      ).then(
        function (answers) {


          /*
           * Merge in all options and underscore.string.
           */

          locals = _.merge(
            (answers || {}),
            overrides,
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
            return init.beforeRender();
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
                return fs.writeFileAsync(file.fullPath, ejs.render(fs.readFileSync(file.fullPath, 'utf8'), locals));
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
            return init.after();
          }

        }
      ).return(self);
    },

    /*
     * Update template source.  Checks for remote origins.
     * If one or more exists, runs update.  Otherwise,
     * the promise simply resolves.
     * @return {Promise} - Promise for Template instance.
     */

    update: function () {
      var self = this;
      return exec('git remote', { cwd: self.path }).then(
        function (stdout) {
          if (stdout) {
            return exec('git remote update', { cwd: self.path });
          }
        }
      ).return(self);
    },

    /*
     * Delete the template.
     * @return {Promise} - Promise for Template instance.
     */

    remove: function () {
      return rimraf(this.path)
        .return(this);
    }

  }

  return Template;

}.call(this));
