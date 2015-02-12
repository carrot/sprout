which  = require 'which'
W      = require 'when'
nodefn = require 'when/node/function'
exec   = require('child_process').exec
Base   = require '../base'
fs     = require 'fs'
path   = require 'path'
rimraf = require 'rimraf'
url    = require 'url'
dns    = require 'dns'

class Add extends Base

  constructor: -> super

  execute: (opts) ->
    foo = 'wow'
    configure_options.call(@, opts).with(@)
      .then(determine_if_local)
      .then(ensure_local_template_exists)
      .then(check_internet_connection)
      .then(set_branch)
      .then(remove_existing_template)
      .then(link_project)
      .then(checkout_branch)
      .yield("template '#{@name}' added")

  ###*
   * @private
  ###

  configure_options = (opts) ->
    if not opts or not opts.name
      return W.reject(new Error('your template needs a name'))

    @name     = opts.name
    @template = opts.uri
    @local    = false

    if @name and not @template
      @template = @name
      @name = @template.split('/')[@template.split('/').length-1]

    W.resolve()

  ###*
   * If the template isn't an http or git url, set `@local` to true
  ###

  determine_if_local = ->
    url  = url.parse(@template)
    remote = url.pathname.split('.')[url.pathname.split('.').length-1] == 'git'
    if not remote
      @local = true
    W.resolve()

  ###*
   * If a local template was passed, we need to make sure it exists
  ###

  ensure_local_template_exists = ->
    if not @local then return W.resolve()
    if not which.sync('git')
      return W.reject(new Error('you need to have git installed'))

    if not fs.existsSync(path.normalize(@template))
      return W.reject(
        new Error("there is no sprout template located at '#{@template}'")
      )

  ###*
   * The most legitimate way to find out if someone is connected to the
   * internetz, backed by a 5 year money-back guarantee!
  ###

  check_internet_connection = ->
    if @local then return W.resolve()

    try
      nodefn.call(dns.resolve, 'google.com')
      .catch(-> throw new Error('make that you are connected to the internet!'))
    catch e
      console.log 'caught'
      console.log(e)

  ###*
   * If a branch was passed via hash (github.com/foo/bar#some-branch), extract
   * it and save to a local variable, then remove it from the template uri
  ###

  set_branch = ->
    if @local then return W.resolve()
    @branch = null
    branch_matcher = /#(.*)$/
    if @template.match(branch_matcher)
      @branch = "#{@template.match(branch_matcher)[1]}"
      @template = @template.replace(branch_matcher, '')
    W.resolve()

  ###*
   * If there was a template already there, get rid of it because we're about
   * to update it with a new version.
  ###

  remove_existing_template = ->
    if not @no_internet then nodefn.call(rimraf, @path(@name))

  ###*
   * Link up the template to the right spot, whether this is locally or through
   * a git clone.
  ###

  link_project = ->
    cmd = "git clone #{@template} #{@path(@name)}"
    if @local
      cmd = "rm -rf #{@path(@name)} && ln -s #{@template} #{@path(@name)}"
    if not @no_internet then nodefn.call(exec, cmd)

  ###*
   * If there was a branch provided, check it out.
  ###

  checkout_branch = ->
    if not @branch then return W.resolve()
    nodefn.call(exec, "git checkout #{@branch}", {cwd: @path(@name)})

module.exports = (opts) ->
  (new Add()).execute(opts)
