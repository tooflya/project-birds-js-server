var util = require("util");

Array.prototype.last = function() {
  return this[this.length - 1];
};

var online = {
  users: {
    count: 0,
    list: []
  },
  battles: 0
};
var rooms = {
  rooms: [],
  create: function(socket) {
    socket.server = true;

    this.join({
      users: [],
      state: false
    }, socket);
  },
  destroy: function(socket) {
    for(var i = 0; i < 2; i++) {
      var user = socket.room.users[i];

      if(user) {
        user.server = false;

        user.emit('unsubscribe');
      }
    }

    if(this.rooms.indexOf(socket.room) != -1) {
      this.rooms.splice(this.rooms.indexOf(socket.room), 1);
    }
  },
  join: function(room, socket) {
    this.rooms.push(room);

    room.users.push(socket);

    socket.join(room);
    socket.room = room;
  },
  leave: function(socket) {
    if(socket.room.users.indexOf(socket) != -1) {
      socket.room.users.splice(socket.room.users.indexOf(socket), 1);
    }

    socket.room = false;
    socket.server = false;
  },
  add: function(socket, callback) {
    if(callback) {
      callback();
    }

    var entry = false;
    for(var i = 0; i < this.rooms.length; i++) {
      var room = this.rooms[i];

      if(!room.state && room.users.length == 1) {
        entry = room;

        break;
      }
    }

    if(entry) {
      entry.state = true;
      this.join(entry, socket);

      setTimeout(function() {
        for(var i = 0; i < 2; i++) {
          var user = entry.users[i];

          if(user) {
            user.emit('subscribe', {
              type: 'pending'
            });
          }
        }
      }, 2000);

      setTimeout(function() {
        for(var i = 0; i < 2; i++) {
          var user = entry.users[i];

          if(user) {
            user.emit('subscribe', {
              server: user.server,
              type: 'start',
              users: [
                {name: entry.users[0].info.personal.name + " " + entry.users[0].info.personal.surname, photo: entry.users[0].info.personal.photo, weapon: entry.users[0].info.personal.weapon},
                {name: entry.users[1].info.personal.name + " " + entry.users[1].info.personal.surname, photo: entry.users[1].info.personal.photo, weapon: entry.users[1].info.personal.weapon}
              ]
            });
          }
        }
      }, 4000);
    } else {
      this.create(socket);
    }
  }
};

var mysql = require('mysql');

var io = require('socket.io').listen(8082, {
});

io.set('transports', ['xhr-polling']);
io.sockets.on('connection', function(socket) {
  mysql.utilities = require('mysql-utilities');

  socket.connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: 'RivaleCompany80632450512',
    database: 'games.tooflya.com'
  });

  mysql.utilities.upgrade(socket.connection);
  mysql.utilities.introspection(socket.connection);

  socket.connection.connect();

  socket.on('setup', function(data, callback) {
    socket.info = {
      personal: data
    };

    var users = [];
    io.sockets.clients().forEach(function(user) {
      if(user.info) {
        users.push(user.info.personal);
      }
    });

    io.sockets.emit('online', {
      online: {
        users: {
          count: ++online.users.count,
          add: users
        },
        battles: online.battles
      }
    });

    callback();
  });

  socket.on('subscribe', function(data, callback) {
    socket.info.personal.weapon = data.weapon;

    setTimeout(function() {
      rooms.add(socket, callback);
    }, 2000);
  });

  socket.on('unsubscribe', function(data, callback) {
    if(socket.room) {
      rooms.destroy(socket);
    }

    if(callback) {
      callback();
    }
  });

  socket.on('data', function(data, callback) {
    if(socket.room) {
      socket.broadcast.to(socket.room).emit('data', data);

      if(callback) {
        callback();
      }
    } else {
      console.log('Error: user is trying to emit data to the own room but room is undefinied.');
    }
  });

  socket.on('message', function(data, callback) {
    if(socket.room) {
      socket.broadcast.to(socket.room).emit('message', data);

      if(callback) {
        callback();
      }
    } else {
      console.log('Error: user is trying to emit data to the own room but room is undefinied.');
    }
  });

  socket.on('disconnect', function() {
    if(socket.info) {
      if(socket.info.personal) {
        io.sockets.emit('online', {
          online: {
            users: {
              count: --online.users.count,
              remove: socket.info.personal
            },
            battles: online.battles
          }
        });
      }
    }

    if(socket.room) {
      rooms.destroy(socket);
    }

    socket.connection.end();
  });
});
