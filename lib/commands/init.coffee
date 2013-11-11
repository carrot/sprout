path = require 'path'
es = require 'event-stream'
fs = require 'fs'
W = require 'when'
nodefn = require 'when/node/function'
readdirp = require 'readdirp'
ncp = require('ncp').ncp
ejs = require 'ejs'
prompt = require 'prompt'
Base = require '../base'

class Init extends Base

  constructor: (@name, @target, @opts = {}, cb) ->
    super
    # accord.call(@, { name: name, target: target, options: opts, done: cb })

    # flexible args

    if typeof @name == 'function' then return @name('please provide a template name')

    if @name and typeof @target == 'function'
      cb = @target
      @target = path.join(process.cwd(), @name)

    if @name and @target and typeof @opts == 'function'
      cb = @opts

    @cb = cb

  execute: ->
    @error = null
    @sprout_path = @path(@name)
    if not fs.existsSync(@sprout_path) then return @cb('template does not exist')

    get_user_config.call(@)

    user_before_fn.call(@)
    .then(prompt_for_info.bind(@))
    .then(user_after_fn.bind(@))
    .then(copy_template.bind(@))
    .then(replace_ejs.bind(@))
    .otherwise(@cb)
    .then =>
      @cb(null, "project #{@name} created!")

  #
  # @api private
  #

  get_user_config = ->
    init_file = path.join(@sprout_path, 'init.coffee')
    if not fs.existsSync(init_file) then return @config = {}
    @config = require(init_file)

  # TODO: the return value from the before call must be passed back into the class
  user_before_fn = ->
    if not @config.before then return W.promise((r)-> r())
    nodefn.call(@config.before, @)

  prompt_for_info = ->
    deferred = W.defer()

    if not @config.configure
      @config_values = @opts
      return W.promise((r)-> r())

    prompt.override = @opts
    prompt.start()
    prompt.get @config, (err, result) ->
      if err then return deferred.reject(err)
      @config_values = result
      deferred.resolve()

    return deferred.promise

  user_after_fn = ->
    if not @config.before then return W.promise((r)-> r())
    nodefn.call(@config.before, @)

  copy_template = ->
    nodefn.call(ncp, path.join(@sprout_path, 'root'), @target)

  replace_ejs = ->
    deferred = W.defer()

    # grab all files in the template
    readdirp root: @target, (err, res) =>
      if err then return deferred.reject(err)

      # replace the ejs in all files
      res.files.map (f) =>
        processed = ejs.render(fs.readFileSync(f.fullPath, 'utf8'), @config_values)
        fs.writeFileSync(f.fullPath, processed)

      deferred.resolve()

    return deferred.promise

module.exports = (name, p, opts, cb) ->
  cmd = new Init(name, p, opts, cb)
  if cmd.cb then cmd.execute()
