require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
sprout = require '../'
accord = require '../lib/utils/accord'

before ->
  @cmd = sprout.commands
  @exec = (cmd) -> exec(cmd, {silent: true})
  @$ = path.join(__dirname, '../bin/sprout')


describe 'accord', ->

  it 'works', ->
    mock = {}
    accord.call(mock, { foo: { some: 'config' }, done: (->) })
    console.log mock

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

  it '[init] creates a project template correctly', (done) ->
    basic_path = path.join(__dirname, 'fixtures/basic')
    @cmd.add 'foobar', "file:////#{basic_path}", (err, res) =>
      should.not.exist(err)
      testpath = path.join(__dirname, 'testproj')
      @cmd.init 'foobar', testpath, { foo: 'bar' }, (err, res) =>
        should.not.exist(err)
        fs.existsSync(path.join(testpath, 'index.html')).should.be.ok
        contents = fs.readFileSync(path.join(testpath, 'index.html'), 'utf8')
        contents.should.match /bar/
        rm('-rf', testpath)
        @cmd.remove('foobar', done)

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

  # waiting on accord to be finished
  # it '[init] creates a project template correctly', ->
  #   cmd = @exec("#{@$} add foobar file:////#{path.join(__dirname, 'fixtures/basic')}")
  #   cmd.code.should.eql(0)
  #   testpath = path.join(__dirname, 'testproj')
  #   cmd = @exec("#{@$} init foobar #{testpath} --foo bar")
  #   console.log cmd
  #   cmd.code.should.eql(0)
  #   fs.existsSync(path.join(testpath, 'index.html')).should.be.ok
  #   rm('-rf', testpath)
  #   rmcmd = @exec("#{@$} remove foobar")
