var Sprout = require('./../lib')
  , Template = require('./../lib/template')
  , Utils = require('./../lib/utils')
  , CLI = require('./../lib/cli')
  , chai = require('chai')
  , path = require('path')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , mockery = require('mockery')
  , errno = require('errno')
  , exec = require('child_process').exec
  , Promise = require('bluebird');

var fixturesPath = path.join(__dirname, 'fixtures');

chai.should()

describe('sprout',
  function () {

    var sproutFixturesPath
      , sprout;

    before(
      function () {
        sproutFixturesPath = path.join(fixturesPath, 'sprout');
        sprout = new Sprout(path.join(sproutFixturesPath, '__sprout__'))
      }
    )

    it('should construct with a valid path',
      function (done) {
        var p = path.join(sproutFixturesPath, 'validPath');
        (function () { return new Sprout(p) })().should.be.ok
        done();
      }
    )

    it('should throw if path doesn\'t exist',
      function (done) {
        var p = 'foo/bar/foo/bar/foo/bar/doge';
        (function () { return new Sprout(p) }).should.throw(p + ' does not exist');
        done();
      }
    )

    it('should throw if path is not a directory',
      function (done) {
        var p = path.join(sproutFixturesPath, 'notDirectory.foo');
        (function () { return new Sprout(p) }).should.throw(p + ' is not a directory');
        done();
      }
    )

    it('should instantiate all directories as template objects.',
      function (done) {
        var p = path.join(sproutFixturesPath, 'templates')
          , newSprout = new Sprout(p);
        newSprout.templates['foo'].should.be.instanceof(Template);
        newSprout.templates['bar'].should.be.instanceof(Template);
        done();
      }
    )

    describe('add',
      function () {

        it('should add template',
          function (done) {
            var name = 'add'
              , src = 'https://github.com/carrot/sprout-sprout';
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                done();
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.add(null, 'https://github.com/carrot/sprout-sprout') }).should.throw;
            done();
          }
        )

      }
    )

    describe('remove',
      function () {

        it('should remove template',
          function (done) {
            var name = 'remove'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template;
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name];
                template.should.be.instanceof(Template);
                template.src.should.eq(src);
                fs.existsSync(template.path).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                (sprout.templates[name] === undefined).should.be.true;
                fs.existsSync(template.path).should.be.false;
                done();
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.remove(null) }).should.throw;
            done();
          }
        )

      }
    )

    describe('init',
      function () {

        it('should init template',
          function (done) {
            var name = 'init'
              , fixture = path.join(sproutFixturesPath, 'init')
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target');
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                return sprout.init(name, target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true;
                return sprout.remove(name);
              }
            ).then(
              function () {
                rimraf(target, done);
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.init(null) }).should.throw;
            done();
          }
        )

      }
    )

  }
)

describe('template',
  function () {

    var templateFixturesPath
      , sprout;

    before(
      function () {
        templateFixturesPath = path.join(fixturesPath, 'template');
        sprout = new Sprout(path.join(templateFixturesPath, '__sprout__'));
      }
    )

    it('should construct with a valid name and path',
      function (done) {
        var name = 'validNamePath'
          , src = path.join(templateFixturesPath, name);
        (function () { return new Template(sprout, name, src) }).should.be.ok
        done();
      }
    )

    it('should throw without a valid name',
      function (done) {
        var name = null
          , src = path.join(templateFixturesPath, 'foo');
        (function () { return new Template(sprout, name, src) }).should.throw
        done();
      }
    )

    it('should determine that src is remote',
      function (done) {
        var name = 'foo'
          , src = 'https://github.com/carrot/sprout-sprout'
          , template = new Template(sprout, name, src);
        template.isRemote.should.be.true;
        done();
      }
    )

    it('should determine that src is local',
      function (done) {
        var name = 'foo'
          , src = path.join(templateFixturesPath, 'isLocal')
          , template = new Template(sprout, name, src);
        template.isRemote.should.be.false;
        done();
      }
    )

    describe('save',
      function () {

        var saveTemplateFixturesPath;

        before(
          function () {
            saveTemplateFixturesPath = path.join(templateFixturesPath, 'save')
          }
        )

        it('should save a remote template',
          function (done) {
            var name = 'remote'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.remove(name);
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should save a local template',
          function (done) {
            var name = 'local'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.remove(name);
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should replace existing template with same name',
          function (done) {
            var name = 'replace'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, 'https://github.com/carrot/sprout-sprout');
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return initGitRepository(src);
              }
            ).then(
              function () {
                return (new Template(sprout, name, src)).save();
              }
            ).then(
              function () {
                fs.existsSync(template.path).should.be.true;
                template.name.should.eq(name);
                fs.readFileSync(path.join(template.path, 'init.js'), 'utf8').should.eq('module.exports = {};\n');
                return template.remove(name)
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should throw if template has no src',
          function (done) {
            var name = 'noSrc'
              , src = null
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: no source provided');
                done();
              }
            )
          }
        )

        it('should throw if src is remote and there is no internet',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false});
            mockery.registerMock('dns', {resolve:
              function (name, callback) {
                return callback(errno.code.ECONNREFUSED);
              }
            })
            var name = 'noInternet'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new (require('./../lib/template'))(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: make sure that you are connected to the internet!');
                mockery.deregisterMock('dns');
                mockery.disable();
                done();
              }
            )
          }
        )

        it('should throw if src is local and doesn\'t exist',
          function (done) {
            var name = 'noLocal'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: there is no sprout template located at ' + src);
                done();
              }
            )
          }
        )

        it('should throw if src is local and isn\'t a git repo',
          function (done) {
            var name = 'noGit'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: ' + src + ' is not a git repository');
                done();
              }
            )
          }
        )

        it('should throw and remove template when init.coffee and init.js don\'t exist in template',
          function (done) {
            var name = 'noInit'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).catch(
              function (error) {
                fs.existsSync(template.path).should.be.false;
                error.toString().should.eq('Error: neither init.coffee nor init.js exist in this template');
                done();
              }
            )
          }
        )

        it('should throw and remove template when root path doesn\'t exist in template',
          function (done) {
            var name = 'noRoot'
              , src = path.join(saveTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).catch(
              function (error) {
                fs.existsSync(template.path).should.be.false;
                error.toString().should.eq('Error: root path doesn\'t exist in template');
                done();
              }
            )
          }
        )

      }
    )

    describe('init',
      function () {

        var initTemplateFixturesPath;

        before(
          function () {
            initTemplateFixturesPath = path.join(templateFixturesPath, 'init');
          }
        )

        it('should init template',
          function (done) {
            var name = 'init'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should throw when no root path',
          function (done) {
            var name = 'noRoot'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(template.root);
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: root path doesn\'t exist in ' + name);
                fs.mkdirSync(template.root);
                fs.writeFileSync(path.join(template.root, '.keep'), '');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when no target provided',
          function (done) {
            var name = 'noRoot'
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = null
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(null);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: target path required');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when target is not git repository',
          function (done) {
            var name = 'noGit'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function () {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(path.join(template.path, '.git'));
              }
            ).then(
              function () {
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

        it('should throw when no init.js or init.coffee provided',
          function (done) {
            var name = 'init'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = 'https://github.com/carrot/sprout-sprout'
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                fs.unlinkSync(path.join(template.path, 'init.coffee'));
                return template.init(target);
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: neither init.coffee nor init.js exist');
                return template.remove().then(
                  function () {
                    rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should use init.js',
          function (done) {
            var name = 'initJs'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should use init.coffee',
          function (done) {
            var name = 'initCoffee'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should include underscore.string as EJS "local"',
          function (done) {
            var name = 'underscoreString'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('Bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should apply defaults',
          function (done) {
            var name = 'defaults'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should install npm dependencies',
          function (done) {
            var name = 'npm'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(template.path, 'node_modules')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should run before hook',
          function (done) {
            var name = 'before'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should run beforeRender hook',
          function (done) {
            var name = 'beforeRender'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('foo\n');
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should run after hook',
          function (done) {
            var name = 'after'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                return rimraf(target, done);
              }
            )
          }
        )

        it('should remove target directory if error thrown after target directory created',
          function (done) {
            var name = 'removeTarget'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).catch(
              function () {
                fs.existsSync(target).should.be.false;
                return template.remove().then(
                  function () {
                    done();
                  }
                )
              }
            )
          }
        )

        it('should work if internet is missing',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false});
            mockery.registerMock('dns', {resolve:
              function (name, callback) {
                return callback(errno.code.ECONNREFUSED);
              }
            })
            var name = 'noInternet'
              , fixture = path.join(initTemplateFixturesPath, name)
              , src = path.join(fixture, 'src')
              , target = path.join(fixture, 'target')
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.init(target);
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true;
                return template.remove();
              }
            ).then(
              function () {
                mockery.deregisterMock('dns');
                mockery.disable();
                return rimraf(target, done);
              }
            )
          }
        )

      }
    )

    describe('update',
      function () {

        var initTemplateFixturesPath;

        before(
          function () {
            updateTemplateFixturesPath = path.join(templateFixturesPath, 'update');
          }
        )

        it('should update',
          function (done) {
            var name = 'update'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return template.update();
              }
            ).then(
              function (template) {
                return template.remove();
              }
            ).then(
              function () {
                done();
              }
            )
          }
        )

        it('should throw error if not a git repo',
          function (done) {
            var name = 'noGit'
              , src = path.join(updateTemplateFixturesPath, name)
              , template = new Template(sprout, name, src);
            return initGitRepository(src).then(
              function () {
                return template.save();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true;
                return Promise.promisify(rimraf)(path.join(template.path, '.git'));
              }
            ).then(
              function () {
                return template.update();
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository');
                return template.remove().then(
                  function () {
                    done();
                  }
                );
              }
            )
          }
        )

      }
    )

    describe('remove',
      function () {

        var removeTemplateFixturesPath;

        before(
          function () {
            removeTemplateFixturesPath = path.join(templateFixturesPath, 'init');
          }
        )

        it('should remove',
          function (done) {
            var name = 'remove'
              , src = 'https://github.com/carrot/sprout-sprout'
              , template = new Template(sprout, name, src);
            return template.save().then(
              function () {
                return template.remove();
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.false;
                done();
              }
            )
          }
        )

      }
    )

  }
)

describe('utils',
  function () {

    var utilsFixturesPath;

    before(
      function () {
        utilsFixturesPath = path.join(fixturesPath, 'utils');
      }
    )

    it('should read a file relative to src path',
      function (done) {
        var fn = 'read'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(fixture);
        return utils.read(fn).then(
          function (output) {
            output.should.eq('bar\n');
            done();
          }
        )
      }
    )

    it('should write relative to target path',
      function (done) {
        var fn = 'write'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.write(fn, 'bar').then(
          function () {
            fs.readFileSync(path.join(fixture, fn), 'utf8').should.eq('bar');
            return utils.remove(fn);
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should write relative to target path and should parse locals passed to third argument',
      function (done) {
        var fn = 'writeEjs'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.write(fn, '<%= foo %>', {foo: fn}).then(
          function () {
            fs.readFileSync(path.join(fixture, fn), 'utf8').should.eq(fn);
            return utils.remove(fn);
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should rename path in target path to path relative to target path',
      function (done) {
        var fixture = path.join(utilsFixturesPath, 'rename')
          , src = fixture
          , target = fixture
          , utils = new Utils(src, target);
        return utils.rename('foo', 'bar').then(
          function () {
            fs.existsSync(path.join(target, 'bar')).should.be.true;
            return utils.rename('bar', 'foo');
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should remove a path relative to the target path',
      function (done) {
        var fn = 'remove'
          , fixture = path.join(utilsFixturesPath, fn)
          , utils = new Utils(null, fixture);
        return utils.remove(fn).then(
          function () {
            fs.existsSync(path.join(fixture, fn)).should.be.false;
            return utils.write(fn, '');
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

  }
)

describe('CLI',
  function () {

    var cliFixturesPath
      , cli
      , emitter;

    before(
      function () {
        cliFixturesPath = path.join(fixturesPath, 'cli');
        cli = new CLI(path.join(cliFixturesPath, '__sprout__'));
        emitter = cli.emitter;
      }
    )

    it('should have sprout instance',
      function (done) {
        cli.sprout.should.be.ok;
        done();
      }
    )

    it('should run add method',
      function (done) {
        var action = 'add'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` from ' + src + ' added!');
        }
        var onError = function (error) {
          throw error;
        }
        emitter.on('success', onSuccess);
        emitter.on('error', onError);
        cli.run({action: action, name: action, src: src}).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should run remove method',
      function (done) {
        var action = 'remove'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` removed!');
        }
        var onError = function (error) {
          throw error;
        }
        cli.run({action: 'add', name: action, src: src}).then(
          function () {
            emitter.on('success', onSuccess);
            emitter.on('error', onError);
            return cli.run({action: action, name: action});
          }
        ).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            done();
          }
        )
      }
    )

    it('should run list method',
      function (done) {
        var action = 'list'
          , src = 'https://github.com/carrot/sprout-sprout';
        var onList = function (arr) {
          arr.should.include(action);
        }
        var onError = function (error) {
          throw error;
        }
        cli.run({action: 'add', name: action, src: src}).then(
          function () {
            emitter.on('list', onList);
            emitter.on('error', onError);
            return cli.run({action: action, name: action});
          }
        ).then(
          function () {
            emitter.removeListener('list', onList);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            done();
          }
        )
      }
    )

    it('should run init method',
      function (done) {
        var action = 'init'
          , initFixturesPath = path.join(cliFixturesPath, 'init')
          , src = path.join(initFixturesPath, 'src')
          , target = path.join(initFixturesPath, 'target');
        var onSuccess = function (message) {
          message.should.eq('template `' + action + '` initialized at ' + target + '!');
        }
        var onError = function (error) {
          throw error;
        }
        initGitRepository(src).then(
          function () {
            return cli.run({action: 'add', name: action, src: src});
          }
        ).then(
          function () {
            emitter.on('success', onSuccess);
            emitter.on('error', onError);
            return cli.run({action: action, name: action, target: target});
          }
        ).then(
          function () {
            emitter.removeListener('success', onSuccess);
            emitter.removeListener('error', onError);
            return cli.run({action: 'remove', name: action});
          }
        ).then(
          function () {
            return rimraf(target, done);
          }
        )
      }
    )

  }
)

/*
 * Helper function for creating a git repository
 * in the specified directory.
 * @param {String} dir - directory to create repo in.
 */

 var initGitRepository = function (dir) {
   return Promise.promisify(exec)('git init ' + dir);
 }
