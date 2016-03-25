/* global describe, it, before */

import chai from 'chai'
import path from 'path'
import fs from 'fs'
import W from 'when'
import node from 'when/node'
import _rimraf from 'rimraf'
import mockery from 'mockery'
import errno from 'errno'
import { exec as _exec } from 'child_process'
import os from 'os'
import Sprout from '..'
import apiAdd from '../lib/api/add'
import apiInit from '../lib/api/init'
import apiRemove from '../lib/api/remove'
import apiRun from '../lib/api/run'
import Template from '../lib/template'
import Utils from '../lib/utils'
import * as helpers from '../lib/helpers'

const exec = node.lift(_exec)
const rimraf = node.lift(_rimraf)
const fixturesPath = path.join(__dirname, 'fixtures')

chai.should()

describe('sprout',
  function () {
    var sproutFixturesPath,
      sprout

    before(
      function () {
        sproutFixturesPath = path.join(fixturesPath, 'sprout')
        sprout = new Sprout(path.join(sproutFixturesPath, '__sprout__'))
      }
    )

    it('should construct with a valid path',
      function (done) {
        var p = path.join(sproutFixturesPath, 'validPath')
        ;(function () { return new Sprout(p) })().should.be.ok
        done()
      }
    )

    it("should throw if path doesn't exist",
      function (done) {
        var p = 'foo/bar/foo/bar/foo/bar/doge'
        ;(function () { return new Sprout(p) }).should.throw(p + ' does not exist')
        done()
      }
    )

    it('should throw if path is not a directory',
      function (done) {
        var p = path.join(sproutFixturesPath, 'notDirectory.foo')
        ;(function () { return new Sprout(p) }).should.throw(p + ' is not a directory')
        done()
      }
    )

    it('should instantiate all directories as template objects.',
      function (done) {
        var p = path.join(sproutFixturesPath, 'templates')
        var newSprout = new Sprout(p)
        newSprout.templates['foo'].should.be.instanceof(Template)
        newSprout.templates['bar'].should.be.instanceof(Template)
        done()
      }
    )

    describe('add',
      function () {
        it('should add template',
          function (done) {
            var name = 'add'
            var src = 'https://github.com/carrot/sprout-sprout'
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template)
                sprout.templates[name].src.should.eq(src)
                fs.existsSync(sprout.templates[name].path).should.be.true
                return sprout.remove(name)
              }
            ).then(
              function () {
                done()
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.add(null, 'https://github.com/carrot/sprout-sprout') }).should.throw
            done()
          }
        )
      }
    )

    describe('remove',
      function () {
        it('should remove template',
          function (done) {
            var name = 'remove'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template
            sprout.add(name, src).then(
              function (sprout) {
                template = sprout.templates[name]
                template.should.be.instanceof(Template)
                template.src.should.eq(src)
                fs.existsSync(template.path).should.be.true
                return sprout.remove(name)
              }
            ).then(
              function () {
                (sprout.templates[name] === undefined).should.be.true
                fs.existsSync(template.path).should.be.false
                done()
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.remove(null) }).should.throw
            done()
          }
        )
      }
    )

    describe('init',
      function () {
        it('should init template',
          function (done) {
            var name = 'init'
            var fixture = path.join(sproutFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            sprout.add(name, src).then(
              function (sprout) {
                sprout.templates[name].should.be.instanceof(Template)
                sprout.templates[name].src.should.eq(src)
                fs.existsSync(sprout.templates[name].path).should.be.true
                return sprout.init(name, target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                })
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true
                return sprout.remove(name)
              }
            ).then(
              function () {
                rimraf(target, done)
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.init(null) }).should.throw
            done()
          }
        )
      }
    )

    describe('run',
      function () {
        it('should run generator in template',
          function (done) {
            var name = 'run'
            var fixture = path.join(sproutFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            return gitInit(src).then(
              function () {
                return sprout.add(name, src)
              }
            ).then(
              function () {
                sprout.templates[name].should.be.instanceof(Template)
                sprout.templates[name].src.should.eq(src)
                fs.existsSync(sprout.templates[name].path).should.be.true
                return sprout.init(name, target)
              }
            ).then(
              function () {
                return sprout.run(name, target, 'foo')
              }
            ).then(
              function () {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return sprout.remove(name)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw if no name',
          function (done) {
            (function () { sprout.run(null) }).should.throw
            done()
          }
        )
      }
    )
  }
)

describe('api',
  function () {
    var apiFixturesPath,
      sprout

    before(
      function () {
        apiFixturesPath = path.join(fixturesPath, 'api')
        sprout = new Sprout(path.join(apiFixturesPath, '__sprout__'))
      }
    )

    describe('add',
      function () {
        it('should add template',
          function (done) {
            return apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout').then(
              function () {
                sprout.templates['foo'].should.be.ok
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.true
                return apiRemove(sprout, 'foo')
              }
            ).then(
              function () {
                done()
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
            return apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout').then(
              function () {
                sprout.templates['foo'].should.be.ok
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.true
                return apiRemove(sprout, 'foo')
              }
            ).then(
              function () {
                (sprout.templates['foo'] === undefined).should.be.true
                fs.existsSync(path.join(sprout.path, 'foo')).should.be.false
                done()
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiRemove(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist')
                done()
              }
            )
          }
        )
      }
    )

    describe('init',
      function () {
        it('should init template',
          function (done) {
            var action = 'init'
            var fixture = path.join(apiFixturesPath, action)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            return gitInit(src).then(
              function () {
                return apiAdd(sprout, action, src)
              }
            ).then(
              function () {
                sprout.templates[action].should.be.ok
                fs.existsSync(path.join(sprout.path, action)).should.be.true
                return apiInit(sprout, action, target)
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true
                return apiRemove(sprout, action)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiInit(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist')
                done()
              }
            )
          }
        )
      }
    )

    describe('run',
      function () {
        it('should run generator in template',
          function (done) {
            var action = 'run'
            var fixture = path.join(apiFixturesPath, action)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            return gitInit(src).then(
              function () {
                return apiAdd(sprout, action, src)
              }
            ).then(
              function () {
                sprout.templates[action].should.be.ok
                fs.existsSync(path.join(sprout.path, action)).should.be.true
                return apiInit(sprout, action, target)
              }
            ).then(
              function () {
                fs.existsSync(target).should.be.true
                return apiRun(sprout, action, target, 'foo')
              }
            ).then(
              function () {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return apiRemove(sprout, action)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw if template does not exists',
          function (done) {
            return apiRun(sprout, 'foo').catch(
              function (error) {
                error.toString().should.eq('Error: template foo does not exist')
                done()
              }
            )
          }
        )
      }
    )
  }
)

describe('template',
  function () {
    var templateFixturesPath,
      sprout

    before(
      function () {
        templateFixturesPath = path.join(fixturesPath, 'template')
        sprout = new Sprout(path.join(templateFixturesPath, '__sprout__'))
      }
    )

    it('should construct with a valid name and path',
      function (done) {
        var name = 'validNamePath'
        var src = path.join(templateFixturesPath, name)
        ;(function () { return new Template({ sprout: sprout, name: name, src: src }) }).should.be.ok
        done()
      }
    )

    it('should throw without a valid name',
      function (done) {
        var name = null
        var src = path.join(templateFixturesPath, 'foo')
        ;(function () { return new Template({ sprout: sprout, name: name, src: src }) }).should.throw
        done()
      }
    )

    it('should determine that src is remote',
      function (done) {
        var name = 'foo'
        var src = 'https://github.com/carrot/sprout-sprout'
        var template = new Template({ sprout: sprout, name: name, src: src })
        template.isRemote.should.be.true
        done()
      }
    )

    it('should determine that src is local',
      function (done) {
        var name = 'foo'
        var src = path.join(templateFixturesPath, 'isLocal')
        var template = new Template({ sprout: sprout, name: name, src: src })
        template.isRemote.should.be.false
        done()
      }
    )

    describe('save',
      function () {
        var saveTemplateFixturesPath

        before(
          function () {
            saveTemplateFixturesPath = path.join(templateFixturesPath, 'save')
          }
        )

        it('should save a remote template',
          function (done) {
            var name = 'remote'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.remove(name)
              }
            ).then(
              function () {
                done()
              }
            )
          }
        )

        it('should save a local template',
          function (done) {
            var name = 'local'
            var src = path.join(saveTemplateFixturesPath, name)
            var template = new Template({ sprout: sprout, name: name, src: src })
            gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.remove(name)
              }
            ).then(
              function () {
                done()
              }
            )
          }
        )

        it('should replace existing template with same name',
          function (done) {
            var name = 'replace'
            var src = path.join(saveTemplateFixturesPath, name)
            var template = new Template({ sprout: sprout, name: name, src: 'https://github.com/carrot/sprout-sprout' })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return gitInit(src)
              }
            ).then(
              function () {
                return (new Template({ sprout: sprout, name: name, src: src })).save()
              }
            ).then(
              function () {
                fs.existsSync(template.path).should.be.true
                template.name.should.eq(name)
                fs.readFileSync(path.join(template.path, 'init.js'), 'utf8').should.eq('module.exports = {};\n')
                return template.remove(name)
              }
            ).then(
              function () {
                done()
              }
            )
          }
        )

        it('should throw if template has no src',
          function (done) {
            var name = 'noSrc'
            var template = new Template({ sprout: sprout, name: name })
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: no source provided')
                done()
              }
            )
          }
        )

        it('should throw if src is remote and there is no internet',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false})
            mockery.registerMock('dns', {
              resolve: function (name, callback) {
                return callback(errno.code.ECONNREFUSED)
              }
            })
            var name = 'noInternet'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template = new (require('./../lib/template'))({ sprout: sprout, name: name, src: src })
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: make sure that you are connected to the internet!')
                mockery.deregisterMock('dns')
                mockery.disable()
                done()
              }
            )
          }
        )

        it("should throw if src is local and doesn't exist",
          function (done) {
            var name = 'noLocal'
            var src = path.join(saveTemplateFixturesPath, name)
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: there is no sprout template located at ' + src)
                done()
              }
            )
          }
        )

        it("should throw if src is local and isn't a git repo",
          function (done) {
            var name = 'noGit'
            var src = path.join(saveTemplateFixturesPath, name)
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().catch(
              function (error) {
                error.toString().should.eq('Error: ' + src + ' is not a git repository')
                done()
              }
            )
          }
        )
      }
    )

    describe('init',
      function () {
        var initTemplateFixturesPath

        before(
          function () {
            initTemplateFixturesPath = path.join(templateFixturesPath, 'init')
          }
        )

        it('should init template',
          function (done) {
            var name = 'init'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {
                  locals: {
                    name: 'bar',
                    description: 'foo',
                    github_username: 'carrot'
                  }
                })
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw when no root path',
          function (done) {
            var name = 'noRoot'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return rimraf(template.rootPath)
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: root path does not exist in template')
                fs.mkdirSync(template.rootPath)
                fs.writeFileSync(path.join(template.rootPath, '.keep'), '')
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should throw when no target provided',
          function (done) {
            var name = 'noRoot'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(null)
              }
            ).catch(
              function (error) {
                error.toString().should.match(/"target" must be a string/)
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should throw when target is not git repository',
          function (done) {
            var name = 'noGit'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function () {
                fs.existsSync(template.path).should.be.true
                return rimraf(path.join(template.path, '.git'))
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository')
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should throw when target exists',
          function (done) {
            var name = 'targetExists'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function () {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + target + ' already exists')
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should throw when no init.js provided',
          function (done) {
            var name = 'init'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                fs.unlinkSync(path.join(template.path, 'init.js'))
                return template.init(target)
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: init.js does not exist in this template')
                return template.remove().then(
                  function () {
                    rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should throw when require init throws',
          function (done) {
            var name = 'initThrows'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).catch(
              function (error) {
                error.toString().should.eq("Error: Cannot find module 'doge'")
                return template.remove().then(
                  function () {
                    rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should use init.js',
          function (done) {
            var name = 'initJs'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should use a different git branch if specified',
          function (done) {
            var name = 'branch'
            var fixture = path.join(initTemplateFixturesPath, name)
            var sproutPath = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), '__sprout__')
            var src = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), name)
            var srcRoot = path.join(src, 'root')
            var srcInit = path.join(src, 'init.js')
            var target = path.join(fixture, 'target')
            var template
            return rimraf(sproutPath).then(
              function () {
                fs.mkdirSync(sproutPath)
                return rimraf(src)
              }
            ).then(
              function () {
                fs.mkdirSync(src)
                fs.writeFileSync(srcInit, 'module.exports={};')
                fs.mkdirSync(srcRoot)
                fs.writeFileSync(path.join(srcRoot, '.keep'), '')
                template = new Template({ sprout: new Sprout(sproutPath), name: name, src: src })
              }
            ).then(
              function () {
                return gitInit(src)
              }
            ).then(
              function () {
                return gitCommitAdd(src)
              }
            ).then(
              function () {
                return template.save()
              }
            )
              .then(
                function () {
                  return gitCreateBranch(template.path, name)
                }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.rootPath, 'foo'), '', 'utf8')
                return gitCommitAdd(template.path)
              }
            ).then(
              function () {
                return gitCheckout(template.path, 'master')
              }
            ).then(
              function () {
                return template.init(target, {branch: name})
              }
            ).then(
              function () {
                fs.existsSync(path.join(target, 'foo')).should.be.true
                return gitCurrentBranch(template.path)
              }
            ).then(
              function (branch) {
                branch.should.eq('master\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should use a different git tag if specified',
          function (done) {
            var name = 'tag'
            var fixture = path.join(initTemplateFixturesPath, name)
            var sproutPath = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), '__sprout__')
            var src = path.join((os.tmpdir ? os.tmpdir() : os.tmpDir()), name)
            var srcRoot = path.join(src, 'root')
            var srcInit = path.join(src, 'init.js')
            var target = path.join(fixture, 'target')
            var template
            return rimraf(sproutPath).then(
              function () {
                fs.mkdirSync(sproutPath)
                return rimraf(src)
              }
            ).then(
              function () {
                fs.mkdirSync(src)
                fs.writeFileSync(srcInit, 'module.exports={};')
                fs.mkdirSync(srcRoot)
                fs.writeFileSync(path.join(srcRoot, '.keep'), '')
                template = new Template({ sprout: new Sprout(sproutPath), name: name, src: src })
              }
            ).then(
              function () {
                return gitInit(src)
              }
            ).then(
              function () {
                return gitCommitAdd(src)
              }
            ).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.rootPath, 'foo'), '', 'utf8')
                return gitCommitAdd(template.path)
              }
            )
              .then(
                function () {
                  return gitTag(template.path, name)
                }
            ).then(
              function () {
                fs.writeFileSync(path.join(template.rootPath, 'foo2'), '', 'utf8')
                return gitCommitAdd(template.path)
              }
            ).then(
              function () {
                return gitCheckout(template.path, 'master')
              }
            ).then(
              function () {
                return template.init(target, {tag: name})
              }
            ).then(
              function () {
                fs.existsSync(path.join(target, 'foo2')).should.be.false
                return gitCurrentBranch(template.path)
              }
            ).then(
              function (branch) {
                branch.should.eq('master\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it("should throw error if tag doesn't exist",
          function (done) {
            var name = 'tagMissing'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = 'https://github.com/carrot/sprout-sprout'
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {tag: 'foooooooo'})
              }
            ).catch(
              function (error) {
                error.toString().should.match(/Error: Command failed:.*git checkout tags\/foooooooo/)
                return template.remove().then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should use .json configuration file',
          function (done) {
            var name = 'jsonConfig'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {configPath: path.join(fixture, 'config.json')})
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should use .yaml configuration file',
          function (done) {
            var name = 'yamlConfig'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {configPath: path.join(fixture, 'config.yaml')})
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('it should ignore files specified in init',
          function (done) {
            var name = 'ignore'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('{{ foo }}\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('it should ignore one file specified in init',
          function (done) {
            var name = 'ignoreOne'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('{{ foo }}\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should ask questions if questionnaire is passed',
          function (done) {
            var name = 'questionnaire'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            var q = function () {
              return W.resolve({ foo: 'bar' })
            }
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {questionnaire: q})
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw error if configuration file is invalid',
          function (done) {
            var name = 'invalidConfig'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var configPath = path.join(fixture, 'foobar')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target, {configPath: configPath})
              }
            ).catch(
              function (error) {
                error.toString().should.match(/Error: ENOENT: no such file or directory/)
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should include underscore.string as EJS "local"',
          function (done) {
            var name = 'underscoreString'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('Bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should apply defaults',
          function (done) {
            var name = 'defaults'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should apply moment.js as a local',
          function (done) {
            var name = 'defaultsLocals'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8')
                  .should.eq('1984\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should install npm dependencies',
          function (done) {
            var name = 'npm'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(template.path, 'node_modules')).should.be.true
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should copy files that are binaries',
          function (done) {
            var name = 'binary'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                (fs.readFileSync(path.join(src, 'root', 'logo.png')).length === fs.readFileSync(path.join(target, 'logo.png')).length).should.be.true
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should run before hook',
          function (done) {
            var name = 'before'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true
                return template.remove()
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
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('foo\n')
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should run after hook',
          function (done) {
            var name = 'after'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.existsSync(path.join(target, 'bar')).should.be.true
                return template.remove()
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should remove target directory if error thrown after target directory created',
          function (done) {
            var name = 'removeTarget'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).catch(
              function () {
                fs.existsSync(target).should.be.false
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )

        it('should work if internet is missing',
          function (done) {
            mockery.enable({useCleanCache: true, warnOnUnregistered: false})
            mockery.registerMock('dns', {
              resolve: function (name, callback) {
                return callback(errno.code.ECONNREFUSED)
              }
            })
            var name = 'noInternet'
            var fixture = path.join(initTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.init(target)
              }
            ).then(
              function (template) {
                fs.existsSync(target).should.be.true
                return template.remove()
              }
            ).then(
              function () {
                mockery.deregisterMock('dns')
                mockery.disable()
                return rimraf(target, done)
              }
            )
          }
        )
      }
    )

    describe('update',
      function () {
        var updateTemplateFixturesPath

        before(function () {
          updateTemplateFixturesPath = path.join(templateFixturesPath, 'update')
        })

        it('should update',
          function (done) {
            var name = 'update'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return template.update()
              }
            ).then(
              function (template) {
                return template.remove()
              }
            ).then(
              function () {
                done()
              }
            )
          }
        )

        it('should throw error if not a git repo',
          function (done) {
            var name = 'noGit'
            var src = path.join(updateTemplateFixturesPath, name)
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.true
                return rimraf(path.join(template.path, '.git'))
              }
            ).then(
              function () {
                return template.update()
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + name + ' is not a git repository')
                return template.remove().then(
                  function () {
                    done()
                  }
                )
              }
            )
          }
        )
      }
    )

    describe('run',
      function () {
        var runTemplateFixturesPath

        before(
          function () {
            runTemplateFixturesPath = path.join(templateFixturesPath, 'run')
          }
        )

        it('should run generator',
          function (done) {
            var name = 'run'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo')
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return template.remove(name)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw if no target set',
          function (done) {
            var name = 'noTarget'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(null, 'foo')
              }
            ).catch(
              function (error) {
                error.toString().should.eq('ValidationError: child "target" fails because ["target" must be a string]')
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should throw if target missing',
          function (done) {
            var name = 'noTarget'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var fakeTarget = path.join(fixture, 'doge/doge/doge/doge/doge')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(fakeTarget, 'foo')
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: ' + fakeTarget + ' does not exist')
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should throw if no generator name',
          function (done) {
            var name = 'noGenerator'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, null)
              }
            ).catch(
              function (error) {
                error.toString().should.eq('ValidationError: child "generator" fails because ["generator" must be a string]')
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it('should throw if generator missing',
          function (done) {
            var name = 'generatorMissing'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo2')
              }
            ).catch(
              function (error) {
                error.toString().should.eq('Error: \'foo2\' is not a generator in this template')
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it("should run generator if it's a .js file",
          function (done) {
            var name = 'generatorJs'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo')
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return template.remove(name)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('should throw error if require returns error',
          function (done) {
            var name = 'requireError'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo')
              }
            ).catch(
              function (error) {
                error.toString().should.eq("Error: Cannot find module 'foo'")
                return template.remove(name).then(
                  function () {
                    return rimraf(target, done)
                  }
                )
              }
            )
          }
        )

        it.skip('it should pass arguments',
          function (done) {
            var name = 'arguments'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo', ['bar'])
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return template.remove(name)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )

        it('it should not break if undefined is passed as arguments',
          function (done) {
            var name = 'undefinedArguments'
            var fixture = path.join(runTemplateFixturesPath, name)
            var src = path.join(fixture, 'src')
            var target = path.join(fixture, 'target')
            var template = new Template({ sprout: sprout, name: name, src: src })
            return gitInit(src).then(
              function () {
                return template.save()
              }
            ).then(
              function () {
                return template.init(target)
              }
            ).then(
              function (template) {
                return template.run(target, 'foo', undefined)
              }
            ).then(
              function (template) {
                fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
                return template.remove(name)
              }
            ).then(
              function () {
                return rimraf(target, done)
              }
            )
          }
        )
      }
    )

    describe('remove',
      function () {
        it('should remove',
          function (done) {
            var name = 'remove'
            var src = 'https://github.com/carrot/sprout-sprout'
            var template = new Template({ sprout: sprout, name: name, src: src })
            return template.save().then(
              function () {
                return template.remove()
              }
            ).then(
              function (template) {
                fs.existsSync(template.path).should.be.false
                done()
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
    var utilsFixturesPath

    before(
      function () {
        utilsFixturesPath = path.join(fixturesPath, 'utils')
      }
    )

    describe('copy',
      function () {
        var utilsCopyFixturesPath

        before(
          function () {
            utilsCopyFixturesPath = path.join(utilsFixturesPath, 'copy')
          }
        )

        it('should copy from one path relative to the src, to another',
          function (done) {
            var fixture = path.join(utilsCopyFixturesPath, 'base')
            var utils = new Utils(fixture, fixture)
            return utils.copy('foo', 'bar').then(
              function () {
                fs.readFileSync(path.join(fixture, 'bar'), 'utf8').should.eq('bar\n')
                fs.unlinkSync(path.join(fixture, 'bar'))
                done()
              }
            )
          }
        )
      }
    )

    describe('src',
      function () {
        var utilsSrcFixturesPath

        before(
          function () {
            utilsSrcFixturesPath = path.join(utilsFixturesPath, 'src')
          }
        )

        it('should read from a path relative to the source path',
          function (done) {
            var fixture = path.join(utilsSrcFixturesPath, 'read')
            var utils = new Utils(fixture, null)
            return utils.src.read('foo').then(
              function (output) {
                output.should.eq('bar\n')
                done()
              }
            )
          }
        )

        it('should return the source path',
          function (done) {
            var fixture = path.join(utilsSrcFixturesPath, 'path')
            var utils = new Utils(fixture, null)
            utils.src.path.should.eq(fixture)
            done()
          }
        )
      }
    )

    describe('target',
      function () {
        var utilsTargetFixturesPath

        before(
          function () {
            utilsTargetFixturesPath = path.join(utilsFixturesPath, 'target')
          }
        )

        it('should return the target path',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'path')
            var utils = new Utils(fixture, null)
            utils.src.path.should.eq(fixture)
            done()
          }
        )

        it('should copy from one path to another, relative to the target',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'copy')
            var utils = new Utils(null, fixture)
            return utils.target.copy('foo', 'bar').then(
              function () {
                fs.readFileSync(path.join(fixture, 'bar'), 'utf8').should.eq('bar\n')
                fs.unlinkSync(path.join(fixture, 'bar'))
                done()
              }
            )
          }
        )

        it('should read from a path relative to the source path',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'read')
            var utils = new Utils(null, fixture)
            return utils.target.read('foo').then(
              function (output) {
                output.should.eq('bar\n')
                done()
              }
            )
          }
        )

        it('should write to path relative to the source path',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'write')
            var utils = new Utils(null, fixture)
            return utils.target.write('foo', 'bar').then(
              function (output) {
                fs.readFileSync(path.join(fixture, 'foo'), 'utf8').should.eq('bar')
                fs.unlinkSync(path.join(fixture, 'foo'))
                done()
              }
            )
          }
        )

        it('should write to path relative to the source path and use locals',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'writeLocals')
            var utils = new Utils(null, fixture)
            return utils.target.write('foo', '{{ foo }}', {foo: 'bar'}).then(
              function (output) {
                fs.readFileSync(path.join(fixture, 'foo'), 'utf8').should.eq('bar')
                fs.unlinkSync(path.join(fixture, 'foo'))
                done()
              }
            )
          }
        )

        it('should write to path relative to the source path recursively',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'writeRecursive')
            var utils = new Utils(null, fixture)
            return utils.target.write('nested/deep/foo', 'bar').then(
              function (output) {
                fs.readFileSync(path.join(fixture, 'nested', 'deep', 'foo'), 'utf8').should.eq('bar')
                rimraf(path.join(fixture, 'nested')).then(_ => done())
              }
            )
          }
        )

        it('should write to path relative to the source path recursively, even if dir exists',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'writeRecursiveExists')
            var utils = new Utils(null, fixture)
            return utils.target.write('nested/deep/foo', 'bar').then(
              function (output) {
                fs.readFileSync(path.join(fixture, 'nested', 'deep', 'foo'), 'utf8').should.eq('bar')
                rimraf(path.join(fixture, 'nested', 'deep')).then(_ => done())
              }
            )
          }
        )

        it('should rename from one path to another, relative to the target',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'rename')
            var utils = new Utils(null, fixture)
            return utils.target.rename('foo', 'bar').then(
              function () {
                fs.existsSync(path.join(fixture, 'bar')).should.be.true
                fs.renameSync(path.join(fixture, 'bar'), path.join(fixture, 'foo'))
                done()
              }
            )
          }
        )

        it('should remove from a path, relative to the target',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'remove')
            var utils = new Utils(null, fixture)
            return utils.target.remove('foo').then(
              function () {
                fs.existsSync(path.join(fixture, 'foo')).should.be.false
                fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
                done()
              }
            )
          }
        )

        it('should remove an array of paths, relative to the target',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'removeArray')
            var utils = new Utils(null, fixture)
            return utils.target.remove(['foo', 'bar']).then(
              function () {
                fs.existsSync(path.join(fixture, 'foo')).should.be.false
                fs.existsSync(path.join(fixture, 'bar')).should.be.false
                fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
                fs.writeFileSync(path.join(fixture, 'bar'), '', 'utf8')
                done()
              }
            )
          }
        )

        it('should execute a command with the target as a working directory',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'exec')
            var utils = new Utils(null, fixture)
            return utils.target.exec('rm -rf foo').then(
              function () {
                fs.existsSync(path.join(fixture, 'foo')).should.be.false
                fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
                done()
              }
            )
          }
        )

        it('should execute a command with a path relative to the target as a working directory',
          function (done) {
            var fixture = path.join(utilsTargetFixturesPath, 'execRelative')
            var utils = new Utils(null, fixture)
            return utils.target.exec('rm -rf foo', 'bar').then(
              function () {
                fs.existsSync(path.join(fixture, 'bar', 'foo')).should.be.false
                fs.writeFileSync(path.join(fixture, 'bar', 'foo'), '', 'utf8')
                done()
              }
            )
          }
        )
      }
    )
  }
)

describe('helpers',
  function () {
    describe('isGitURL',
      function () {
        it('should determine is git url',
          function (done) {
            helpers.isGitUrl('git@github.com:foo/bar').should.be.true
            done()
          }
        )

        it('should determine is not git url',
          function (done) {
            helpers.isGitUrl('asdfadsfasdf').should.be.false
            done()
          }
        )
      }
    )
  }
)

/*
 * Helper function for initializing a git repository
 * in the specified directory.
 * @param {String} dir - directory to create repo in.
 */

var gitInit = function (dir) {
  return exec('git init .', { cwd: dir })
}

/*
 * Helper function for `git tag` command
 * in the specified directory.
 * @param {String} dir - git repo.
 * @param {String} tag - tag to create.
 */

var gitTag = function (dir, tag) {
  return exec('git tag ' + tag, { cwd: dir })
}

/*
 * Helper function for creating a new branch
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

var gitCreateBranch = function (dir, branch) {
  return exec('git checkout -b ' + branch, { cwd: dir })
}

/*
 * Helper function for `git checkout` command
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

var gitCheckout = function (dir, branch) {
  return exec('git checkout ' + branch, { cwd: dir })
}

/*
 * Helper function for committing all added,
 * files in a git repository.
 * @param {String} dir - git repo.
 */

var gitCommitAdd = function (dir) {
  return exec('git add . && git commit -m "sprout test" .', { cwd: dir })
}

/*
 * Helper function for determining the
 * current git branch for a repository.
 * @param {String} dir - git repo.
 */

var gitCurrentBranch = function (dir) {
  return exec('git rev-parse --abbrev-ref HEAD', { cwd: dir }).spread(
    function (stdout) {
      return stdout
    }
  )
}
