require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
_path  = path.join(__dirname, 'fixtures')
sprout = require '..'

# remote template
test_template_url  = 'https://github.com/carrot/sprout-test-template.git'

# local template
test_template_path     = path.join(_path, 'basic')

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

  it '[add] saves/removes the template when passed a valid http url', (done) ->
    sprout.add(name: 'foobar', template: test_template_url)
      .tap(-> fs.existsSync(sprout.path('foobar')).should.be.ok)
      .then(-> sprout.remove('foobar'))
      .tap(-> fs.existsSync(sprout.path('foobar')).should.not.be.ok)
      .done((-> done()), done)

  it '[add] saves/removes the template when passed a local path', (done) ->
    sprout.add(name: 'foobar', template: test_template_path)
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

    sprout.add(name: 'foobar', template: test_template_path)
      .then(-> sprout.init(name: 'foobar', path: test_path, options: { foo: 'bar'}))
      .tap(->
        fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
        contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
        contents.should.match /bar/
        rm('-rf', test_path)
      )
      .then(-> sprout.remove('foobar'))
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

  it "[init] creates a project by overriding inquirer's question types", (done) ->
    basic_path = path.join(__dirname, 'fixtures/override')
    test_path  = path.join(__dirname, 'testproj')
    opts =
      foo: "bar"
      snow: true
      size: "Medium"
      liquid: '7up'

    sprout.add(name: 'foobar', template: basic_path)
      .then(-> sprout.init(name: 'foobar', path: test_path, options: opts))
      .tap(->
        contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
        contents.should.match /foo/
        contents.should.match /you know nothing jon snow/
        contents.should.match /Medium/
        contents.should.match /7up/
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

  it '[init] creates a project template correctly', ->
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

  it '[init] creates a project with multiple inquirer inputs'
  it '[init] errors when prompt entry doesn\'t pass validation'
  it '[init] executes before function'
  it '[init] executes after function'
  it '[init] includes String.js in ejs compilation'
  it '[init] errors when template does not have `root` directory'
  it '[init] errors when template does not have and `init.coffee` in root dir'
  it '[init] errors when template has malformed `init.coffee`'
  it '[init] errors when template does not have and `init.coffee` in root dir'
  it '[init] does not error when ejs has a key not present in @config_values'
  it '[new] runs sprout.init when `sprout new` is attempted'
  it '[add] replaces existing template on add'
