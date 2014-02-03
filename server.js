#!/usr/bin/env node

// create the server and require other libraries
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , path = require('path')
  , send = require('send')
  , HeadlessTerminal = require('headless-terminal')
  , ScreenBuffer = HeadlessTerminal.ScreenBuffer
  , EventEmitter = require('events').EventEmitter


// create socket.io server
var io = require('socket.io').listen(server)
io.set('log level', 1)


// serve static files
app.use(express.static(__dirname + '/static'))


function sendTo(key, event, value) {
  //console.log('== want to broadcast', event, key)
  if (listeners[key]) {
    var obj = listeners[key]
    for (var id in obj) {
      if (obj[id] && obj[id].emit) {
        obj[id].emit(event, value)
        //console.log('emit to', id)
      }
    }
  }
}

var listeners = { }

function Room(key) {
  var room = new EventEmitter()
  room.buffer = new ScreenBuffer()
  room.destroy = function() {
    sendTo(key, 'destroyed', 'Room has been destroyed')
  }
  room.send = function(data) {
    var allowed = ['setCursor', 'setRows', 'draw', 'copy', 'setCols']
    var operations = []
    try {
      for (var i = 0; i < data.length; i ++) {
        var name = data[i][0]
        if (allowed.indexOf(name) > -1) {
          room.buffer[name].apply(room.buffer, data[i].slice(1))
          operations.push(data[i])
        }
      }
      sendTo(key, 'data', operations)
    } catch (e) {
    }
  }
  sendTo(key, 'created', 'Room has been created')
  return room
}


// the display as seen by clients
var buffer = new ScreenBuffer()
  , patcher = HeadlessTerminal.patcher


var rooms = { }

// when a client is connected, it is initialized with an empty buffer.
// we patch its buffer to our current state
var nid = 0
io.sockets.on('connection', function(socket) {

  var state = main
  var id = ++nid

  socket.on('c', function(msg) {
    // console.log(id, msg)
    if (msg && typeof msg == 'object') state(msg)
  })

  function main(msg) {
    if (msg.command == 'broadcast') {
      var key = ':' + msg.params
      if (rooms[key]) {
        socket.emit('c', { error: 'Room already exists!' })
      } else {
        socket.emit('c', { ok: 'Room created!' })
        state = room(key)
      }
    } else if (msg.command == 'join') {
      var key = ':' + msg.params
      socket.emit('c', { ok: 'Room joined!' })
      state = join(key)
    }
  }

  function join(key) {
    var obj = listeners[key] || (listeners[key] = { })
    obj[id] = socket
    if (rooms[key]) {
      socket.emit('data', patcher.patch(new ScreenBuffer(), rooms[key].buffer))
    }
    socket.on('disconnect', function() {
      delete obj[id]
    })
    return function() {
    }
  }

  function room(key) {
    rooms[key] = new Room(key)
    socket.on('disconnect', function() {
      rooms[key].destroy()
      delete rooms[key]
    })
    return function(msg) {
      if (msg.command == 'data') {
        rooms[key].send(msg.params)
      }
    }
  }

})

var fs = require('fs')
var buf = fs.readFileSync(__dirname + '/ttycast.html')

app.get('/:room', function(req, res, next) {
  res.set('Content-Type', 'text/html')
  res.send(buf)
})

// listen
server.listen(Number(process.env.PORT) || 13377, function() {
  var address = server.address()
  console.log('ttycast listening on %s port %s', address.address, address.port)
})

