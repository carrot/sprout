path = require 'path'
fs = require 'fs'
W = require 'when'
nodefn = require 'when/node/function'
readdirp = require 'readdirp'
ncp = require('ncp').ncp
exec = require('child_process').exec
ejs = require 'ejs'
prompt = require 'prompt'
Base = require '../base'

class Init extends Base

  constructor: -> super

  execute: (opts) ->

    configure_options.call(@, opts)
      .then(get_user_config.bind(@))
      .then(user_before_fn.bind(@))
      .then(prompt_for_info.bind(@))
      .then(user_after_fn.bind(@))
      .then(update_template.bind(@))
      .then(copy_template.bind(@))
      .then(replace_ejs.bind(@))
      .yield("project #{@template} created!")

  #
  # @api private
  #
  
  configure_options = (opts) ->
    if not opts then return W.reject('please provide a template name')
    @template = opts.template
    @target = opts.path
    @options = opts.options

    if not @template then return W.reject('please provide a template name')
    if not @target then @target = path.join(process.cwd(), @template)

    @sprout_path = @path(@template)
    if not fs.existsSync(@sprout_path) then return W.reject("template #{@template} does not exist")

    W.resolve()

  get_user_config = ->
    init_file = path.join(@sprout_path, 'init.coffee')
    if not fs.existsSync(init_file) then return @config = {}
    @config = require(init_file)

  user_before_fn = ->
    if not @config.before then return W.resolve()
    nodefn.call(@config.before, @)

  prompt_for_info = ->
    if not @config.configure
      @config_values = @options
      return W.resolve()

    prompt.override = @options
    prompt.message = ''
    prompt.delimiter = ''

    if not prompt.override then console.log '\nplease enter the following information:'.yellow

    prompt.start()
    nodefn.call(prompt.get, @config.configure).tap (res) =>
      @config_values = res
      if not prompt.override then console.log('')

  user_after_fn = ->
    if not @config.before then return W.resolve()
    nodefn.call(@config.before, @)

  update_template = ->
    nodefn.call(exec, "cd #{@sprout_path}; git pull")

  copy_template = ->
    nodefn.call(ncp, path.join(@sprout_path, 'root'), @target)

  replace_ejs = ->
    nodefn.call(readdirp, { root: @target })
      .tap (res) =>
        res.files.map (f) =>
          processed = ejs.render(fs.readFileSync(f.fullPath, 'utf8'), @config_values)
          fs.writeFileSync(f.fullPath, processed)

module.exports = (opts) ->
  (new Init()).execute(opts)
