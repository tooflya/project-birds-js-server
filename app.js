/**
 * Tooflya Inc. Development
 *
 * @author Igor Mats from Tooflya Inc.
 * @copyright (c) 2014 by Igor Mats
 * http://www.tooflya.com/development/
 *
 * License: Attribution NonCommercial NoDerivatives 4.0 International
 *
 * Creative Commons Corporation (“Creative Commons”) is not a law firm and does
 * not provide legal services or legal advice. Distribution of Creative Commons
 * public licenses does not create a lawyer-client or other relationship.
 * Creative Commons makes its licenses and related information available on
 * an “as-is” basis. Creative Commons gives no warranties regarding its licenses,
 * any material licensed under their terms and conditions, or any related
 * information. Creative Commons disclaims all liability for damages resulting
 * from their use to the fullest extent possible.
 *
 * Creative Commons public licenses provide a standard set of terms and
 * conditions that creators and other rights holders may use to share original
 * works of authorship and other material subject to copyright and certain other
 * rights specified in the public license below. The following considerations
 * are for informational purposes only, are not exhaustive, and do not form part
 * of our licenses.
 *
 * Creative Commons may be contacted at creativecommons.org.
 *
 */

var fs = require("fs");
var util = require("util");
var rooms = require('./modules/rooms.js');
var online = require('./modules/online.js');
var mysql = require('mysql');

var options = { 
  key: fs.readFileSync('/etc/ssl/www.tooflya.com.key'), 
  cert: fs.readFileSync('/etc/ssl/www.tooflya.com.crt'),
  log: true
};
var io = require('socket.io').listen(8082, options);

io.set('transports', ['xhr-polling', 'websocket']);
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

    socket.subscribeTimeout = setTimeout(function() {
      rooms.subscribe(socket, data, callback);

      if(callback) {
        callback();
      }
    }, 2000);
  });

  socket.on('unsubscribe', function(data, callback) {
    if(socket.subscribeTimeout) {
      clearTimeout(socket.subscribeTimeout);

      socket.subscribeTimeout = false;
    }

    rooms.leave(socket);

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

    rooms.leave(socket);

    socket.connection.end();
  });
});
