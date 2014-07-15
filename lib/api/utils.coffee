fs    = require 'fs'
path  = require 'path'
Base  = require '../base'
ejs   = require 'ejs'
_     = require 'lodash'

class Utils extends Base

  constructor: (@sprout) -> super

  read: (base_path, encoding = 'utf8') ->
    read_path = @full_path base_path
    fs.readFileSync(read_path, encoding) if fs.existsSync(read_path)

  write: (base_path, src) ->
    fs.writeFileSync @full_path(base_path), ejs.render(src, @sprout.ejs_options)

  rename: (source_path, destination_path) ->
    fs.renameSync @full_path(source_path), @full_path(destination_path)

  remove: (base_path) ->
    remove_path = @full_path(base_path)
    fs.unlinkSync remove_path if fs.existsSync remove_path

  configure: (config) ->
    @sprout.config_values = _.extend @sprout.config_values, config

  full_path: (file) ->
    path.resolve @sprout.target, file

module.exports = Utils
