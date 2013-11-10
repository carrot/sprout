path = require 'path'
fs = require 'fs'
ncp = require('ncp').ncp
Base = require '../base'

class Init extends Base

  constructor: (@name, @target, cb) ->
    super
    if typeof @name == 'function' then return @name('please provide a template name')
    if @name and typeof @target == 'function'
      cb = @target
      @target = path.join(process.cwd(), @name)

    @cb = cb

  execute: ->
    error = null
    if not fs.existsSync(@path(@name)) then return @cb('template does not exist')

    ncp path.join(@path(@name), 'root'), @target, (err) =>
      if err then error = err
      @cb(error, "project #{@name} created!")

module.exports = (name, p, cb) ->
  cmd = new Init(name, p, cb)
  if cmd.cb then cmd.execute()
