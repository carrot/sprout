which = require 'which'
exec = require('child_process').exec
Base = require '../base'
accord = require '../utils/accord'

class Add extends Base

  constructor: (name, url, opts, cb) ->
    super
    accord.call(@, { name: name, url: url, options: opts, cb: cb })

    if not @name then return @cb('your template needs a name!')
    if not which.sync('git') then return @cb('you need to have git installed')

    if @name and not @url
      @url = @name
      @name = @url.split('/')[@url.split('/').length-1]

    @branch = ''
    branch_matcher = /#(.*)$/
    if @url.match(branch_matcher)
      @branch = "-b #{@url.match(branch_matcher)[1]}"
      @url = @url.replace(branch_matcher, '')

    @done = @cb

  execute: ->
    error = null
    exec "git clone #{@branch} #{@url} #{@path(@name)}", (err) =>
      if err and err.code > 0
        str = err.toString()
        if str.match /already exists and is not an empty directory/
          error = 'a template with this name already exists'
        else if str.match /repository .* does not exist/
          error = "cannot find repository at url \"#{@url}\""
        else
          error = str

      @done(error, "added template \"#{@name}\"".green)

module.exports = (name, url, opts, cb) ->
  cmd = new Add(name, url, opts, cb)
  if cmd.done then cmd.execute()
