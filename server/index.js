const path = require('path');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const { generateMessage, generateLocationMessage } = require('./utils/message.js');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');
const publicPath = path.join(__dirname, '../public');
const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
app.use(express.static(publicPath));

var io = socketIO(server);
var users = new Users();

io.on('connection', (socket) => {

    socket.on('leave', (params) => {
        socket.leave(params.room);
    });

    socket.on('login', (params, callback) => {
        console.log(params.nama + ' baru saja login');

        socket.join('umum');
        // users.removeUser(params.pengguna_id);
        users.addUser(params.pengguna_id, params.nama, 'umum');

        io.emit('updateUserList', users.getUserList('umum'));

        callback();
    });

    socket.on('online', (params, callback) => {
        console.log(socket.id + ' online');
        io.emit('updateUserList', users.getUserList('umum'));
    });

    socket.on('join', (params, callback) => {

        // console.log(params);
        // console.log(socket);

        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('Bad request');
        }

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room);

        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage('Admin', params.room, 'Welcome to the chat app.'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', params.room, `${params.name} has joined.`));

        callback();
    });

    socket.on('createMessage', (kuis_id, callback) => {
        // var user = users.getUser(socket.id);
        // if (user && isRealString(message.text)) {
        //     let tempObj = generateMessage(user.name, user.room, message.text);
        //     io.to(user.room).emit('newMessage', tempObj);
        //     callback({
        //         data: tempObj
        //     });
        // }
        // callback();
        io.emit('newMessage', kuis_id);
    });

    socket.on('createLocationMsg', (coords) => {
        var user = users.getUser(socket.id);
        if (user) {
            io.to(user.room).emit('createLocationMsg', generateLocationMessage(user.name, user.room, coords.lat, coords.lon));
        }
    });

    socket.on('disconnect', () => {
        var user = users.removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', user.room, `${user.name} has left.`));
        }
    });

    //buatan khs
    // socket.on('pesertaJawab', (nama) => {
    //     console.log(nama+ ' menjawab pertanyaan');
    // })

});

server.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});

