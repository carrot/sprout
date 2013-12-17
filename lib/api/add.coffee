which = require 'which'
W = require 'when'
nodefn = require 'when/node/function'
exec = require('child_process').exec
Base = require '../base'

class Add extends Base

  constructor: -> super

  execute: (opts) ->
    configure_options.call(@, opts)
      .then(nodefn.lift(exec, "git clone #{@url} #{@path(@name)}"))
      .then(=> if @branch then nodefn.call(exec, "cd #{@path(@name)}; git checkout #{@branch}"))
      .yield("template '#{@name}' added")

  # @api private
  
  configure_options = (opts) ->
    if not opts then return W.reject('your template needs a name!')
    @name = opts.name
    @url = opts.url

    if not @name then return W.reject('your template needs a name!')
    if not which.sync('git') then return W.reject('you need to have git installed')

    if @name and not @url
      @url = @name
      @name = @url.split('/')[@url.split('/').length-1]

    @branch = null
    branch_matcher = /#(.*)$/
    if @url.match(branch_matcher)
      @branch = "#{@url.match(branch_matcher)[1]}"
      @url = @url.replace(branch_matcher, '')

    W.resolve()

module.exports = (opts) ->
  (new Add()).execute(opts)
