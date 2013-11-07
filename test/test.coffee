require 'shelljs/global'
should = require 'should'
sprout = require '../'

describe 'add', ->

  before -> @cmd = sprout.commands

  describe 'js api', ->
    
    it 'errors when no args provided', ->
      (-> @cmd.add()).should.throw()

  describe 'cli', ->

    it 'errors when no args provided', ->
      cmd = exec('./bin/sprout add', {silent: true})
      cmd.code.should.be.above(0)
