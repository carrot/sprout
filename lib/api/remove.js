import W from 'when'

/*
 * Remove a template.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - name of template to remove.
 * @return {Promise} - Promise for Template instance.
 */
export default function (sprout, name) {
  const template = sprout.templates[name]
  if (template) {
    return template.remove().then((_) => delete sprout.templates[name])
  }
  return W.reject(new Error(`template ${name} does not exist`))
}
