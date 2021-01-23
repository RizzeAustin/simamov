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
const { db, count, translateAliases } = require('../model/Loket.model');

//Socket.io
loket.connections;
loket.io;

loket.socket = function(io, connections, client) {

    loket.connections = connections;
    loket.io = io;

    io.on('connection', (socket) => {
        Loket.find({ status: 'belum selesai' }, (err, data) => {
            if (err) console.log(err)
            daftarPengajuan = JSON.parse(JSON.stringify(data))
                // console.log(daftarPengajuan)
        });

        Loket.find({ status: 'selesai' }, (err, data) => {
            if (err) console.log(err)
            daftarSelesai = JSON.parse(JSON.stringify(data))
                // console.log(daftarSelesai)
        });
    })

    client.on('mintaDetailTiket', function(id) {
        Loket.findById(id, function(err, data) {
            if (err) console.log(err)
            var detail = JSON.parse(JSON.stringify(data))
            client.emit('kirimDetailTiket', detail)
        })
    })

}


// --------------------   ROUTER   -----------------------

loket.get('/dashboard', function(req, res) {

    res.render('loket/loket_dashboard', {
        layout: false,
        admin: req.session.jenis,
        daftarPengajuan: daftarPengajuan,
        daftarSelesai: daftarSelesai,
    })

})

loket.get('/user', function(req, res) {
    res.render('loket/loket_user', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/ppk', function(req, res) {
    res.render('loket/loket_ppk', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/ppspm', function(req, res) {
    res.render('loket/loket_ppspm', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/reviewer', function(req, res) {
    res.render('loket/loket_reviewer', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/bendahara', function(req, res) {
    res.render('loket/loket_bendahara', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/bank', function(req, res) {
    res.render('loket/loket_bank', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.post('/unitKirim', function(req, res) {

    try {
        const tiket = new Loket({
            nomorTransaksi: noTransaksi(req.body.loketKodeUnit),
            unit: req.body.loketNamaUnit,
            kodeUnit: req.body.loketKodeUnit,
            operator: req.body.loketOperator,
            tanggal: {
                pengajuan: new Date(),
                pelaksanaan: new Date(req.body.loketTglPelaksanaan),
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
            posisi: 'ppk',
            status: 'belum selesai'
        });

        // console.log('nomor transaksi: ' + noTransaksi(req.body.loketKodeUnit))

        tiket.save();
        console.log(tiket);
        console.log('------------------------------');
        console.log(JSON.parse(JSON.stringify(tiket)));
    } catch (error) {
        console.log(error)
    }

})

loket.post('/ppkTolak', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/ppkKirim', function(req, res) {

    try {
        res.render('loket/loket_dashboard', {
            layout: false,
            admin: req.session.jenis,
            daftarPengajuan: daftarPengajuan,
            daftarSelesai: daftarSelesai,
        })
        console.log('maaf anda telah ditolak ppk kirim')
    } catch (error) {
        console.log(error)
    }



})

loket.post('/ppspmTolak', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/ppspmKirimReviewer', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/ppspmKirimBinagram', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/reviewerTolak', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/reviewerProses', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bendaharaProses', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bendaharaKirimArsiparis', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bendaharaKirimBmn', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bendaharaInputRealisasi', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bendaharaInputPajak', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

loket.post('/bankKirim', function(req, res) {
    console.log(req.body.loketCatatanPpk)
    console.log('maaf anda telah ditolak')
})

// --------------------   FUNCTION   -----------------------

// javascript create JSON object from two dimensional Array
function arrayToJSONObject(arr) {
    //header
    var keys = arr[0];

    //vacate keys from main array
    var newArr = arr.slice(1, arr.length);

    var formatted = [],
        data = newArr,
        cols = keys,
        l = cols.length;
    for (var i = 0; i < data.length; i++) {
        var d = data[i],
            o = {};
        for (var j = 0; j < l; j++)
            o[cols[j]] = d[j];
        formatted.push(o);
    }
    return formatted;
}

// fungsi membiat nomor transaksi
function noTransaksi(kodeUnit) {
    let noUrut = 1
    let tahun = new Date().getFullYear()
    let bulan = new Date().getMonth()

    bulan++
    if (bulan < 10) {
        bulan = '0' + bulan
    }

    Loket.count({}, function(err, count) {
        if (err) console.log(err)
        noUrut += count
        if (noUrut < 10) {
            noUrut = '00' + noUrut
        } else if (noUrut < 100) {
            noUrut = '0' + noUrut
        }
    })

    return `${tahun}${bulan}${kodeUnit}${noUrut}`
}

//membuat tanggal lebih mudah dibaca
function formatTanggal(tgl) {
    let tahun = tgl.getFullYear();
    let bulan = tgl.getMonth() + 1;
    let hari = tgl.getDate();
    return `${hari}/${bulan}/${tahun}`
}

// function noTransaksi(tahun, bulan, kodeUnit) {
//     const noUrut = 1

//     Loket.count({}, function(err, count) {
//         if (err) console.log(err)
//         noUrut =+ count

//     })
//     return `${tahun}${bulan}${kodeUnit}${noUrut}`

// }

// function noTransaksi() {
//     const hitung = () => new Promise((fulfill, reject) => {
//         Loket.count({}, (err, count) => {
//             if (err) return reject(err)
//             return fulfill(count)
//         })
//     })

//     let a = 1
//     hitung()
//         .then(() => {
//             a = a + hasil
//             console.log('hasil: ' + hasil)
//             console.log('a: ' + a)
//         })
// }

// loket.post('/submit', function(req, res){
//     console.log('form penarikan disubmit');
//     // loket.connections[req.session.user_id].emit('form_penarikan');
// })







module.exports = loket;