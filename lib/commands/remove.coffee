rimraf = require 'rimraf'
Base = require '../base'

class Remove extends Base

  constructor: (@name, done) ->
    super
    if typeof @name == 'function' then return @name('what do you want to remove?')
    @done = done

  execute: ->
    rimraf @path(@name), (err) =>
      @done(err, "removed template \"#{@name}\"".green)

module.exports = (name, cb) ->
  cmd = new Remove(name, cb)
  if cmd.done then cmd.execute()
