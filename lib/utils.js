var Promise = require('bluebird')
  , fs = Promise.promisifyAll(require('fs'))
  , exec = Promise.promisify(require('child_process').exec)
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
    var self = this;

    // set proxy values of src and target
    this._src = src;
    this._target = target;


    /*
     * Copy a file from one path relative to the src, to another relative to the target
     * @param {String} from - the path to copy from, relative to the src.
     * @param {String} to - the path to copy to.
     * @return {Promise} - promise to copy
     */
    this.copy = function (from, to) {
      return copy(path.resolve(self._src, from), path.resolve(self._target, to));
    }


    this.src = {

      /*
       * Read a file, relative to the source.
       * @param {String} from - the path to read from, relative to the source.
       * @return {Promise} - a promise to return the file's content.
       */

      read: function (from) {
        return read(path.resolve(self._src, from));
      }

    },

    this.target = {

      /*
       * Copy a file from one path to another, relative
       * to the target.
       * @param {String} from - the path to copy from, relative to the target.
       * @param {String} to - the path to copy to relative to the target.
       * @return {Promise} - promise to copy
       */

      copy: function (from, to) {
        return copy(path.resolve(self._target, from), path.resolve(self._target, to));
      },

      /*
       * Read a file, relative to the target.
       * @param {String} from - the path to read from, relative to the target.
       * @return {Promise} - a promise to return the file's content.
       */

      read: function (from) {
        return read(path.resolve(self._target, from));
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
        return write(path.resolve(self._target, to), what, locals);
      },

      /*
       * Rename a file, relative to the target.
       * @param {String} from - the path to the file, relative to the target.
       * @param {String} to - the new path to the file, relative to the target.
       * @return {Promise} - a promise to rename the file.
       */

      rename: function (from, to) {
        return rename(path.resolve(self._target, from), path.resolve(self._target, to));
      },

      /*
       * Remove files, relative to the target.
       * @param {String[]} what - the path(s) to read from, relative to the target.
       * @return {Promise} -  a promise to remove the file
       */

      remove: function (what) {
        return remove(self._target, what);
      },

      /*
       * Execute a child process at the specified
       * working directory, relative to the target.
       * @param {String} cmd - the command to run.
       * @param {string} cwd - the working directory, relative to the target
       * @return {Promise} - a promise for the standard out.
       */

      exec: function (cmd, cwd) {
        return execute(cmd, cwd ? path.resolve(self._target, cwd) : self._target);
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
    return fs.readFileAsync(from).then(
      function (buffer) {
        return fs.writeFileAsync(to, buffer);
      }
    )
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
    return fs.writeFileAsync(to, content, 'utf8');
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
