
/*global DisplayBuffer, ScreenBuffer, io*/
window.onload = function() {

  var el = document.getElementById('terminal')
    , buf = new DisplayBuffer(el)

  var socket = io.connect()
  var room = location.pathname.substr(1)

  socket.on('connect', function() {
    socket.emit('message', { command: 'join', room: room })
  })

  socket.on('patch', function(operations) {
    ScreenBuffer.patch(buf, operations)
  })

  socket.on('options', function(options) {
    document.getElementById('aux').innerHTML = options.aux || ''
    document.getElementById('container').style.display = options.hide == 'yes' ? 'none' : ''
  })

}
