import Promise from 'bluebird'

/*
 * Run a generator in an existing template
 * given the target path and generator name.
 * @param {Function} sprout - Sprout instance.
 * @param {String} name - name of template to run generator from.
 * @param {String} target - The path of the existing instance.
 * @param {String} generator - The generator to use.
 * @param {Array} args - An array of arguments to pass to the generator.
 * @return {Promise} - Promise for Template instance.
 */
export default function (sprout, name, target, generator, args) {
  const template = sprout.templates[name]
  if (template) { return template.run(target, generator, args) }
  return Promise.reject(new Error(`template ${name} does not exist`))
}
