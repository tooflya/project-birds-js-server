var io = require('socket.io').listen(82, {
});

io.sockets.on('connection', function(socket) {
  socket.emit('message', 'Welcome to the our awesome server.');

  setTimeout(function() {
    socket.emit('data', {
      user: true
    });
  }, 1000);
});