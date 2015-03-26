var Template = require('./../template')
  , Promise = require('bluebird');

module.exports = (function () {

  /*
   * Initialize an existing template at a
   * given target path.
   * @param {Function} sprout - Sprout instance.
   * @param {String} name - name of template to initialize.
   * @param {String} target - The path to save the template to.
   * @return {Promise} - Promise for Template instance.
   */

  return function (sprout, name, target, options) {
    var template = sprout.templates[name];
    if (template) return template.init(target, options);
    return Promise.reject(new Error('template ' + name + ' does not exist'));
  }

}.call(this));
