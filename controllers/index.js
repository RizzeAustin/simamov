//====== MODUL ======//
//load framework express
var express = require('express');

//buat router khusus index/home
var index = express.Router();

var Setting = require(__dirname+"/../model/Setting.model");

index.get('/', function(req, res){
	res.render('blank', {display_name: req.session.username, admin: req.session.jenis, tahun_anggaran: req.session.tahun_anggaran});
});

index.get('/home', function(req, res){
	Setting.findOne({'thang': req.session.tahun_anggaran || new Date().getFullYear(), type:'pok'}, function(err, pok_setting){
		if(pok_setting){
			res.render('pok/pok', {layout: false, pok_name: pok_setting.toObject().name, admin: req.session.jenis, username: req.session.username, tahun_anggaran: req.session.tahun_anggaran});
		} else{
			Setting.create({'thang': req.session.tahun_anggaran, type:'pok', name: 'POK', old: []}, function(err, new_setting){
				res.render('pok/pok', {layout: false, pok_name: new_setting.toObject().name, admin: req.session.jenis, username: req.session.username, tahun_anggaran: req.session.tahun_anggaran});
			})
		}
	})
});

module.exports = index;