import W from 'when'

/*
 * Initialize an existing template at a
 * given target path.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - name of template to initialize.
 * @param {String} target - The path to save the template to.
 * @return {Promise} - Promise for Template instance.
 */
export default function (sprout, name, target, options) {
  const template = sprout.templates[name]
  if (template) { return template.init(target, options) }
  return W.reject(new Error(`template ${name} does not exist`))
}
