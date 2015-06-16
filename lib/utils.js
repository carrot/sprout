var Promise = require('bluebird')
  , fs = Promise.promisifyAll(require('fs'))
  , exec = Promise.promisify(require('child_process').exec)
  , ncp = Promise.promisify(require('ncp').ncp)
  , mkdirp = Promise.promisify(require('mkdirp'))
  , ejs = require('ejs')
  , path = require('path')
  , _ = require('lodash')
  , underscoreString = require('underscore.string');

module.exports = (function () {

  /*
   * Given a source path and a target path,
   * returns a Utils instance.
   * @param {String} src - The template source path.
   * @param {String} target - The template destination path.
   * @return {Function} - Template instance.
   */

  var Utils = function (src, target) {

    /*
     * Copy a file from one path relative to the src, to another relative to the target
     * @param {String} from - the path to copy from, relative to the src.
     * @param {String} to - the path to copy to.
     * @return {Promise} - promise to copy
     */

    this.copy = function (from, to) {
      return copy(path.resolve(src, from), path.resolve(target, to));
    }


    this.src = {

      /*
       * The source path.
       */

      path: _.clone(src),

      /*
       * Read a file, relative to the source.
       * @param {String} from - the path to read from, relative to the source.
       * @return {Promise} - a promise to return the file's content.
       */

      read: function (from) {
        return read(path.resolve(src, from));
      }

    },

    this.target = {

      /*
       * The target path.
       */

      path: _.clone(target),

      /*
       * Copy a file from one path to another, relative
       * to the target.
       * @param {String} from - the path to copy from, relative to the target.
       * @param {String} to - the path to copy to relative to the target.
       * @return {Promise} - promise to copy
       */

      copy: function (from, to) {
        return copy(path.resolve(target, from), path.resolve(target, to));
      },

      /*
       * Read a file, relative to the target.
       * @param {String} from - the path to read from, relative to the target.
       * @return {Promise} - a promise to return the file's content.
       */

      read: function (from) {
        return read(path.resolve(target, from));
      },

      /*
       * Write a file to a path, optionally with ejs locals,
       * relative to the target.
       * @param {String} to - the path to write to, relative to the target.
       * @param {String} what - the content to write, relative to the target.
       * @param {Object} locals - object to pass as locals to ejs.
       * @return {String} - the contents of the file.
       */

      write: function (to, what, locals) {
        return write(path.resolve(target, to), what, locals);
      },

      /*
       * Rename a file, relative to the target.
       * @param {String} from - the path to the file, relative to the target.
       * @param {String} to - the new path to the file, relative to the target.
       * @return {Promise} - a promise to rename the file.
       */

      rename: function (from, to) {
        return rename(path.resolve(target, from), path.resolve(target, to));
      },

      /*
       * Remove files, relative to the target.
       * @param {String[]} what - the path(s) to read from, relative to the target.
       * @return {Promise} -  a promise to remove the file
       */

      remove: function (what) {
        return remove(target, what);
      },

      /*
       * Execute a child process at the specified
       * working directory, relative to the target.
       * @param {String} cmd - the command to run.
       * @param {string} cwd - the working directory, relative to the target
       * @return {Promise} - a promise for the standard out.
       */

      exec: function (cmd, cwd) {
        return execute(cmd, cwd ? path.resolve(target, cwd) : target);
      }

    }

  }

  /*
   * Copy a file from one path to another.
   * @param {String} from - the path to copy from.
   * @param {String} to - the path to copy to.
   * @return {Promise} - promise to copy
   */

  function copy (from, to) {
    return ncp(from, to);
  }

  /*
   * Read a file.
   * @param {String} from - the path to read from.
   * @return {Promise} - a promise to return the file's content.
   */

  function read (from) {
    return fs.readFileAsync(from, 'utf8');
  }

  /*
   * Write a file to a path, optionally with ejs locals.
   * @param {String} to - the path to write to.
   * @param {String} what - the content to write.
   * @param {Object} locals - object to pass as locals to ejs.
   * @return {String} - the contents of the file.
   */

  function write (to, what, locals) {
    var content = ejs.render(what, _.extend({}, (locals || {}), {S: underscoreString}));
    return mkdirp(path.dirname(to)).then(
      function () {
        return fs.writeFileAsync(to, content, 'utf8');
      }
    );
  }

  /*
   * Rename a file.
   * @param {String} from - the path to the file.
   * @param {String} to - the new path to the file.
   * @return {Promise} - a promise to rename the file.
   */

  function rename (from, to) {
    return fs.renameAsync(from, to);
  }

  /*
   * Remove files.
   * @param {String} from - base path to resolve.
   * @param {String[]} what - the path(s) to remove.
   * @return {Promise} -  a promise to remove the file
   */

  function remove (from, what) {
    if (!_.isArray(what)) what = [what];
    return Promise.map(what,
      function (p) {
        return fs.unlinkSync(path.resolve(from, p));
      }
    )
  }

  /*
   * Execute a child process at the specified
   * working directory.
   * @param {String} cmd - the command to run.
   * @param {string} cwd - the working directory
   * @return {Promise} - a promise for the standard out.
   */

  function execute (cmd, cwd) {
    return exec(cmd, { cwd: cwd });
  }

  return Utils;

}.call(this));
