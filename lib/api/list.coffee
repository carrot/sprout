fs   = require 'fs'
Base = require '../base'

class List extends Base

  constructor: (opts) ->
    super
    if opts
      if opts.pretty then @pretty = true

  execute: ->
    list = fs.readdirSync(@path())
    if @pretty
      plist = "\n"
      plist += "Templates\n".bold.blue
      plist += "---------\n".bold.blue
      if list.length
        plist += "\n- #{item}" for item in list
      else
        plist += '\nno templates present'
      plist += "\n"
      return plist
    return list

module.exports = (opts) ->
  cmd = new List(opts)
  cmd.execute()

module.exports.sync = true
