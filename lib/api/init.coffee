path = require 'path'
fs = require 'fs'
W = require 'when'
nodefn = require 'when/node/function'
nodecb = require 'when/callbacks'
readdirp = require 'readdirp'
ncp = require('ncp').ncp
exec = require('child_process').exec
ejs = require 'ejs'
inquirer = require 'inquirer'
Base = require '../base'
S = require 'string'
_ = require 'lodash'

class Init extends Base

  constructor: -> super

  execute: (opts) ->

    configure_options.call(@, opts).with(@)
      .then(get_user_init_file)
      .then(run_user_before_function)
      .then(remove_overrides_from_prompt)
      .then(prompt_user_for_answers)
      .then(merge_config_values_with_overrides)
      .then(ensure_template_is_updated)
      .then(copy_template)
      .then(replace_ejs)
      .then(run_user_after_function)
      .yield("project created at '#{@target}'!")

  # intended for use in the after function, quick way to remove
  # files/folders that users wanted to nix after the prompts.
  remove: (f) ->
    fs.unlinkSync(path.resolve(@target, f))

  #
  # @api private
  #

  configure_options = (opts) ->
    if not opts or not opts.name
      return W.reject('your template needs a name!')

    @name        = opts.name
    @target      = opts.path
    @options     = opts.options
    @sprout_path = @path(@name)

    if not fs.existsSync(@sprout_path)
      return W.reject("template '#{@name}' does not exist")

    if not @target then @target = path.join(process.cwd(), @name)

    W.resolve()

  get_user_init_file = ->
    init_file = path.join(@sprout_path, 'init.coffee')
    if not fs.existsSync(init_file) then return @config = {}
    @config = require(init_file)

  run_user_before_function = ->
    if not @config.before then return W.resolve()
    nodefn.call(@config.before, @)

  remove_overrides_from_prompt = ->
    keys = _.keys(@options)
    @questions = _.reject(@config.configure, (v) -> _.contains(keys, v.name) )

  prompt_user_for_answers = ->
    @answers = {}
    if not @questions.length then return W.resolve()
    nodecb.call(inquirer.prompt, @questions)
      .then((o) => @answers = o)

  merge_config_values_with_overrides = ->
    @config_values = _.assign(@answers, @options)

  ensure_template_is_updated = ->
    nodefn.call(exec, "cd #{@sprout_path} && git pull")
      .catch(-> return W.resolve())

  copy_template = ->
    nodefn.call(ncp, path.join(@sprout_path, 'root'), @target)

  replace_ejs = ->
    nodefn.call(readdirp, { root: @target })
      .tap (res) =>
        ejs_options = _.extend(@config_values, {S: S})
        res.files.map (f) =>
          out = ejs.render(fs.readFileSync(f.fullPath, 'utf8'), ejs_options)
          fs.writeFileSync(f.fullPath, out)

  run_user_after_function = ->
    if not @config.after then return W.resolve()
    nodefn.call(@config.after, @)

module.exports = (opts) ->
  (new Init()).execute(opts)
