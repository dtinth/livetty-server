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
app.use(express.urlencoded())
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
        var room = manager.create(msg.room, msg.key)
        socket.emit('room_created', { name: room.name, key: room.key })
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
    sendInitialPatch()

    return function() {
    }

    function subscriber(event) {
      if (event.type == 'patch') {
        socket.emit('patch', event.operations)
      } else if (event.type == 'options') {
        socket.emit('options', event.options)
      } else {
        socket.emit(event.type)
      }
    }

    function sendInitialPatch() {
      var roomObject = manager.get(room)
      if (roomObject) {
        socket.emit('patch', roomObject.getInitialPatch())
        socket.emit('options', roomObject.getViewerOptions())
      }
    }

  }

})


var fs = require('fs')
var buf = fs.readFileSync(__dirname + '/livetty.html')

function room(fn) {
  return function(req, res, next) {
    req.room = manager.get(req.param('room'))
    if (req.room) {
      fn(req, res, next)
    } else {
      next()
    }
  }
}

function checkKey(fn) {
  return function(req, res, next) {
    if (req.param('key') != req.room.key) {
      res.send(401, 'Invalid key!')
    } else {
      fn(req, res, next)
    }
  }
}

app.get('/:room', room(function(req, res, next) {
  res.set('Content-Type', 'text/html')
  res.send(buf)
}))

app.get('/:room/info.json', room(function(req, res, next) {
  res.json({ room: req.room.name, viewers: manager.count(req.room.name) })
}))

app.post('/:room/:key/options.json', room(checkKey(function(req, res, next) {
  var options = req.room.getViewerOptions()
  for (var i in req.body) {
    if (Object.prototype.hasOwnProperty.call(req.body, i)) {
      options[i] = req.body[i]
    }
  }
  req.room.setViewerOptions(options)
  res.json({ ok: true })
})))

app.get('/', function(req, res, next) {
  res.redirect('https://github.com/dtinth/livetty-server')
})

app.use(function(req, res, next) {
  res.send(404, '404 Not Found')
})

// listen
server.listen(Number(process.env.PORT) || 13377, function() {
  var address = server.address()
  console.log('ttycast listening on %s port %s', address.address, address.port)
})

