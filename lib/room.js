

var ScreenBuffer = require('screen-buffer')
var EventEmitter = require('events').EventEmitter

module.exports = Room

function Room(name, key) {

  var room = new EventEmitter()

  room.name = name
  room.key = key
  room.buffer = new ScreenBuffer()
  room.viewerOptions = { }

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

  room.setViewerOptions = function(options) {
    room.viewerOptions = options
    room.emit('broadcast', { type: 'options', options: options })
  }

  room.getViewerOptions = function() {
    return room.viewerOptions
  }

  return room

}



