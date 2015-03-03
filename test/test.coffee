path    = require 'path'
fs      = require 'fs'
exec    = require('child_process').exec
rimraf  = require 'rimraf'
mockery = require 'mockery'
errno   = require 'errno'
_       = require 'lodash'
W       = require 'when'
nodefn  = require 'when/node'
cli     = new (require '../lib/cli')(debug: true)

test_template_url  = 'https://github.com/carrot/sprout-test-template.git'
test_template_path = path.join(_path, 'basic')
test_path          = path.join(__dirname, 'testproj')

before ->
  fixtures = path.join(__dirname, 'fixtures')
  W.map fs.readdirSync(fixtures), (dir) ->
    nodefn.call(exec, "git init", cwd: path.join(fixtures, dir))
  .should.be.fulfilled

describe 'js api', ->

  describe 'add', ->

    it 'errors when no args provided', ->
      sprout.add().should.be.rejected

    it 'errors when passed an invalid repo url', ->
      sprout.add(name: 'foobar').should.be.rejected

    it 'saves/removes the template when passed a valid http url', ->
      sprout.add(name: 'foobar', uri: test_template_url)
        .tap -> fs.existsSync(sprout.path('foobar')).should.be.ok
        .then -> sprout.remove('foobar')
        .tap -> fs.existsSync(sprout.path('foobar')).should.not.be.ok
        .should.be.fulfilled

    it 'saves/removes the template when passed a local path', ->
      sprout.add(name: 'foobar', uri: test_template_path)
        .tap -> fs.existsSync(sprout.path('foobar')).should.be.ok
        .then -> sprout.remove('foobar')
        .tap -> fs.existsSync(sprout.path('foobar')).should.not.be.ok
        .should.be.fulfilled

    it 'replaces existing template on add', ->
      sprout.add(name: 'foobar', uri: test_template_path)
        .tap ->
          fs.existsSync(sprout.path('foobar')).should.be.ok
          contents = fs.readFileSync(path.join(sprout.path('foobar'), 'init.coffee'), 'utf8')
          contents.should.match /basic foo/
        .then(-> sprout.add(name: 'foobar', uri: test_template_url))
        .tap ->
          fs.existsSync(sprout.path('foobar')).should.be.ok
          contents = fs.readFileSync(path.join(sprout.path('foobar'), 'init.coffee'), 'utf8')
          contents.should.match /is foo/
        .then(-> sprout.remove('foobar'))
        .should.be.fulfilled

    it 'errors when a local template is added but doesn\'t actually exist', ->
      sprout.add(name: 'foobar', uri: path.join(_path, 'not-there'))
        .catch (err) ->
          should.exist(err)
          err.should.match /there is no sprout template located at/
        .should.be.fulfilled

    it 'errors when trying to add a remote template with no internet', ->
      mockery.enable(useCleanCache: true, warnOnUnregistered: false)
      mockery.registerMock 'dns',
        resolve: (name, cb) -> cb(errno.code.ECONNREFUSED)

      sprout = require '..'

      sprout.add(name: 'foobar', uri: test_template_url)
        .should.be.rejectedWith('make that you are connected to the internet!')

      mockery.deregisterMock('dns')
      mockery.disable()

  describe 'remove', ->

    it 'errors when trying to remove a nonexistant template', ->
      sprout.remove(name: 'blarg')
        .should.be.rejectedWith('template blarg does not exist')

    it 'errors when not passed any arguments', ->
      sprout.remove()
        .should.be.rejectedWith('you must pass the name of a template to remove')

  describe 'list', ->

    it 'lists available templates', ->
      start = sprout.list().length
      sprout.add(name: 'foobar', uri: test_template_path, options: {foo: 'bar'})
        .tap -> sprout.list().length.should.equal(start + 1)
        .then -> sprout.remove('foobar')
        .should.be.fulfilled

  describe 'utils', ->

    it 'read file', (done) ->
      utils_template = path.join(_path, 'utils-read')
      sprout.add(name: 'utils-read', uri: utils_template)
        .then(-> sprout.init(name: 'utils-read', path: test_path, overrides: { name: 'bar' }))
        .tap(->
          write_path = path.join(test_path, 'foo')
          fs.readFileSync(write_path, 'utf8').should.match /bar/
        ).then(-> sprout.remove('utils-read'))
        .done((-> done()), done)

    it 'write file', (done) ->
      utils_template = path.join(_path, 'utils-write')
      sprout.add(name: 'utils-write', uri: utils_template)
        .then(-> sprout.init(name: 'utils-write', path: test_path, overrides: { name: 'bar' }))
        .tap(->
          write_path = path.join(test_path, 'foo')
          fs.readFileSync(write_path, 'utf8').should.match /bar buzz/
        ).then(-> sprout.remove('utils-write'))
        .done((-> done()), done)

    it 'rename file', (done) ->
      utils_template = path.join(_path, 'utils-rename')
      sprout.add(name: 'utils-rename', uri: utils_template)
        .then(-> sprout.init(name: 'utils-rename', path: test_path) )
        .tap(->
          rename_path = path.join(test_path, '.travis.yml')
          fs.existsSync(rename_path).should.be.true
        ).then(-> sprout.remove('utils-rename'))
        .done((-> done()), done)

    it 'remove file', (done) ->
      utils_template = path.join(_path, 'utils-remove')
      sprout.add(name: 'utils-remove', uri: utils_template)
        .then(-> sprout.init(name: 'utils-remove', path: test_path, overrides: { name: 'bar' }))
        .tap(->
          remove_path = path.join(test_path, '.travis.yml')
          fs.existsSync(remove_path).should.be.false
        ).then(-> sprout.remove('utils-remove'))
        .done((-> done()), done)

    it 'modifies configuration', (done) ->
      utils_template = path.join(_path, 'utils-configure')
      sprout.add(name: 'utils-configure', uri: utils_template)
        .then(-> sprout.init(name: 'utils-configure', path: test_path, overrides: { name: 'bar' }) )
        .tap(->
          configure_path = path.join(test_path, 'foo')
          fs.readFileSync(configure_path, 'utf8').should.match /foo/
        ).then(-> sprout.remove('utils-configure'))
        .done((-> done()), done)

  describe 'init', ->

    before -> sprout = require '..'

    it 'errors when no args provided', ->
      sprout.init().should.be.rejected

    it 'errors when passed a non-existant template', ->
      sprout.init('foobar').should.be.rejected

    it 'creates a project template correctly', ->
      test_template = path.join(_path, 'basic')

      sprout.add(name: 'foobar', uri: test_template)
        .then -> sprout.init(name: 'foobar', path: test_path, overrides: { foo: 'bar'})
        .tap ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar')
        .should.be.fulfilled

    it 'creates a project template from a branch', ->
      sprout.add(name: 'foobar-2', uri: "#{test_template_url}#alt")
        .then -> sprout.init(name: 'foobar-2', path: test_path, overrides: { foo: 'bar' })
        .tap ->
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /alternate/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-2')
        .should.be.fulfilled

    it "creates a project by overriding inquirer's question types", ->
      test_template = path.join(_path, 'override')

      opts =
        foo: "bar"
        snow: true
        size: "Medium"
        liquid: '7up'

      sprout.add(name: 'foobar', uri: test_template)
        .then -> sprout.init(name: 'foobar', path: test_path, overrides: opts)
        .tap ->
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /foo/
          contents.should.match /you know nothing jon snow/
          contents.should.match /Medium/
          contents.should.match /7up/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar')
        .should.be.fulfilled

    it 'installs template dependencies', (done) ->
      name = 'install_deps'
      test_template = path.join(_path, name)

      sprout.add(name: name, uri: test_template, path: test_path)
        .then -> sprout.init(name: name, path: test_path, overrides: {foo: 'bar'})
        .then ->
          p = path.join(test_template, 'node_modules')
          fs.existsSync(p).should.be.ok
        .catch (e) -> done(e)
        .done -> done()

    it 'executes before function', ->
      test_template = path.join(_path, 'before')
      new_path      = path.join(__dirname, 'newproj')

      sprout.add(name: 'foobar-3', uri: test_template)
        .then -> sprout.init(name: 'foobar-3', path: test_path, overrides: {foo: 'bar'})
        .tap ->
          p = path.join(new_path, 'index.html')
          exists = fs.existsSync(p).should.be.ok
          contents = fs.readFileSync(path.join(new_path, 'index.html'), 'utf8')
          contents.should.match /bar/
        .then -> rimraf.sync(new_path)
        .then -> sprout.remove('foobar-3')
        .should.be.fulfilled

    it 'executes before render function', ->
      test_template = path.join(_path, 'before_render')

      sprout.add(name: 'foobar-9', uri: test_template)
        .then -> sprout.init(name: 'foobar-9', path: test_path, overrides: {foo: 'bar'})
        .tap ->
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.not.match /bar/
          contents.should.match /doge/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-9')
        .should.be.fulfilled


    it 'executes after function', ->
      test_template = path.join(_path, 'after')

      sprout.add(name: 'foobar-4', uri: test_template)
        .then -> sprout.init(name: 'foobar-4', path: test_path, overrides: {foo: 'bar'})
        .tap ->
          fs.existsSync(path.join(test_path, 'findex.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'findex.html'), 'utf8')
          contents.should.match /bar/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-4')
        .should.be.fulfilled

    it 'includes underscore.string in ejs compilation', ->
      test_template = path.join(_path, 'stringjs')

      sprout.add(name: 'foobar-5', uri: test_template)
        .then -> sprout.init(name: 'foobar-5', path: test_path, overrides: {user_model: 'user'})
        .tap ->
          fs.existsSync(path.join(test_path, 'user.rb')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'user.rb'), 'utf8')
          contents.should.match /class User/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-5')
        .should.be.fulfilled

    it 'errors when template does not have `root` directory', ->
      test_template = path.join(_path, 'no-root')
      sprout.add(name: 'foobar-6', uri: test_template)
        .then -> sprout.init(name: 'foobar-6', path: test_path)
        .catch (err) ->
          should.exist(err)
          err.should.match /template does not contain root directory/
        .then -> sprout.remove('foobar-6')
        .should.be.fulfilled

    it 'uses defaults correctly', ->
      test_template = path.join(_path, 'basic')

      sprout.add(name: 'foobar-7', uri: test_template)
        .then -> sprout.init(name: 'foobar-7', path: test_path, defaults: { foo: 'bar' }, overrides: { foo: 'bar'})
        .tap ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-7')
        .should.be.fulfilled

    it 'works even when not connected to the internet', ->
      mockery.enable(useCleanCache: true, warnOnUnregistered: false)
      mockery.registerMock 'dns',
        resolve: (name, cb) -> cb(errno.code.ECONNREFUSED)

      sprout = require '..'
      test_template = path.join(_path, 'basic')

      sprout.add(name: 'foobar-8', uri: test_template)
        .then -> sprout.init(name: 'foobar-8', path: test_path, overrides: { foo: 'bar'})
        .tap ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
        .then -> rimraf.sync(test_path)
        .then -> sprout.remove('foobar-8')
        .then ->
          mockery.deregisterMock('dns')
          mockery.disable()
        .should.be.fulfilled

describe 'tags', ->
  tag_template_url = 'https://github.com/carrot/sprout-test-template2.git'

  before -> sprout = require '..'

  it 'creates a project at a specific version is @VERSION is on the uri', ->
    sprout.add(name: 'tags-1', uri: tag_template_url)
      .then -> sprout.init(name: 'tags-1@0.0.1', path: test_path)
      .then ->
        fs.existsSync(path.join(test_path, 'index.txt')).should.be.ok
        contents = fs.readFileSync(path.join(test_path, 'index.txt'), 'utf8')
        contents.should.match /tag test 1/
      .then -> rimraf.sync(test_path)
      .then -> sprout.remove('tags-1')
      .should.be.fulfilled

  it 'creates a project at a specific version, ignoring "v" in the tag', ->
    sprout.add(name: 'tags-2', uri: tag_template_url)
      .then -> sprout.init(name: 'tags-2@0.0.2', path: test_path)
      .then ->
        fs.existsSync(path.join(test_path, 'index.txt')).should.be.ok
        contents = fs.readFileSync(path.join(test_path, 'index.txt'), 'utf8')
        contents.should.match /tag test 2/
      .then -> rimraf.sync(test_path)
      .then -> sprout.remove('tags-2')
      .should.be.fulfilled

  it 'uses the latest tag if a version is not present', ->
    sprout.add(name: 'tags-3', uri: tag_template_url)
      .then -> sprout.init(name: 'tags-3', path: test_path)
      .then ->
        fs.existsSync(path.join(test_path, 'index.txt')).should.be.ok
        contents = fs.readFileSync(path.join(test_path, 'index.txt'), 'utf8')
        contents.should.match /tag test 3/
      .then -> rimraf.sync(test_path)
      .then -> sprout.remove('tags-3')
      .should.be.fulfilled

  it 'errors if an invalid tag is used', ->
    sprout.add(name: 'tags-4', uri: tag_template_url)
      .then -> sprout.init(name: 'tags-4@manatoge', path: test_path)
      .catch (err) -> sprout.remove('tags-4').then(-> throw err)
      .should.be.rejectedWith('version does not exist')

describe 'cli', ->

  it 'should initialize api without options', ->
    (-> new (require '../lib/cli')() ).should.not.throw()

  describe 'add', ->

    it 'errors when no args provided', ->
      (-> cli.run([])).should.throw(/too few arguments/)

    it 'errors when passed an invalid repo url', (done) ->
      cli.run('add foobar sdlfkjsd').catch (err) ->
        err.should.match /there is no sprout template located at/
        done()

    it 'saves/removes the template when passed a valid http url', ->
      cli.run("add foobar #{test_template_url}").then ->
        fs.existsSync(sprout.path('foobar')).should.be.ok
        cli.run("remove foobar")
      .then -> fs.existsSync(sprout.path('foobar')).should.not.be.ok
      .should.be.fulfilled

  describe 'list', ->

    it 'lists available templates', ->
      cli.run('list')
        .then(cli.run.bind(cli, "add foobar #{test_template_url}"))
        .then(cli.run.bind(cli, "list"))
        .then (res) -> res.should.match /- foobar/
        .then(cli.run.bind(cli, 'rm foobar'))
        .should.be.fulfilled

  describe 'init', ->

    it 'errors when no args provided', ->
      (-> cli.run('init')).should.throw(/too few arguments/)

    it 'errors when passed a non-existant template', (done) ->
      cli.run('init foobar').catch (err) ->
        err.should.match /template 'foobar' does not exist/
        done()

    it 'creates a project template correctly', ->
      cli.run("add foobar #{test_template_url}")
        .then(cli.run.bind(cli, "init foobar #{test_path} -o foo bar"))
        .then ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        .then(cli.run.bind(cli, 'rm foobar'))
        .should.be.fulfilled

    it 'should default the path to the name of the template in cwd if no path is provided', ->
      name = 'manatoge'
      test_path = path.join(process.cwd(), name)

      cli.run("add #{name} #{test_template_url}")
        .then(cli.run.bind(cli, "init #{name} -o foo bar"))
        .then ->
          fs.existsSync(path.join(test_path, 'index.html')).should.be.ok
          contents = fs.readFileSync(path.join(test_path, 'index.html'), 'utf8')
          contents.should.match /bar/
          rimraf.sync(test_path)
        .then(cli.run.bind(cli, "rm #{name}"))
        .should.be.fulfilled

    # these tests require a better way of responding to the command-line
    # prompts. they will remain stubbed for ref until a new solution is found
    it 'creates a project with multiple inquirer inputs'
    it 'errors when prompt entry doesn\'t pass validation'
    it 'uses defaults correctly'
