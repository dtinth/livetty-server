

var ScreenBuffer = require('screen-buffer')
var EventEmitter = require('events').EventEmitter

module.exports = Room

function Room(name) {

  var room = new EventEmitter()

  room.name = name
  room.buffer = new ScreenBuffer()

  room.destroy = function() {
    room.emit('destroy')
  }

  room.send = function(operations) {
    try {
      ScreenBuffer.patch(room.buffer, operations)
    } catch (e) {
    }
    room.emit('broadcast', { type: 'patch', operations: operations })
  }

  room.getInitialPatch = function() {
    return ScreenBuffer.diff(new ScreenBuffer(), room.buffer)
  }

  return room

}



