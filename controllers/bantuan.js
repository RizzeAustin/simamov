//====== MODUL ======//
//load framework express
var express = require('express');

//buat router khusus bantuan
var bantuan = express.Router();

bantuan.get('/', function(req, res){
	res.render('bantuan', {layout: false});
});

module.exports = bantuan;