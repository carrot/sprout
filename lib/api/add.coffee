which = require 'which'
W = require 'when'
nodefn = require 'when/node/function'
exec = require('child_process').exec
Base = require '../base'

class Add extends Base

  constructor: -> super

  execute: (opts) ->
    configure_options.call(@, opts).with(@)
      .then(link_project)
      .then(=> if @branch then nodefn.call(exec, "cd #{@path(@name)}; git checkout #{@branch}"))
      .yield("template '#{@name}' added")

  # @api private

  configure_options = (opts) ->
    if not opts then return W.reject('your template needs a name!')
    @name = opts.name
    @template = opts.template
    @options = opts.options || {}

    if not @name then return W.reject('your template needs a name!')
    if not which.sync('git') then return W.reject('you need to have git installed')

    if @name and not @template
      @template = @name
      @name = @template.split('/')[@template.split('/').length-1]

    @branch = null
    branch_matcher = /#(.*)$/
    if @template.match(branch_matcher)
      @branch = "#{@template.match(branch_matcher)[1]}"
      @template = @template.replace(branch_matcher, '')

    W.resolve()


  link_project = ->
    nodefn.call(exec, "git clone #{@template} #{@path(@name)}")
    # nodefn.call(exec, "rm -rf #{@path(@name)}; ln -s #{@template} #{@path(@name)}")


module.exports = (opts) ->
  (new Add()).execute(opts)
