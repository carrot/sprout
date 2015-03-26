var Template = require('./../template');

module.exports = (function () {

  /*
   * Create a new template.
   * @param {Function} sprout - Sprout instance.
   * @param {String} name - name to save template as.
   * @param {String} src - path or URL to template source.
   * @return {Promise} - Promise for Template instance.
   */

  return function (sprout, name, src) {
    var template = new Template(sprout, name, src);
    return template.save().then(
      function (template) {
        sprout.templates[name] = template;
      }
    )
  }

}.call(this));
