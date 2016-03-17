import Template from '../template'

/*
 * Create a new template.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - name to save template as.
 * @param {String} src - path or URL to template source.
 * @return {Promise} - Promise for Template instance.
 */
export default function (sprout, name, src) {
  const template = new Template(sprout, name, src)
  return template.save().then((template) => {
    sprout.templates[name] = template
  })
}
