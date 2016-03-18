import Template from './template'
import {EventEmitter} from 'events'
import fs from 'fs'
import path from 'path'
import api from './api'

/*
 * Given a base path, returns a Sprout instance.
 * @param {String} basePath - Path to directory containing Sprout templates.
 * @return {Function} - Sprout instance.
 */
class Sprout extends EventEmitter {

  constructor (basePath) {
    super()
    this.templates = {}
    this.path = basePath

    try { fs.accessSync(this.path) } catch (err) {
      throw new Error(`${this.path} does not exist`)
    }

    if (!fs.lstatSync(this.path).isDirectory()) {
      throw new Error(`${this.path} is not a directory`)
    }

    fs.readdirSync(this.path).map((name) => {
      const lstat = fs.lstatSync(path.join(this.path, name))
      if (lstat.isDirectory() || lstat.isSymbolicLink()) {
        this.templates[name] = new Template(this, name)
      }
    })
  }

  /*
   * Create a new template.
   * @param {String} name - name to save template as.
   * @param {String} src - path or URL to template source.
   * @return {Promise} - Promise for Sprout instance.
   */
  add (name, src) {
    return api.add(this, name, src).yield(this)
  }

  /*
   * Remove a template.
   * @param {String} name - name of template to remove.
   * @return {Promise} - Promise for Sprout instance.
   */
  remove (name) {
    return api.remove(this, name).yield(this)
  }

  /*
   * Initialize an existing template at a
   * given target path.
   * @param {String} name - name of template to initialize.
   * @param {String} target - The path to save the template to.
   * @param {Object} options - Initialization options.
   * @return {Promise} - Promise for Sprout instance.
   */
  init (name, target, options) {
    return api.init(this, name, target, options).yield(this)
  }

  /*
   * Run a generator in an existing template
   * given the target path and generator name.
   * @param {String} name - name of template to run generator from.
   * @param {String} target - The path of the existing instance.
   * @param {String} generator - The generator to use.
   * @param {Array} args - An array of arguments to pass to the generator.
   * @return {Promise} - Promise for Sprout instance.
   */
  run (name, target, generator, args) {
    return api.run(this, name, target, generator, args).yield(this)
  }
}

module.exports = Sprout
