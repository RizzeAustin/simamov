// mongorestore -d simamov D:\simamov\db\simamov

//server
// mongorestore --host "127.0.0.1:27017" --username 221709865 --password L232efzfYmtUuGI --authenticationDatabase skripsi_221709865 -d skripsi_221709865 /home/221709865/simamov/db/simamov
// mongo --username 221709865 --password L232efzfYmtUuGI --authenticationDatabase skripsi_221709865


//====== MODUL ======//
//load framework express
var express = require('express');
var app = express();

var server = require('http').createServer(app);
var io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        transports: ['websocket', 'polling'],
        credentials: true
    },
    allowEIO3: true
});
//clients connection
var connections = {};

require('dotenv').config();

//Security
var helmet = require('helmet');
app.use(helmet());


//modul morgan utk debug log ke console
var logger = require('morgan');
app.use(logger('dev'));

//modul cookie parser utk mengatur cookie
var cookieParser = require('cookie-parser');
var credentials = require('./credentials.js'); //string acak utk encrypt
app.use(cookieParser(credentials.cookieSecret));

//modul body parser utk mengatur POST request
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

//Kompresi gzip
var compression = require('compression');
app.use(compression());

//modul mongodb utk koneksi mongo db keuangan
var mongo = require('mongodb');

var url = 'mongodb://127.0.0.1:27017/simamov';

var mongoose = require('mongoose');

mongoose.connect(url), {useNewUrlParser: true, useUnifiedTopology: true};
mongoose.set('useCreateIndex', true)
var Program = require(__dirname + "/model/Program.model");

//Untuk auto Increment
var autoIncrement = require('mongoose-auto-increment');
autoIncrement.initialize(mongoose.createConnection('mongodb://127.0.0.1:27017/simamov'));

//modul session utk tracking visitor
var session = require('express-session')({
    resave: false,
    saveUninitialized: true,
    secret: credentials.cookieSecret
});
var sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session, {
    autoSave: true
}));

//modul handlebars utk dynamic page render
var handlebars = require('express-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        if_eq: function(a, b, opts) {
            if (a == b) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
        },
        if_neq: function(a, b, opts) {
            if (a != b) {
                return opts.fn(this);
            } else {
                return opts.inverse(this);
            }
        },
        json: function(context) {
            return JSON.stringify(context);
        },
        "inc": function(value, options) {
            return parseInt(value) + 1;
        },
        "fullYear": function() {
            return (new Date()).getFullYear();
        },
        prev: function(value) {
            return parseInt(value) - 1;
        },
        next: function(value) {
            return parseInt(value) + 1;
        }
    }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

//====== DIRECTORY PUBLIC ACCESS ======//
//dir yg bisa diakses langsung
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.use('/img', express.static(__dirname + '/img'));
app.use('/result', express.static(__dirname + '/template/output'));
app.use('/result_temp', express.static(__dirname + '/temp_file'));
app.use('/template', express.static(__dirname + '/template'));
app.use('/download', express.static(__dirname + '/template/output/riwayat'));

//====== ROUTES ======//
var login = require('./controllers/login.js'); //route index
app.use('/login', login); //root menggunakan dialihkan ke index.js


//Short syntax tool
var _ = require("underscore");

//cek login, urutan harus di bawah route login
var login_check = function(req, res, next) {
    if (!req.session.username) {
        Program.findOne().sort({ 'thang': 1 }).exec(function(error, programs) {
            var thang = [];
            if (!programs) {
                thang = [{ thang: new Date().getFullYear() }];
            } else {
                for (var i = (programs.thang); i < new Date().getFullYear() + 1; i++) {
                    thang.push({ thang: i });
                }
            }
            res.set('login', '0')
            res.render('login', { layout: false, 'thang': thang, 'this_year': new Date().getFullYear() });
        })
        return;
    }
    //register socket.io utk call via socket
    io.on('connection', function(client) {
        if (req.session)
            connections[req.session.user_id] = client;
    })

    next()
}

app.use(login_check)

//Home
var index = require('./controllers/index.js'); //route index
app.use('/', index); //root menggunakan dialihkan ke index.js

//SPPD
var sppd = require('./controllers/sppd.js');
app.use('/sppd', sppd);
//SPJ
var spj = require('./controllers/spj.js');
app.use('/spj', spj);
//PEGAWAI
var pegawai = require('./controllers/pegawai.js');
app.use('/pegawai', pegawai);
//POK
var pok = require('./controllers/pok.js');
app.use('/pok', pok);
//ADMIN
var admin = require('./controllers/admin.js');
app.use('/admin', admin);
//LOGOUT
var logout = require('./controllers/logout.js');
app.use('/logout', logout);
//BANTUAN
var bantuan = require('./controllers/bantuan.js');
app.use('/bantuan', bantuan);
//LOKET
var loket = require('./controllers/loketController.js');
app.use('/loket', loket);

//route jika halaman tidak ditemukan
app.use(function(req, res) {
    res.type('text/html');
    res.status(404);
    res.render('404', { layout: false });
});
//route jika terjadi error di server/bug code
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500', { layout: false });
});

server.listen(process.env.PORT || 3000, function() {
    console.log('Server listening on ' + (process.env.PORT || 3000));
});

io.on('connection', function(client) {

    if (!client.handshake.session.user_id) {

        client.emit('login_required', 'Anda harus login.');
        return;

    }

    pok.socket(io, connections, client);
    sppd.socket(io, connections, client);
    spj.socket(io, connections, client);
    pegawai.socket(io, connections, client);
    admin.socket(io, connections, client);
    login.socket(io, connections, client);
    loket.socket(io, connections, client);

    client.on('join', function(data) {
        client.emit('messages', 'Terhubung ke server.');
    });
})