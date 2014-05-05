fs    = require 'fs'
path  = require 'path'
Base  = require '../base'
ejs   = require 'ejs'

class Utils extends Base

  constructor: (@sprout) -> super

  read: (file, encoding = 'utf8') ->
    read_path = @full_path(file)
    fs.readFileSync(read_path, encoding) if fs.existsSync(read_path)

  write: (file, data) ->
    fs.writeFileSync @full_path(file), ejs.render(data, @sprout.ejs_options)

  remove: (file) ->
    remove_path = @full_path(file)
    fs.unlinkSync remove_path if fs.existsSync remove_path

  write_from: (file, dest, encoding = 'utf8') ->
    source_path = path.join @sprout.sprout_path, file
    data = fs.readFileSync source_path, encoding
    @write dest, data

  full_path: (file) ->
    path.join(@sprout.target, file)

module.exports = Utils
