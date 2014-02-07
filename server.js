#!/usr/bin/env node

/* create the server and require other libraries */
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , path = require('path')
  , send = require('send')


/* create socket.io server */
var io = require('socket.io').listen(server)
io.set('log level', 1)


/* serve static files */
app.use(express.static(__dirname + '/static'))
app.use('/bower_components', express.static(__dirname + '/bower_components'))



var Room = require('./lib/room')
var RoomManager = require('./lib/room_manager')

var manager = new RoomManager(Room)


// when a client is connected, it is initialized with an empty buffer.
// we patch its buffer to our current state
var nid = 0
io.sockets.on('connection', function(socket) {

  var state = main
  var id = ++nid

  socket.on('message', function(msg) {
    if (msg && typeof msg == 'object') state(msg)
  })

  function main(msg) {
    if (msg.command == 'broadcast') {
      try {
        var room = manager.create(msg.room)
        socket.emit('room_created', { name: room.name })
        state = roomState(room)
      } catch (e) {
        socket.emit('room_exists')
      }
    } else if (msg.command == 'join') {
      state = subscribe(msg.room)
    }
  }

  function roomState(room) {
    socket.on('disconnect', function() {
      room.destroy()
    })
    return function(msg) {
      if (msg.command == 'patch') {
        room.send(msg.operations)
      }
    }
  }

  function subscribe(room) {
    manager.subscribe(room, subscriber)
    socket.on('disconnect', function() {
      manager.unsubscribe(room, subscriber)
    })
    return function() {
    }
    function subscriber(event) {
      if (event.type == 'patch') {
        socket.emit('patch', event.operations)
      } else {
        socket.emit(event.type)
      }
    }
  }

})


var fs = require('fs')
var buf = fs.readFileSync(__dirname + '/livetty.html')

app.get('/:room', function(req, res, next) {
  res.set('Content-Type', 'text/html')
  res.send(buf)
})


// listen
server.listen(Number(process.env.PORT) || 13377, function() {
  var address = server.address()
  console.log('ttycast listening on %s port %s', address.address, address.port)
})

