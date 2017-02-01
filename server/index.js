const path = require('path');
const chalk = require('chalk');
const http = require('http');
const server = http.createServer();
const port = process.env.PORT || 1337;
const express = require('express');
const app = express();
const socketio = require('socket.io');

const {updatePlayers, removePlayer} = require('./players/action-creator');
const { addBomb, updateBombPositions, removePlayerBombs, removeBomb } = require('./bombs/action-creator')

const store = require('./store')


server.on('request', app);


// creates a new connection server for web sockets and integrates
// it into our HTTP server
const io = socketio(server)


//  use socket server as an event emitter in order to listen for new connctions
io.on('connection', (socket) => {
  io.sockets.emit('initial', store.getState());
  console.log(chalk.blue('A new client has connected'));
  console.log(chalk.yellow('socket id: ', socket.id));

  //on connection add this new player to our store
  store.dispatch(updatePlayers({id: socket.id,
                                position: {x: 0, y: 0, z: 0}
                              }));
  socket.on('get_players', () => {
    socket.emit('get_players', store.getState().players);
  })

  socket.on('update_world', (data) => {
    store.dispatch(updatePlayers({ id: data.playerId, position: data.playerPosition }));
    store.dispatch(updateBombPositions({ userId: data.playerId, bombs: data.playerBombs }))

    console.log(store.getState().bombs.allBombs)
    io.sockets.emit('update_world', store.getState())
  })

  //add new bomb to the state when a player clicks
  socket.on('add_bomb', (data) => {
    store.dispatch(addBomb(data))
    io.sockets.emit('update_bomb_positions', store.getState().bombs.allBombs)
  })

  //remove the player from the state on socket disconnect
  socket.on('disconnect', () => {
    store.dispatch(removePlayer(socket.id))
    store.dispatch(removePlayerBombs(socket.id))

    io.sockets.emit('remove_player', socket.id)
    console.log('socket id ' + socket.id + ' has disconnected. : (');
  })
})


app.use(express.static(path.join(__dirname, '..', 'public', 'assets')));

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


server.listen(port, function () {
    console.log(`The server is listening on port ${port}!`);
});
