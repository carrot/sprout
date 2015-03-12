var Template = require('./../template')
  , Promise = require('bluebird');

module.exports = (function () {

  /*
   * Update a template.
   * @param {Function} sprout - Sprout instance.
   * @param {String} name - name of template to update.
   * @return {Promise} - Promise for Sprout instance.
   */

  return function (sprout, name) {
    var template = sprout.templates[name];
    if (template) return template.update();
    return Promise.reject(new Error('template ' + name + ' does not exist'));
  }

}.call(this));
