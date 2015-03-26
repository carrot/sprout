var Promise = require('bluebird')
  , fs = Promise.promisifyAll(require('fs'))
  , path = require('path')
  , _ = require('lodash');

module.exports = (function () {

  /*
   * Given a target path, returns a ConfigFile instance.
   * @param {String} target - the target path
   * @return {Function} - ConfigFile instance.
   */

  var ConfigFile = function (target, defaults) {
    var lstat;
    if (!fs.existsSync(target)) {
      throw new Error(target + ' does not exist');
    } else {
      lstat = fs.lstatSync(target);
      if (!lstat.isDirectory()) {
        throw new Error(target + ' is not a directory');
      }
    }
    this.path = path.join(target, '.sproutrc');
    this.config = _.extend({}, defaults);
  }

  ConfigFile.prototype = {

    /*
     * Read `configFile.path`
     * @return {Promise} - a promise which returns the read configuration.
     */

    read: function () {
      var self = this;
      return new Promise(
        function (resolve, reject) {

          /*
           * If the config file exists, read it and
           * resolve with the parsed output. if the
           * file doesn't exist, simply resolve with
           * the existing configuration.
           */

          if (fs.existsSync(self.path)) {
            return fs.readFileAsync(self.path, 'utf8').then(
              function (output) {
                self.config = JSON.parse(output);
                return resolve(self.config);
              }
            )
          } else {
            return resolve(self.config);
          }

        }
      );
    },

    /*
     * Write `configFile.path` with the JSON
     * set in `configFile.config`.
     * @return {Promise} - a promise which returns the configuration.
     */

    write: function () {
      return fs.writeFileAsync(this.path, JSON.stringify(this.config))
        .return(this.config);
    }

  }

  return ConfigFile;

}.call(this));
