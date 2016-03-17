var Promise = require('bluebird')

/*
 * Remove a template.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - name of template to remove.
 * @return {Promise} - Promise for Template instance.
 */

module.exports = function (sprout, name) {
  var template = sprout.templates[name]
  if (template) {
    return template.remove().then(
      function () {
        delete sprout.templates[name]
      }
    )
  }
  return Promise.reject(new Error('template ' + name + ' does not exist'))
}
