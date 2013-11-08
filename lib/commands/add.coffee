require 'shelljs/global'
exec = require('child_process').exec
Base = require '../base'

class Add extends Base

  constructor: (name, url, done) ->
    super

    if not name then return 'your template needs a name!'
    if typeof name == 'function' then return name('your template needs a name!')
    if name and typeof url == 'function'
      done = url
      url = null
    if not which('git') then return done('you need to have git installed')

    if name and not url
      @url = name
      @name = @url.split('/')[@url.split('/').length-1]
    else
      @name = name
      @url = url

    @done = done

  execute: ->
    error = null
    exec "git clone #{@url} #{@path(@name)}", (err, stdout, stderr) =>
      if err and err.code > 0
        str = err.toString()
        if str.match /already exists and is not an empty directory/
          error = 'a template with this name already exists'
        else if str.match /repository .* does not exist/
          error = "cannot find repository at url \"#{@url}\""
        else
          error = str

      @done(error, "added template \"#{@name}\"".green)

module.exports = (name, url, cb) ->
  cmd = new Add(name, url, cb)
  if cmd.done then cmd.execute()
