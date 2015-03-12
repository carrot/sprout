require('colors')
W            = require 'when'
path         = require 'path'
pkg          = require '../package.json'
ArgParse     = require('argparse').ArgumentParser
EventEmitter = require('events').EventEmitter

###*
 * @class  CLI
 * @classdesc command line interface to sprout
###

class CLI

  ###*
   * Creates and sets up the argument parser, makes the event emitter through
   * which it returns all information publicy available.
   *
   * @param {Boolean} debug - if debug is true, arg parse errors throw rather
   *                          than exiting the process.
  ###

  constructor: (opts = {}) ->
    @emitter = new EventEmitter
    @parser = new ArgParse
      version: pkg.version
      description: pkg.description
      debug: opts.debug || false
    sub = @parser.addSubparsers()

    $add(sub)
    $remove(sub)
    $list(sub)
    $init(sub)

  ###*
   * Parses the arguments, runs the command
   *
   * @param {String|Array} args - a string or array of command line arguments
   * @return {Promise} a promise for the command's results
  ###

  run: (args) ->
    if typeof args is 'string' then args = args.split(' ')
    args = @parser.parseArgs(args)
    fn = require('./' + path.join('api/', args.fn))
    e = @emitter

    W.resolve(fn(args)).then (data) ->
      e.emit('data', data)
      data

  ###*
   * @private
  ###

  $add = (sub) ->
    s = sub.addParser 'add',
      aliases: ['install']
      help: 'Add a new template to sprout'

    s.addArgument ['name'],
      help: 'Name of the template you want to add'
    s.addArgument ['uri'],
      nargs: '?'
      help: 'A `git clone`-able url or local path to your template'

    s.setDefaults(fn: 'add')

  $remove = (sub) ->
    s = sub.addParser 'remove',
      aliases: ['delete', 'rm']
      help: 'Remove a template from sprout'

    s.addArgument ['name'],
      help: 'Name of the template you want to remove'

    s.setDefaults(fn: 'remove')

  $list = (sub) ->
    s = sub.addParser 'list',
      aliases: ['ls', 'all']
      help: 'List all installed sprout templates'

    s.setDefaults(fn: 'list', pretty: true)

  $init = (sub) ->
    s = sub.addParser 'init',
      aliases: ['new', 'create']
      help: 'Create a new sprout project from a template'

    s.addArgument ['name'],
      help: 'Name of the template you want to use'
    s.addArgument ['path'],
      nargs: '?'
      defaultValue: null
      help: 'Path where you want to create your project'
    s.addArgument ['--overrides', '-o'],
      nargs: '*'
      help: 'Space-separated override key-value pairs to be passed to the
      template'
    s.addArgument ['--defaults', '-d'],
      nargs: '*'
      help: 'Space-separated default key-value pairs to be passed to the
      template'

    s.setDefaults(fn: 'init')

module.exports = CLI
