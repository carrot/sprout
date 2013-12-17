rimraf = require 'rimraf'
Base = require '../base'
nodefn = require 'when/node/function'

class Remove extends Base

  constructor: -> super

  execute: (name) ->
    nodefn.call(rimraf, @path(name))
      .yield("template '#{name}' removed")

module.exports = (name) ->
  (new Remove()).execute(name)
