require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
sprout = require '../'

before ->
  @cmd = sprout.commands
  @exec = (cmd) -> exec(cmd, {silent: true})
  @$ = path.join(__dirname, '../bin/sprout')

describe 'js api', ->

  it '[add] errors when no args provided', (done)->
    @cmd.add (err, res) ->
      should.exist(err)
      done()

  it '[add] errors when passed an invalid repo url', (done) ->
    @cmd.add 'foobar', (err, res) ->
      should.exist(err)
      done()

  it '[add] saves/removes the template when passed a valid url', (done) ->
    @cmd.add 'foobar', 'https://github.com/carrot/sprout', (err, res) =>
      should.not.exist(err)
      fs.existsSync(sprout.path('foobar')).should.be.ok
      @cmd.remove 'foobar', (err) ->
        should.not.exist(err)
        fs.existsSync(sprout.path('foobar')).should.not.be.ok
        done()

  it '[list] lists available templates', (done) ->
    @cmd.list().length.should.eql(0)
    @cmd.add 'foobar', 'https://github.com/carrot/sprout', (err, res) =>
      should.not.exist(err)
      @cmd.list().length.should.eql(1)
      @cmd.remove('foobar', done)

  it '[init] errors when no args provided', (done) ->
    @cmd.init (err, res) ->
      should.exist(err)
      done()

  it '[init] errors when passed a non-existant template', (done) ->
    @cmd.init 'foobar', (err, res) ->
      should.exist(err)
      done()

describe 'cli', ->

  it '[add] errors when no args provided', ->
    cmd = @exec("#{@$} add")
    cmd.code.should.be.above(0)

  it '[add] errors when passed an invalid repo url', ->
    cmd = @exec("#{@$} add foobar")
    cmd.code.should.be.above(0)

  it '[add] saves/removes the template when passed a valid url', ->
    cmd = @exec("#{@$} add foobar https://github.com/carrot/sprout")
    cmd.code.should.eql(0)
    fs.existsSync(sprout.path('foobar')).should.be.ok
    rmcmd = @exec("#{@$} remove foobar")
    rmcmd.code.should.eql(0)
    fs.existsSync(sprout.path('foobar')).should.not.be.ok

  it '[list] lists available templates', ->
    cmd = @exec("#{@$} list")
    cmd.code.should.eql(0)
    cmd.output.should.match /Templates/
    cmd.output.should.match /no templates present/
    cmd = @exec("#{@$} add foobar https://github.com/carrot/sprout")
    cmd.code.should.eql(0)
    cmd = @exec("#{@$} list")
    cmd.code.should.eql(0)
    cmd.output.should.match /- foobar/
    rmcmd = @exec("#{@$} remove foobar")
    rmcmd.code.should.eql(0)

  it '[init] errors when no args provided', ->
    cmd = @exec("#{@$} init")
    cmd.code.should.be.above(0)

  it '[init] errors when passed a non-existant template', ->
    cmd = @exec("#{@$} init foobar")
    cmd.code.should.be.above(0)
