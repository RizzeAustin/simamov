//====== MODUL ======//
//load framework express
var express = require('express');

//buat router khusus index/home
var index = express.Router();

var Setting = require(__dirname + "/../model/Setting.model");

index.get('/', function(req, res) {
    if (req.query.tahun_anggaran) {
        ref = 'ref=' + req.query.tahun_anggaran;
        console.log(ref);
        req.session.tahun_anggaran = req.query.tahun_anggaran;
    }
    res.render('blank', {
        display_name: req.session.username,
        tahun_anggaran: req.session.tahun_anggaran,
        admin: req.session.jenis,
        jabatan: req.session.userJabatan,
        role: req.session.userRole,
    });
});

index.get('/home', function(req, res) {
    res.render('beranda', { layout: false, username: req.session.username, tahun_anggaran: req.session.tahun_anggaran });
});

module.exports = index;