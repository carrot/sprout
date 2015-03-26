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

    /*
     * Read a file from the source.
     * @param {String} from - the path to read from, relative to the source.
     * @return {String} - the contents of the file.
     */

    this.read = function (from) {
      return fs.readFileAsync(path.resolve(src, from), 'utf8');
    };

    /*
     * Write a file to a path in the target, optionally
     * with ejs locals.
     * @param {String} to - the path to write to, relative to the source.
     * @param {String} what - the content to write.
     * @param {Object} locals - object to pass as locals to ejs.
     * @return {String} - the contents of the file.
     */

    this.write = function (to, what, locals) {
      var content = ejs.render(what, _.extend({}, (locals || {}), {S: underscoreString}));
      return fs.writeFileAsync(path.resolve(target, to), content, 'utf8');
    };

    /*
     * Rename a file in the target.
     * @param {String} from - the path to read from, relative to the source.
     * @return {String} - the contents of the file.
     */

    this.rename = function (from, to) {
      return fs.renameAsync(path.resolve(target, from), path.resolve(target, to));
    };

    /*
     * Remove files in the target.
     * @param {String[]} what - the path(s) to read from, relative to the source.
     * @return {String} - the contents of the file.
     */

    this.remove = function (what) {
      if (!_.isArray(what)) what = [what];
      return Promise.map(what,
        function (p) {
          return fs.unlinkSync(path.join(target, p));
        }
      )
    }

    /*
     * Execute a child process, with the current working
     * directory set to the target.
     * @param {String} cmd - the command to run.
     * @return {Array} - the standard out.
     */

    this.exec = function (cmd) {
      return exec(cmd, { cwd: target });
    }

  }

  return Utils;

}.call(this));
