var Sprout = require('./../lib')
  , Template = require('../lib/template')
  , chai = require('chai')
  , path = require('path')
  , fs = require('fs')
  , rimraf = require('rimraf');

var fixturesPath = path.join(__dirname, 'fixtures')
  , fixtures;

chai.should()

describe('sprout',
  function () {

    before(
      function () {
        fixtures = path.join(fixturesPath, 'sprout');
      }
    )

    it('should construct with a valid path',
      function (done) {
        var p = path.join(fixtures, 'validPath');
        (function () { return new Sprout(p) })
        done();
      }
    )

    it('should throw if path doesn\'t exist',
      function (done) {
        var p = path.join(fixtures, 'invalidPath');
        (function () { return new Sprout(p) }).should.throw(p + ' does not exist');
        done();
      }
    )

    it('should throw if path is not a directory',
      function (done) {
        var p = path.join(fixtures, 'notDirectory.foo');
        (function () { return new Sprout(p) }).should.throw(p + ' is not a directory');
        done();
      }
    )

    it('should instantiate all directories as template objects.',
      function (done) {
        var p = path.join(fixtures, 'templates')
          , sprout = new Sprout(p);
        sprout.templates['foo'].should.be.instanceof(Template);
        sprout.templates['bar'].should.be.instanceof(Template);
        done();
      }
    )

    describe('add',
      function () {

        it('should add template',
          function (done) {
            var p = path.join(fixtures, 'add')
              , sprout = new Sprout(p)
              , name = 'foo'
              , src = 'git@github.com:carrot/sprout-sprout';
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template);
                sprout.templates[name].src.should.eq(src);
                fs.existsSync(sprout.templates[name].path).should.be.true;
                rimraf(sprout.templates[name].path, done);
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            var p = path.join(fixtures, 'add')
              , sprout = new Sprout(p);
            (function () { sprout.add(null, 'git@github.com:carrot/sprout-sprout') }).should.throw;
            done();
          }
        )

        it('should throw if no src',
          function (done) {
            var p = path.join(fixtures, 'add')
              , sprout = new Sprout(p);
            sprout.add('foo', null).catch(
              function (error) {
                done();
              }
            )
          }
        )

      }
    )

    describe('remove',
      function () {

        it('should remove template',
          function (done) {
            var p = path.join(fixtures, 'remove')
              , sprout = new Sprout(p)
              , name = 'foo'
              , src = 'git@github.com:carrot/sprout-sprout'
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
              function (sprout) {
                (sprout.templates[name] === undefined).should.be.true;
                fs.existsSync(template.path).should.be.false;
                done();
              }
            );
          }
        )

        it('should throw if no name',
          function (done) {
            var p = path.join(fixtures, 'remove')
              , sprout = new Sprout(p);
            (function () { sprout.remove(null) }).should.throw;
            done();
          }
        )

      }
    )

    describe('update',
      function () {

        it('should update template',
          function (done) {
            var p = path.join(fixtures, 'update')
              , sprout = new Sprout(p)
              , name = 'foo'
              , src = 'git@github.com:carrot/sprout-sprout';
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name];
                template.should.be.instanceof(Template);
                template.src.should.eq(src);
                fs.existsSync(template.path).should.be.true;
                return sprout.update(name);
              }
            ).then(
              function (sprout) {
                done();
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            var p = path.join(fixtures, 'update')
              , sprout = new Sprout(p);
            (function () { sprout.update(null) }).should.throw;
            done();
          }
        )

      }
    )

    describe('init',
      function () {

        it('should init template',
          function (done) {
            var p = path.join(fixtures, 'init')
              , sprout = new Sprout(p)
              , name = 'foo'
              , src = 'git@github.com:carrot/sprout-sprout'
              , target = path.join(p, 'bar');
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name];
                template.should.be.instanceof(Template);
                template.src.should.eq(src);
                fs.existsSync(template.path).should.be.true;
                return sprout.init(name, target, {
                  defaults: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).then(
              function (sprout) {
                fs.existsSync(target).should.be.true;
                rimraf(sprout.templates[name].path,
                  function () {
                    rimraf(target, done);
                  }
                );
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            var p = path.join(fixtures, 'init')
              , sprout = new Sprout(p);
            (function () { sprout.init(null) }).should.throw;
            done();
          }
        )

        it('should throw if no target',
          function (done) {
            var p = path.join(fixtures, 'init')
              , sprout = new Sprout(p)
              , name = 'foo'
              , src = 'git@github.com:carrot/sprout-sprout';
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name];
                template.should.be.instanceof(Template);
                template.src.should.eq(src);
                fs.existsSync(template.path).should.be.true;
                return sprout.init(name, null, {
                  defaults: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                });
              }
            ).catch(
              function () {
                rimraf(sprout.templates[name].path, done);
              }
            );
          }
        )

      }
    )

  }
)
