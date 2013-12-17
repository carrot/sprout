path = require 'path'
fs = require 'fs'
crypto = require 'crypto'
os = require 'os'
osenv = require 'osenv'
mkdirp = require 'mkdirp'

class Base

  constructor: ->
    user = (osenv.user() || generate_fake_user()).replace(/\\/g, '-')
    tmp_dir = path.join((if os.tmpdir then os.tmpdir() else os.tmpDir()), user)
    @config_dir = process.env.XDG_CONFIG_HOME || path.join((osenv.home() || tmp_dir), '.config/sprout')
    if not fs.existsSync(@config_dir) then mkdirp.sync(@config_dir)

  path: (name='') ->
    path.join(@config_dir, name)

  #
  # @api private
  #

  # h/t to configstore for this logic
  generate_fake_user: ->
    uid = [process.pid, Date.now(), Math.floor(Math.random() * 1000000)].join('-')
    crypto.createHash('md5').update(uid).digest('hex')

module.exports = Base
