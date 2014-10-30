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

Array.prototype.last = function() {
  return this[this.length - 1];
};
Array.prototype.remove = function(element) {
  if(this.indexOf(element) >= 0) {
    this.splice(this.indexOf(element), 1);
  }

  return false;
};

module.exports = {
  /**
   *
   * Definition of rooms types.
   *
   */
  types: {
    simple: 0,
    special: 1
  },

  rooms: [],

  create: function(type, socket) {
    /**
     *
     * Trying to make a room definition.
     *
     */
    this.rooms.push({
      min: 0,
      max: 2,

      type: type,
      state: false,
      sockets: [],

      pendingTimeout: false,
      startTimeout: false,

      count: function() {
        return this.sockets.length;
      },
      join: function(socket) {
        if(this.sockets.length < this.max) {
          this.sockets.push(socket);

          socket.server = this.sockets.length == 1;
          socket.room = this;
          socket.join(this);

          if(this.sockets.length >= this.max) {
            this.start();
          }
        } else {
          console.log('Error: room is full but some socket trying to join it.');
        }
      },
      leave: function(socket) {
        if(this.sockets.length > 0) {
          var socket1 = socket;
          var socket2 = this.sockets[socket.server ? 1 : 0];

          this.sockets.remove(socket1);
          this.sockets.remove(socket2);

          if(socket1) {
            socket1.server = false;
            socket1.room = false;

            socket1.leave(this);

            socket1.emit('unsubscribe');
          }

          if(socket2) {
            socket2.server = false;
            socket2.room = false;

            socket2.leave(this);

            socket2.emit('cancel');
          }
        } else {
          console.log('Error: room is empty but some socket trying to leave it.');
        }
      },

      start: function() {
        this.state = true;

        this.pendingTimeout = setTimeout(function() {
          this.sockets.forEach(function(socket) {
            var index = socket.server ? 1 : 0;
            socket.emit('subscribe', {
              type: 'pending',
              user: {
                name: this.sockets[index].info.personal.name,
                surname: this.sockets[index].info.personal.surname,
                photo: this.sockets[index].info.personal.photo,
                weapon: this.sockets[index].info.personal.weapon
              }
            });

            this.startTimeout = setTimeout(function() {
              this.sockets.forEach(function(socket) {
                socket.emit('subscribe', {
                  server: socket.server,
                  type: 'start',
                  users: [
                    {name: this.sockets[0].info.personal.name, surname: this.sockets[0].info.personal.surname, photo: this.sockets[0].info.personal.photo, weapon: this.sockets[0].info.personal.weapon},
                    {name: this.sockets[1].info.personal.name, surname: this.sockets[1].info.personal.surname, photo: this.sockets[1].info.personal.photo, weapon: this.sockets[1].info.personal.weapon}
                  ]
                });
              }.bind(this));
            }.bind(this), 9000);
          }.bind(this));
        }.bind(this), 2000);

        console.log('Info: starting room.');
      }
    });

    this.rooms.last().join(socket);

    console.log('Info: new room was created.');
  },
  destroy: function() {
  },

  join: function() {
  },
  leave: function(socket) {
    var room = socket.room;
    if(room) {
      room.leave(socket);

      this.rooms.remove(room);

      clearTimeout(room.pendingTimeout);
      clearTimeout(room.startTimeout);

      console.log('Info: some room was destroyed.');

      return true;
    }

    return false;
  },

  getRoom: function(type, callback) {
    var find = false;
    this.rooms.forEach(function(room) {
      if(!find) {
        if(room.type == type) {
          if(!room.state) {
            if(room.count() < room.max) {
              find = room;
            }
          }
        }
      }
    });

    return find;
  },

  subscribe: function(socket, data, callback) {
    var room = this.getRoom(data.type);

    if(room) {
      room.join(socket);
    } else {
      this.create(data.type, socket);
    }

    console.log('Info: total count of created rooms is - ' + this.rooms.length);
  }
};
