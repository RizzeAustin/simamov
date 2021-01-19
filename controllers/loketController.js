var express = require('express');
var loket = express.Router();

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');

var Pegawai = require(__dirname + "/../model/Pegawai.model");

var Program = require(__dirname + "/../model/Program.model");
var Kegiatan = require(__dirname + "/../model/Kegiatan.model");
var Output = require(__dirname + "/../model/Output.model");
var Komponen = require(__dirname + "/../model/Komponen.model");
var Akun = require(__dirname + "/../model/Akun.model");
var DetailBelanja = require(__dirname + "/../model/DetailBelanja.model");

var CustomEntity = require(__dirname + "/../model/CustomEntity.model");
var SettingSPPD = require(__dirname + "/../model/SettingSPPD.model");
var Setting = require(__dirname + "/../model/Setting.model");

var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname + "/../model/User.model");

var Loket = require(__dirname + "/../model/Loket.model");

//Short syntax tool
var _ = require("underscore");
const { json } = require('body-parser');
const { db } = require('../model/Loket.model');

//Socket.io
loket.connections;
loket.io;

var daftarPengajuan = [];

loket.socket = function(io, connections, client) {

    loket.connections = connections;
    loket.io = io;


    // Loket.find({}, function(err, data) {
    //     if (err) {
    //         errorHandler(client, 'Database Error. Mohon hubungi admin.');
    //         return;
    //     }

    //     _.each(data, function(dataLoket) {
    //         daftarPengajuan.push(
    //             dataLoket.kodeUnit,
    //             dataLoket.nomorTransaksi,
    //             dataLoket.tanggal.pengajuan,
    //             dataLoket.nilaiPengajuan,
    //             dataLoket.detail,
    //             dataLoket.posisi,
    //             dataLoket.status,
    //             dataLoket.catatan,
    //         )
    //     })

    // })

    Loket.find({}, function(err, data) {
        console.log(data)
    })


}

loket.get('/dashboard', function(req, res) {

    res.render('loket/loket_dashboard', {
        layout: false,
        admin: req.session.jenis,
        daftarP: daftarPengajuan,
    })

})

loket.get('/user', async(req, res) => {

    // DetailBelanja.find({ kdakun: '522192', jumlah: { $gte: 4000000 } }, function(err, data) {
    //     if (err) console.log(err)
    //         // console.log(data)
    //         // console.log(data[0].jumlah)
    //     for (let index = 0; index < data.length; index++) {
    //         console.log(data[index].jumlah)
    //     }
    // })

    res.render('loket/loket_user', {
        layout: false,
        admin: req.session.jenis,
        // duit: data[0].jumlah
    });

})

loket.post('/unitSubmit', function(req, res) {
    // buat nomor transaksi
    let a = new Date().getFullYear().toString()
    let b = new Date().getMonth() + 1
    if (b < 11) {
        b = '0' + b
    } else {
        b = b.toString()
    }

    const tiket = new Loket({
        nomorTransaksi: a + b + req.body.loketKodeUnit.toString(),
        unit: req.body.loketUnit,
        kodeUnit: req.body.loketKodeUnit,
        operator: req.body.loketOperator,
        tanggal: {
            pengajuan: new Date().toDateString,
            pelaksanaan: req.body.loketTglPelaksanaan,
        },
        detail: req.body.loketDetail,
        nilaiPengajuan: req.body.loketNilai,
        checklist: {
            spj: req.body.checklistSpjUnit,
            daftarHadir: req.body.checklistDaftarHadirUnit,
            dokumentasi: req.body.checklistDokumentasiUnit,
            notulensi: req.body.checklistNotulensiUnit,
            cvNarasumber: req.body.checklistCvUnit,
        },
        filespj: req.body.filespj,
        posisi: 'validator',
        status: 'belum selesai'
    })

    try {
        tiket.save()
        console.log(JSON.parse(tiket))
    } catch (error) {
        res.json({ message: error })
    }

})

// loket.get('/validator', function (req, res) {
//     res.render('loket/loket_validator',{
//         layout: false, 
//         admin: req.session.jenis,
//     })
// })

// loket.get('/reviewer', function (req, res) {
//     res.render('loket/loket_reviewer',{
//         layout: false, 
//         admin: req.session.jenis,
//     })
// })

// loket.get('/bendahara', function (req, res) {
//     res.render('loket/loket_bendahara',{
//         layout: false, 
//         admin: req.session.jenis,
//     })
// })

// loket.get('/bank', function (req, res) {
//     res.render('loket/loket_bank',{
//         layout: false, 
//         admin: req.session.jenis,
//     })
// })

// loket.get('/arsiparis', function (req, res) {
//     res.render('loket/loket_arsiparis',{
//         layout: false, 
//         admin: req.session.jenis,
//     })
// })

// loket.post('/submit', function(req, res){
//     console.log('form penarikan disubmit');
//     // loket.connections[req.session.user_id].emit('form_penarikan');
// })







module.exports = loket;