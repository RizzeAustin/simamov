var express = require('express');
var loket = express.Router();

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');

var Pegawai = require(__dirname+"/../model/Pegawai.model");

var Program = require(__dirname+"/../model/Program.model");
var Kegiatan = require(__dirname+"/../model/Kegiatan.model");
var Output = require(__dirname+"/../model/Output.model");
var Komponen = require(__dirname+"/../model/Komponen.model");
var Akun = require(__dirname+"/../model/Akun.model");
var DetailBelanja = require(__dirname+"/../model/DetailBelanja.model");

var CustomEntity = require(__dirname+"/../model/CustomEntity.model");
var SettingSPPD = require(__dirname+"/../model/SettingSPPD.model");
var Setting = require(__dirname+"/../model/Setting.model");

var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname+"/../model/User.model");

var Loket = require(__dirname+"/../model/Loket.model");

//Short syntax tool
var _ = require("underscore");

//Socket.io
loket.connections;
loket.io;

loket.socket = function(io, connections, client){

	loket.connections = connections;
    loket.io = io;
    
}

loket.get('/', function (req, res){
    res.render('loket/loket', {layout: false, admin: req.session.jenis});
})

loket.post('/submit', function(req, res){
    console.log('form penarikan disubmit');
    loket.connections[req.session.user_id].emit('form_penarikan');
})







module.exports = loket;