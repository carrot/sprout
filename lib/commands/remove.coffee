rimraf = require 'rimraf'
Base = require '../base'
accord = require '../utils/accord'

class Remove extends Base

  constructor: (name, opts, cb) ->
    super
    accord.call(@, { name: name, options: opts, cb: cb })
    if typeof @name == 'function' then return @name('what do you want to remove?')
    @done = @cb

  execute: ->
    rimraf @path(@name), (err) =>
      @done(err, "removed template \"#{@name}\"".green)

module.exports = (name, opts, cb) ->
  cmd = new Remove(name, opts, cb)
  if cmd.done then cmd.execute()
