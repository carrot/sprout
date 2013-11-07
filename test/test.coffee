should = require 'should'
sprout = require '../'

describe 'commands', ->

  before -> @cmd = sprout.commands

  describe 'add', ->
    
    it 'errors when no args provided', ->
      (-> @cmd.add()).should.throw()

