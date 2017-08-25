/* global describe, it, before */

import chai from 'chai'
import dirtyChai from 'dirty-chai'
import chaiAsPromised from 'chai-as-promised'
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

chai.use(dirtyChai)
chai.use(chaiAsPromised)
chai.should()

describe('sprout', () => {
  let sproutFixturesPath, sprout

  before(() => {
    sproutFixturesPath = path.join(fixturesPath, 'sprout')
    sprout = new Sprout(path.join(sproutFixturesPath, '__sprout__'))
  })

  it('should construct with a valid path', done => {
    const p = path.join(sproutFixturesPath, 'validPath')
    ;(() => new Sprout(p))().should.be.ok()
    done()
  })

  it("should throw if path doesn't exist", done => {
    const p = 'foo/bar/foo/bar/foo/bar/doge'
    ;(() => new Sprout(p)).should.throw(`${p} does not exist`)
    done()
  })

  it('should throw if path is not a directory', done => {
    const p = path.join(sproutFixturesPath, 'notDirectory.foo')
    ;(() => new Sprout(p)).should.throw(`${p} is not a directory`)
    done()
  })

  it('should instantiate all directories as template objects.', done => {
    const p = path.join(sproutFixturesPath, 'templates')
    const newSprout = new Sprout(p)
    newSprout.templates.foo.should.be.instanceof(Template)
    newSprout.templates.bar.should.be.instanceof(Template)
    done()
  })

  describe('add', () => {
    it('should add template', done => {
      const name = 'add'
      const src = 'https://github.com/carrot/sprout-sprout'
      sprout
        .add(name, src)
        .then(sprout => {
          sprout.templates[name].should.be.instanceof(Template)
          sprout.templates[name].src.should.eq(src)
          fs.existsSync(sprout.templates[name].path).should.be.true()
          return sprout.remove(name)
        })
        .then(() => done())
    })

    it('should throw if no name', done => {
      (() => sprout.add(null, 'https://github.com/carrot/sprout-sprout')).should.throw()
      done()
    })
  })

  describe('remove', () => {
    it('should remove template', done => {
      const name = 'remove'
      const src = 'https://github.com/carrot/sprout-sprout'
      let template
      sprout
        .add(name, src)
        .then(sprout => {
          template = sprout.templates[name]
          template.should.be.instanceof(Template)
          template.src.should.eq(src)
          fs.existsSync(template.path).should.be.true()
          return sprout.remove(name)
        })
        .then(() => {
          ;(sprout.templates[name] === undefined).should.be.true()
          fs.existsSync(template.path).should.be.false()
          done()
        })
    })

    it('should throw if no name', done => {
      sprout.remove(null).should.be.rejected()
      done()
    })
  })

  describe('init', () => {
    it('should init template', done => {
      const name = 'init'
      const fixture = path.join(sproutFixturesPath, name)
      const src = 'https://github.com/carrot/sprout-sprout'
      const target = path.join(fixture, 'target')
      sprout
        .add(name, src)
        .then(sprout => {
          sprout.templates[name].should.be.instanceof(Template)
          sprout.templates[name].src.should.eq(src)
          fs.existsSync(sprout.templates[name].path).should.be.true()
          return sprout.init(name, target, {
            locals: {
              name: 'bar',
              description: 'foo',
              github_username: 'carrot'
            }
          })
        })
        .then(() => {
          fs.existsSync(target).should.be.true()
          return sprout.remove(name)
        })
        .then(() => {
          rimraf(target, done)
        })
    })

    it('should throw if no name', done => {
      sprout.init(null).should.be.rejected()
      done()
    })
  })

  describe('run', () => {
    it('should run generator in template', done => {
      const name = 'run'
      const fixture = path.join(sproutFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      gitInit(src)
        .then(() => sprout.add(name, src))
        .then(() => {
          sprout.templates[name].should.be.instanceof(Template)
          sprout.templates[name].src.should.eq(src)
          fs.existsSync(sprout.templates[name].path).should.be.true()
          return sprout.init(name, target)
        })
        .then(() => sprout.run(name, target, 'foo'))
        .then(() => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return sprout.remove(name)
        })
        .then(() => rimraf(target, done))
    })

    it('should throw if no name', done => {
      sprout.run(null).should.be.rejected()
      done()
    })
  })
})

describe('api', () => {
  let apiFixturesPath, sprout

  before(() => {
    apiFixturesPath = path.join(fixturesPath, 'api')
    sprout = new Sprout(path.join(apiFixturesPath, '__sprout__'))
  })

  describe('add', () => {
    it('should add template', done => {
      apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout')
        .then(() => {
          sprout.templates.foo.should.be.ok()
          fs.existsSync(path.join(sprout.path, 'foo')).should.be.true()
          return apiRemove(sprout, 'foo')
        })
        .then(() => done())
    })
  })

  describe('remove', () => {
    it('should remove template', done => {
      apiAdd(sprout, 'foo', 'https://github.com/carrot/sprout-sprout')
        .then(() => {
          sprout.templates.foo.should.be.ok()
          fs.existsSync(path.join(sprout.path, 'foo')).should.be.true()
          return apiRemove(sprout, 'foo')
        })
        .then(() => {
          ;(sprout.templates.foo === undefined).should.be.true()
          fs.existsSync(path.join(sprout.path, 'foo')).should.be.false()
          done()
        })
    })

    it('should throw if template does not exists', done => {
      apiRemove(sprout, 'foo').catch(error => {
        error.toString().should.eq('Error: template foo does not exist')
        done()
      })
    })
  })

  describe('init', () => {
    it('should init template', done => {
      const action = 'init'
      const fixture = path.join(apiFixturesPath, action)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      gitInit(src)
        .then(() => apiAdd(sprout, action, src))
        .then(() => {
          sprout.templates[action].should.be.ok()
          fs.existsSync(path.join(sprout.path, action)).should.be.true()
          return apiInit(sprout, action, target)
        })
        .then(() => {
          fs.existsSync(target).should.be.true()
          return apiRemove(sprout, action)
        })
        .then(() => rimraf(target, done))
    })

    it('should throw if template does not exists', done => {
      apiInit(sprout, 'foo').catch(error => {
        error.toString().should.eq('Error: template foo does not exist')
        done()
      })
    })
  })

  describe('run', () => {
    it('should run generator in template', done => {
      const action = 'run'
      const fixture = path.join(apiFixturesPath, action)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      gitInit(src)
        .then(() => apiAdd(sprout, action, src))
        .then(() => {
          sprout.templates[action].should.be.ok()
          fs.existsSync(path.join(sprout.path, action)).should.be.true()
          return apiInit(sprout, action, target)
        })
        .then(() => {
          fs.existsSync(target).should.be.true()
          return apiRun(sprout, action, target, 'foo')
        })
        .then(() => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return apiRemove(sprout, action)
        })
        .then(() => rimraf(target, done))
    })

    it('should throw if template does not exists', done => {
      apiRun(sprout, 'foo').catch(error => {
        error.toString().should.eq('Error: template foo does not exist')
        done()
      })
    })
  })
})

describe('template', () => {
  let templateFixturesPath, sprout

  before(() => {
    templateFixturesPath = path.join(fixturesPath, 'template')
    sprout = new Sprout(path.join(templateFixturesPath, '__sprout__'))
  })

  it('should construct with a valid name and path', done => {
    const name = 'validNamePath'
    const src = path.join(templateFixturesPath, name)
    ;(() => new Template({ sprout, name, src })).should.be.ok()
    done()
  })

  it('should throw without a valid name', done => {
    const name = null
    const src = path.join(templateFixturesPath, 'foo')
    ;(() => new Template({ sprout, name, src })).should.throw()
    done()
  })

  it('should determine that src is remote', done => {
    const name = 'foo'
    const src = 'https://github.com/carrot/sprout-sprout'
    const template = new Template({ sprout, name, src })
    template.isRemote.should.be.true()
    done()
  })

  it('should determine that src is local', done => {
    const name = 'foo'
    const src = path.join(templateFixturesPath, 'isLocal')
    const template = new Template({ sprout, name, src })
    template.isRemote.should.be.false()
    done()
  })

  describe('save', () => {
    let saveTemplateFixturesPath

    before(() => {
      saveTemplateFixturesPath = path.join(templateFixturesPath, 'save')
    })

    it('should save a remote template', done => {
      const name = 'remote'
      const src = 'https://github.com/carrot/sprout-sprout'
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.remove(name)
        })
        .then(() => done())
    })

    it('should save a local template', done => {
      const name = 'local'
      const src = path.join(saveTemplateFixturesPath, name)
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.remove(name)
        })
        .then(() => done())
    })

    it('should replace existing template with same name', done => {
      const name = 'replace'
      const src = path.join(saveTemplateFixturesPath, name)
      const template = new Template({
        sprout,
        name,
        src: 'https://github.com/carrot/sprout-sprout'
      })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return gitInit(src)
        })
        .then(() => new Template({ sprout, name, src }).save())
        .then(() => {
          fs.existsSync(template.path).should.be.true()
          template.name.should.eq(name)
          fs
            .readFileSync(path.join(template.path, 'init.js'), 'utf8')
            .should.eq('module.exports = {};\n')
          return template.remove(name)
        })
        .then(() => done())
    })

    it('should throw if template has no src', done => {
      const name = 'noSrc'
      const template = new Template({ sprout, name })
      template.save().catch(error => {
        error.toString().should.eq('Error: no source provided')
        done()
      })
    })

    it('should throw if src is remote and there is no internet', done => {
      mockery.enable({ useCleanCache: true, warnOnUnregistered: false })
      mockery.registerMock('dns', {
        resolve (name, callback) {
          return callback(errno.code.ECONNREFUSED)
        }
      })
      const name = 'noInternet'
      const src = 'https://github.com/carrot/sprout-sprout'
      const template = new (require('./../lib/template'))({
        sprout,
        name,
        src
      })
      template.save().catch(error => {
        error
          .toString()
          .should.eq('Error: make sure that you are connected to the internet!')
        mockery.deregisterMock('dns')
        mockery.disable()
        done()
      })
    })

    it("should throw if src is local and doesn't exist", done => {
      const name = 'noLocal'
      const src = path.join(saveTemplateFixturesPath, name)
      const template = new Template({ sprout, name, src })
      template.save().catch(error => {
        error
          .toString()
          .should.eq(`Error: there is no sprout template located at ${src}`)
        done()
      })
    })
  })

  describe('init', () => {
    let initTemplateFixturesPath

    before(() => {
      initTemplateFixturesPath = path.join(templateFixturesPath, 'init')
    })

    it('should init template', done => {
      const name = 'init'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = 'https://github.com/carrot/sprout-sprout'
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, {
            locals: {
              name: 'bar',
              description: 'foo',
              github_username: 'carrot'
            }
          })
        })
        .then(template => {
          fs.existsSync(target).should.be.true()
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should throw when no root path', done => {
      const name = 'noRoot'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return rimraf(template.rootPath)
        })
        .then(() => template.init(target))
        .catch(error => {
          error
            .toString()
            .should.eq('Error: root path does not exist in template')
          fs.mkdirSync(template.rootPath)
          fs.writeFileSync(path.join(template.rootPath, '.keep'), '')
          return template.remove().then(() => done())
        })
    })

    it('should throw when no target provided', done => {
      const name = 'noRoot'
      const src = 'https://github.com/carrot/sprout-sprout'
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(null)
        })
        .catch(error => {
          error.toString().should.match(/"target" must be a string/)
          return template.remove().then(() => done())
        })
    })

    it('should throw when target exists', done => {
      const name = 'targetExists'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = 'https://github.com/carrot/sprout-sprout'
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(() => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .catch(error => {
          error.toString().should.eq(`Error: ${target} already exists`)
          return template.remove().then(() => done())
        })
    })

    it('should throw when no init.js provided', done => {
      const name = 'init'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = 'https://github.com/carrot/sprout-sprout'
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          fs.unlinkSync(path.join(template.path, 'init.js'))
          return template.init(target)
        })
        .catch(error => {
          error
            .toString()
            .should.eq('Error: init.js does not exist in this template')
          return template.remove().then(() => {
            rimraf(target, done)
          })
        })
    })

    it('should throw when require init throws', done => {
      const name = 'initThrows'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .catch(error => {
          error.toString().should.eq("Error: Cannot find module 'doge'")
          return template.remove().then(() => {
            rimraf(target, done)
          })
        })
    })

    it('should use init.js', done => {
      const name = 'initJs'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should use a different git branch if specified', done => {
      const name = 'branch'
      const fixture = path.join(initTemplateFixturesPath, name)
      const sproutPath = path.join(os.tmpdir(), '__sprout__')
      const src = path.join(os.tmpdir(), name)
      const srcRoot = path.join(src, 'root')
      const srcInit = path.join(src, 'init.js')
      const target = path.join(fixture, 'target')
      let template
      rimraf(sproutPath)
        .then(() => {
          fs.mkdirSync(sproutPath)
          return rimraf(src)
        })
        .then(() => {
          fs.mkdirSync(src)
          fs.writeFileSync(srcInit, 'module.exports={};')
          fs.mkdirSync(srcRoot)
          fs.writeFileSync(path.join(srcRoot, '.keep'), '')
          template = new Template({
            sprout: new Sprout(sproutPath),
            name,
            src
          })
        })
        .then(() => gitInit(src))
        .then(() => gitCommitAdd(src))
        .then(() => template.save())
        .then(() => gitCreateBranch(template.path, name))
        .then(() => {
          fs.writeFileSync(path.join(template.rootPath, 'foo'), '', 'utf8')
          return gitCommitAdd(template.path)
        })
        .then(() => gitCheckout(template.path, 'master'))
        .then(() => template.init(target, { branch: name }))
        .then(() => {
          fs.existsSync(path.join(target, 'foo')).should.be.true()
          return gitCurrentBranch(template.path)
        })
        .then(branch => {
          branch.should.eq('master\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should use a different git tag if specified', done => {
      const name = 'tag'
      const fixture = path.join(initTemplateFixturesPath, name)
      const sproutPath = path.join(os.tmpdir(), '__sprout__')
      const src = path.join(os.tmpdir(), name)
      const srcRoot = path.join(src, 'root')
      const srcInit = path.join(src, 'init.js')
      const target = path.join(fixture, 'target')
      let template
      rimraf(sproutPath)
        .then(() => {
          fs.mkdirSync(sproutPath)
          return rimraf(src)
        })
        .then(() => {
          fs.mkdirSync(src)
          fs.writeFileSync(srcInit, 'module.exports={};')
          fs.mkdirSync(srcRoot)
          fs.writeFileSync(path.join(srcRoot, '.keep'), '')
          template = new Template({
            sprout: new Sprout(sproutPath),
            name,
            src
          })
        })
        .then(() => gitInit(src))
        .then(() => gitCommitAdd(src))
        .then(() => template.save())
        .then(() => {
          fs.writeFileSync(path.join(template.rootPath, 'foo'), '', 'utf8')
          return gitCommitAdd(template.path)
        })
        .then(() => gitTag(template.path, name))
        .then(() => {
          fs.writeFileSync(path.join(template.rootPath, 'foo2'), '', 'utf8')
          return gitCommitAdd(template.path)
        })
        .then(() => gitCheckout(template.path, 'master'))
        .then(() => template.init(target, { tag: name }))
        .then(() => {
          fs.existsSync(path.join(target, 'foo2')).should.be.false()
          return gitCurrentBranch(template.path)
        })
        .then(branch => {
          branch.should.eq('master\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it("should throw error if tag doesn't exist", done => {
      const name = 'tagMissing'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = 'https://github.com/carrot/sprout-sprout'
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, { tag: 'foooooooo' })
        })
        .catch(error => {
          error
            .toString()
            .should.match(
              /Error: Command failed:.*git checkout tags\/foooooooo/
            )
          return template.remove().then(() => rimraf(target, done))
        })
    })

    it('should use .json configuration file', done => {
      const name = 'jsonConfig'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, {
            configPath: path.join(fixture, 'config.json')
          })
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should use .yaml configuration file', done => {
      const name = 'yamlConfig'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, {
            configPath: path.join(fixture, 'config.yaml')
          })
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('it should ignore files specified in init', done => {
      const name = 'ignore'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs
            .readFileSync(path.join(target, 'foo'), 'utf8')
            .should.eq('<%= foo %>\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('it should ignore one file specified in init', done => {
      const name = 'ignoreOne'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs
            .readFileSync(path.join(target, 'foo'), 'utf8')
            .should.eq('<%= foo %>\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should ask questions if questionnaire is passed', done => {
      const name = 'questionnaire'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      const q = () => W.resolve({ foo: 'bar' })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, { questionnaire: q })
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should throw error if configuration file is invalid', done => {
      const name = 'invalidConfig'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const configPath = path.join(fixture, 'foobar')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target, { configPath })
        })
        .catch(error => {
          error
            .toString()
            .should.match(/Error: ENOENT: no such file or directory/)
          return template.remove().then(() => done())
        })
    })

    it('should include underscore.string as EJS "local"', done => {
      const name = 'underscoreString'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('Bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should apply defaults', done => {
      const name = 'defaults'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should apply moment.js as a local', done => {
      const name = 'defaultsLocals'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('1984\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should install npm dependencies', done => {
      const name = 'npm'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.existsSync(path.join(template.path, 'node_modules')).should.be.true()
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should copy files that are binaries', done => {
      const name = 'binary'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          ;(fs.readFileSync(path.join(src, 'root', 'logo.png')).length ===
            fs.readFileSync(path.join(target, 'logo.png')).length).should.be
            .true()
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should run before hook', done => {
      const name = 'before'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.existsSync(path.join(target, 'bar')).should.be.true()
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should run beforeRender hook', done => {
      const name = 'beforeRender'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('foo\n')
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should run after hook', done => {
      const name = 'after'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.existsSync(path.join(target, 'bar')).should.be.true()
          return template.remove()
        })
        .then(() => rimraf(target, done))
    })

    it('should remove target directory if error thrown after target directory created', done => {
      const name = 'removeTarget'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .catch(() => {
          fs.existsSync(target).should.be.false()
          return template.remove().then(() => done())
        })
    })

    it('should work if internet is missing', done => {
      mockery.enable({ useCleanCache: true, warnOnUnregistered: false })
      mockery.registerMock('dns', {
        resolve (name, callback) {
          return callback(errno.code.ECONNREFUSED)
        }
      })
      const name = 'noInternet'
      const fixture = path.join(initTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.init(target)
        })
        .then(template => {
          fs.existsSync(target).should.be.true()
          return template.remove()
        })
        .then(() => {
          mockery.deregisterMock('dns')
          mockery.disable()
          return rimraf(target, done)
        })
    })
  })

  describe('update', () => {
    it('should update', done => {
      const name = 'update'
      const src = 'https://github.com/carrot/sprout-sprout'
      const template = new Template({ sprout, name, src })
      template
        .save()
        .then(template => {
          fs.existsSync(template.path).should.be.true()
          return template.update()
        })
        .then(template => template.remove())
        .then(() => done())
    })
  })

  describe('run', () => {
    let runTemplateFixturesPath

    before(() => {
      runTemplateFixturesPath = path.join(templateFixturesPath, 'run')
    })

    it('should run generator', done => {
      const name = 'run'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo'))
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return template.remove(name)
        })
        .then(() => rimraf(target, done))
    })

    it('should throw if no target set', done => {
      const name = 'noTarget'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(null, 'foo'))
        .catch(error => {
          error
            .toString()
            .should.eq(
              'ValidationError: [sprout generator] option "target" must be a string'
            )
          return template.remove(name).then(() => rimraf(target, done))
        })
    })

    it('should throw if target missing', done => {
      const name = 'noTarget'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const fakeTarget = path.join(fixture, 'doge/doge/doge/doge/doge')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(fakeTarget, 'foo'))
        .catch(error => {
          error.toString().should.eq(`Error: ${fakeTarget} does not exist`)
          return template.remove(name).then(() => rimraf(target, done))
        })
    })

    it('should throw if no generator name', done => {
      const name = 'noGenerator'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, null))
        .catch(error => {
          error
            .toString()
            .should.eq(
              'ValidationError: [sprout generator] option "generator" must be a string'
            )
          return template.remove(name).then(() => rimraf(target, done))
        })
    })

    it('should throw if generator missing', done => {
      const name = 'generatorMissing'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo2'))
        .catch(error => {
          error
            .toString()
            .should.eq("Error: 'foo2' is not a generator in this template")
          return template.remove(name).then(() => rimraf(target, done))
        })
    })

    it("should run generator if it's a .js file", done => {
      const name = 'generatorJs'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo'))
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return template.remove(name)
        })
        .then(() => rimraf(target, done))
    })

    it('should throw error if require returns error', done => {
      const name = 'requireError'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo'))
        .catch(error => {
          error.toString().should.eq("Error: Cannot find module 'foo'")
          return template.remove(name).then(() => rimraf(target, done))
        })
    })

    it.skip('it should pass arguments', done => {
      const name = 'arguments'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo', ['bar']))
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return template.remove(name)
        })
        .then(() => rimraf(target, done))
    })

    it('it should not break if undefined is passed as arguments', done => {
      const name = 'undefinedArguments'
      const fixture = path.join(runTemplateFixturesPath, name)
      const src = path.join(fixture, 'src')
      const target = path.join(fixture, 'target')
      const template = new Template({ sprout, name, src })
      gitInit(src)
        .then(() => template.save())
        .then(() => template.init(target))
        .then(template => template.run(target, 'foo', undefined))
        .then(template => {
          fs.readFileSync(path.join(target, 'foo'), 'utf8').should.eq('bar')
          return template.remove(name)
        })
        .then(() => rimraf(target, done))
    })
  })

  describe('remove', () => {
    it('should remove', done => {
      const name = 'remove'
      const src = 'https://github.com/carrot/sprout-sprout'
      const template = new Template({ sprout, name, src })
      template.save().then(() => template.remove()).then(template => {
        fs.existsSync(template.path).should.be.false()
        done()
      })
    })
  })
})

describe('utils', () => {
  let utilsFixturesPath

  before(() => {
    utilsFixturesPath = path.join(fixturesPath, 'utils')
  })

  describe('copy', () => {
    let utilsCopyFixturesPath

    before(() => {
      utilsCopyFixturesPath = path.join(utilsFixturesPath, 'copy')
    })

    it('should copy from one path relative to the src, to another', done => {
      const fixture = path.join(utilsCopyFixturesPath, 'base')
      const utils = new Utils(fixture, fixture)
      utils.copy('foo', 'bar').then(() => {
        fs.readFileSync(path.join(fixture, 'bar'), 'utf8').should.eq('bar\n')
        fs.unlinkSync(path.join(fixture, 'bar'))
        done()
      })
    })
  })

  describe('src', () => {
    let utilsSrcFixturesPath

    before(() => {
      utilsSrcFixturesPath = path.join(utilsFixturesPath, 'src')
    })

    it('should read from a path relative to the source path', done => {
      const fixture = path.join(utilsSrcFixturesPath, 'read')
      const utils = new Utils(fixture, null)
      utils.src.read('foo').then(output => {
        output.should.eq('bar\n')
        done()
      })
    })

    it('should return the source path', done => {
      const fixture = path.join(utilsSrcFixturesPath, 'path')
      const utils = new Utils(fixture, null)
      utils.src.path.should.eq(fixture)
      done()
    })
  })

  describe('target', () => {
    let utilsTargetFixturesPath

    before(() => {
      utilsTargetFixturesPath = path.join(utilsFixturesPath, 'target')
    })

    it('should return the target path', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'path')
      const utils = new Utils(fixture, null)
      utils.src.path.should.eq(fixture)
      done()
    })

    it('should copy from one path to another, relative to the target', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'copy')
      const utils = new Utils(null, fixture)
      utils.target.copy('foo', 'bar').then(() => {
        fs.readFileSync(path.join(fixture, 'bar'), 'utf8').should.eq('bar\n')
        fs.unlinkSync(path.join(fixture, 'bar'))
        done()
      })
    })

    it('should read from a path relative to the source path', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'read')
      const utils = new Utils(null, fixture)
      utils.target.read('foo').then(output => {
        output.should.eq('bar\n')
        done()
      })
    })

    it('should write to path relative to the source path', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'write')
      const utils = new Utils(null, fixture)
      utils.target.write('foo', 'bar').then(() => {
        fs.readFileSync(path.join(fixture, 'foo'), 'utf8').should.eq('bar')
        fs.unlinkSync(path.join(fixture, 'foo'))
        done()
      })
    })

    it('should write to path relative to the source path and use locals', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'writeLocals')
      const utils = new Utils(null, fixture)
      utils.target.write('foo', '<%= foo %>', { foo: 'bar' }).then(() => {
        fs.readFileSync(path.join(fixture, 'foo'), 'utf8').should.eq('bar')
        fs.unlinkSync(path.join(fixture, 'foo'))
        done()
      })
    })

    it('should write to path relative to the source path recursively', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'writeRecursive')
      const utils = new Utils(null, fixture)
      utils.target.write('nested/deep/foo', 'bar').then(() => {
        fs
          .readFileSync(path.join(fixture, 'nested', 'deep', 'foo'), 'utf8')
          .should.eq('bar')
        rimraf(path.join(fixture, 'nested')).then(() => done())
      })
    })

    it('should write to path relative to the source path recursively, even if dir exists', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'writeRecursiveExists')
      const utils = new Utils(null, fixture)
      utils.target.write('nested/deep/foo', 'bar').then(() => {
        fs
          .readFileSync(path.join(fixture, 'nested', 'deep', 'foo'), 'utf8')
          .should.eq('bar')
        rimraf(path.join(fixture, 'nested', 'deep')).then(() => done())
      })
    })

    it('should rename from one path to another, relative to the target', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'rename')
      const utils = new Utils(null, fixture)
      utils.target.rename('foo', 'bar').then(() => {
        fs.existsSync(path.join(fixture, 'bar')).should.be.true()
        fs.renameSync(path.join(fixture, 'bar'), path.join(fixture, 'foo'))
        done()
      })
    })

    it('should remove from a path, relative to the target', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'remove')
      const utils = new Utils(null, fixture)
      utils.target.remove('foo').then(() => {
        fs.existsSync(path.join(fixture, 'foo')).should.be.false()
        fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
        done()
      })
    })

    it('should remove an array of paths, relative to the target', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'removeArray')
      const utils = new Utils(null, fixture)
      utils.target.remove(['foo', 'bar']).then(() => {
        fs.existsSync(path.join(fixture, 'foo')).should.be.false()
        fs.existsSync(path.join(fixture, 'bar')).should.be.false()
        fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
        fs.writeFileSync(path.join(fixture, 'bar'), '', 'utf8')
        done()
      })
    })

    it('should execute a command with the target as a working directory', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'exec')
      const utils = new Utils(null, fixture)
      utils.target.exec('rm -rf foo').then(() => {
        fs.existsSync(path.join(fixture, 'foo')).should.be.false()
        fs.writeFileSync(path.join(fixture, 'foo'), '', 'utf8')
        done()
      })
    })

    it('should execute a command with a path relative to the target as a working directory', done => {
      const fixture = path.join(utilsTargetFixturesPath, 'execRelative')
      const utils = new Utils(null, fixture)
      utils.target.exec('rm -rf foo', 'bar').then(() => {
        fs.existsSync(path.join(fixture, 'bar', 'foo')).should.be.false()
        fs.writeFileSync(path.join(fixture, 'bar', 'foo'), '', 'utf8')
        done()
      })
    })
  })
})

describe('helpers', () => {
  describe('isGitURL', () => {
    it('should determine is git url', done => {
      helpers.isGitUrl('git@github.com:foo/bar').should.be.true()
      done()
    })

    it('should determine is not git url', done => {
      helpers.isGitUrl('asdfadsfasdf').should.be.false()
      done()
    })
  })
})

/*
 * Helper function for initializing a git repository
 * in the specified directory.
 * @param {String} dir - directory to create repo in.
 */

const gitInit = dir => exec('git init .', { cwd: dir })

/*
 * Helper function for `git tag` command
 * in the specified directory.
 * @param {String} dir - git repo.
 * @param {String} tag - tag to create.
 */

const gitTag = (dir, tag) => exec(`git tag ${tag}`, { cwd: dir })

/*
 * Helper function for creating a new branch
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

const gitCreateBranch = (dir, branch) =>
  exec(`git checkout -b ${branch}`, { cwd: dir })

/*
 * Helper function for `git checkout` command
 * in the specified git repository.
 * @param {String} dir - git repo.
 * @param {String} branch - branch to checkout.
 */

const gitCheckout = (dir, branch) =>
  exec(`git checkout ${branch}`, { cwd: dir })

/*
 * Helper function for committing all added,
 * files in a git repository.
 * @param {String} dir - git repo.
 */

const gitCommitAdd = dir =>
  exec('git add . && git commit -m "sprout test" .', { cwd: dir })

/*
 * Helper function for determining the
 * current git branch for a repository.
 * @param {String} dir - git repo.
 */

const gitCurrentBranch = dir =>
  exec('git rev-parse --abbrev-ref HEAD', { cwd: dir }).spread(stdout => stdout)
