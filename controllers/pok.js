var express = require('express');

var pok = express.Router();

//Flow control
var async = require('async');

//modul path utk concenate path
var path = require('path');

//modul formidable utk parse POST gambar
var formidable = require('formidable');

//Zip
var Unrar = require('unrar');

// Require library 
var xl = require('excel4node');

//Xlsx to Pdf
var msopdf = require('node-msoffice-pdf');

//modul fs utk rw file
var fs = require('fs');

//XML to JSON
var parseString = require('xml2js').parseString;

//Mongo db 
var mongodb = require('mongodb');
var ObjectId = require('mongoose').Types.ObjectId;

var Program = require(__dirname+"/../model/Program.model");
var Kegiatan = require(__dirname+"/../model/Kegiatan.model");
var Output = require(__dirname+"/../model/Output.model");
var SubOutput = require(__dirname+"/../model/SubOutput.model");
var Komponen = require(__dirname+"/../model/Komponen.model");
var SubKomponen = require(__dirname+"/../model/SubKomponen.model");
var Akun = require(__dirname+"/../model/Akun.model");
var DetailBelanja = require(__dirname+"/../model/DetailBelanja.model");

var UraianAkun = require(__dirname+"/../model/UraianAkun.model");

var Setting = require(__dirname+"/../model/Setting.model");

var Pegawai = require(__dirname+"/../model/Pegawai.model");
var CustomEntity = require(__dirname+"/../model/CustomEntity.model");

//Short syntax tool
var _ = require("underscore");

var levenshtein = require('fast-levenshtein');

//modul sql utk koneksi db mysql sipadu
var mysql = require('mysql');
var sipadu_db = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: '',
	database: 'sipadu_db'
});

sipadu_db.connect();

// var query = 'SELECT * ' +
// 			'FROM dosen ' +
// 			'WHERE nama = ?';
// sipadu_db.query(query, 'Dosen1', function (err, rows, fields) {
// 	if (err){
// 	  	console.log(err)
// 	  	return;
// 	}

// 	console.log(rows[0].nama)
// })

//Socket.io
pok.connections;

pok.io;

pok.socket = function(io, connections){
	pok.connections = connections;

	pok.io = io;

	io.sockets.on('connection', function (client) {
		//tahun anggaran utk pok
		var thang = client.handshake.session.tahun_anggaran || new Date().getFullYear();
		//user aktiv
		var user_aktiv = client.handshake.session.username || 'dummy user';

		//join sesama tahun anggaran utk broadcast
		client.join(thang);

	    client.on('pok_title_submit', function (pok_name) {
	    	//Ubah nama
			Setting.findOne({type:'pok', 'thang': thang}, 'name timestamp old', function(err, pok_setting){
				if(err) {
					errorHandler(client, 'Database error.');
					return;
				};
				//tambahkan nama, nama sebelumnya di old kan
				if(pok_setting){
					Setting.update({type: 'pok', 'thang': thang},{$set: {name: pok_name}, $push: {"old": {name: pok_setting.toObject().name, timestamp: pok_setting.toObject().timestamp}}}, {upsert: true}, function(err, status){
						if(err){
							errorHandler(client, 'Database error.');
							return;
						}	
						sendNotification(client, 'Nama POK telah diubah.');
						client.broadcast.to(thang).emit('title_change', pok_name);
					})
				} else {
					old_setting = [];
					Setting.update({type: 'pok', 'thang': thang},{$set: {name: pok_name, old: old_setting}}, {upsert: true}, function(err, status){
						if(err){
							errorHandler(client, 'Database error.');
							return;
						}		
						sendNotification(client, 'Nama POK telah diubah.');		
					})
				}
			})
	    });

	    //event item pok teredit
	    client.on('pok_edit_item', function (user_input) {
	    	//ambil id yg teredit
	    	var _id = user_input._id;
	    	//init model
	    	var Model;
	    	//hapus id spy tdk ikut terupdate
	    	delete user_input._id;
	    	//pemilihan model
	    	if(user_input.type == 'detail'){
	    		Model = DetailBelanja;
	    	} else if(user_input.type == 'program'){
	    		Model = Program;
	    	} else if(user_input.type == 'kegiatan'){
	    		Model = Kegiatan;
	    	} else if(user_input.type == 'output'){
	    		Model = Output;
	    	} else if(user_input.type == 'soutput'){
	    		Model = SubOutput;
	    	} else if(user_input.type == 'komponen'){
	    		Model = Komponen;
	    	} else if(user_input.type == 'skomponen'){
	    		Model = SubKomponen;
	    	} else if(user_input.type == 'akun'){
	    		Model = Akun;
	    	}
	    	//hapus type spy tdk terupdate
	    	delete user_input.type;
	    	//cari item yg teredit
	    	Model.findOne({'_id': _id, 'active': true, 'thang': thang}, function(err, item){
    			if(err){
					errorHandler(client, 'Gagal update. Mohon hubungi admin.');
					return;
				}
				//init old dan perubahan
				var old = {};
				var new_item = {};

				//loop through nama var 
				_.each(_.keys(user_input), function(element, index, list){
					if( item[ element ] ){ //jika var di db ada
						//simpan sbg old
						old[ element ] = item[ element ];
						//yg baru
						new_item[ element ] = user_input[ element ];
					} else {
						//yg baru
						new_item[ element ] = user_input[ element ];
					}
					//sebarkan
					client.broadcast.to(thang).emit('pok_item_change', {'_id': _id, [element]: user_input[ element ]});
				});

				//simpan timestamp sbg old
				old[ 'timestamp' ] = item[ 'timestamp' ];
				old[ 'pengentry' ] = item[ 'pengentry' ] || 'init';

				//timestamp baru
				var current_timestamp = Math.round(new Date().getTime()/1000);
				new_item[ 'timestamp' ] = current_timestamp;

				//ambil old lama lalu tambah dgn old baru
				new_item['old'] = item[ 'old' ];
				new_item['old'].push(old);

				//catat pengedit
				new_item['pengentry'] = user_aktiv;

				//update
				Model.update({'_id': _id, 'active': true, 'thang': thang}, { $set: new_item }, function(err, status){
					if(err){
						errorHandler(client, 'Gagal update. Mohon hubungi admin.');
						return;
					}
					//beritahu pengedit
					client.emit('messages', 'Berhasil diupdate');
				});
    		})
	    });

	    client.on('pok_row_init', function (tabel) {
	    	var data = {};
	    	data.tabel = tabel;
	    	//ambil semua program
	    	Program.find({active: true, 'thang': thang}).sort('kdprogram').exec(function(err, programs){
	    		//jika error notif user
	      		if(err){
					errorHandler(client, 'Database Error. Mohon hubungi admin.');
					return;
				}
				//init tasks
				var prog_tasks = [];
				//iterasi tiap program
				_.each(programs, function(program, index, list){
					//push tugas utk tiap program
					prog_tasks.push(
						function(prog_cb){
							//buat element row program
							if(!program.uraian) program.uraian = '[uraian blm ada]';
							if(!program.jumlah) program.jumlah = 0;
							var program_row;
							if(tabel == 'edit'){
								program_row = [
					                program._id,
					                '',
					                '<span class="badge badge-default">program</span>',
					                '054.01.'+program.kdprogram,
					                program.uraian,
					                '-',
					                '-',
					                '-',
					                program.jumlah,
					                '<button type="button" class="tambah"><i class="icon-plus"></i></button> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
					            ]
							} else {
								program_row = [
					                program._id,
					                '',
					                '<span class="badge badge-default">program</span>',
					                '054.01.'+program.kdprogram,
					                program.uraian,
					                '-',
					                '-',
					                '-',
					                program.jumlah,
					                '-',
					                '-',
					                '-',
					                '-',
					                '-',
					                ''
					            ]
							}
							data.row = program_row;
							//append ke tabel
							client.emit('pok_row_init_response', data, function () {
								//jika sudah  append, iterasi tiap kegiatan
								Kegiatan.find({'kdprogram': program.kdprogram, active: true, 'thang': thang}).sort('kdgiat').exec(function(err, kegiatans){
									//notif user jika ada error
									if(err){
										errorHandler(client, 'Database Error. Mohon hubungi admin.');
										return;
									}
									//init task kegiatan
									var keg_tasks = [];
									//iterasi tiap kegiatan
									_.each(kegiatans, function(kegiatan, index, list){
										//push tiap keg
										keg_tasks.push(
											function(keg_cb){
												if(!kegiatan.uraian) kegiatan.uraian = '[uraian blm ada]';
												if(!kegiatan.jumlah) kegiatan.jumlah = 0;
												var kegiatan_row;
												if(tabel == 'edit'){
													kegiatan_row = 
													[
								                        kegiatan._id,
								                        program._id,
								                        '<span class="badge badge-default">kegiatan</span>',
								                        kegiatan.kdgiat,
								                        kegiatan.uraian,
								                        '-',
								                        '-',
								                        '-',
								                        kegiatan.jumlah,
								                        '<button type="button" class="tambah"><i class="icon-plus"></i></button> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
								                    ]
							                   } else {
							                   		kegiatan_row = 
													[
								                        kegiatan._id,
								                        program._id,
								                        '<span class="badge badge-default">kegiatan</span>',
								                        kegiatan.kdgiat,
								                        kegiatan.uraian,
								                        '-',
								                        '-',
								                        '-',
								                        kegiatan.jumlah,
										                '-',
										                '-',
										                '-',
										                '-',
										                '-',
								                        ''
								                    ]
							                   }
							                   data.row = kegiatan_row
												//append row
												client.emit('pok_row_init_response', data, function () {
													//jika sudah  append, iterasi tiap output
													Output.find({'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat, active: true, 'thang': thang}).sort('kdoutput').exec(function(err, outputs){
														//notif user jika ada error
														if(err){
															errorHandler(client, 'Database Error. Mohon hubungi admin.');
															return;
														}
														//init task output
														var outp_tasks = [];
														//iterasi tiap output
														_.each(outputs, function(output, index, list){
															//push tiap out
															outp_tasks.push(
																function(outp_cb){
																	if(!output.uraian) output.uraian = '[uraian blm ada]';
										                            if(!output.vol) output.vol = '-';
										                            if(!output.jumlah) output.jumlah = 0;
										                            var output_row;
										                            if(tabel == 'edit'){
																		output_row = 
																		[
											                                output._id,
											                                kegiatan._id,
											                                '<span class="badge badge-danger">output</span>',
											                                kegiatan.kdgiat+'.'+output.kdoutput,
											                                output.uraian,
											                                output.vol,
											                                '-',
											                                '-',
											                                output.jumlah,
											                                '<span class="dropdown"><button class="dropdown-toggle" type="button" data-toggle="dropdown"><i class="icon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu"><li><a subitem="sub_output" class="tambah" href="#">Sub Output</a></li><li><a subitem="komponen" class="tambah" href="#">Komponen</a></li></ul></span> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
											                            ]
											                        } else {
											                        	output_row = 
																		[
											                                output._id,
											                                kegiatan._id,
											                                '<span class="badge badge-danger">output</span>',
											                                kegiatan.kdgiat+'.'+output.kdoutput,
											                                output.uraian,
											                                output.vol,
											                                '-',
											                                '-',
											                                output.jumlah,
															                '-',
															                '-',
															                '-',
															                '-',
															                '-',
											                                ''
											                            ]
											                        }
											                        data.row = output_row
																	//append row
																	client.emit('pok_row_init_response', data, function () {
																		//jika sudah  append, iterasi tiap output
																		SubOutput.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,'kdoutput': output.kdoutput, active: true}).sort('kdsoutput').exec(function(err, soutputs){
																			//notif user jika ada error
																			if(err){
																				errorHandler(client, 'Database Error. Mohon hubungi admin.');
																				return;
																			}
																			//init task output
																			var soutp_tasks = [];
																			//iterasi tiap output
																			_.each(soutputs, function(soutput, index, list){
																				//push tiap out
																				soutp_tasks.push(
																					function(soutp_cb){
                                    													if(!soutput.jumlah) soutput.jumlah = 0;
																						if(!soutput.ursoutput) soutput.ursoutput = '[uraian blm ada]';
																						var soutput_row;
																						if(tabel == 'edit'){
																							soutput_row = 
																							[
													                                            soutput._id,
													                                            output._id,
													                                            '<span class="badge badge-danger">soutput</span>',
													                                            output.kdoutput+'.'+soutput.kdsoutput,
													                                            soutput.ursoutput,
													                                            '-',
													                                            '-',
													                                            '-',
													                                            soutput.jumlah,
													                                            '<button type="button" class="tambah"><i class="icon-plus"></i></button> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
													                                        ]
																						} else {
																							soutput_row = 
																							[
													                                            soutput._id,
													                                            output._id,
													                                            '<span class="badge badge-danger">soutput</span>',
													                                            output.kdoutput+'.'+soutput.kdsoutput,
													                                            soutput.ursoutput,
													                                            '-',
													                                            '-',
													                                            '-',
													                                            soutput.jumlah,
																				                '-',
																				                '-',
																				                '-',
																				                '-',
																				                '-',
													                                            ''
													                                        ]
																						}
																						
																						//append row
																						var parent_var = 'kdsoutput';
																						var parent_kd = soutput.kdsoutput;
																						var parent_id = soutput._id;
																						if(soutput.ursoutput == 'tanpa sub output'){
																							soutput_row = '';
																							parent_var = 'kdoutput';
																							parent_kd = output.kdoutput;
																							parent_id = output._id;
																						}
																						data.row = soutput_row
																						client.emit('pok_row_init_response', data, function () {
																							//jika sudah  append, iterasi tiap output
																							Komponen.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,
																							[parent_var]: parent_kd, active: true}).sort('kdkmpnen').exec(function(err, komponens){
																								//notif user jika ada error
																								if(err){
																									errorHandler(client, 'Database Error. Mohon hubungi admin.');
																									return;
																								}
																								//init task output
																								var komp_tasks = [];
																								//iterasi tiap output
																								_.each(komponens, function(komponen, index, list){
																									//push tiap out
																									komp_tasks.push(
																										function(komp_cb){
																											if(!komponen.urkmpnen) komponen.urkmpnen = '[uraian blm ada]';
                                            																if(!komponen.jumlah) komponen.jumlah = 0;
																											var komponen_row;
																											if(tabel == 'edit'){
																												komponen_row = 
																													[
																		                                                komponen._id,
																		                                                parent_id,
																		                                                '<span class="badge badge-primary">komponen</span>',
																		                                                komponen.kdkmpnen,
																		                                                komponen.urkmpnen,
																		                                                '-',
																		                                                '-',
																		                                                '-',
																		                                                komponen.jumlah,
																		                                                '<span class="dropdown"><button class="dropdown-toggle" type="button" data-toggle="dropdown"><i class="icon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu"><li><a subitem="sub_komponen" class="tambah" href="#">Sub Komponen</a></li><li><a subitem="akun" class="tambah" href="#">Akun</a></li></ul></span> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
																		                                            ]
																											} else{
																												komponen_row = 
																													[
																		                                                komponen._id,
																		                                                parent_id,
																		                                                '<span class="badge badge-primary">komponen</span>',
																		                                                komponen.kdkmpnen,
																		                                                komponen.urkmpnen,
																		                                                '-',
																		                                                '-',
																		                                                '-',
																		                                                komponen.jumlah,
																										                '-',
																										                '-',
																										                '-',
																										                '-',
																										                '-',
																		                                                ''
																		                                            ]
																											}

																											data.row = komponen_row																										
																											//append row
																											client.emit('pok_row_init_response', data, function () {
																												//jika sudah  append, iterasi tiap output
																												SubKomponen.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,'kdoutput': output.kdoutput,
																												'kdsoutput': soutput.kdsoutput, 'kdkmpnen': komponen.kdkmpnen, active: true}).sort('kdskmpnen').exec(function(err, skomponens){
																													//notif user jika ada error
																													if(err){
																														errorHandler(client, 'Database Error. Mohon hubungi admin.');
																														return;
																													}
																													//init task output
																													var skomp_tasks = [];
																													//iterasi tiap output
																													_.each(skomponens, function(skomponen, index, list){
																														//push tiap out
																														skomp_tasks.push(
																															function(skomp_cb){
																																if(!skomponen.urskmpnen) skomponen.urskmpnen = '[uraian blm ada]';
                                                    																			if(!skomponen.jumlah) skomponen.jumlah = 0;
																																var skomponen_row;
																																if(tabel == 'edit'){
																																	skomponen_row =
																																	[
																			                                                            skomponen._id,
																			                                                            komponen._id,
																			                                                            '<span class="badge badge-primary">skomponen</span>',
																			                                                            skomponen.kdskmpnen,
																			                                                            skomponen.urskmpnen,
																			                                                            '-',
																			                                                            '-',
																			                                                            '-',
																			                                                            skomponen.jumlah,
																			                                                            '<button type="button" class="tambah"><i class="icon-plus"></i></button> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
																			                                                        ]
																																} else{
																																	skomponen_row =
																																	[
																			                                                            skomponen._id,
																			                                                            komponen._id,
																			                                                            '<span class="badge badge-primary">skomponen</span>',
																			                                                            skomponen.kdskmpnen,
																			                                                            skomponen.urskmpnen,
																			                                                            '-',
																			                                                            '-',
																			                                                            '-',
																			                                                            skomponen.jumlah,
																														                '-',
																														                '-',
																														                '-',
																														                '-',
																														                '-',
																			                                                            ''
																			                                                        ]
																																}
																																
																																//append row 
																																var parent_var = 'kdskmpnen';
																																var parent_kd = skomponen.kdskmpnen;
																																var parent_id = skomponen._id;
																																if(skomponen.urskmpnen == 'tanpa sub komponen'){
																																	skomponen_row = '';
																																	parent_var = 'kdkmpnen';
																																	parent_kd = komponen.kdkmpnen;
																																	parent_id = komponen._id;
																																}
																																data.row = skomponen_row
																																client.emit('pok_row_init_response', data, function () {
																																	//jika sudah  append, iterasi tiap output
																																	Akun.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,'kdoutput': output.kdoutput, 
																																	'kdsoutput': soutput.kdsoutput, 'kdkmpnen': komponen.kdkmpnen, [parent_var]: parent_kd, active: true}).sort('kdakun').exec(function(err, akuns){
																																		//notif user jika ada error
																																		if(err){
																																			errorHandler(client, 'Database Error. Mohon hubungi admin.');
																																			return;
																																		}
																																		//init task output
																																		var akun_tasks = [];
																																		//iterasi tiap output
																																		_.each(akuns, function(akun, index, list){
																																			//push tiap out
																																			akun_tasks.push(
																																				function(akun_cb){
																																				 	if(!akun.uraian) akun.uraian = '[uraian blm ada]';
                                                            																						if(!akun.jumlah) akun.jumlah = 0;
                                                            																						var akun_row;
                                                            																						if(tabel == 'edit'){
                                                            																							akun_row = 
																																							[
																								                                                                akun._id,
																								                                                                parent_id,
																								                                                                '<span class="badge badge-warning">akun</span>',
																								                                                                akun.kdakun,
																								                                                                akun.uraian,
																								                                                                '-',
																								                                                                '-',
																								                                                                '-',
																								                                                                akun.jumlah,
																								                                                                '<button type="button" class="tambah"><i class="icon-plus"></i></button> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
																								                                                            ]
                                                            																						} else{
                                                            																							akun_row = 
																																							[
																								                                                                akun._id,
																								                                                                parent_id,
																								                                                                '<span class="badge badge-warning">akun</span>',
																								                                                                akun.kdakun,
																								                                                                akun.uraian,
																								                                                                '-',
																								                                                                '-',
																								                                                                '-',
																								                                                                akun.jumlah,
																																				                '-',
																																				                '-',
																																				                '-',
																																				                '-',
																																				                '-',
																								                                                                ''
																								                                                            ]
                                                            																						}
                                                            																						data.row = akun_row
																																					
																																					//append row
																																					client.emit('pok_row_init_response', data, function () {
																																						//jika sudah  append, iterasi tiap output
																																						DetailBelanja.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,'kdoutput': output.kdoutput, 
																																						'kdsoutput': soutput.kdsoutput, [parent_var]: parent_kd, 'kdakun': akun.kdakun, active: true}).sort('noitem').exec(function(err, details){
																																							//notif user jika ada error
																																							if(err){
																																								errorHandler(client, 'Database Error. Mohon hubungi admin.');
																																								return;
																																							}
																																							//init task output
																																							var detail_tasks = [];
																																							//iterasi tiap output
																																							_.each(details, function(detail, index, list){
																																								//push tiap out
																																								detail_tasks.push(
																																									function(detail_cb){
																																										akun.jumlah += detail.jumlah;
																																										var detail_row;
																																										if(tabel == 'edit'){
																																											detail_row = [
																																												detail._id,
																										                                                                        akun._id,
																										                                                                        '<span class="badge badge-success">detail</span>',
																										                                                                        '',
																										                                                                        detail.nmitem,
																										                                                                        detail.volkeg,
																										                                                                        detail.satkeg,
																										                                                                        detail.hargasat,
																										                                                                        detail.jumlah,
																										                                                                        '<button type="button" class="hapus-item"><i class="icon-close"></i></button>'
																										                                                                    ]
																																										} else{
																																											detail_row = [
																																												detail._id,
																										                                                                        akun._id,
																										                                                                        '<span class="badge badge-success">detail</span>',
																										                                                                        '',
																										                                                                        detail.nmitem,
																										                                                                        detail.volkeg,
																										                                                                        detail.satkeg,
																										                                                                        detail.hargasat,
																										                                                                        detail.jumlah,
																																								                '-',
																																								                '-',
																																								                '-',
																																								                '-',
																																								                '-',
																										                                                                        '<button type="button" class="entry"><i class="icon-plus"></i></button>'
																										                                                                        +' <button type="button" class="riwayat"><i class="icon-list"></i></button>'
																										                                                                    ]
																																										}

																																										data.row = detail_row																										                                                                        
																																										//append row
																																										client.emit('pok_row_init_response', data, function () {
																																											//jika sudah  append, iterasi tiap output
																																											detail_cb(null, 'ok');
																																										})
																																									}
																																								)
																																							})
																																							//jalankan tiap keg
																																							async.series(detail_tasks, function(err, finish){
																																								skomponen.jumlah += akun.jumlah;
																																								client.emit('pok_edit_update_jlh', {'parent_id': akun._id, 'new_jumlah': akun.jumlah, 'tabel': tabel})
																																								akun_cb(null, 'ok');
																																							})
																																						})
																																					})
																																				}
																																			) 
																																		})
																																		//jalankan tiap keg
																																		async.series(akun_tasks, function(err, finish){
																																			komponen.jumlah += skomponen.jumlah;
																																			if(skomponen.urskmpnen != 'tanpa sub komponen'){
																																				client.emit('pok_edit_update_jlh', {'parent_id': skomponen._id, 'new_jumlah': skomponen.jumlah, 'tabel': tabel})
																																			}
																																			skomp_cb(null, 'ok');
																																		})
																																	})
																																})
																															}
																														)
																													})
																													//jalankan tiap keg
																													async.series(skomp_tasks, function(err, finish){
																														soutput.jumlah += komponen.jumlah;
																														client.emit('pok_edit_update_jlh', {'parent_id': komponen._id, 'new_jumlah': komponen.jumlah, 'tabel': tabel})
																														komp_cb(null, 'ok');
																													})
																												})
																											})
																										}
																									)
																								})
																								//jalankan tiap keg
																								async.series(komp_tasks, function(err, finish){
																									output.jumlah += soutput.jumlah;
																									if(soutput.ursoutput != 'tanpa sub output'){
																										client.emit('pok_edit_update_jlh', {'parent_id': soutput._id, 'new_jumlah': soutput.jumlah, 'tabel': tabel})
																									}
																									soutp_cb(null, 'ok');
																								})
																							})
																						})
																					}
																				)
																			})
																			//jalankan tiap keg
																			async.series(soutp_tasks, function(err, finish){
																				kegiatan.jumlah += output.jumlah;
																				client.emit('pok_edit_update_jlh', {'parent_id': output._id, 'new_jumlah': output.jumlah, 'tabel': tabel})
																				outp_cb(null, 'ok');
																			})
																		})
																	})
																}
															)
														})
														//jalankan tiap keg
														async.series(outp_tasks, function(err, finish){
															program.jumlah += kegiatan.jumlah;
															client.emit('pok_edit_update_jlh', {'parent_id': kegiatan._id, 'new_jumlah': kegiatan.jumlah, 'tabel': tabel})
															keg_cb(null, 'ok');
														})
													})
												})
											}
										)
									})
									//jalankan tiap keg
									async.series(keg_tasks, function(err, finish){
										client.emit('pok_edit_update_jlh', {'parent_id': program._id, 'new_jumlah': program.jumlah, 'tabel': tabel})
										prog_cb(null, 'ok');
									})
								})
						    });
						}
					)
				});

				async.series(prog_tasks, function(err, finish){
					client.emit('pok_datatable_apply', tabel);
					if(tabel == 'entry'){
						var date = new Date();
						getRealisasiSum(client, Math.round(new Date(thang, date.getMonth(), 1)/1000), 
							Math.round(new Date(thang, +date.getMonth() + 1, 0).getTime()/1000) + 86399, false);
					}
				})
	      	})
	    });

	    client.on('pok_uraian_akun_entry', function (user_input) {
	    	user_input.thang = thang;
	    	uraian_akun = new UraianAkun(user_input)
	    	uraian_akun.isExist(function(err, ua){
	    		if(!ua){
	    			uraian_akun.save();
	    			client.emit('pok_uraian_akun_entry_saved_response', uraian_akun.toObject());
	    			Akun.find({'thang': thang, kdakun: user_input._id}, '_id', function(err, akuns){
	    				//update semua akuns di user
	    				io.sockets.to(thang).emit('pok_id_update_uraian_akun', {'akuns': akuns, 'uraian': user_input.uraian});
	    			})
	    		} else {
	    			uraian_akun.update({$set: {'uraian': user_input.uraian}}, function(err, ua){
	    				client.emit('pok_uraian_akun_entry_updated_response', uraian_akun.toObject());
	    				Akun.find({'thang': thang, kdakun: user_input._id}, '_id', function(err, akuns){
	    					io.sockets.to(thang).emit('pok_id_update_uraian_akun', {'akuns': akuns, 'uraian': user_input.uraian});
		    			})
	    			});
	    		}
	    		Akun.update({'thang': thang, kdakun: user_input._id}, {$set: {uraian: user_input.uraian}}, {"multi": true},function(err, status){
					if(err){
						errorHandler(client, 'Database update error. Mohon hubungi admin.')
						return;
					}
					sendNotification(client, 'Uraian berhasil disimpan.')
				});
	    	})
	    })

	    client.on('pok_uraian_akun_remove', function (id) {
	    	UraianAkun.remove({'thang': thang, _id: id}, function(err, status){
	    		client.emit('pok_uraian_akun_remove_response', id);
	    	})
	    })

	    client.on('pok_delete_item', function (item) {
	    	if(item._id =='') return;
	    	var Model;
	    	if(item.type == 'detail'){
	    		Model = DetailBelanja;
	    	} else if(item.type == 'program'){
	    		Model = Program;
	    	} else if(item.type == 'kegiatan'){
	    		Model = Kegiatan;
	    	} else if(item.type == 'output'){
	    		Model = Output;
	    	} else if(item.type == 'soutput'){
	    		Model = SubOutput;
	    	} else if(item.type == 'komponen'){
	    		Model = Komponen;
	    	} else if(item.type == 'skomponen'){
	    		Model = SubKomponen;
	    	} else if(item.type == 'akun'){
	    		Model = Akun;
	    	}

	    	var current_timestamp = Math.round(new Date().getTime()/1000);
	    	function removeItem(Model, syarat, cb){
	    		Model.find(syarat, function(err, result){
	    			if(err){
						errorHandler(client, 'Gagal dihapus. Mohon hubungi admin.')
						return;
					}
					if(result.length == 1){
						result[0].active = false;
		    			if(result[0].old){
		    				result[0].old.push({active: true, pengentry: result[0].pengentry, timestamp: result[0].timestamp})
		    			} else{
		    				result[0].old = [];
		    				result[0].old.push({active: true, pengentry: result[0].pengentry, timestamp: result[0].timestamp})
		    			}
		    			result[0].pengentry = user_aktiv;
		    			result[0].timestamp = current_timestamp;
		    			_id = result[0]._id;
		    			delete result[0]._id;
		    			result[0].save(function(err, status){
		    				if(cb) cb(result[0]);
		    			});
					} else if(result.length > 1){
						_.each(result, function(item, index, list){
							item.active = false;
			    			if(result.old){
			    				item.old.push({active: true, pengentry: item.pengentry, timestamp: item.timestamp})
			    			} else{
			    				item.old = [];
			    				item.old.push({active: true, pengentry: item.pengentry, timestamp: item.timestamp})
			    			}
			    			item.pengentry = user_aktiv;
			    			item.timestamp = current_timestamp;
			    			item.save();
						})
					}
	    			
	    		})
	    	}
	    	removeItem(Model, {'thang': thang, _id: item._id, 'active': true}, function(item_deleted){
	    		client.broadcast.to(thang).emit('pok_item_deleted', item._id);
				if(item.type == 'program'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'active': true};
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    		removeItem(SubKomponen, syarat, null);
		    		removeItem(Komponen, syarat, null);
		    		removeItem(SubOutput, syarat, null);
		    		removeItem(Output, syarat, null);
		    		removeItem(Kegiatan, syarat, null);
		    	} else if(item.type == 'kegiatan'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    		removeItem(SubKomponen, syarat, null);
		    		removeItem(Komponen, syarat, null);
		    		removeItem(SubOutput, syarat, null);
		    		removeItem(Output, syarat, null);
		    	} else if(item.type == 'output'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		    			'kdoutput': item_deleted.kdoutput, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    		removeItem(SubKomponen, syarat, null);
		    		removeItem(Komponen, syarat, null);
		    		removeItem(SubOutput, syarat, null);
		    	} else if(item.type == 'soutput'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		    			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    		removeItem(SubKomponen, syarat, null);
		    		removeItem(Komponen, syarat, null);
		    	} else if(item.type == 'komponen'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		    			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    		removeItem(SubKomponen, syarat, null);
		    	} else if(item.type == 'skomponen'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		    			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen, 
		    			'kdskmpnen': item_deleted.kdskmpnen, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    		removeItem(Akun, syarat, null);
		    	} else if(item.type == 'akun'){
					var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		    			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen, 
		    			'kdskmpnen': item_deleted.kdskmpnen, 'kdakun': item_deleted.kdakun, 'active': true}
		    		removeItem(DetailBelanja, syarat, null);
		    	}
	    	});
	   //  	Model.findOneAndUpdate({'thang': thang, _id: item._id, 'active': true}, {$set: {active: false, pengentry: user_aktiv}, $push: {"old": {active: true, pengentry: msg}}}, function(err, item_deleted){
	   //  		if(err){
				// 	errorHandler(client, 'Gagal dihapus. Mohon hubungi admin.')
				// 	return;
				// }
				// client.broadcast.to(thang).emit('pok_item_deleted', item._id);
				// if(item.type == 'program'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram};
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubKomponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Komponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubOutput.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Output.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Kegiatan.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'kegiatan'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubKomponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Komponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubOutput.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Output.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'output'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		  //   			'kdoutput': item_deleted.kdoutput}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubKomponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Komponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubOutput.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'soutput'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		  //   			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubKomponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Komponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'komponen'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		  //   			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		SubKomponen.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'skomponen'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		  //   			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen, 
		  //   			'kdskmpnen': item_deleted.kdskmpnen}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   		Akun.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	} else if(item.type == 'akun'){
				// 	var syarat = {'thang': thang, 'kdprogram': item_deleted.kdprogram, 'kdgiat': item_deleted.kdgiat, 
		  //   			'kdoutput': item_deleted.kdoutput, 'kdsoutput': item_deleted.kdsoutput, 'kdkmpnen': item_deleted.kdkmpnen, 
		  //   			'kdskmpnen': item_deleted.kdskmpnen, 'kdakun': item_deleted.kdakun}
		  //   		DetailBelanja.update(syarat, {$set: {active: false}}, {"multi": true}, function(err,s){})
		  //   	}
	   //  	})
	    })

	    client.on('pok_edit_new_item', function (user_input) {
	    	var Model;
	    	if(user_input.type == 'detail'){
	    		Model = DetailBelanja;
	    	} else if(user_input.type == 'kegiatan'){
	    		Model = Kegiatan;
	    	} else if(user_input.type == 'output'){
	    		Model = Output;
	    	} else if(user_input.type == 'soutput'){
	    		Model = SubOutput;
	    	} else if(user_input.type == 'komponen'){
	    		Model = Komponen;
	    	} else if(user_input.type == 'skomponen'){
	    		Model = SubKomponen;
	    	} else if(user_input.type == 'akun'){
	    		Model = Akun;
	    	} else if(user_input.type == 'program'){
	    		Model = Program;
	    	}
	    	var type_temp = user_input.type;
	    	var parent_id_temp = user_input.parent_id;
	    	var from_temp = user_input.from;
	    	delete user_input.type;
	    	user_input.timestamp = Math.round(new Date().getTime()/1000);
	    	if(user_input.parent_type == 'akun'){
	    		Akun.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			delete user_input.parent_id;
	    			delete user_input.parent_type;

	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.kdoutput = parent.kdoutput
	    			user_input.kdsoutput = parent.kdsoutput
	    			user_input.kdkmpnen = parent.kdkmpnen
	    			user_input.kdskmpnen = parent.kdskmpnen
	    			user_input.kdakun = parent.kdakun
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						//jika cara 2 maka broadcast, jika cara 1 maka ke semua (krn cara 1 tdk append langsung)
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'kegiatan'){
	    		Kegiatan.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'output'){
	    		Output.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.kdoutput = parent.kdoutput
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'soutput'){
	    		SubOutput.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.kdoutput = parent.kdoutput
	    			user_input.kdsoutput = parent.kdsoutput
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'komponen'){
	    		Komponen.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.kdoutput = parent.kdoutput
	    			user_input.kdsoutput = parent.kdsoutput
	    			user_input.kdkmpnen = parent.kdkmpnen
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'skomponen'){
	    		SubKomponen.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.kdgiat = parent.kdgiat
	    			user_input.kdoutput = parent.kdoutput
	    			user_input.kdsoutput = parent.kdsoutput
	    			user_input.kdkmpnen = parent.kdkmpnen
	    			user_input.kdskmpnen = parent.kdskmpnen
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == 'program'){
	    		Program.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
	    			user_input.kdprogram = parent.kdprogram
	    			user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	} else if(user_input.parent_type == ''){
	    		Program.findOne({'thang': thang, _id: user_input.kdprogram, 'active': true}, function(err, parent){
	    			if(parent){
	    				sendNotification(client, 'Item Sudah ada.');
	    				return;
	    			}
					user_input.thang = thang
	    			var item = new Model(user_input);
	    			item.save(function(err, result){
	    				if(err){
	    					console.log(err)
							errorHandler(client, 'Gagal menyimpan. Mohon hubungi admin.')
							return;
						}
						client.emit('pok_new_id', result._id);
						user_input._id = result._id;
						user_input.parent_id = parent_id_temp;
						user_input.type = type_temp;
						if(!from_temp) client.broadcast.to(thang).emit('pok_new_entry', user_input)
							else io.sockets.to(thang).emit('pok_new_entry', user_input);
						sendNotification(client, 'Item berhasil disimpan.')
	    			});
	    		})
	    	}
	    })

	    client.on('pok_uraian_akun_get', function () {
	    	UraianAkun.find({'thang': thang}, function(err, uraianakuns){
	    		client.emit('pok_uraian_akun_get_response', uraianakuns);
	    	})
	    })

	    client.on('pok_list', function (data) {
	    	var Model;
	    	var ParentModel;
	    	var parent_type = data.type;
	    	if(data.type == ''){
	    		Model = Program;
	    		data.type = 'program';
	    	} else if(data.type == 'program'){
	    		Model = Kegiatan;
	    		ParentModel = Program;
	    		data.type = 'kegiatan';
	    	} else if(data.type == 'kegiatan'){
	    		Model = Output;
	    		ParentModel = Kegiatan;
	    		data.type = 'output';
	    	} else if(data.type == 'output'){
	    		Model = SubOutput;
	    		ParentModel = Output;
	    		data.type = 'soutput';
	    	} else if(data.type == 'soutput'){
	    		Model = Komponen;
	    		ParentModel = SubOutput;
	    		data.type = 'komponen';
	    	} else if(data.type == 'komponen'){
	    		Model = SubKomponen;
	    		ParentModel = Komponen;
	    		data.type = 'skomponen';
	    	} else if(data.type == 'skomponen'){
	    		Model = Akun;
	    		ParentModel = SubKomponen;
	    		data.type = 'akun';
	    	} else if(data.type == 'akun'){
	    		Model = DetailBelanja;
	    		ParentModel = Akun;
	    		data.type = 'detail';
	    	}
	    	data.syarat.active = true;
	    	data.syarat.thang = thang;

	    	Model.find(data.syarat).sort(data.sortby).exec(function(err, items){
	    		if(data.type != 'program'){
	    			ParentModel.findOne(data.syarat, function(err, parent){
	    				if(data.type == 'akun'){
	    					if(parent.urskmpnen == 'tanpa sub komponen'){
	    						delete data.syarat.kdskmpnen;
	    						Komponen.findOne(data.syarat, function(err, parent){
	    							if(data.for == 'riwayat'){
	    								client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
	    							} else {
	    								client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': parent._id, 'parent_type': parent_type});
	    							}
	    						})
	    					}
	    				} else if(data.type == 'komponen'){
	    					if(parent.ursoutput == 'tanpa sub output'){
	    						delete data.syarat.kdsoutput;
	    						Output.findOne(data.syarat, function(err, parent){
	    							if(data.for == 'riwayat'){
	    								client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
	    							} else {
	    								client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': parent._id, 'parent_type': parent_type});
	    							}
	    						})
	    					}
	    				} else {
	    					if(data.for == 'riwayat'){
	    						client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
							} else {
								client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': parent._id, 'parent_type': parent_type});
							}
	    				}
	    			})
	    		} else {
	    			if(data.for == 'riwayat'){
	    				client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
	    			} else {
	    				client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': '', 'parent_type': ''});
	    			}
	    		}	    		
	    	});
	    })

	    client.on('penerima_list', function (q, cb){
	    	if(q.type == 'custom_bps_only'){
	    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: 'BPS'}, 'nama', function(err, custs){
	    			_.each(custs, function(item, index, list){
		    			custs[index].d = levenshtein.get(q.query, item.nama);
		    		})
		    		custs = _.sortBy(custs, function(o) { return o.d; })
		    		cb(custs);
		    	})
	    	} else if(q.type == 'custom_non_only'){
	    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: {$ne: 'BPS'}}, 'nama', function(err, custs){
		    		_.each(custs, function(item, index, list){
		    			custs[index].d = levenshtein.get(q.query, item.nama);
		    		})
		    		custs = _.sortBy(custs, function(o) { return o.d; })
		    		cb(custs);
		    	})
	    	} else if(q.type == 'pegawai_only'){
	    		Pegawai.find({"nama": new RegExp(q.query, "i")}, 'nama', function(err, pegs){
		    		_.each(pegs, function(item, index, list){
		    			pegs[index].d = levenshtein.get(q.query || q, item.nama);
		    		})
		    		pegs = _.sortBy(pegs, function(o) { return o.d; })
		    		cb(pegs);
		    	})
	    	} else if(q.type == 'pegawai_and_bps'){
	    		Pegawai.find({"nama": new RegExp(q.query, "i")}, 'nama', function(err, pegs){
		    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: 'BPS'}, 'nama', function(err, custs){
			    		_.each(pegs, function(item, index, list){
			    			pegs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		_.each(custs, function(item, index, list){
			    			custs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		entity = _.sortBy(pegs.concat(custs), function(o) { return o.d; })
			    		cb(entity);
			    	})
		    	})
	    	} else if(q.type == 'sppd') {
	    		Pegawai.find({"nama": new RegExp(q.query || q, "i")}, 'nama', function(err, pegs){
		    		CustomEntity.find({"nama": new RegExp(q.query || q, "i"), type: 'Penerima', unit: { $exists: true }}, 'nama', function(err, custs){
			    		_.each(pegs, function(item, index, list){
			    			pegs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		_.each(custs, function(item, index, list){
			    			custs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		entity = _.sortBy(pegs.concat(custs), function(o) { return o.d; })
			    		cb(entity);
			    	})
		    	})
	    	} else {
	    		Pegawai.find({"nama": new RegExp(q.query || q, "i")}, 'nama', function(err, pegs){
		    		CustomEntity.find({"nama": new RegExp(q.query || q, "i"), type: 'Penerima'}, 'nama', function(err, custs){
			    		_.each(pegs, function(item, index, list){
			    			pegs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		_.each(custs, function(item, index, list){
			    			custs[index].d = levenshtein.get(q.query || q, item.nama);
			    		})
			    		entity = _.sortBy(pegs.concat(custs), function(o) { return o.d; })
			    		cb(entity);
			    	})
		    	})
	    	}
	    })

	    client.on('entry_submit', function (new_entry, cb){
	    	//init tahun, bulan, lower/upper timestamp
	    	var y = thang || new Date().getFullYear();
    		var m = new_entry.month || client.handshake.session.bulan_anggaran || new Date().getMonth();
    		var lower_ts = Math.round(new Date(y, m, 1).getTime()/1000)
    		var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399;

	    	//jika sekali banyak
	    	if(new_entry.import){
	    		//hapus data terakhir (row kosong/spare)
	    		new_entry.data.pop();
	    		//kueri utk dosen di sipadu
	    		var query = 'SELECT * ' +
							'FROM dosen ' +
							'WHERE nama = ?';

				//fungsi umum utk menyimpan
				function submit_entry(item, callback){
					//validasi tgl entry (harus dlm tahun anggaran)
					if(item.tgl_timestamp <= Math.round(new Date(y, 0, 1).getTime()/1000)
			    		|| item.tgl_timestamp >= Math.round(new Date(y, 12, 0).getTime()/1000)){
			    		errorHandler(client, 'Mohon cek tanggal entrian.');
			    		return;
			    	}

			    	//init total sampai bulan ini
			    	var total_sampai_bln_ini = 0;
			    	//push realisasi baru
			    	DetailBelanja.update({'thang': thang, "_id": new_entry._id}, {$push: {"realisasi": item}}, {new: true}, function(err, result){
			    		if (err) {
			    			console.log(err)
			    			errorHandler(client, 'Gagal menyimpan.')
			    			cb('gagal')
			    			return
			    		}
			    		callback(null, 'ok')
			    		//sebarkan perubahan
			    		if(item.tgl_timestamp >= lower_ts && item.tgl_timestamp <= upper_ts){
			    			if(item.tgl_timestamp <= upper_ts) total_sampai_bln_ini += item.jumlah;
			    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': new_entry._id, 'realisasi': item.jumlah, 
			    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
			    		} else if(item.tgl_timestamp <= upper_ts){
			    			total_sampai_bln_ini += item.jumlah;
			    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': new_entry._id, 'realisasi': 0, 
			    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
			    		}

			    	})
				}

				//init task
				var tasks = []

				//iterasi tiap row
	    		_.each(new_entry.data, function(item, index, list){
	    			tasks.push(function(callback){
	    				//catat timestamp & user
	    				item.timestamp = new_entry.timestamp;
		    			item.pengentry = client.handshake.session.username || 'admin';
						//ambil id d sipadu
						sipadu_db.query(query, item.penerima_nama, function (err, dosen, fields) {
							if (err){
							  	console.log(err)
							  	return;
							}

							//jika tdk kosong
							if(!_.isEmpty(dosen)){
								//assign id
								item.penerima_id = dosen[0].kode_dosen;

								//cek apakah sdh pernah dientry
								DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
										'tgl': item.tgl}).exec(function(err, result){
										//jika blm ada, simpan
				    					if(!result){
				    						submit_entry(item, callback);
				    					} else {
				    						//jika sdh ada
				    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
									    			+item.tgl+' sudah pernah dientry.')
				    						callback(null, 'sudah ada')
				    					}
				    			})

								//cek klo dosen sdh ada d pegawai & custom entity
								Pegawai.findOne({kode_dosen: dosen[0].kode_dosen}, '_id', function(err, peg){
									//cek klo dosen sdh ada d custom entity
									CustomEntity.findOne({kode_dosen: dosen[0].kode_dosen}, '_id', function(err, cust){
										//jika di kduanya blm ada
										if(!peg && !cust){
											//hanya simpan yg dari bps atau non bps/stis
											if(dosen[0].unit == 'BPS' || dosen[0].unit == 'Non STIS/BPS'){
												var ce = new CustomEntity({nama: dosen[0].nama, type: 'Penerima', unit: dosen[0].unit,
															kode_dosen: dosen[0].kode_dosen});
												ce.save();
											}
										}
									})
								})
								
							} else {
								//jika tdk ada di db sipadu, ambil dari simamov
								Pegawai.findOne({nama: item.penerima_nama}, '_id', function(err, pegawai){
									//jika tdk ada
									if(!_.isEmpty(pegawai)){
										item.penerima_id = pegawai._id;
										DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
											'tgl': item.tgl}).exec(function(err, result){
						    					if(!result){
						    						submit_entry(item, callback);
						    					} else {
						    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
									    							+item.tgl+' sudah pernah dientry.')
						    						callback(null, 'sudah ada')
						    					}
						    			})	
									} else {
										//klo masih tdk ada, ambil di custom
										CustomEntity.findOne({nama: item.penerima_nama}, '_id', function(err, cust){
											if(!_.isEmpty(cust)){
												item.penerima_id = cust._id;
												DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
													'tgl': item.tgl}).exec(function(err, result){
								    					if(!result){
								    						submit_entry(item, callback);
								    					} else {
								    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
									    							+item.tgl+' sudah pernah dientry.')
								    						callback(null, 'sudah ada')
								    					}
								    			})	
											} else {
												//klo masih tdk ada, buat custom
												CustomEntity.create({'nama': item.penerima_nama, type:'Penerima'}, function(err, new_penerima){
													item.penerima_id = new_penerima._id;
													DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
														'tgl': item.tgl}).exec(function(err, result){
									    					if(!result){
									    						submit_entry(item, callback);
									    					} else {
									    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
									    							+item.tgl+' sudah pernah dientry.')
									    						callback(null, 'sudah ada')
									    					}
									    			})	
												})
											}
										})
									}
								})
							}
						})
	    			})
	    		}); 

	    		async.series(tasks, function(err, finish){
	    			if(err){
	    				console.log(err);
	    				cb('gagal');
	    				return;
	    			} 
	    			cb('sukses');
	    		})

	    		return;
	    	}

	    	//jika atomic entry
	    	//cek jk sdh pernah dientry
	    	DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': new_entry.data.jumlah, 'penerima_id': new_entry.data.penerima_id, 
				'tgl': new_entry.data.tgl}).exec(function(err, result){
					//jika blm pernah
					if(!result){
						//validasi tgl entrian
						if(new_entry.data.tgl_timestamp <= Math.round(new Date(y, 0, 1).getTime()/1000)
				    		|| new_entry.data.tgl_timestamp >= Math.round(new Date(y, 12, 0).getTime()/1000)){
				    		errorHandler(client, 'Mohon cek tanggal entrian.');
				    		return;
				    	}

				    	//init total, user
			    		var total_sampai_bln_ini = 0;
				    	new_entry.data.pengentry = 	client.handshake.session.username || 'admin';
				    	//jika penerima blm terdaftar
				    	if(new_entry.data.penerima_id == ''){
				    		//buat penerima baru
				    		CustomEntity.create({'nama': new_entry.data.penerima_nama, type:'Penerima'}, function(err, new_penerima){
				    			//assign id penerima baru yg sdh didaftar
				    			new_entry.data.penerima_id = new_penerima._id;
				    			//insert realisasi
				    			DetailBelanja.update({'thang': thang, "_id": new_entry._id}, {$push: {"realisasi": new_entry.data}}, {new: true}, function(err, result){
						    		if (err) {
						    			console.log(err)
						    			errorHandler(client, 'Gagal menyimpan.')
						    			cb('gagal')
						    			return
						    		}
						    		cb('sukses');
						    		//sebarkan
						    		if(new_entry.data.tgl_timestamp >= lower_ts && new_entry.data.tgl_timestamp <= upper_ts){
						    			if(new_entry.data.tgl_timestamp <= upper_ts) total_sampai_bln_ini += new_entry.data.jumlah;
						    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': new_entry._id, 'realisasi': new_entry.data.jumlah, 
						    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
						    		}
						    	})
				    		})
				    	} else {
				    		DetailBelanja.update({'thang': thang, "_id": new_entry._id}, {$push: {"realisasi": new_entry.data}}, {new: true}, function(err, result){
					    		if (err) {
					    			console.log(err)
					    			errorHandler(client, 'Gagal menyimpan.')
					    			cb('gagal')
					    			return
					    		}
					    		cb('sukses');
					    		if(new_entry.data.tgl_timestamp >= lower_ts && new_entry.data.tgl_timestamp <= upper_ts){
					    			if(new_entry.data.tgl_timestamp <= upper_ts) total_sampai_bln_ini += new_entry.data.jumlah;
					    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': new_entry._id, 'realisasi': new_entry.data.jumlah, 
					    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
					    		} else if(new_entry.data.tgl_timestamp <= upper_ts){
					    			total_sampai_bln_ini += new_entry.data.jumlah;
					    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': new_entry._id, 'realisasi': 0, 
					    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
					    		}

					    	})
				    	}
					} else {
						//jika sdh ada
						cb(new_entry.data.penerima_nama+', Rp'+new_entry.data.jumlah+', Tgl '+new_entry.data.tgl+' sudah pernah dientry.')
					}
			})
	    })

	    client.on('riwayat_init', function (data, cb){
	    	console.log(data);
	    	if((!data.detail_id || data.detail_id == '--pilih--') && !data.call_from_pengguna){
	    		errorHandler(client, 'Detail belanja belum ditentukan.');
	    		return;
	    	}
	    	if(!data.call_from_pengguna){
	    		DetailBelanja.findOne({'thang': thang, _id: data.detail_id, 'active': true}, 'kdprogram kdgiat kdoutput kdsoutput kdkmpnen kdskmpnen kdakun realisasi', 
		    		function(err, detail){
		    			// cb({'details': details, 'akuns': akuns, 'skomps': skomps, 'komps': komps, 'souts': souts, 
		    			// 		'outs': outs, 'kegs': kegs, 'progs': progs});
		    		if(!detail) return;
		    		if(data.init){
		    			DetailBelanja.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat, 'kdoutput': detail.kdoutput, 
			    			'kdsoutput': detail.kdsoutput, 'kdkmpnen': detail.kdkmpnen, 'kdskmpnen': detail.kdskmpnen, 
			    			'kdakun': detail.kdakun}, 'noitem nmitem kdakun').sort('noitem').exec(function(err, details){
		    				Akun.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat, 'kdoutput': detail.kdoutput, 
				    			'kdsoutput': detail.kdsoutput, 'kdkmpnen': detail.kdkmpnen, 'kdskmpnen': detail.kdskmpnen}, 'kdakun uraian kdskmpnen').sort('kdakun').exec(function(err, akuns){
				    				SubKomponen.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat, 'kdoutput': detail.kdoutput, 
						    			'kdsoutput': detail.kdsoutput, 'kdkmpnen': detail.kdkmpnen}, 'kdskmpnen urskmpnen kdkmpnen').sort('kdskmpnen').exec(function(err, skomps){
						    			Komponen.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat, 'kdoutput': detail.kdoutput, 
							    			'kdsoutput': detail.kdsoutput}, 'kdkmpnen urkmpnen kdsoutput').sort('kdkmpnen').exec(function(err, komps){
						    				SubOutput.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat, 'kdoutput': detail.kdoutput}, 
						    					'kdsoutput ursoutput kdoutput').sort('kdsoutput').exec(function(err, souts){
						    						Output.find({'thang': thang, 'kdprogram': detail.kdprogram, 'kdgiat': detail.kdgiat}, 
								    					'kdoutput uraian kdgiat').sort('kdoutput').exec(function(err, outs){
								    						Kegiatan.find({'thang': thang, 'kdprogram': detail.kdprogram}, 
										    					'kdgiat uraian kdprogram').sort('kdgiat').exec(function(err, kegs){
										    						Program.find({'thang': thang},'kdprogram uraian').sort('kdprogram').exec(function(err, progs){
										    							cb({'details': details, 'akuns': akuns, 'skomps': skomps, 'komps': komps, 'souts': souts, 
										    								'outs': outs, 'kegs': kegs, 'progs': progs});
													    			})
											    			})
									    			})
							    			})
							    		})
						    		})
				    		})
			    		})
			    		if(data.month){
			    			var y = thang || new Date().getFullYear();
				    		var m = data.month || new Date().getMonth();
				    		var lower_ts = Math.round(new Date(y, m, 1).getTime()/1000)
				    		var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
		    				_.each(detail.realisasi, function(item, index, list){
		    					if(item.tgl_timestamp >= lower_ts && item.tgl_timestamp <= upper_ts){
		    						client.emit('riwayat_tbl_add', [item._id, '', item.tgl, item.penerima_nama, item.jumlah, item.pph21, item.pph22, 
		    							item.pph23, item.ppn, item.spm_no, item.bukti_no, item.ket, item.pengentry, 
		    							'<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button>']);
		    					}
		    				});
			    		}			    		
		    		} else {
		    			var y = thang || new Date().getFullYear();
			    		var m = data.month || new Date().getMonth();
			    		var lower_ts = data.lower_ts || Math.round(new Date(y, m, 1).getTime()/1000)
			    		var upper_ts = data.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
		    			_.each(detail.realisasi, function(item, index, list){
		    				if(item.tgl_timestamp >= lower_ts && item.tgl_timestamp <= upper_ts){
		    					client.emit('riwayat_tbl_add', [item._id, '', item.tgl, item.penerima_nama, item.jumlah, item.pph21, item.pph22, 
	    							item.pph23, item.ppn, item.spm_no, item.bukti_no, item.ket, item.pengentry, '<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button>']);
		    				}
	    				});
		    		}
		    	})
	    	} else {
	    		var y = client.handshake.session.tahun_anggaran || new Date().getFullYear();
	    		var m = data.month || new Date().getMonth();
	    		var lower_ts = data.lower_ts || Math.round(new Date(y, m, 1).getTime()/1000)
	    		var upper_ts = data.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
	    		DetailBelanja.find({'thang': thang, active: true, $or:[ {'realisasi.penerima_id': data.penerima_id}, 
	    			{'realisasi.penerima_id': data.kode_dosen}]}, 'nmitem realisasi', function(err, details){
	    			_.each(details, function(detail, index, list){
	    				_.each(detail.realisasi, function(realisasi, index, list){
		    				if((realisasi.penerima_id == data.penerima_id || realisasi.penerima_id == data.kode_dosen) && 
		    					(realisasi.tgl_timestamp >= lower_ts && realisasi.tgl_timestamp <= upper_ts)){
		    					client.emit('riwayat_tbl_add', [realisasi._id, detail._id, '', realisasi.tgl, detail.nmitem, realisasi.jumlah, realisasi.pph21, realisasi.pph22, 
	    							realisasi.pph23, realisasi.ppn, realisasi.spm_no, realisasi.bukti_no, realisasi.ket, realisasi.pengentry, '<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button>']);
		    				}
	    				})
    				});
	    		})
	    	}
	    	
	    })

	    client.on('del_riwayat', function (id, cb){
	    	DetailBelanja.findOne({'thang': thang, _id: id.parent_id}, 'realisasi', function(err, parent){
	    		if (err) {
	    			errorHandler(client, 'Gagal menghapus.')
	    			cb('gagal');
	    			return
	    		}
	    		var y = thang || new Date().getFullYear();
	    		var m = id.month || client.handshake.session.bulan_anggaran || new Date().getMonth();
	    		var lower_ts = Math.round(new Date(y, m, 1).getTime()/1000)
	    		var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
	    		if(parent.realisasi.id(id.target_id).tgl_timestamp >= lower_ts && parent.realisasi.id(id.target_id).tgl_timestamp <= upper_ts){
	    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': id.parent_id, 
	    				'realisasi': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'sum': false,
	    					'total_sampai_bln_ini': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'broadcast': true, message: '1 item realisasi telah dihapus.'});
	    		} else if(parent.realisasi.id(id.target_id).tgl_timestamp <= upper_ts) {
	    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': id.parent_id,'realisasi': 0, 'sum': false,
	    					'total_sampai_bln_ini': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'broadcast': true, message: '1 item realisasi telah dihapus.'});
	    		}
	    		parent.realisasi.id(id.target_id).remove();
	    		parent.save();
	    		cb('sukses')
	    		sendNotification(client, 'Berhasil dihapus.');
	    	})
	    })

	    client.on('riwayat_edit', function (user_input, cb){
	    	DetailBelanja.findOneAndUpdate({'thang': thang, '_id': user_input.parent_id, 'realisasi._id': user_input.target_id}, 
	    		{$set: user_input.data}, function(err, result){
	    		if (err) {
	    			errorHandler(client, 'Update gagal.')
	    			cb('gagal');
	    			return
	    		}
	    		
	    		cb('sukses')
	    	})
	    })

	    client.on('realisasi_change_month', function (month){
	    	var y = thang || new Date().getFullYear();
			getRealisasiSum(client, Math.round(new Date(y, month, 1).getTime()/1000), 
				Math.round(new Date(y, +month + 1, 0).getTime()/1000) + 86399);
	    })
	});
}

function getRealisasiSum(client, lower_ts, upper_ts, bypass){
	DetailBelanja.find({'thang': client.handshake.session.tahun_anggaran, active: true, realisasi: { $exists: true, $ne: [] }}, 'realisasi', function(err, reals){
		_.each(reals, function(detail, index, list){
			var sum = 0;
			var total_sampai_bln_ini = 0;
			_.each(detail.realisasi, function(realisasi, index, list){
				if(bypass){
					sum += realisasi.jumlah;
				} else if(realisasi.tgl_timestamp >= lower_ts && realisasi.tgl_timestamp <= upper_ts){
					sum += realisasi.jumlah;
				}
				if(realisasi.tgl_timestamp <= upper_ts) total_sampai_bln_ini += realisasi.jumlah;
			});
			client.emit('pok_entry_update_realisasi', {'parent_id': detail._id, 'realisasi': sum, 
				'total_sampai_bln_ini': total_sampai_bln_ini, 'sum': true});
		})
	})
}

//root pok
pok.get('/', function(req, res){
	Setting.findOne({'thang': req.session.tahun_anggaran || new Date().getFullYear(), type:'pok'}, function(err, pok_setting){
		if(pok_setting) res.render('pok/pok', {layout: false, pok_name: pok_setting.toObject().name, admin: req.session.jenis, username: req.session.username});
			else res.render('pok/pok', {layout: false, pok_name: 'POK', admin: req.session.jenis, username: req.session.username});
	})
})

//satuan pok
pok.get('/satuan_pok', function(req, res){
	DetailBelanja.find({'thang': req.session.tahun_anggaran || new Date().getFullYear()}).distinct('satkeg', function(error, satuans) {
		res.send(satuans);
	})
})

//unggah pok file
pok.post('/unggah_pok', function(req, res){
	var form = new formidable.IncomingForm();
	var pok_name, file_path;

	async.waterfall([
			function(callback){
				form.parse(req, function(err, fields, file){
					if(err){
						errorHandler(req.session.username, 'Form parse Error. Mohon hubungi admin.');
						return;
					}
					pok_name = fields.pok_name;
					callback(null, 'File parsed')
				});

				form.on('fileBegin', function (name, file){
					file.path = __dirname+'/../uploaded/pok/'+file.name;
					file_path = file.path;
				})
			} 
		], function(err, final){
			var pok = new POK(file_path, pok_name, req.session.username || 'admin');
		}
	)

	res.send('ok');
});

//unggah pok file
pok.get('/download/:type/:month', function(req, res){
	var y = req.session.tahun_anggaran || new Date().getFullYear();
	var m = req.params.month;
	var thang = req.session.tahun_anggaran || new Date().getFullYear();
	var month = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'OKTOBER', 
		'SEPTEMBER', 'NOVEMBER', 'DESEMBER']	 
	// Create a new instance of a Workbook class 
	var pok_wb = new xl.Workbook({
		defaultFont: {
	        size: 11
	    }
	});
	 
	// Add Worksheets to the workbook 
	var ws = pok_wb.addWorksheet(month[m], {
		'pageSetup': {
			'orientation': 'landscape',
			'paperHeight': '15in', // Value must a positive Float immediately followed by unit of measure from list mm, cm, in, pt, pc, pi. i.e. '10.5cm'
	        'paperSize': 'LEGAL_PAPER', // see lib/types/paperSize.js for all types and descriptions of types. setting paperSize overrides paperHeight and paperWidth settings
	        'paperWidth': '8.5in'
		},
		'margins': {
	        'bottom': 0.1,
	        'footer': 0.1,
	        'header': 0.1,
	        'left': 0.1,
	        'right': 0.1,
	        'top': 0.1
	    }
	});
	 
	// Create a reusable style 
	var header = pok_wb.createStyle({
	    font: {
	    	bold: true,
	        size: 11
	    }, 
	    alignment: {
	        wrapText: true,
	        horizontal: 'center',
	        vertical: 'center'
	    },
	    border: {
	    	left: {
	    		style: 'thin'
	    	},
	    	right: {
	    		style: 'thin'
	    	},
	    	top: {
	    		style: 'thin'
	    	},
	    	bottom: {
	    		style: 'thin'
	    	},
	    }
	});
	//program
	var prog_u = pok_wb.createStyle({
	    font: {
	    	bold: true,
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var prog_k = pok_wb.createStyle({
	    font: {
	    	bold: true,
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	//kegiatan
	var keg_k = pok_wb.createStyle({
	    font: {
	    	bold: true,
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var keg_u = pok_wb.createStyle({
	    font: {
	    	bold: true,
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	//output
	var out_k = pok_wb.createStyle({
	    font: {
	    	bold: true,
	    	size: 11,
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var out_u = pok_wb.createStyle({
	    font: {
	    	bold: true,
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	//komponen
	var komp_k = pok_wb.createStyle({
	    font: {
	    	bold: true,
	    }, 
	    alignment: {
	        horizontal: 'center'
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	//umum
	var bold11 = pok_wb.createStyle({
	    font: {
	    	bold: true,
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var normal11 = pok_wb.createStyle({
	    font: {
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var bold11kanan = pok_wb.createStyle({
	    font: {
	    	bold: true,
	        size: 11
	    }, 
	    alignment: {
	        horizontal: 'right'
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var red_font = pok_wb.createStyle({
	    font: {
	    	bold: true,
        	color: '#FF0000',
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var goldy_font = pok_wb.createStyle({
	    font: {
	    	bold: true,
        	color: '#72760D',
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var blue_font = pok_wb.createStyle({
	    font: {
	    	bold: true,
        	color: '#7E00FF',
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var violet_font = pok_wb.createStyle({
	    font: {
	    	bold: true,
        	color: '#BD30B8',
	        size: 11
	    },
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var uang = pok_wb.createStyle({
	    font: {
	        size: 11
	    }, 
	    alignment: {
	        horizontal: 'right'
	    },
    	numberFormat: '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)',
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var uang2 = pok_wb.createStyle({
	    font: {
	        size: 11
	    }, 
	    alignment: {
	        horizontal: 'right'
	    },
    	numberFormat: '#,##0',
    	border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var b = pok_wb.createStyle({
	    border: {
	    	left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var end_border = pok_wb.createStyle({
	    border: {
	    	bottom: {
	            style: 'thin'
	        }
	    }
	});
	var b_e = pok_wb.createStyle({
		fill: {
			type: 'pattern',
			patternType: 'solid',
			fgColor: '#FFFC00'
		},
	    border: {
	    	top: {
	            style: 'thin'
	        },
	    	bottom: {
	            style: 'thin'
	        },
	        left: {
	            style: 'thin'
	        },
	        right: {
	            style: 'thin'
	        }
	    }
	});
	var v_bg = pok_wb.createStyle({
		fill: {
			type: 'pattern',
			patternType: 'solid',
			fgColor: '#ECD2EE'
		}
	});
	var v_bg2 = pok_wb.createStyle({
		font: {
			color : '#FFFFFF'
		},
		fill: {
			type: 'pattern',
			patternType: 'solid',
			fgColor: '#800080'
		}
	});
	var y_bg = pok_wb.createStyle({
		fill: {
			type: 'pattern',
			patternType: 'solid',
			fgColor: '#FFFC00'
		}
	});

	var row_pos = 6;
	var arr_skomp = {};

	function writeRow(ws, item, type){
		if(type == 'detail'){
			//Detail
			ws.cell(row_pos,1).style(b);
			ws.cell(row_pos,2).string('- '+item.nmitem.replace(/^\s+/g,'')).style(normal11);
			ws.cell(row_pos,3).number(+item.volkeg).style(uang);
			ws.cell(row_pos,4).string(item.satkeg).style(normal11);
			ws.cell(row_pos,5).number(item.hargasat).style(uang);
			ws.cell(row_pos,6).number(item.jumlah).style(uang);
			ws.cell(row_pos,7).number(item.pengeluaran || 0).style(uang).style(v_bg);
			ws.cell(row_pos,8).number(item.rbl || 0).style(uang);
			ws.cell(row_pos,9).formula('G'+row_pos+'+H'+row_pos).style(uang);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang);
			if(item.jumlah - (item.pengeluaran + item.rbl) >= 0) ws.cell(row_pos,11).formula('F'+row_pos+'-I'+row_pos).style(uang2);
				else ws.cell(row_pos,11).formula('F'+row_pos+'-I'+row_pos).style(uang2).style(y_bg);
			
		} else if(type == 'akun'){
			ws.cell(row_pos,1).string(item.kdakun).style(bold11kanan);
			ws.cell(row_pos,2).string(item.uraian || '(Blm diedit)').style(bold11);
			ws.cell(row_pos,3).number(0).style(uang).style(bold11);
			ws.cell(row_pos,4).style(b);
			ws.cell(row_pos,5).number(0).style(uang).style(bold11);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+item.length)+')').style(uang).style(bold11);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+item.length)+')').style(uang).style(bold11).style(v_bg);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+item.length)+')').style(uang).style(bold11);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+item.length)+')').style(uang).style(bold11);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+item.length)+')').style(uang2);
		} else if(type == 'skomponen'){
			ws.cell(row_pos,1).string(item.kdskmpnen).style(komp_k).style(violet_font);
			ws.cell(row_pos,2).string(item.urskmpnen || '(Blm diedit)').style(out_u).style(violet_font);
			ws.cell(row_pos,3).number(0).style(uang).style(violet_font);
			ws.cell(row_pos,4).style(b);
			ws.cell(row_pos,5).number(0).style(uang).style(violet_font);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+2)+')').style(uang).style(violet_font);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+2)+')').style(uang).style(violet_font).style(v_bg);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+2)+')').style(uang).style(violet_font);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+2)+')').style(uang).style(violet_font);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(violet_font);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+2)+')').style(uang2).style(violet_font);
		} else if(type == 'komponen'){
			ws.cell(row_pos,1).string(item.kdkmpnen).style(komp_k).style(blue_font);
			ws.cell(row_pos,2).string(item.urkmpnen || '(Blm diedit)').style(out_u).style(blue_font);
			ws.cell(row_pos,3).number(0).style(uang).style(blue_font);
			ws.cell(row_pos,4).style(b);
			ws.cell(row_pos,5).number(0).style(uang).style(blue_font);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+2)+')').style(uang).style(blue_font);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+2)+')').style(uang).style(blue_font).style(v_bg);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+2)+')').style(uang).style(blue_font);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+2)+')').style(uang).style(blue_font);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(blue_font);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+2)+')').style(uang2).style(blue_font);
		} else if(type == 'output'){
			ws.cell(row_pos,1).string(item.kdgiat+'.'+item.kdoutput).style(out_k).style(red_font);
			ws.cell(row_pos,2).string(item.uraian || '(Blm diedit)').style(out_u).style(red_font);
			ws.cell(row_pos,3).number(item.vol).style(uang).style(red_font);
			ws.cell(row_pos,4).string('').style(out_u).style(red_font);
			ws.cell(row_pos,5).number(0).style(uang).style(red_font);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+2)+')').style(uang).style(red_font);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+2)+')').style(uang).style(red_font).style(v_bg);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+2)+')').style(uang).style(red_font);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+2)+')').style(uang).style(red_font);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(red_font);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+2)+')').style(uang2).style(red_font);
		} else if(type == 'kegiatan'){
			ws.cell(row_pos,1).string(item.kdgiat).style(keg_k).style(goldy_font);
			ws.cell(row_pos,2).string(item.uraian || '(Blm diedit)').style(keg_u).style(goldy_font);;
			ws.cell(row_pos,3).number(0).style(uang).style(goldy_font);
			ws.cell(row_pos,4).style(b);
			ws.cell(row_pos,5).number(0).style(uang).style(goldy_font);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+2)+')').style(uang).style(goldy_font);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+2)+')').style(uang).style(goldy_font).style(v_bg);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+2)+')').style(uang).style(goldy_font);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+2)+')').style(uang).style(goldy_font);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(goldy_font);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+2)+')').style(uang2).style(goldy_font);
		} else if(type == 'program'){
			ws.cell(row_pos,1).string('054.01.'+item.kdprogram).style(prog_k).style(b).style(v_bg2);
			ws.cell(row_pos,2).string(item.uraian || '(Blm diedit)').style(prog_u).style(b).style(v_bg2);
			ws.cell(row_pos,3).number(0).style(uang).style(bold11).style(b).style(v_bg2);
			ws.cell(row_pos,4).style(b).style(v_bg2);
			ws.cell(row_pos,5).style(b).style(v_bg2);
			ws.cell(row_pos,6).formula('SUM(F'+(row_pos+1)+':F'+(row_pos+2)+')').style(uang).style(bold11).style(b).style(v_bg2);
			ws.cell(row_pos,7).formula('SUM(G'+(row_pos+1)+':G'+(row_pos+2)+')').style(uang).style(bold11).style(b).style(v_bg).style(v_bg2);
			ws.cell(row_pos,8).formula('SUM(H'+(row_pos+1)+':H'+(row_pos+2)+')').style(uang).style(bold11).style(b).style(v_bg2);
			ws.cell(row_pos,9).formula('SUM(I'+(row_pos+1)+':I'+(row_pos+2)+')').style(uang).style(bold11).style(b).style(v_bg2);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(bold11).style(b).style(v_bg2);
			ws.cell(row_pos,11).formula('SUM(K'+(row_pos+1)+':K'+(row_pos+2)+')').style(uang2).style(bold11).style(b).style(v_bg2);
		}
		return row_pos++;
	}
	//width
	ws.column(1).setWidth(9);
	ws.column(2).setWidth(50);
	ws.column(3).setWidth(10);
	ws.column(4).setWidth(7);
	ws.column(5).setWidth(14);
	ws.column(6).setWidth(15);
	ws.column(7).setWidth(15);
	ws.column(8).setWidth(15);
	ws.column(9).setWidth(16);
	ws.column(10).setWidth(8);
	ws.column(11).setWidth(15);

	ws.column(2).freeze(2);

	//header
	ws.cell(4,1).string('kode').style(header);
	ws.cell(4,2).string('uraian').style(header);
	ws.cell(4,3).string('vol').style(header);
	ws.cell(4,4).string('sat').style(header);
	ws.cell(4,5).string('hargasat').style(header);
	ws.cell(4,6).string('jumlah').style(header);
	ws.cell(4,7).string('PENGELUARAN').style(header);
	ws.cell(4,8, 5, 8, true).string('REALISASI BULAN LALU').style(header);
	ws.cell(4, 9, 4, 10, true).string('REALISASI S/D BULAN INI').style(header);
	ws.cell(5,9).string('(Rp)').style(header);
	ws.cell(5,10).string('%').style(header);
	ws.cell(4,11, 5, 11, true).string('SISA DANA (RP)').style(header);

	ws.cell(5,1).style(b);
	ws.cell(5,2).style(b);
	ws.cell(5,3).style(b);
	ws.cell(5,4).style(b);
	ws.cell(5,5).style(b);
	ws.cell(5,6).style(b);
	ws.cell(5,7).style(b);

	var d = new Date();
	var date = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+', '+d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
	ws.cell(2,3, 2, 7, true).string('REALISASI '+month[m]+' '+y).style({font: {bold: true, size: 14}, alignment: {horizontal: 'center'}});
	ws.cell(3,8, 3, 11, true).string('Generated by simamov at '+date).style({alignment:{horizontal: 'right'}});
	var lower_ts = Math.round(new Date(y, m, 1).getTime()/1000);
	var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399;

	// SubKomponen.find({active: true}).sort('kdskmpnen').exec(function(err, skomps){
	// 	var tasks2 = [];

	// 	_.each(skomps, function(skomp, index, list){
	// 		tasks2.push(function(cb2){

				

	// 		})
	// 	})

	// 	async.series(tasks2, function(err, finish){
	// 		pok_wb.write('POK.xlsx', res);
	// 	})
	// })

	var index_prog = []

	Program.find({'thang': thang, active: true}).sort('kdprogram').exec(function(err, progs){
		var tasks6 = [];

		_.each(progs, function(prog, index, list){
			tasks6.push(function(cb6){

				Kegiatan.find({'thang': thang, active: true, kdprogram: prog.kdprogram}).sort('kdgiat').exec(function(err, kegs){
					var tasks5 = [];

					var index_keg = []
					var prog_i = writeRow(ws, prog, 'program')
					index_prog.push(prog_i)

					_.each(kegs, function(keg, index, list){
						tasks5.push(function(cb5){

							Output.find({'thang': thang, active: true, kdgiat: keg.kdgiat, kdprogram: keg.kdprogram}).sort('kdoutput').exec(function(err, outputs){
								var tasks4 = [];

								var index_outp = []
								var keg_i = writeRow(ws, keg, 'kegiatan');
								index_keg.push(keg_i)

								_.each(outputs, function(outp, index, list){
									tasks4.push(function(cb4){

										Komponen.find({'thang': thang, active: true, kdoutput: outp.kdoutput,
											kdgiat: outp.kdgiat, kdprogram: outp.kdprogram}).sort('kdkmpnen').exec(function(err, komps){
											var tasks3 = [];

											var index_komp = [];
											var outp_i = writeRow(ws, outp, 'output');
											index_outp.push(outp_i)

											_.each(komps, function(komp, index, list){
												tasks3.push(function(cb3){

													SubKomponen.find({'thang': thang, active: true, kdkmpnen: komp.kdkmpnen, kdsoutput: komp.kdsoutput, kdoutput: komp.kdoutput,
														kdgiat: komp.kdgiat, kdprogram: komp.kdprogram}).sort('kdskmpnen').exec(function(err, skomps){
														var tasks2 = [];

														var index_skomp = [];
														var komp_i = writeRow(ws, komp, 'komponen');
														index_komp.push(komp_i)

														_.each(skomps, function(skomp, index, list){
															tasks2.push(function(cb2){

																Akun.find({'thang': thang, active: true, kdskmpnen: skomp.kdskmpnen,
																	kdkmpnen: skomp.kdkmpnen, kdsoutput: skomp.kdsoutput, kdoutput: skomp.kdoutput,
																		kdgiat: skomp.kdgiat, kdprogram: skomp.kdprogram}).sort('kdakun').exec(function(err, akuns){
																	var tasks1 = [];

																	var index_akun = [];
																	var skomp_i = 0;

																	if(skomp.urskmpnen !== 'tanpa sub komponen'){
																		skomp_i = writeRow(ws, skomp, 'skomponen');
																		index_skomp.push(skomp_i);
																	}																	

																	_.each(akuns, function(akun, index, list){

																		tasks1.push(function(cb1){
																			DetailBelanja.find({'thang': thang, active: true, kdakun: akun.kdakun, kdskmpnen: akun.kdskmpnen,
																				kdkmpnen: akun.kdkmpnen, kdsoutput: akun.kdsoutput, kdoutput: akun.kdoutput,
																					kdgiat: skomp.kdgiat, kdprogram: akun.kdprogram}).sort('noitem').exec(function(err, details){

																				akun.length = details.length;
																				index_akun.push(writeRow(ws, akun, 'akun'));
																				var tasks0 = [];

																				_.each(details, function(detail, index, list){
																					tasks0.push(function(cb0){
																						detail.pengeluaran = 0;
																						detail.rbl = 0;
																						_.each(detail.realisasi, function(realisasi, index, list){
																							if(realisasi.tgl_timestamp >= lower_ts && realisasi.tgl_timestamp <= upper_ts){
																								detail.pengeluaran += realisasi.jumlah;
																							}
																							if(realisasi.tgl_timestamp <= lower_ts) detail.rbl += realisasi.jumlah;
																						});
																						writeRow(ws, detail, 'detail');
																						cb0(null, 'ok0')
																					})
																				})

																				async.series(tasks0, function(err, finish){
																					cb1(null, 'ok1');
																				})
																			})
																		})
																	})

																	async.series(tasks1, function(err, finish){
																		var F = _.map(index_akun, function(index){ return 'F'+index; });
																		var G = _.map(index_akun, function(index){ return 'G'+index; });
																		var H = _.map(index_akun, function(index){ return 'H'+index; });
																		var I = _.map(index_akun, function(index){ return 'I'+index; });
																		var K = _.map(index_akun, function(index){ return 'K'+index; });
																		if(skomp_i){
																			ws.cell(skomp_i,6).formula('SUM('+F.join()+')').style(uang).style(violet_font);
																			ws.cell(skomp_i,7).formula('SUM('+G.join()+')').style(uang).style(violet_font);
																			ws.cell(skomp_i,8).formula('SUM('+H.join()+')').style(uang).style(violet_font);
																			ws.cell(skomp_i,9).formula('SUM('+I.join()+')').style(uang).style(violet_font);
																			ws.cell(skomp_i,11).formula('SUM('+K.join()+')').style(uang).style(violet_font);
																		} else {
																			ws.cell(komp_i,6).formula('SUM('+F.join()+')').style(uang).style(blue_font);
																			ws.cell(komp_i,7).formula('SUM('+G.join()+')').style(uang).style(blue_font).style(v_bg);
																			ws.cell(komp_i,8).formula('SUM('+H.join()+')').style(uang).style(blue_font);
																			ws.cell(komp_i,9).formula('SUM('+I.join()+')').style(uang).style(blue_font);
																			ws.cell(komp_i,11).formula('SUM('+K.join()+')').style(uang2).style(blue_font);
																		}
																		cb2(null, 'ok2');
																	})
																})

															})
														})

														async.series(tasks2, function(err, finish){
															if(index_skomp.length){
																var F = _.map(index_skomp, function(index){ return 'F'+index; });
																var G = _.map(index_skomp, function(index){ return 'G'+index; });
																var H = _.map(index_skomp, function(index){ return 'H'+index; });
																var I = _.map(index_skomp, function(index){ return 'I'+index; });
																var K = _.map(index_skomp, function(index){ return 'K'+index; });

																ws.cell(komp_i,6).formula('SUM('+F.join()+')').style(uang).style(blue_font);
																ws.cell(komp_i,7).formula('SUM('+G.join()+')').style(uang).style(blue_font).style(v_bg);
																ws.cell(komp_i,8).formula('SUM('+H.join()+')').style(uang).style(blue_font);
																ws.cell(komp_i,9).formula('SUM('+I.join()+')').style(uang).style(blue_font);
																ws.cell(komp_i,11).formula('SUM('+K.join()+')').style(uang2).style(blue_font);
															}
															
															cb3(null, 'ok3');
														})
													})

												})
											})

											async.series(tasks3, function(err, finish){
												var F = _.map(index_komp, function(index){ return 'F'+index; });
												var G = _.map(index_komp, function(index){ return 'G'+index; });
												var H = _.map(index_komp, function(index){ return 'H'+index; });
												var I = _.map(index_komp, function(index){ return 'I'+index; });
												var K = _.map(index_komp, function(index){ return 'K'+index; });

												ws.cell(outp_i,6).formula('SUM('+F.join()+')').style(uang).style(red_font);
												ws.cell(outp_i,7).formula('SUM('+G.join()+')').style(uang).style(red_font).style(v_bg);
												ws.cell(outp_i,8).formula('SUM('+H.join()+')').style(uang).style(red_font);
												ws.cell(outp_i,9).formula('SUM('+I.join()+')').style(uang).style(red_font);
												ws.cell(outp_i,11).formula('SUM('+K.join()+')').style(uang2).style(red_font);
												cb4(null, 'ok4');
											})
										})

									})
								})

								async.series(tasks4, function(err, finish){
									var F = _.map(index_outp, function(index){ return 'F'+index; });
									var G = _.map(index_outp, function(index){ return 'G'+index; });
									var H = _.map(index_outp, function(index){ return 'H'+index; });
									var I = _.map(index_outp, function(index){ return 'I'+index; });
									var K = _.map(index_outp, function(index){ return 'K'+index; });

									ws.cell(keg_i,6).formula('SUM('+F.join()+')').style(uang).style(goldy_font);
									ws.cell(keg_i,7).formula('SUM('+G.join()+')').style(uang).style(goldy_font).style(v_bg);
									ws.cell(keg_i,8).formula('SUM('+H.join()+')').style(uang).style(goldy_font);
									ws.cell(keg_i,9).formula('SUM('+I.join()+')').style(uang).style(goldy_font);
									ws.cell(keg_i,11).formula('SUM('+K.join()+')').style(uang2).style(goldy_font);
									cb5(null, 'ok5');
								})
							})

						})
					})

					async.series(tasks5, function(err, finish){
						var F = _.map(index_keg, function(index){ return 'F'+index; });
						var G = _.map(index_keg, function(index){ return 'G'+index; });
						var H = _.map(index_keg, function(index){ return 'H'+index; });
						var I = _.map(index_keg, function(index){ return 'I'+index; });
						var K = _.map(index_keg, function(index){ return 'K'+index; });

						ws.cell(prog_i,6).formula('SUM('+F.join()+')').style(uang).style(bold11).style(b).style(v_bg2);
						ws.cell(prog_i,7).formula('SUM('+G.join()+')').style(uang).style(bold11).style(b).style(v_bg).style(v_bg2);
						ws.cell(prog_i,8).formula('SUM('+H.join()+')').style(uang).style(bold11).style(b).style(v_bg2);
						ws.cell(prog_i,9).formula('SUM('+I.join()+')').style(uang).style(bold11).style(b).style(v_bg2);
						ws.cell(prog_i,11).formula('SUM('+K.join()+')').style(uang2).style(bold11).style(b).style(v_bg2);
						cb6(null, 'ok6');
					})
				})

			})
		})

		async.series(tasks6, function(err, finish){
			var F = _.map(index_prog, function(index){ return 'F'+index; });
			var G = _.map(index_prog, function(index){ return 'G'+index; });
			var H = _.map(index_prog, function(index){ return 'H'+index; });
			var I = _.map(index_prog, function(index){ return 'I'+index; });
			var K = _.map(index_prog, function(index){ return 'K'+index; });

			ws.cell(row_pos,1).style(b_e);
			ws.cell(row_pos,2).string('Jumlah').style({font: {bold: true, size:14}, alignment: {horizontal: 'center'}}).style(b_e);
			ws.cell(row_pos,3).style(b_e);
			ws.cell(row_pos,4).style(b_e);
			ws.cell(row_pos,5).style(b_e);
			ws.cell(row_pos,6).formula('SUM('+F.join()+')').style(uang).style(bold11).style(b_e);
			ws.cell(row_pos,7).formula('SUM('+G.join()+')').style(uang).style(bold11).style(b_e);
			ws.cell(row_pos,8).formula('SUM('+H.join()+')').style(uang).style(bold11).style(b_e);
			ws.cell(row_pos,9).formula('SUM('+I.join()+')').style(uang).style(bold11).style(b_e);
			ws.cell(row_pos,10).formula('I'+row_pos+'/F'+row_pos+'*100').style(uang).style(bold11).style(b_e);
			ws.cell(row_pos,11).formula('SUM('+K.join()+')').style(uang).style(bold11).style(b_e);

			var file_name = date.replace(/\:|\//g, '-')+' REALISASI '+month[m]+' '+y;

			if(req.params.type == 'xlsx')
				pok_wb.write(file_name+'.xlsx', res)
				else {
					msopdf(null, function(error, office) {
						var input = __dirname + '/../temp_file/'+file_name+'.xlsx';
						var output = __dirname + '/../temp_file/'+file_name+'.pdf';

						pok_wb.write(input, function (err, stats) {
						    if (err) {
						        console.error(err);
						    }

						    office.excel({'input': input, 'output': output}, function(error, pdf) {
						    	if (err) {
							        console.error(err);
							    }
							    //hapus xlsx setelah terconvert
						    	fs.unlink(input);
							})

							office.close(null, function(error) {
	  							res.download(output);
	  							res.on('finish', function() {
	  								//hapus pdf setelah didownload
									fs.unlink(output);
								});
							})

						});
						
					})
				}
		})
	})
});


//Functions
function unrar_pok_file(path){

	//convert ke rar
	var archive = new Unrar(path);

	return archive;
}

function proses_xml(xml_stream, roots_var, var_array, current_timestamp, Model, username, cb){
	var thang;
	async.auto({

		xml_to_json: function(callback){
			//stream to xml string
			var xml_string = '';
		    xml_stream.on('data', function(xml_buffer){
				xml_string += xml_buffer.toString();
			});

			//xml string to json
			xml_stream.on('end', function(xml_buffer){
				parseString(xml_string, function (err, json) {
					if(err) errorHandler(username, 'Parse xml error. Mohon hubungi admin.');
					callback(err, json);
				});
			});
		},
		json_to_db: ['xml_to_json', function(data, callback){
			//Daftar tasks : Inisialisasi
			var tasks = [];

			thang = data.xml_to_json[ roots_var[ 0 ] ][ roots_var[ 1 ] ][0]['thang'];
			
			data.xml_to_json[ roots_var[ 0 ] ][ roots_var[ 1 ] ].forEach(function(value, key){
				tasks.push(
					function(item_added_callback){
						var item = new Model({timestamp: current_timestamp});
						for (var i = 0; i < var_array.length; i++) {
							if(value[ var_array[ i ] ]){
								item[ var_array[ i ] ] = value[ var_array[ i ] ][ 0 ]
							}
						}

						item.pengentry = username;

						item.isExist(function(err, result) {
							if(err) errorHandler(username, 'Item isExist error. Mohon hubungi admin.');
							//jika sudah pernah ada
							if(result){
								//init old
								var old = {};
								//init item aktiv
								var new_item = {};
								//iterasi variabel yg bisa jadi old
								for (var i = 0; i < var_array.length; i++) {
									//jika var terdefinisi
									if(result[ var_array[ i ] ]){
										//jika tdk sama dgn yg baru, var lama jadikan old
										if( result[ var_array[ i ] ] != item[ var_array[ i ] ] ){
											//bakal push to old
											old[ var_array[ i ] ] = result[ var_array[ i ] ];
											//bakal jadi active item
											new_item[ var_array[ i ] ] = item[ var_array[ i ] ]
										}
									}
								}
								if(!_.isEmpty(old)){
									//timestamp utk unique revisi
									old[ 'timestamp' ] = result[ 'timestamp' ];
									//timestemp update terbaru
									new_item[ 'timestamp' ] = current_timestamp;
									//old yg lama ditransfer
									new_item['old'] = result[ 'old' ];
									//penambahan old
									new_item['old'].push(old);
									new_item['active'] = true;
									Model.update({_id: new ObjectId(result[ '_id' ])}, { $set: new_item }, function(err, updated){
										if(err) errorHandler(username, result[ '_id' ]+' update error. Mohon hubungi admin.');
										// console.log(result[ '_id' ]+' updated');
										item_added_callback(err, result[ '_id' ]+' updated');
									});
								} else {
									// update timestamp terbaru
									Model.update({_id: new ObjectId(result[ '_id' ])}, { $set: {'timestamp': current_timestamp, 'active': true} }, function(err, updated){
										item_added_callback(err, result[ '_id' ]+' tidak ditambah.');
									});
								}
							} else {
								item.save(function(err, item){
									if(err) errorHandler(username, item[ '_id' ]+' insert error. Mohon hubungi admin.');
									// console.log(item[ '_id' ]+' inserted')
									item_added_callback(err, item[ '_id' ]+' inserted');
								})
							}
						})
					}
				)
								

			});//end data.forEach

			//setelah dipush, dijalankan satu2
		    async.parallel(tasks, function(err, final_item_added){
		    	if(err){
		    		if(err) errorHandler(username, 'Async parallel error. Mohon hubungi admin.');
		    		return;
		    	}
		    	
		    	callback(err, 'Semua item telah disimpan');
		    });

		}]
	}, function(err, result){
		if(err) errorHandler(username, 'Async auto error. Mohon hubungi admin.');
    	// Jika timestamp tidak terupdate ==> Telah dihapus
    	Model.update({'thang': thang[0], timestamp: {$ne: current_timestamp}}, {$set: {active: false}}, {"multi": true},function(err, status){
			if(err) errorHandler(username, 'Database update error. Mohon hubungi admin.');
		});
		if(cb) cb(thang[0]);
	})
}

function DisableItem(thang, current_timestamp, username){
	Kegiatan.update({'thang': thang, timestamp: {$ne: current_timestamp}}, {$set: {active: false}}, {"multi": true},function(err, status){
		if(err) errorHandler(username, 'Database update error. Mohon hubungi admin.');
	});
	Program.update({'thang': thang, timestamp: {$ne: current_timestamp}}, {$set: {active: false}}, {"multi": true},function(err, status){
		if(err) errorHandler(username, 'Database update error. Mohon hubungi admin.');
	});
}


function POK(file_path, pok_name, username){
	this.name;

	if(pok_name) this.name = pok_name;

	if(file_path){
		//Timestamp
		var current_timestamp = Math.round(new Date().getTime()/1000);

		//Awalan file item
		var output_prefix = new RegExp("d_output");
		var sub_output_prefix = new RegExp("d_soutput");
		var komponen_prefix = new RegExp("d_kmpnen");
		var sub_komponen_prefix = new RegExp("d_skmpnen");
		var akun_prefix = new RegExp("d_akun");
		var detail_belanja_prefix = new RegExp("d_item");

		//daftar variabel
		var root_index_program_var = [];
		var program_var = ['kdprogram'];

		var root_index_kegiatan_var = [];
		var kegiatan_var = ['kdprogram','kdgiat'];

		var root_index_output_var = ['VFPData', 'c_output'];
		var output_var = ['thang', 'kdprogram','kdgiat','kdoutput', 'vol'];

		var root_index_sub_output_var = ['VFPData', 'c_soutput'];
		var sub_output_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput', 'ursoutput'];

		var root_index_komponen_var = ['VFPData', 'c_kmpnen'];
		var komponen_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen', 'urkmpnen'];

		var root_index_sub_komponen_var = ['VFPData', 'c_skmpnen'];
		var sub_komponen_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','urskmpnen'];

		var root_index_akun_var = ['VFPData', 'c_akun'];
		var akun_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','kdakun'];

		var root_index_detail_belanja_var = ['VFPData', 'c_item'];
		var detail_belanja_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','kdakun','noitem','nmitem','volkeg','satkeg','hargasat','jumlah'];

		var archive = unrar_pok_file(file_path);

		//list
	    archive.list(function(err, entries){
	    	if(err) {
	    		errorHandler(username, 'Archive list error. Mohon hubungi admin.');
	    		return;
	    	}
	    	for (var i = 0; i < entries.length; i++) {
			    var name = entries[i].name;

			    var type = entries[i].type;

			    if (type !== 'File') {
			        continue;
			    }
			    if(detail_belanja_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_detail_belanja_var, detail_belanja_var, current_timestamp, DetailBelanja, username, function(thang){
						//Ubah nama
						Setting.findOne({type:'pok', 'thang': thang}, 'name timestamp old', function(err, pok_setting){
							if(err) {
								errorHandler(username, 'Database error.');
								return;
							};
							//tambahkan nama, nama sebelumnya di old kan
							if(pok_setting){
								Setting.update({'thang': thang, type: 'pok'},{$set: {name: pok_name, timestamp: current_timestamp}, $push: {"old": {name: pok_setting.toObject().name, timestamp: pok_setting.toObject().timestamp}}}, {upsert: true}, function(err, status){
									if(err){
										errorHandler(username, 'Database error.');
										return;
									}			
								})
							} else {
								old_setting = [];
								Setting.update({'thang': thang, type: 'pok'},{$set: {name: pok_name, timestamp: current_timestamp, old: old_setting}}, {upsert: true}, function(err, status){
									if(err){
										errorHandler(username, 'Database error.');
										return;
									}			
								})
							}
						})
						async.waterfall([

							function(callback_level0){
								DetailBelanja.find({'thang': thang}).distinct('kdprogram', function(error, prog) {
									var tasks = [];
									_.each(prog, function(kdprogram, index, list){
										tasks.push(
											function(callback_level1){
												Program.findOne({ 'thang': thang, 'kdprogram': kdprogram }, function(err, prog){
													if(err) {
											    		errorHandler(username, 'Program find error. Mohon hubungi admin.');
											    		callback_level1(err, null);
											    		return;
											    	}

													if(!prog){														
														program = new Program({ 'pengentry': username, 'thang': thang, 'timestamp': current_timestamp, 'kdprogram': kdprogram});
														program.save(function(err, prog){
															callback_level1(null, 'ok');
														});
													} else {
														if(current_timestamp !== prog[ 'timestamp' ]){
													    	//init old
															var old = {};
															//init item aktiv
															var new_item = {};
															//timestamp utk unique revisi
															old[ 'timestamp' ] = prog[ 'timestamp' ];
															if(prog[ 'pengentry' ] != username) old[ 'pengentry' ] = prog[ 'pengentry' ];
															//timestemp update terbaru
															new_item[ 'timestamp' ] = current_timestamp;
															//old yg lama ditransfer
															if(prog[ 'old' ]) new_item['old'] = prog[ 'old' ];
															//penambahan old
															new_item['old'].push(old);
															//status
															new_item['active'] = true;
															//pengentry
															new_item['pengentry'] = username;

															Program.update({_id: new ObjectId(prog[ '_id' ]), 'thang': thang}, { $set: new_item }, function(er, prog){
																callback_level1(null, 'ok');
															});
														} else {
															callback_level1(null, 'ok');
														}
													}
												})
											}
										)
									});
									async.parallel(tasks, function(err, final){
										callback_level0(err, 'ok');
									});

								});
							},

							function(prev_result, callback_level0){
								var tasks = [];
								DetailBelanja.find().distinct('kdgiat', function(error, giat) {
									_.each(giat, function(kdgiat, index, list){
										tasks.push(
											function(callback_level1){
												DetailBelanja.findOne({'thang': thang, 'kdgiat': kdgiat}, 'kdprogram', function(err, dblnj){
													if(err) {
											    		errorHandler(username, 'DetailBelanja find error. Mohon hubungi admin.');
											    		callback_level1(err, null);
											    		return;
											    	}
													Kegiatan.findOne({ 'thang': thang, 'kdprogram': dblnj['kdprogram'], 'kdgiat': kdgiat }, function(err, keg){
														if(err) {
												    		errorHandler(username, 'DetailBelanja find error. Mohon hubungi admin.');
												    		callback_level1(null, 'ok');
												    		return;
												    	}
														if(!keg){
															kegiatan = new Kegiatan({'pengentry': username, 'thang': thang, 'timestamp': current_timestamp, 'kdprogram': dblnj['kdprogram'], 'kdgiat': kdgiat});
															kegiatan.save(function(err, keg){
																callback_level1(null, 'ok');
															});
														} else {
															if(current_timestamp !== keg[ 'timeStamp' ]){
														    	//init old
																var old = {};
																//init item aktiv
																var new_item = {};
																//timestamp utk unique revisi
																old[ 'timestamp' ] = keg[ 'timestamp' ];
																if(keg[ 'pengentry' ] != username) old[ 'pengentry' ] = keg[ 'pengentry' ];
																//timestemp update terbaru
																new_item[ 'timestamp' ] = current_timestamp;
																//old yg lama ditransfer
																if(keg[ 'old' ]) new_item['old'] = keg[ 'old' ];
																//penambahan old
																new_item['old'].push(old);
																//status
																new_item['active'] = true;
																//pengentry
																new_item['pengentry'] = username;
																Kegiatan.update({_id: new ObjectId(keg[ '_id' ]), 'thang': thang}, { $set: new_item },function(err, keg){
																	callback_level1(null, 'ok');
																});
															} else {
																callback_level1(null, 'ok');
															}
														}
													})
												})
											}

										)
										
									});
									async.parallel(tasks, function(err, final){
										callback_level0(err, 'ok');
									})
								});
							}

							], function(err, final){
								Program.find({'thang': thang, active: true, uraian: { $exists: false}}).sort('kdprogram').exec(function(err, progs){
									Kegiatan.find({'thang': thang, active: true, uraian: { $exists: false}}).sort('kdgiat').exec(function(err, kegs){
										Akun.find({'thang': thang, active: true, uraian: { $exists: false}}).distinct('kdakun', function(err, akuns){
											pok.connections[username].emit('pok_unduh_finish', {'progs': progs, 'kegs': kegs, 
												'akuns': _.sortBy(akuns, function(o) { return o; })});
										})
									})
								})
								sendNotification(username, "Item telah diunggah.");
						})
			    	});

			    } else if(akun_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_akun_var, akun_var, current_timestamp, Akun, username, null);

			    } else if(sub_komponen_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_sub_komponen_var, sub_komponen_var, current_timestamp, SubKomponen, username, null);

			    } else if(komponen_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_komponen_var, komponen_var, current_timestamp, Komponen, username, null);

			    } else if(sub_output_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_sub_output_var, sub_output_var, current_timestamp, SubOutput, username, null);

			    } else if(output_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_output_var, output_var, current_timestamp, Output, username, null);

			    }
			}
	    });

	}

	this.getDetailBelanja = function(){
		return detail_belanja;
	}
}

function errorHandler(username, message){
	if(_.isString(username)) pok.connections[username].emit('messages', message)
		else username.emit('messages', message)
}

function sendNotification(username, message){
	if(!pok.connections[username]) return;
	if(_.isString(username)) pok.connections[username].emit('messages', message)
		else username.emit('messages', message)
}

module.exports = pok;