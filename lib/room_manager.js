

var EventEmitter = require('events').EventEmitter

module.exports = RoomManager

function RoomManager(Room) {

  if (typeof Room != 'function') throw new Error('Expected a Room constructor')

  var manager = new EventEmitter()
  var rooms = { }
  
  /* subscribers */
  var subscribers = new EventEmitter()
  subscribers.setMaxListeners(0)

  manager.get = function(name) {
    return rooms[':' + name]
  }

  manager.create = function(name) {

    if (!name) name = makeUniqueName()
    if (rooms[':' + name]) throw new Error("This room name already exists")

    var room = rooms[':' + name] = new Room(name)

    room.on('destroy', function() {
      delete rooms[':' + name]
      broadcast({ type: 'destroyed' })
    })
    room.on('broadcast', broadcast)

    broadcast({ type: 'created' })

    return room

    function broadcast(event) {
      subscribers.emit('broadcast:' + name, event)
    }
  }

  manager.subscribe = function(name, subscriber) {
    subscribers.on('broadcast:' + name, subscriber)
  }

  manager.unsubscribe = function(name, subscriber) {
    subscribers.removeListener('broadcast:' + name, subscriber)
  }

  function makeUniqueName() {
    var name
    do {
      name = makeRandomName()
    } while (rooms[':' + name])
    return name
  }

  function makeRandomName() {
    var charset = '0123456789abcdef'
    var name = ''
    for (var i = 0; i < 8; i ++) {
      name += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    return name
  }


  return manager

}




