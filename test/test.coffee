path    = require 'path'
fs      = require 'fs'
should  = require 'should'
rimraf  = require 'rimraf'
_path   = path.join(__dirname, 'fixtures')
sprout  = require '..'
cli     = new (require '../lib/cli')(debug: true)
mockery = require 'mockery'
errno   = require 'errno'
_       = require 'lodash'

test_template_url  = 'https://github.com/carrot/sprout-test-template.git'
test_template_path = path.join(_path, 'basic')
test_path          = path.join(__dirname, 'testproj')

describe 'js api', ->

  describe 'add', ->

    it 'errors when no args provided', (done)->
      sprout.add()
        .catch((err) -> should.exist(err); done())

    it 'errors when passed an invalid repo url', (done) ->
      sprout.add(name: 'foobar')
        .catch((err) -> should.exist(err); done())

    it 'saves/removes the template when passed a valid http url', (done) ->
      sprout.add(name: 'foobar', uri: test_template_url)
        .tap(-> fs.existsSync(sprout.path('foobar')).should.be.ok)
        .then(-> sprout.remove('foobar'))
        .tap(-> fs.existsSync(sprout.path('foobar')).should.not.be.ok)
        .done((-> done()), done)

    it 'saves/removes the template when passed a local path', (done) ->
      sprout.add(name: 'foobar', uri: test_template_path)
        .tap(-> fs.existsSync(sprout.path('foobar')).should.be.ok)
        .then(-> sprout.remove('foobar'))
        .tap(-> fs.existsSync(sprout.path('foobar')).should.not.be.ok)
        .done((-> done()), done)

    it 'replaces existing template on add', (done) ->
      sprout.add(name: 'foobar', uri: test_template_path)
        .tap(->
          fs.existsSync(sprout.path('foobar')).should.be.ok
          contents = fs.readFileSync(path.join(sprout.path('foobar'), 'init.coffee'), 'utf8')
          contents.should.match /basic foo/
        )
        .then(-> sprout.add(name: 'foobar', uri: test_template_url))
        .tap(->
          fs.existsSync(sprout.path('foobar')).should.be.ok
          contents = fs.readFileSync(path.join(sprout.path('foobar'), 'init.coffee'), 'utf8')
          contents.should.match /is foo/
        )
        .then(-> sprout.remove('foobar'))
        .done((-> done()), done)

    it 'errors when a local template is added but doesn\'t actually exist', (done) ->
      sprout.add(name: 'foobar', uri: path.join(_path, 'not-there'))
        .catch((err) ->
          should.exist(err)
          err.should.match /there is no sprout template located at/
        ).done((-> done()), done)

    it 'errors when trying to add a remote template with no internet', (done) ->
      mockery.enable(useCleanCache: true, warnOnUnregistered: false)
      mockery.registerMock 'dns',
        resolve: (name, cb) -> cb(errno.code.ECONNREFUSED)

      sprout = require '..'

      sprout.add(name: 'foobar', uri: test_template_url)
        .catch (e) ->
          e.should.eql('make that you are connected to the internet!')
          done()

      mockery.deregisterMock('dns')
      mockery.disable()

  describe 'list', ->

    it 'lists available templates', (done) ->
      start = sprout.list().length
      sprout.add(name: 'foobar', uri: test_template_path, options: {foo: 'bar'})
        .tap(-> sprout.list().length.should.eql(start + 1))
        .then(-> sprout.remove('foobar'))
        .done((-> done()), done)

  describe 'init', ->

    before -> sprout = require '..'

    it 'errors when no args provided', (done) ->
      sprout.init()
        .catch((err) -> should.exist(err); done())

    it 'errors when passed a non-existant template', (done) ->
      sprout.init('foobar')
        .catch((err) -> should.exist(err); done())

    it 'creates a project template correctly', (done) ->
      test_template = path.join(_path, 'basic')

      sprout.add(name: 'foobar', uri: test_template)
        .then(-> sprout.init(name: 'foobar', path: test_path, overrides: { foo: 'bar'}))
        .tap(->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        )
        .then(-> sprout.remove('foobar'))
        .done((-> done()), done)

    it 'creates a project template from a branch', (done) ->
      sprout.add(name: 'foobar-2', uri: "#{test_template_url}#alt")
        .then(-> sprout.init(name: 'foobar-2', path: test_path, overrides: { foo: 'bar' }))
        .tap(->
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /alternate/
          rimraf.sync(test_path)
        ).then(-> sprout.remove('foobar-2'))
        .done((-> done()), done)

    it "creates a project by overriding inquirer's question types", (done) ->
      test_template = path.join(_path, 'override')

      opts =
        foo: "bar"
        snow: true
        size: "Medium"
        liquid: '7up'

      sprout.add(name: 'foobar', uri: test_template)
        .then(-> sprout.init(name: 'foobar', path: test_path, overrides: opts))
        .tap(->
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /foo/
          contents.should.match /you know nothing jon snow/
          contents.should.match /Medium/
          contents.should.match /7up/
          rimraf.sync(test_path)
        ).then(-> sprout.remove('foobar'))
        .done((-> done()), done)

    it 'executes before function', (done) ->
      test_template = path.join(_path, 'before')
      new_path      = path.join(__dirname, 'newproj')

      sprout.add(name: 'foobar-3', uri: test_template)
        .then(-> sprout.init(name: 'foobar-3', path: test_path, overrides: {foo: 'bar'}))
        .tap(->
          p = path.join(new_path, 'index.html')
          exists = fs.existsSync(p).should.be.ok
          contents = fs.readFileSync(path.join(new_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(new_path)
        )
        .then(-> sprout.remove('foobar-3'))
        .done((-> done()), done)

    it 'executes after function', (done) ->
      test_template = path.join(_path, 'after')

      sprout.add(name: 'foobar-4', uri: test_template)
        .then(-> sprout.init(name: 'foobar-4', path: test_path, overrides: {foo: 'bar'}))
        .tap(->
          fs.existsSync(path.join(test_path, 'findex.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'findex.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        )
        .then(-> sprout.remove('foobar-4'))
        .done((-> done()), done)

    it 'includes String.js in ejs compilation', (done) ->
      test_template = path.join(_path, 'stringjs')

      sprout.add(name: 'foobar-5', uri: test_template)
        .then(-> sprout.init(name: 'foobar-5', path: test_path, overrides: {user_model: 'user'}))
        .tap(->
          fs.existsSync(path.join(test_path, 'user.rb')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'user.rb'), 'utf8')
          contents.should.match /class User/
          rimraf.sync(test_path)
        )
        .then(-> sprout.remove('foobar-5'))
        .done((-> done()), done)

    it 'errors when template does not have `root` directory', (done) ->
      test_template = path.join(_path, 'no-root')
      sprout.add(name: 'foobar-6', uri: test_template)
        .then(-> sprout.init(name: 'foobar-6', path: test_path))
        .catch (err) ->
          should.exist(err)
          err.should.match /template does not contain root directory/
        .then(-> sprout.remove('foobar-6'))
        .done((-> done()), done)

    it 'works even when not connected to the internet', (done) ->
      mockery.enable(useCleanCache: true, warnOnUnregistered: false)
      mockery.registerMock 'dns',
        resolve: (name, cb) -> cb(errno.code.ECONNREFUSED)

      sprout = require '..'
      test_template = path.join(_path, 'basic')

      sprout.add(name: 'foobar', uri: test_template)
        .then(-> sprout.init(name: 'foobar', path: test_path, overrides: { foo: 'bar'}))
        .tap(->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        )
        .then(-> sprout.remove('foobar'))
        .done((-> done()), done)

      mockery.deregisterMock('dns')
      mockery.disable()

describe 'cli', ->

  describe 'add', ->
    
    it 'errors when no args provided', ->
      (-> cli.run([])).should.throw(/too few arguments/)

    it 'errors when passed an invalid repo url', (done) ->
      cli.run('add foobar sdlfkjsd').catch (err) ->
        err.should.match /there is no sprout template located at/
        done()

    it 'saves/removes the template when passed a valid http url', (done) ->
      cli.run("add foobar #{test_template_url}").then ->
        fs.existsSync(sprout.path('foobar')).should.be.ok
        cli.run("remove foobar")
      .then ->
        fs.existsSync(sprout.path('foobar')).should.not.be.ok
      .done((-> done()), done)

  describe 'list', ->

    it 'lists available templates', (done) ->
      cli.run('list')
        .then(cli.run.bind(cli, "add foobar #{test_template_url}"))
        .then(cli.run.bind(cli, "list"))
        .then (res) -> res.should.match /- foobar/
        .then(cli.run.bind(cli, 'rm foobar'))
        .done((-> done()), done)

  describe 'init', ->

    it 'errors when no args provided', ->
      (-> cli.run('init')).should.throw(/too few arguments/)

    it 'errors when passed a non-existant template', (done) ->
      cli.run('init foobar').catch (err) ->
        err.should.match /template 'foobar' does not exist/
        done()

    it 'creates a project template correctly', (done) ->
      cli.run("add foobar #{test_template_url}")
        .then(cli.run.bind(cli, "init foobar #{test_path} -o foo bar"))
        .then ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        .then(cli.run.bind(cli, 'rm foobar'))
        .done((-> done()), done)

    # these tests require a better way of responding to the command-line
    # prompts. they will remain stubbed for ref until a new solution is found
    it 'creates a project with multiple inquirer inputs'
    it 'errors when prompt entry doesn\'t pass validation'
    it 'uses defaults correctly'
