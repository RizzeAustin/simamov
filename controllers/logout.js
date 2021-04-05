//====== MODUL ======//
//load framework express
var express = require('express');
//buat router khusus logout
var logout = express.Router();

//load model User
var User = require(__dirname + "/../model/User.model");

//route GET /logout
logout.get('/', function(req, res) {
    User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Logout', timestamp: new Date().getTime() } } }, function(err, status) {

    });
    req.session.destroy();
    res.redirect('login');
});

module.exports = logout;