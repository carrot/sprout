which  = require 'which'
W      = require 'when'
nodefn = require 'when/node/function'
exec   = require('child_process').exec
Base   = require '../base'
fs     = require 'fs'
path   = require 'path'
rimraf = require 'rimraf'
url    = require 'url'

class Add extends Base

  constructor: -> super

  execute: (opts) ->
    configure_options.call(@, opts).with(@)
      .then(determine_if_local)
      .then(ensure_local_template_exists)
      .then(set_branch)
      .then(remove_existing_template)
      .then(link_project)
      .then(checkout_branch)
      .yield("template '#{@name}' added")

  # @api private

  configure_options = (opts) ->
    if not opts or not opts.name
      return W.reject('your template needs a name!')

    @name     = opts.name
    @template = opts.uri
    @local    = false

    if @name and not @template
      @template = @name
      @name = @template.split('/')[@template.split('/').length-1]

    W.resolve()

  determine_if_local = ->
    # set @local to true if @template isn't an http or git url
    url  = url.parse(@template)
    remote = url.pathname.split('.')[url.pathname.split('.').length-1] == 'git'
    if not remote
      @local = true
    W.resolve()

  ensure_local_template_exists = ->
    if not @local then return W.resolve()
    if not which.sync('git')
      return W.reject('you need to have git installed')

    if not fs.existsSync(path.normalize(@template))
      return W.reject("there is no sprout template located at '#{@template}'")

  set_branch = ->
    if @local then return W.resolve()
    @branch = null
    branch_matcher = /#(.*)$/
    if @template.match(branch_matcher)
      @branch = "#{@template.match(branch_matcher)[1]}"
      @template = @template.replace(branch_matcher, '')
    W.resolve()

  remove_existing_template = ->
    nodefn.call(rimraf, @path(@name))

  link_project = ->
    cmd = "git clone #{@template} #{@path(@name)}"
    if @local then cmd = "rm -rf #{@path(@name)} && ln -s #{@template} #{@path(@name)}"
    nodefn.call(exec, cmd)

  checkout_branch = ->
    if not @branch then return W.resolve()
    nodefn.call(exec, "git checkout #{@branch}", {cwd: @path(@name)})

module.exports = (opts) ->
  (new Add()).execute(opts)
