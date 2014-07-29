var mysql = require('mysql');

var io = require('socket.io').listen(8082, {
});

io.set('transports', ['xhr-polling']);
io.sockets.on('connection', function(socket) {
  mysql.utilities = require('mysql-utilities');

  socket.connection = mysql.createConnection({
    host: 'www.tooflya.com',
    user: 'root',
    password: 'password',
    database: 'www.project-birds.com'
  });

  mysql.utilities.upgrade(socket.connection);
  mysql.utilities.introspection(socket.connection);

  socket.connection.connect();

  socket.emit('message', 'Welcome to the our awesome server.');

  socket.on('disconnection', function(socket) {
    socket.connection.end();
  });

  socket.on('authorize', function(data, callback) {
    socket.identify = data.id;
    setTimeout(function() {
      socket.connection.queryRow('SELECT * FROM `users` WHERE `identify` = ? LIMIT 1', [data.id], function(error, row) {
        socket.emit('data', {
          user: row
        });

        if(!row) {
          socket.connection.insert('users', {
            identify: data.id,
            platform: data.platform
          }, function(error, id) {
          });
        }
      });
    }, 1000);
  });

  socket.on('leaderboard-id', function(data, callback) {
    socket.connection.query('SELECT * FROM `users` ORDER by `score` DESC', function(error, rows, fields) {
      var counter = 0;
      rows.forEach(function(some) {
        counter++;

        if(socket.identify == some.identify) {
          callback(counter, rows.length);

          return;
        }
      });

      callback(rows.length);
    })
  });

  socket.on('leaderboard', function(data, callback) {
    socket.connection.queryRow('SELECT * FROM `users` WHERE `identify` = ? LIMIT 1', [socket.identify], function(error, row) {
      var player = row;
      var counter = 0;
      socket.connection.query('SELECT * FROM `users` ORDER by `score` DESC', function(error, rows, fields) {
        var players = {};

        players.id = [];
        players.score = [];

        rows.forEach(function(some) {
          counter++;

          players.id.push(some.identify);
          players.score.push(some.score);

          if(socket.identify == some.identify) {
            player.place = counter;
          }
        });

        setTimeout(function() {
          callback({
            player: {
              id: [player.identify],
              score: player.score,
              place: player.place
            },
            players: {
              id: players.id,
              score: players.score
            },
            users: counter
          });
        }, 1000);
      });
    });
  });
});
