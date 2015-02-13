path     = require 'path'
fs       = require 'fs'
W        = require 'when'
nodefn   = require 'when/node'
nodecb   = require 'when/callbacks'
readdirp = require 'readdirp'
ncp      = require('ncp').ncp
exec     = require('child_process').exec
ejs      = require 'ejs'
inquirer = require 'inquirer'
Base     = require '../base'
S        = require 'underscore.string'
_        = require 'lodash'
dns      = require 'dns'

class Init extends Base

  constructor: -> super

  execute: (opts) ->
    configure_options.call(@, opts).with(@)
      .then(install_template_dependencies)
      .then(get_user_init_file)
      .then(run_user_before_function)
      .then(remove_overrides_from_prompt)
      .then(add_defaults_to_questions)
      .then(prompt_user_for_answers)
      .then(merge_config_values_with_overrides)
      .then(check_internet_connection)
      .then(ensure_template_is_updated)
      .then(checkout_version)
      .then(copy_template)
      .then(run_user_before_render_function)
      .then(replace_ejs)
      .then(run_user_after_function)
      .then(-> "project created at '#{@target}'!")

  # intended for use in the after function, quick way to remove
  # files/folders that users wanted to nix after the prompts.
  # TODO: this should be refactored out into a separate utils module
  remove: (f) ->
    fs.unlinkSync(path.resolve(@target, f))

  ###*
   * @private
  ###

  configure_options = (opts) ->
    if not opts or not opts.name
      return W.reject(new Error('your template needs a name!'))

    # perhaps name should be template?
    @name        = opts.name
    @target      = opts.path
    @overrides   = opts.overrides || []
    @defaults    = opts.defaults
    @answers     = {}
    @version     = parse_version(@name) or ''

    # if we have a version, remove it and the @ from the name
    if @version.length then @name = @name.replace(@version, '').slice(0,-1)

    @sprout_path = @path(@name)

    # transform overrides paired array to object
    if Array.isArray(@overrides)
      @overrides = @overrides.reduce (m, v, i) =>
        (if i % 2 == 0 then m[v] = @overrides[i+1]); m
      , {}

    if not fs.existsSync(@sprout_path)
      return W.reject(new Error("template '#{@name}' does not exist"))

    if not @target then @target = path.join(process.cwd(), @name)

    W.resolve()

  parse_version = (name) ->
    match = name.match(/@+([^@]*)$/)
    if match then match[1] else false

  install_template_dependencies = ->
    p = path.join(@sprout_path, 'package.json')
    if fs.existsSync(p) then nodefn.call(exec, "npm install", cwd: @sprout_path)

  get_user_init_file = ->
    init_file = path.join(@sprout_path, 'init.coffee')
    if not fs.existsSync(init_file) then return @config = {}
    @config = require(init_file)

  run_user_before_function = ->
    if not @config.before then return W.resolve()
    nodefn.call(@config.before, @)

  remove_overrides_from_prompt = ->
    keys = _.keys(@overrides)
    @questions = _.reject(@config.configure, (v) -> _.contains(keys, v.name) )

  add_defaults_to_questions = ->
    if not @defaults then return

    for q, i in @questions
      if val = _.find(@defaults, (v,k) -> k == q.name)
        @questions[i].default = val

  prompt_user_for_answers = ->
    if not @questions.length then return W.resolve()
    nodecb.call(inquirer.prompt, @questions)
      .then((o) => @answers = o)

  merge_config_values_with_overrides = ->
    @config_values = _.assign(@answers, @overrides)

  check_internet_connection = ->
    nodefn.call(dns.resolve, 'google.com')
      .then(-> true).catch(-> false)

  ensure_template_is_updated = (internet) ->
    if not internet then return W.resolve()
    nodefn.call(exec, "git pull", cwd: @sprout_path)
      .catch(-> return W.resolve())

  checkout_version = ->
    nodefn.call(exec, "git tag -l", cwd: @sprout_path)
    .then (res) =>
      versions = _.compact(res[0].split('\n'))

      # if no tags, dont check out anything, just use most recent commit
      if not versions.length then return W.resolve()

      # if no version, use the most recent tag
      if not @version.length
        cmd = "git checkout tags/#{versions[versions.length-1]}"
        return nodefn.call(exec, cmd, cwd: @sprout_path)

      # if version provided, check that out
      if @version in versions
        cmd = "git checkout tags/#{@version}"
        return nodefn.call(exec, cmd, cwd: @sprout_path)

      # if the leading 'v' was omitted, its ok
      if "v#{@version}" in versions
        cmd = "git checkout tags/v#{@version}"
        return nodefn.call(exec, cmd, cwd: @sprout_path)

      # otherwise, invalid version
      W.reject(new Error('version does not exist'))

  copy_template = ->
    root_path = path.join(@sprout_path, 'root')
    if not fs.existsSync(root_path)
      return W.reject(new Error('template does not contain root directory'))
    nodefn.call(ncp, root_path, @target)

  run_user_before_render_function = ->
    if not @config.before_render then return W.resolve()
    nodefn.call(@config.before_render, @)

  replace_ejs = ->
    nodefn.call(readdirp, { root: @target })
      .tap (res) =>
        ejs_options = _.extend(@config_values, {S: S})
        res.files.map (f) ->
          out = ejs.render(fs.readFileSync(f.fullPath, 'utf8'), ejs_options)
          fs.writeFileSync(f.fullPath, out)

  run_user_after_function = ->
    if not @config.after then return W.resolve()
    nodefn.call(@config.after, @)

module.exports = (opts) ->
  (new Init()).execute(opts)
