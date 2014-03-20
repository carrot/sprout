require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
sprout = require '..'

test_template_url = 'https://github.com/jenius/sprout-test-template.git'

before ->
  @exec = (cmd) -> exec(cmd, {silent: true})
  @$ = path.join(__dirname, '../bin/sprout')

describe 'js api', ->

  it '[add] errors when no args provided', (done)->
    sprout.add()
      .catch((err) -> should.exist(err); done())

  it '[add] errors when passed an invalid repo url', (done) ->
    sprout.add(name: 'foobar')
      .catch((err) -> should.exist(err); done())

  it '[add] saves/removes the template when passed a valid url', (done) ->
    sprout.add(name: 'foobar', template: test_template_url)
      .tap(-> fs.existsSync(sprout.path('foobar')).should.be.ok)
      .then(-> sprout.remove('foobar'))
      .tap(-> fs.existsSync(sprout.path('foobar')).should.not.be.ok)
      .done((-> done()), done)

  it '[list] lists available templates', (done) ->
    start = sprout.list().length
    sprout.add(name: 'foobar', template: test_template_url)
      .tap(-> sprout.list().length.should.eql(start + 1))
      .then(-> sprout.remove('foobar'))
      .done((-> done()), done)

  it '[init] errors when no args provided', (done) ->
    sprout.init()
      .catch((err) -> should.exist(err); done())

  it '[init] errors when passed a non-existant template', (done) ->
    sprout.init('foobar')
      .catch((err) -> should.exist(err); done())

  it '[init] creates a project template correctly', (done) ->
    basic_path = path.join(__dirname, 'fixtures/basic')
    test_path = path.join(__dirname, 'testproj')

    sprout.add(name: 'foobar', template: test_template_url)
      .then(-> sprout.init(name: 'foobar', path: test_path, options: { foo: 'bar' }))
      .tap(->
        fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
        contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
        contents.should.match /bar/
        rm('-rf', test_path)
      ).then(-> sprout.remove('foobar'))
      .done((-> done()), done)

  it '[init] creates a project template from a branch', (done) ->
    basic_path = path.join(__dirname, 'fixtures/basic')
    test_path = path.join(__dirname, 'testproj')

    sprout.add(name: 'foobar', template: "#{test_template_url}#alt")
      .then(-> sprout.init(name: 'foobar', path: test_path, options: { foo: 'bar' }))
      .tap(->
        contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
        contents.should.match /alternate/
        rm('-rf', test_path)
      ).then(-> sprout.remove('foobar'))
      .done((-> done()), done)

describe 'cli', ->

  it '[add] errors when no args provided', ->
    cmd = @exec("#{@$} add")
    cmd.code.should.be.above(0)

  it '[add] errors when passed an invalid repo url', ->
    cmd = @exec("#{@$} add foobar")
    cmd.code.should.be.above(0)

  it '[add] saves/removes the template when passed a valid url', ->
    cmd = @exec("#{@$} add foobar #{test_template_url}")
    cmd.code.should.eql(0)
    fs.existsSync(sprout.path('foobar')).should.be.ok
    rmcmd = @exec("#{@$} remove foobar")
    rmcmd.code.should.eql(0)
    fs.existsSync(sprout.path('foobar')).should.not.be.ok

  it '[list] lists available templates', ->
    cmd = @exec("#{@$} list")
    cmd.code.should.eql(0)
    cmd = @exec("#{@$} add foobar #{test_template_url}")
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

  it '[init] creates a project template correctly target', ->
    test_path = path.join(__dirname, 'testproj')
    cmd = @exec("#{@$} add foobar #{test_template_url}")
    cmd.code.should.eql(0)
    cmd = @exec("#{@$} init foobar #{test_path} --foo bar")
    cmd.code.should.eql(0)
    fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
    contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
    contents.should.match /bar/
    rm('-rf', test_path)
    rmcmd = @exec("#{@$} remove foobar")
