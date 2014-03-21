which = require 'which'
W = require 'when'
nodefn = require 'when/node/function'
exec = require('child_process').exec
Base = require '../base'
fs = require 'fs'
path = require 'path'
url = require 'url'

class Add extends Base

  constructor: -> super

  execute: (opts) ->
    configure_options.call(@, opts).with(@)
      .then(determine_if_local)
      .then(assure_local_template_exists)
      .then(set_branch)
      .then(link_project)
      .then(=> if @branch then nodefn.call(exec, "cd #{@path(@name)}; git checkout #{@branch}"))
      .yield("template '#{@name}' added")

  # @api private

  configure_options = (opts) ->
    if not opts then return W.reject('your template needs a name!')
    @name = opts.name
    @template = opts.template
    @options = opts.options || {}
    @local = false

    if not @name then return W.reject('your template needs a name!')
    if not which.sync('git') then return W.reject('you need to have git installed')

    if @name and not @template
      @template = @name
      @name = @template.split('/')[@template.split('/').length-1]
    W.resolve()

  determine_if_local = ->
    # set @local to true if @template isn't an http or git url
    url  = url.parse(@template)
    test = url.pathname.split('.')[url.pathname.split('.').length-1] == 'git'
    if not test
      @local = true
    W.resolve()

  assure_local_template_exists = ->
    if not @local then return W.resolve()

    test = fs.existsSync(path.normalize(@template))
    if not test then return W.reject("there is no sprout template located at '#{@template}'")
    W.resolve()

  set_branch = ->
    if @local then return W.resolve()
    @branch = null
    branch_matcher = /#(.*)$/
    if @template.match(branch_matcher)
      @branch = "#{@template.match(branch_matcher)[1]}"
      @template = @template.replace(branch_matcher, '')
    W.resolve()

  link_project = ->
    if @local
      nodefn.call(exec, "rm -rf #{@path(@name)}; ln -s #{@template} #{@path(@name)}")
    else
      nodefn.call(exec, "git clone #{@template} #{@path(@name)}")


module.exports = (opts) ->
  (new Add()).execute(opts)
