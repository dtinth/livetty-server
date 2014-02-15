
var EventEmitter = require('events').EventEmitter
var RoomManager = require('../lib/room_manager')
var assert = require('assert')
var util = require('util')

describe('RoomManager', function() {

  function Room(name) {
    EventEmitter.call(this)
    this.name = name
  }

  util.inherits(Room, EventEmitter)

  var manager

  beforeEach(function() {
    manager = new RoomManager(Room)
  })

  context('room management', function() {

    it('should allow room creation without name', function() {
      var a = manager.create()
      var b = manager.create()
      assert.notEqual(a.name, b.name)
    })

    it('should allow room creation with name', function() {
      var room = manager.create('lobby')
      assert.equal(room.name, 'lobby')
    })

    it('should not allow room to be created with same name', function() {
      var a = manager.create('lobby')
      assert.throws(function() {
        var b = manager.create('lobby')
      })
    })

    it('should allow room to be re-created', function() {
      var a = manager.create('lobby')
      a.emit('destroy')
      var b = manager.create('lobby') /* should not throw */
    })

    it('should allow querying room', function() {
      assert.equal(manager.get('lobby'), undefined)
      var a = manager.create('lobby')
      assert.equal(manager.get('lobby'), a)
      a.emit('destroy')
      assert.equal(manager.get('lobby'), undefined)
    })

  })


  context('subscription', function() {

    var subscriber, receivedEvent

    beforeEach(function() {
      receivedEvent = null
      subscriber = function subscriber(e) {
        receivedEvent = e
      }
    })

    it('count should count number of subscribers', function() {
      assert.equal(manager.count('lobby'), 0)
      manager.subscribe('lobby', function() {})
      assert.equal(manager.count('lobby'), 1)
      manager.subscribe('lobby', function() {})
      assert.equal(manager.count('lobby'), 2)
    })

    it('should allow clients to subscribe and unsubscribe from a room', function() {

      manager.subscribe('lobby', subscriber)

      var lobby = manager.create('lobby')
      var event = { x: 1 }
      var another = { x: 2 }
      lobby.emit('broadcast', event)
      assert.equal(receivedEvent, event)

      manager.unsubscribe('lobby', subscriber)
      lobby.emit('broadcast', another)
      assert.equal(receivedEvent, event)

    })

    it('should notify clients about room creation and destruction', function() {

      manager.subscribe('entrepreneur', subscriber)
      
      var room = manager.create('entrepreneur')
      assert.equal(receivedEvent.type, 'created')

      room.emit('destroy')
      assert.equal(receivedEvent.type, 'destroyed')
      
    })

  })
  
})






