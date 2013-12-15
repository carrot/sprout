require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
sprout = require '../'
accord = require '../lib/utils/accord'

before ->
  @exec = (cmd) -> exec(cmd, {silent: true})
  @$ = path.join(__dirname, '../bin/sprout')

describe 'accord', ->

  beforeEach ->
    @mock = {}

  it 'accepts a config object', ->
    accord.call(@mock, { foo: { bar: 'baz' }, done: (->) })
    @mock.bar.should.eql('baz')
    @mock.done.should.be.type('function')

  it 'accepts normal args', ->
    accord.call(@mock, { foo: 'bar', baz: 'quux', snargle: 'blarg' })
    @mock.foo.should.eql('bar')
    @mock.baz.should.eql('quux')
    @mock.snargle.should.eql('blarg')

  it 'should shift callback', ->
    accord.call(@mock, { foo: 'bar', baz: (->), snargle: undefined })
    @mock.foo.should.eql('bar')
    should.not.exist(@mock.baz)
    @mock.snargle.should.be.type('function')

describe 'js api', ->

  it '[add] errors when no args provided', (done)->
    sprout.add (err, res) ->
      should.exist(err)
      done()

  it '[add] errors when passed an invalid repo url', (done) ->
    sprout.add 'foobar', (err, res) ->
      should.exist(err)
      done()

  it '[add] saves/removes the template when passed a valid url', (done) ->
    sprout.add 'foobar', 'https://github.com/carrot/sprout', (err, res) ->
      should.not.exist(err)
      fs.existsSync(sprout.path('foobar')).should.be.ok
      sprout.remove 'foobar', (err) ->
        should.not.exist(err)
        fs.existsSync(sprout.path('foobar')).should.not.be.ok
        done()

  it '[list] lists available templates', (done) ->
    sprout.list().length.should.eql(0)
    sprout.add 'foobar', 'https://github.com/carrot/sprout', (err, res) ->
      should.not.exist(err)
      sprout.list().length.should.eql(1)
      sprout.remove('foobar', done)

  it '[init] errors when no args provided', (done) ->
    sprout.init (err, res) ->
      should.exist(err)
      done()

  it '[init] errors when passed a non-existant template', (done) ->
    sprout.init 'foobar', (err, res) ->
      should.exist(err)
      done()

  it '[init] creates a project template correctly', (done) ->
    basic_path = path.join(__dirname, 'fixtures/basic')
    sprout.add 'foobar', "https://github.com/jenius/sprout-test-template.git", (err, res) ->
      should.not.exist(err)
      testpath = path.join(__dirname, 'testproj')
      sprout.init 'foobar', testpath, { foo: 'bar' }, (err, res) =>
        if err then done(err)
        should.not.exist(err)
        fs.existsSync(path.join(testpath, 'index.html')).should.be.ok
        contents = fs.readFileSync(path.join(testpath, 'index.html'), 'utf8')
        contents.should.match /bar/
        rm('-rf', testpath)
        sprout.remove('foobar', done)

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

  it '[init] creates a project template correctly', ->
    cmd = @exec("#{@$} add foobar https://github.com/jenius/sprout-test-template.git")
    cmd.code.should.eql(0)
    testpath = path.join(__dirname, 'testproj')
    cmd = @exec("#{@$} init foobar #{testpath} --foo bar")
    cmd.code.should.eql(0)
    fs.existsSync(path.join(testpath, 'index.html')).should.be.ok
    contents = fs.readFileSync(path.join(testpath, 'index.html'), 'utf8')
    contents.should.match /bar/
    rm('-rf', testpath)
    rmcmd = @exec("#{@$} remove foobar")
