require 'shelljs/global'
path = require 'path'
fs = require 'fs'
should = require 'should'
sprout = require '../'

describe 'add', ->

  before ->
    @cmd = sprout.commands
    @exec = (cmd) -> exec(cmd, {silent: true})
    @$ = path.join(__dirname, '../bin/sprout')

  describe 'js api', ->
    
    it 'errors when no args provided', (done)->
      @cmd.add (err, res) ->
        should.exist(err)
        done()

    it 'errors when passed an invalid repo url', (done) ->
      @cmd.add 'foobar', (err, res) ->
        should.exist(err)
        done()

    it 'saves the template when passed a valid url', (done) ->
      @cmd.add 'foobar', 'https://github.com/carrot/sprout', (err, res) =>
        should.not.exist(err)
        fs.existsSync(sprout.path('foobar')).should.be.ok
        @cmd.remove 'foobar', (err) ->
          should.not.exist(err)
          fs.existsSync(sprout.path('foobar')).should.not.be.ok
          done()

  describe 'cli', ->

    it 'errors when no args provided', ->
      cmd = @exec("#{@$} add")
      cmd.code.should.be.above(0)

    it 'errors when passed an invalid repo url', ->
      cmd = @exec("#{@$} add foobar")
      cmd.code.should.be.above(0)

    it 'saves the template when passed a valid url', ->
      cmd = @exec("#{@$} add foobar https://github.com/carrot/sprout")
      cmd.code.should.eql(0)
      fs.existsSync(sprout.path('foobar')).should.be.ok
      rmcmd = @exec("#{@$} remove foobar")
      rmcmd.code.should.eql(0)
      fs.existsSync(sprout.path('foobar')).should.not.be.ok
