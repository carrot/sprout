fs     = require 'fs'
W      = require 'when'
rimraf = require 'rimraf'
Base   = require '../base'
nodefn = require 'when/node/function'

class Remove extends Base

  constructor: -> super

  execute: (opts) ->
    if not opts
      return W.reject("you must pass the name of a template to remove")

    if not fs.existsSync(@path(opts.name))
      return W.reject("template #{opts.name} does not exist")

    nodefn.call(rimraf, @path(opts.name))
      .yield("template '#{opts.name}' removed")

module.exports = (opts) ->
  (new Remove()).execute(opts)
