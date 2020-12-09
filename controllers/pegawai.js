var express = require('express');
var pegawai = express.Router();

//Flow control
var async = require('async');

var Pegawai = require(__dirname+"/../model/Pegawai.model");

var CustomEntity = require(__dirname+"/../model/CustomEntity.model");
var User = require(__dirname+"/../model/User.model");

//Short syntax tool
var _ = require("underscore");

//modul sql utk koneksi db mysql sipadu
var mysql = require('mysql');

//Socket.io
pegawai.connections;

pegawai.io;

pegawai.socket = function(io, connections, client){
	pegawai.connections = connections;

	pegawai.io = io;

	client.on('pegawai_init', function (tab) {
		if(tab == 'stis'){
			var kode_dosen = ['init'];
			Pegawai.find({active: true}).sort('nama').exec(function(err, pegs){
				var nomor = 1;
						_.each(pegs, function(peg, i, list){
							var row = [
								nomor,
								peg.nama || '-',
								peg._id || '-',
								peg.jabatan || '-',
								peg.gol || '-',
								'<button type="button" class="hapus-pgw"><i class="icon-close"></i></button>'
								+' <button type="button" class="riwayat-pgw"><i class="icon-list"></i></button>',
								peg.kode_dosen || 'none',
								peg.ce || 'none'
							]
							nomor++;
							client.emit('pegawai_init_response', {'row': row, unit: 'pegawai_stis'});
							if(i == pegs.length - 1) client.emit('pegawai_init_finish', 'pegawai_stis');
						});

			});
		} else if(tab == 'bps'){
			var nomor = 1;
			// var query = 'SELECT * ' +
			// 			'FROM dosen ' +
			// 			'WHERE aktif = 1 AND unit = ? AND kode_dosen NOT IN (?)';
			CustomEntity.find({type: 'Penerima', unit: 'BPS', active: true}).sort('nama').exec(function(err, bpspeg){
				var kode_dosen = ['init'];
				_.each(bpspeg, function(peg, i, list){
					if(peg.get('kode_dosen')) kode_dosen.push(peg.get('kode_dosen'));
					var row = [
						nomor++,
						peg.nama || '-',
						peg.get('nip') || '-',
						peg.get('jabatan') || '-',
						peg.get('gol') || '-',
						'<button type="button" class="hapus-pgw"><i class="icon-close"></i></button>'
						+' <button type="button" class="riwayat-pgw"><i class="icon-list"></i></button>',
						peg.get('kode_dosen') || 'none',
						peg._id || 'none',
						peg.ce || 'none'
					]
					client.emit('pegawai_init_response', {'row': row, unit: 'pegawai_bps'});
					if(i == list.length - 1) client.emit('pegawai_init_finish', 'pegawai_bps');
				});
			});
			
		} else {
			CustomEntity.find({type: 'Penerima', unit: { $ne: 'BPS' }, active: true}).sort('nama').exec(function(err, custs){
				_.each(custs, function(cust, i, list){
					var ket = '-';
					if(cust.unit) ket = 'Dosen '+(cust.unit||'Luar');
					var row = [
						i+1,
						cust.nama,
						cust.get('nip') || '-',
						cust.jabatan || '-',
						cust.gol || '-',
						cust.ket || ket || '-',
						'<button type="button" class="link-sipadu"><i class="icon-link"></i></button>'
						+' <button type="button" class="hapus-pgw"><i class="icon-close"></i></button>'
						+' <button type="button" class="riwayat-pgw"><i class="icon-list"></i></button>',
						cust.kode_dosen || cust._id,
						cust._id || 'none'
					]
					client.emit('pegawai_init_response', {'row': row, unit: 'non_stis_bps'});
					if(i == custs.length - 1) client.emit('pegawai_init_finish', 'non_stis_bps');
				});
			});
		}
		
	});

	client.on('jab_list', function (data, cb) {
		Pegawai.find().distinct('jabatan', function(error, jabs) {
			cb(jabs);
		})
	})

	client.on('entry_pegawai_baru', function (data, cb) {
		if(data.collection == 'pegawai'){
			var peg = new Pegawai(data.data);
			peg.save(function(err, res){
				if(err){
					cb(null);
				}else {
					cb(peg._id);
				}
			});
		} else if(data.collection == 'bps'){
			data.data.nip = data.data._id;
			delete data.data._id;
			data.data.type = 'Penerima';
			data.data.unit = 'BPS';
			var cs = new CustomEntity(data.data);
			cs.save(function(err, res){
				cb(cs._id);
			});
		} else if(data.collection == 'custom_entity'){
			data.data.nip = data.data._id;
			delete data.data._id;
			data.data.type = 'Penerima';
			data.data.unit = 'Non STIS/BPS';
			var cs = new CustomEntity(data.data);
			cs.save(function(err, res){
				cb(cs._id);
			});
		}
		User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat pegawai baru : '+data.data.nama}}}, 
			function(err, status){
		})
	})

	client.on('gol_list', function (data, cb) {
		Pegawai.find().distinct('gol', function(error, gols) {
			cb(gols);
		})
	})

	client.on('edit_pegawai', function (data, cb) {
		if(data.type == 'pegawai'){
			Pegawai.update({_id: data._id}, {[data.field]: data.value}, function(err, status) {
				if (err) {
	    			cb('gagal');
	    			return
	    		}
				cb('sukses');
			})
		} else if(data.type == 'bps'){
			CustomEntity.update({_id: data._id}, {[data.field]: data.value}, function(err, status) {
				if (err) {
	    			cb('gagal');
	    			return
	    		}
				cb('sukses');
			})
		} else{
			Pegawai.update({_id: data._id}, {'ce': data.value}, function(err, status) {
				if (err) {
	    			cb('gagal');
	    			return
	    		}
	    		if(!status.nModified){
	    			CustomEntity.update({_id: data._id}, {'ce': data.value}, function(err, status) {
						if (err) {
			    			cb('gagal');
			    			return
			    		}
						cb('sukses');
						CustomEntity.update({'_id': data.value}, {active: false}, function(err, status) {
		    			})
					})
	    		}else {
	    			cb('sukses');
					CustomEntity.update({'_id': data.value}, {active: false}, function(err, status) {
	    			})
	    		}
			})
		}
		User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Edit pegawai '+data._id+', '+data.field+' ==> '+data.value}}}, 
			function(err, status){
		})
		
	})

	client.on('edit_bps_ce', function (data, cb) {
		CustomEntity.update({_id: data._id}, {[data.field]: data.value}, function(err, status) {
			if (err) {
    			cb('gagal');
    			return
    		}
			cb('sukses');
		})
		User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Edit pegawai '+data._id+', '+data.field+' ==> '+data.value}}}, 
			function(err, status){
		})
	})

	client.on('hapus_pegawai', function (_id, cb) {
		Pegawai.update({'_id': _id}, {active: false}, function(err, status) {
			if (err) {
    			cb('gagal');
    			return
    		}

    		if(!status.nModified){
    			CustomEntity.update({'_id': _id}, {active: false}, function(err, status) {
    				cb('sukses');
					User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Hapus Entitas Non STIS '+_id}}}, 
						function(err, status){
					})	
    			})
    		} else {
    			cb('sukses');
				User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Hapus pegawai STIS '+_id}}}, 
					function(err, status){
				})	
    		}			
		}) 
	})

}

pegawai.get('/', function(req, res){
	res.render('pegawai/pegawai', {layout: false});
});

pegawai.post('/ajax/edit', function(req, res){

	var MongoClient = mongodb.MongoClient;

	MongoClient.connect(url, function(err, db){
		if(err){
		} else{
			var jenis = req.body.jenis;

			var value = req.body.new_value;

			if(jenis == "jabatan"){
				value = value.replace(/(,\s*|\s*,)/g, ",");
				value = value.split(',');
			}
			db.collection('pegawai').update({"nip": req.body.nip}, {$set:{[jenis]:value}}, function(err, result){
				if(err){
					console.error(err);
					return;
				} 
				res.end('sukses');
			})
			
			db.close();
		}
	});
});

function errorHandler(user_id, message){
	if(_.isString(user_id)) pok.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

function sendNotification(user_id, message){
	if(_.isString(user_id)) pok.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

module.exports = pegawai;