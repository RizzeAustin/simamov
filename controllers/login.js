//====== MODUL ======//
//load framework express
var express = require('express');
//load crypto utk hashing password
var crypto = require('crypto');
//load model User
var User = require(__dirname+"/../model/User.model");
var Program = require(__dirname+"/../model/Program.model");

//buat router khusus login
var login = express.Router();

//Socket.io
login.connections;

login.io;

login.socket = function(io, connections, client){
	login.connections = connections;

	login.io = io;
}


//route GET /login
login.get('/', function(req, res){
	var href = '';
	if(req.query.href){
		href = '?href='+req.query.href;
	}
	Program.findOne().sort({'thang': 1}).exec(function(error, programs) {
		var thang = [];
		if(!programs){
			thang = [{thang: new Date().getFullYear()}];
		} else {
			for (var i = (programs.thang); i < new Date().getFullYear()+1; i++) {
				thang.push({thang: i});
			}
		}
		res.render('login', {layout: false, href: href, 'thang': thang, 'this_year': new Date().getFullYear()});
	})
});
//route POST /login
login.post('/', function(req, res){
	//hashing pass utk pengecekan
	var hash = crypto.createHmac('sha256', req.body.password)
                   .digest('hex');
	//cek login ke db
	User.findOne({ 'username':  req.body.username, 'password': hash, active: true}, function (err, user) {
		if (err) {
			//jika koneksi error
			res.send('Database bermasalah, mohon hubungi admin');
			return;
		} else if(!user){
			//jika user tdk ada
			var href = '';
			if(req.query.href){
				href = '?href='+req.query.href;
			}

			Program.findOne().sort({'thang': 1}).exec(function(error, programs) {
				var thang = [];
				if(!programs){
					thang = [{thang: new Date().getFullYear()}];
				} else {
					for (var i = (programs.thang); i < new Date().getFullYear()+1; i++) {
						thang.push({thang: i});
					}
				}
				res.render('login', {layout: false, href: href, message: 'User atau password salah', 'thang': thang, 'this_year': new Date().getFullYear()});
			})
			return;
		}
		//simpan session utk nama & tahun anggaran
		req.session.username = req.body.username;
		req.session.tahun_anggaran = req.body.tahun_anggaran;
		req.session.jenis = user.jenis;
		req.session.user_id = user._id;

		//ke home
		if(!req.query.href) req.query.href = ''
			else req.query.href = '#'+req.query.href
		res.redirect('/'+req.query.href);
		//update user sikap
    	User.update({_id: user._id}, {ip_address: req.headers['x-forwarded-for'] || req.connection.remoteAddress, last_login_time: formatDate(new Date()),
    		$push: {"act": {label: 'Login'}}}, function(err, status){

		})
	});
});



function formatDate(date) {
  var monthNames = [
    "Januari", "Februari", "Maret",
    "April", "Mei", "Juni", "Juli",
    "Agustus", "September", "Oktober",
    "November", "Desember"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();
  var min = date.getMinutes();
  var hour = date.getHours();

  return hour + ':' + min + ' ' + day + ' ' + monthNames[monthIndex] + ' ' + year;
}

module.exports = login;