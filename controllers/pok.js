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

const XlsxPopulate = require('xlsx-populate');

//module parse xlsx
var xlsx = require('node-xlsx').default; 

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
var User = require(__dirname+"/../model/User.model");

var Pegawai = require(__dirname+"/../model/Pegawai.model");
var CustomEntity = require(__dirname+"/../model/CustomEntity.model");

//Short syntax tool
var _ = require("underscore");

var levenshtein = require('fast-levenshtein');

//modul sql utk koneksi db mysql sipadu
var mysql = require('mysql');

//similarity between string
var clj_fuzzy = require('clj-fuzzy');

//Socket.io
pok.connections;

pok.io;

pok.socket = function(io, connections, client){
	pok.connections = connections;

	pok.io = io;

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
				User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'POK edit '+_id+': '+element+' => '+user_input[ element ]}}}, 
    				function(err, status){
				})
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
							                        '<span class="badge badge-default" title="Prog: '+program.kdprogram+'">kegiatan</span>',
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
							                        '<span class="badge badge-default" title="Prog: '+program.kdprogram+'">kegiatan</span>',
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
										                                '<span class="badge badge-danger" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+'">output</span>',
										                                kegiatan.kdgiat+'.'+output.kdoutput,
										                                output.uraian,
										                                output.vol,
										                                output.satkeg || '-',
										                                '-',
										                                output.jumlah,
										                                '<span class="dropdown"><button class="dropdown-toggle" type="button" data-toggle="dropdown"><i class="icon-plus"></i><span class="caret"></span></button><ul class="dropdown-menu"><li><a subitem="sub_output" class="tambah" href="#">Sub Output</a></li><li><a subitem="komponen" class="tambah" href="#">Komponen</a></li></ul></span> <button type="button" class="hapus-item"><i class="icon-close"></i></button>'
										                            ]
										                        } else {
										                        	output_row = 
																	[
										                                output._id,
										                                kegiatan._id,
										                                '<span class="badge badge-danger" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+'">output</span>',
										                                kegiatan.kdgiat+'.'+output.kdoutput,
										                                output.uraian,
										                                output.vol,
										                                output.satkeg || '-',
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
												                                            '<span class="badge badge-danger" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+'">soutput</span>',
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
												                                            '<span class="badge badge-danger" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+'">soutput</span>',
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
																					if(soutput.ursoutput.match(/tanpa sub output/i)){
																						soutput_row = '';
																						parent_var = 'kdoutput';
																						parent_kd = output.kdoutput;
																						parent_id = output._id;
																					} else {

																					}
																					data.row = soutput_row
																					client.emit('pok_row_init_response', data, function () {
																						//jika sudah  append, iterasi tiap output
																						Komponen.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,
																						'kdoutput': soutput.kdsoutput, 'kdoutput': output.kdoutput, active: true}).sort('kdkmpnen').exec(function(err, komponens){
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
																	                                                '<span class="badge badge-primary" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+'">komponen</span>',
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
																	                                                '<span class="badge badge-primary" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+'">komponen</span>',
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
																		                                                            '<span class="badge badge-primary title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+'">skomponen</span>',
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
																		                                                            '<span class="badge badge-primary" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+'">skomponen</span>',
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
																															if(skomponen.urskmpnen.match(/tanpa sub komponen/i)){
																																skomponen_row = '';
																																parent_var = 'kdkmpnen';
																																parent_kd = komponen.kdkmpnen;
																																parent_id = komponen._id;
																															}
																															data.row = skomponen_row
																															client.emit('pok_row_init_response', data, function () {
																																//jika sudah  append, iterasi tiap output
																																Akun.find({'thang': thang, 'kdprogram': program.kdprogram, 'kdgiat': kegiatan.kdgiat,'kdoutput': output.kdoutput, 
																																'kdsoutput': soutput.kdsoutput, 'kdkmpnen': komponen.kdkmpnen, 'kdskmpnen': skomponen.kdskmpnen, active: true}).sort('kdakun').exec(function(err, akuns){
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
																							                                                                '<span class="badge badge-warning" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+', SKomp: '+skomponen.kdskmpnen+'">akun</span>',
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
																							                                                                '<span class="badge badge-warning" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+', SKomp: '+skomponen.kdskmpnen+'">akun</span>',
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
																																					'kdsoutput': soutput.kdsoutput, 'kdkmpnen': komponen.kdkmpnen, 'kdskmpnen': skomponen.kdskmpnen, 'kdakun': akun.kdakun, active: true}).sort('noitem').exec(function(err, details){
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
																									                                                                        '<span class="badge badge-success" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+', SKomp: '+skomponen.kdskmpnen+', Akun: '+akun.kdakun+'">detail</span>',
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
																									                                                                        '<span class="badge badge-success" title="Prog: '+program.kdprogram+', Keg: '+kegiatan.kdgiat+', Outp: '+output.kdoutput+', SOutp: '+soutput.kdsoutput+', Komp: '+komponen.kdkmpnen+', SKomp: '+skomponen.kdskmpnen+', Akun: '+akun.kdakun+'">detail</span>',
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
	    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'POK hapus item '+_id}}}, 
	    				function(err, status){
					})
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
		    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'POK hapus item '+item._id}}}, 
		    				function(err, status){
						})
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
    })

    client.on('pok_edit_new_item', function (user_input, cb) {
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
    			Model.findOne({'thang': thang, kdprogram: parent.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: user_input.kdsoutput,
    				kdkmpnen: user_input.kdkmpnen, kdskmpnen: user_input.kdskmpnen, kdakun: user_input.kdakun, nmitem: user_input.nmitem, 'active': true}, function(err, result){
    				if(result){
    					sendNotification(client, 'Item sudah ada.');
    					if(cb) cb('gagal');
    					return;
    				} else {
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
							if(cb) cb('sukses');
							sendNotification(client, 'Item berhasil disimpan.')
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
    				}
    			})
    		})
    	} else if(user_input.parent_type == 'kegiatan'){
    		if(!user_input.kdoutput.match(/^\d{3}$|\.\d{3}$/)){
    			sendNotification(client, 'Kode output tidak valid.');
    			return;
    		}
    		Kegiatan.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = parent.kdgiat
    			user_input.kdoutput = user_input.kdoutput.match(/\d{3}$/)[0];
    			user_input.thang = thang
    			var item = new Model(user_input);
    			Model.findOne({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, 'active': true}, function(err, result){
					if(result){
						sendNotification(client, 'Item sudah ada.');
						if(cb) cb('gagal');
						return;
					} else {
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
							if(cb) cb('sukses');
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
					}
				})
    		})
    	} else if(user_input.parent_type == 'output'){
    		//jika tdk lompat ke komponen (pada cara 2)
    		if(user_input.kdsoutput){
    			if(!user_input.kdsoutput.match(/^\d{3}$|\.\d{3}$/)){
	    			sendNotification(client, 'Kode sub output tidak valid.');
	    			return;
	    		}
    		} else {
    			if(!user_input.kdkmpnen.match(/^\d{3}$|\.\d{3}$/)){
	    			sendNotification(client, 'Kode komponen tidak valid.');
	    			return;
	    		}
    		}
    		Output.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = parent.kdgiat
    			user_input.kdoutput = parent.kdoutput
    			user_input.thang = thang
    			var syarat;
    			if(user_input.kdsoutput){
    				user_input.kdsoutput = user_input.kdsoutput.match(/\d{3}$/)[0];
    				syarat = {'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: user_input.kdsoutput, 'active': true};
    			} else {
					//buat soutput jika langsung lompat ke komponen
					SubOutput.findOne({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: '001', 'active': true}, function(err, result){
						if(!result){
							SubOutput.create({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: '001', ursoutput: 'tanpa sub output', 'active': true}, function(err, result){
								//kdsoutput 001 dibuat
							})
						}
					})
    				user_input.kdsoutput = '001';
    				user_input.kdkmpnen = user_input.kdkmpnen.match(/\d{3}$/)[0]
    				syarat = {'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: '001', kdkmpnen: user_input.kdkmpnen, 'active': true};
    			}
    			var item = new Model(user_input);
    			Model.findOne(syarat, function(err, result){
					if(result){
						sendNotification(client, 'Item sudah ada.');
						if(cb) cb('gagal');
						return;
					} else {
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
							if(cb) cb('sukses');
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
					}
				})
    		})
    	} else if(user_input.parent_type == 'soutput'){
    		if(!user_input.kdkmpnen.match(/^\d{3}$|\.\d{3}$/)){
    			sendNotification(client, 'Kode komponen tidak valid.');
    			return;
    		}
    		SubOutput.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = parent.kdgiat
    			user_input.kdoutput = parent.kdoutput
    			user_input.kdsoutput = parent.kdsoutput
    			user_input.kdkmpnen = user_input.kdkmpnen.match(/\d{3}$/)[0]
    			user_input.thang = thang
    			var item = new Model(user_input);
    			Model.findOne({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdoutput: user_input.kdoutput,
    				kdsoutput: user_input.kdsoutput, kdkmpnen: user_input.kdkmpnen, 'active': true}, function(err, result){
					if(result){
						sendNotification(client, 'Item sudah ada.');
						if(cb) cb('gagal');
						return;
					} else {
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
							if(cb) cb('sukses');
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
					}
				})
    		})
    	} else if(user_input.parent_type == 'komponen'){
    		if(user_input.kdskmpnen){
    			if(!user_input.kdskmpnen.match(/^[A-Z]{1}$|\.[A-Z]{1}$/)){
	    			sendNotification(client, 'Kode sub komponen tidak valid.');
	    			return;
	    		}
    		}else {
    			if(!user_input.kdakun.match(/^\d{6}$|\.\d{6}$/)){
	    			sendNotification(client, 'Kode akun tidak valid.');
	    			return;
	    		}
    		}
    		
    		Komponen.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = parent.kdgiat
    			user_input.kdoutput = parent.kdoutput
    			user_input.kdsoutput = parent.kdsoutput
    			user_input.kdkmpnen = parent.kdkmpnen
    			user_input.thang = thang
    			var syarat;
    			if(user_input.kdskmpnen){
    				user_input.kdskmpnen = user_input.kdskmpnen.match(/[A-Z]{1}$/)[0]
    				syarat = {'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput,
    				kdsoutput: user_input.kdsoutput, kdkmpnen: user_input.kdkmpnen, kdskmpnen: user_input.kdskmpnen, 'active': true}
    			} else {
					SubKomponen.findOne({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput,
						kdsoutput: user_input.kdsoutput, kdkmpnen: user_input.kdkmpnen, kdskmpnen: 'A', 'active': true}, function(err, result){
						if(!result){
							SubKomponen.create({'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput,
								kdsoutput: user_input.kdsoutput, kdkmpnen: user_input.kdkmpnen, kdskmpnen: 'A', urskmpnen: 'tanpa sub komponen', 'active': true}, function(err, result){
								//kdskmpnen A dibuat
							})
						}
					})
    				user_input.kdskmpnen = 'A';
    				user_input.kdakun = user_input.kdakun.match(/\d{6}$/)[0]
    				syarat = {'thang': thang, kdprogram: user_input.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput,
    				kdsoutput: user_input.kdsoutput, kdkmpnen: user_input.kdkmpnen, kdskmpnen: 'A', kdakun: user_input.kdakun, 'active': true}
    			}
    			var item = new Model(user_input);
    			Model.findOne(syarat, function(err, result){
    				console.log(syarat,result)
					if(result){
						sendNotification(client, 'Item sudah ada.');
						if(cb) cb('gagal');
						return;
					} else {
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
							if(cb) cb('sukses');
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
					}
				})
    		})
    	} else if(user_input.parent_type == 'skomponen'){
    		if(!user_input.kdakun.match(/^\d{6}$|\.\d{6}$/)){
    			sendNotification(client, 'Kode akun tidak valid.');
    			return;
    		}
    		SubKomponen.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = parent.kdgiat
    			user_input.kdoutput = parent.kdoutput
    			user_input.kdsoutput = parent.kdsoutput
    			user_input.kdkmpnen = parent.kdkmpnen
    			user_input.kdskmpnen = parent.kdskmpnen
    			user_input.kdakun = user_input.kdakun.match(/\d{6}$/)[0]
    			user_input.thang = thang
    			var item = new Model(user_input);
    			Model.findOne({'thang': thang, kdprogram: parent.kdprogram, kdgiat: user_input.kdgiat, kdoutput: user_input.kdoutput, kdsoutput: user_input.kdsoutput,
    				kdkmpnen: user_input.kdkmpnen, kdskmpnen: user_input.kdskmpnen, kdakun: user_input.kdakun, 'active': true}, function(err, result){
    				if(result){
    					sendNotification(client, 'Item sudah ada.');
    					if(cb) cb('gagal');
    					return;
    				} else {
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
							if(cb) cb('sukses');
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
    				}
    			})
    		})
    	} else if(user_input.parent_type == 'program'){
    		if(!user_input.kdgiat.match(/^\d{4}$|\.\d{4}$/)){
    			sendNotification(client, 'Kode kegiatan tidak valid.');
    			return;
    		}
    		Program.findOne({'thang': thang, _id: user_input.parent_id, 'active': true}, function(err, parent){
    			user_input.kdprogram = parent.kdprogram
    			user_input.kdgiat = user_input.kdgiat.match(/\d{4}$/)[0];
    			user_input.thang = thang
    			var item = new Model(user_input);
    			Model.findOne({'thang': thang, kdprogram: parent.kdprogram, kdgiat: user_input.kdgiat.match(/\d{4}$/)[0], 'active': true}, function(err, result){
    				if(result){
    					sendNotification(client, 'Item sudah ada.');
    					if(cb) cb('gagal');
    					return;
    				} else {
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
							if(cb) cb('sukses');
							sendNotification(client, 'Item berhasil disimpan.')
							User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
								function(err, status){
							})
		    			});
    				}
    			})
    		})
    	} else if(user_input.parent_type == ''){
    		if(!user_input.kdprogram.match(/^\d{2}$|\.\d{2}$/)){
    			sendNotification(client, 'Kode program tidak valid.');
    			return;
    		}
    		Program.findOne({'thang': thang, kdprogram: user_input.kdprogram.match(/\d{2}$/)[0], 'active': true}, function(err, parent){
    			if(parent){
    				sendNotification(client, 'Item sudah ada.');
    				if(cb) cb('gagal');
    				return;
    			}
    			user_input.kdprogram = user_input.kdprogram.match(/\d{2}$/)[0];
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
					if(cb) cb('sukses');
					User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Buat item POK baru '+result._id}}}, 
						function(err, status){
					})
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
    	//init Model, Parent Model, dan tipe parent
    	var Model;
    	var ParentModel;
    	var parent_type = data.type;
    	//jika kosong, maka program
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
    	//set tambahan syarat
    	data.syarat.active = true;
    	data.syarat.thang = thang;

    	Model.find(data.syarat).sort(data.sortby).exec(function(err, items){
    		if(data.type != 'program'){
    			ParentModel.findOne(data.syarat, function(err, parent){
    				if(data.for == 'riwayat'){
						client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
					} else if(data.for == 'riwayat_for_link') {
						client.emit('pok_list_for_riwayat_for_link', {'items': items, 'type': data.type});
					} else {
						client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': parent._id, 'parent_type': parent_type});
					}
    			})
    		} else {
    			if(data.for == 'riwayat'){
    				client.emit('pok_list_for_riwayat', {'items': items, 'type': data.type});
    			} else if(data.for == 'riwayat_for_link') {
						client.emit('pok_list_for_riwayat_for_link', {'items': items, 'type': data.type});
				} else {
    				client.emit('pok_list_response', {'items': items, 'type': data.type, 'parent_id': '', 'parent_type': ''});
    			}
    		}	    		
    	});
    })

    client.on('penerima_list', function (q, cb){
    	if(q.query){
    		q.query = q.query.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
    	} else if(q.q){
    		q.q = q.q.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
    	} else{
    		q = q.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");
    	}
    	if(q.type == 'custom_bps_only'){
    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: 'BPS', active: true}, 'nama', function(err, custs){
    			_.each(custs, function(item, index, list){
	    			custs[index].d = levenshtein.get(q.query, item.nama);
	    		})
	    		custs = _.sortBy(custs, function(o) { return o.d; })
	    		cb(custs);
	    	})
    	} else if(q.type == 'custom_non_only'){
    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: {$ne: 'BPS'}, active: true}, 'nama', function(err, custs){
	    		_.each(custs, function(item, index, list){
	    			custs[index].d = levenshtein.get(q.query, item.nama);
	    		})
	    		custs = _.sortBy(custs, function(o) { return o.d; })
	    		cb(custs);
	    	})
    	} else if(q.type == 'pegawai_only'){
    		Pegawai.find({"nama": new RegExp(q.query, "i"), active: true}, 'nama', function(err, pegs){
	    		_.each(pegs, function(item, index, list){
	    			pegs[index].d = levenshtein.get(q.query || q, item.nama);
	    		})
	    		pegs = _.sortBy(pegs, function(o) { return o.d; })
	    		cb(pegs);
	    	})
    	} else if(q.type == 'pegawai_and_bps'){
    		Pegawai.find({"nama": new RegExp(q.query, "i"), active: true}, 'nama', function(err, pegs){
	    		CustomEntity.find({"nama": new RegExp(q.query, "i"), type: 'Penerima', unit: 'BPS', active: true}, 'nama', function(err, custs){
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
    		Pegawai.find({"nama": new RegExp(q.query || q, "i"), active: true}, 'nama', function(err, pegs){
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
    		Pegawai.find({"nama": new RegExp(q.query || q, "i"), active: true}, 'nama', function(err, pegs){
	    		CustomEntity.find({"nama": new RegExp(q.query || q, "i"), type: 'Penerima', active: true}, 'nama', function(err, custs){
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

    	//jika sekali banyak/dari handsontable
    	if(new_entry.import){
    		//hapus data terakhir (row kosong/spare)
    		new_entry.data.pop();

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
		    	if(getNumber(item.jumlah)){
		    		if(item.jumlah){
		    			item.jumlah = getNumber(item.jumlah);
		    		}
		    		if(item.pph21){
		    			item.pph21 = getNumber(item.pph21);
		    		}
		    		DetailBelanja.update({'thang': thang, "_id": new_entry._id}, {$push: {"realisasi": item}}, {new: true}, function(err, result){
			    		if (err) {
			    			console.log(err)
			    			errorHandler(client, 'Gagal menyimpan.')
			    			cb('gagal')
			    			return
			    		}
			    		callback(null, 'ok');
		    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Entry realisasi '+item.penerima_nama+', Rp'+item.jumlah+', Tgl '+item.tgl}}}, 
		    				function(err, status){
						})
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
		    	} else{
		    		callback(null, 'ok');
		    	}
			}

			//init task
			var tasks = []

			//iterasi tiap row
    		_.each(new_entry.data, function(item, index, list){
    			//info umum
    			item.timestamp = new_entry.timestamp;
	    		item.pengentry = client.handshake.session.username || 'admin';

    			tasks.push(function(callback){
    				//ambil semua pegawai
    				Pegawai.find({active: true}, 'nama', function(err, pegs){
    					var matched = getMatchEntity(item.penerima_nama, pegs);
    					//ambil id ke peg
    					if(matched.score >= 0.91){
    						item.penerima_id = matched._id;
    						//untuk cross check kesamaan nama
    						item.ket = '['+item.penerima_nama+'] '+item.ket;
    						//ganti penerima nama dgn sesuai id
    						item.penerima_nama = matched.nama;
							DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
								'tgl': item.tgl, 'ket': item.ket}).exec(function(err, result){
			    					if(!result){
			    						//simpan
			    						submit_entry(item, callback);
			    					} else {
			    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
						    							+item.tgl+' sudah pernah dientry.')
			    						callback(null, 'sudah ada')
			    					}
			    			})	
    					} else {
    						CustomEntity.find({type: 'Penerima', active: true}, 'nama', function(err, custs){
								if (err){
								  	console.log(err)
								  	return;
								}
								var matched = getMatchEntity(item.penerima_nama, custs);
								if(matched.score >= 0.91){
		    						item.penerima_id = matched._id;
		    						//untuk cross check kesamaan nama nanti
		    						item.ket = '['+item.penerima_nama+'] '+item.ket;
		    						//ganti penerima nama dgn sesuai id
    								item.penerima_nama = matched.nama;
									DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
										'tgl': item.tgl, 'ket': item.ket}).exec(function(err, result){
					    					if(!result){
					    						//simpan
					    						submit_entry(item, callback);
					    					} else {
					    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
								    							+item.tgl+' sudah pernah dientry.')
					    						callback(null, 'sudah ada')
					    					}
					    			})	
		    					} else {
		    						var sipadu_db = mysql.createConnection({
										host: '127.0.0.1',
										user: 'root',
										password: '',
										database: 'sipadu_db'
									});

						    		//kueri utk dosen di sipadu
						    		var query = 'SELECT * ' +
											'FROM dosen ' +
											'WHERE aktif = 1 AND unit <> "STIS"';
		    						sipadu_db.connect(function(err){
		    							sipadu_db.query(query, function (err, dosen, fields) {
											if (err){
											  	console.log(err)
											  	return;
											}
											sipadu_db.end();
											var dosen_refine = _.map(dosen, function(o, key){return {_id: o.kode_dosen, nama: o.gelar_depan+((o.gelar_depan?' ':''))+o.nama+' '+o.gelar_belakang, unit: o.unit}});
											var matched = getMatchEntity(item.penerima_nama, dosen_refine);
											//ambil id ke peg
					    					if(matched.score >= 0.91){
					    						CustomEntity.create({'nama': item.penerima_nama, type:'Penerima', unit: matched.unit}, function(err, new_penerima){
													item.penerima_id = new_penerima._id;
						    						//untuk cross check kesamaan nama nanti
						    						item.ket = '['+item.penerima_nama+'] '+item.ket;
						    						//ganti penerima nama dgn sesuai id
    												item.penerima_nama = matched.nama;
													DetailBelanja.findOne({'thang': thang, '_id': new_entry._id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': item.jumlah, 'penerima_id': item.penerima_id, 
														'tgl': item.tgl, 'ket': item.ket}).exec(function(err, result){
									    					if(!result){
									    						//simpan
									    						submit_entry(item, callback);
									    					} else {
									    						sendNotification(client, item.penerima_nama+', Rp'+item.jumlah+', Tgl '
												    							+item.tgl+' sudah pernah dientry.')
									    						callback(null, 'sudah ada')
									    					}
									    			})	
												})
					    					} else {
					    						// klo masih tdk ada, buat custom
												CustomEntity.create({'nama': item.penerima_nama.replace(/^\s*/g, ''), type:'Penerima'}, function(err, new_penerima){
													item.penerima_id = new_penerima._id;
													submit_entry(item, callback);
												})
					    					}
										})
		    						});
		    					}
							})
    					}
    				})
    			})
    		})

    		async.series(tasks, function(err, finish){
    		})
			cb('sukses');

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
				    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Entry realisasi '+new_entry.data.penerima_nama+', Rp'+new_entry.data.jumlah+', Tgl '+new_entry.data.tgl}}}, 
				    				function(err, status){
								})
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
			    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Entry realisasi '+new_entry.data.penerima_nama+', Rp'+new_entry.data.jumlah+', Tgl '+new_entry.data.tgl}}}, 
			    				function(err, status){
							})
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
	    			if(!data.xlsx && !data.pdf){
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
	    			}
		    		if(data.month){
		    			var y = thang || new Date().getFullYear();
			    		var m = data.month || new Date().getMonth();
			    		var lower_ts = Math.round(new Date(y, m, 1).getTime()/1000)
			    		var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
			    		var rows = [];
	    				_.each(detail.realisasi, function(item, index, list){
	    					if(item.tgl_timestamp >= lower_ts && item.tgl_timestamp <= upper_ts){
	    						if(data.xlsx || data.pdf){
									rows.push({tgl: item.tgl, penerima_nama: item.penerima_nama, jumlah: item.jumlah, pph21: item.pph21, pph22: item.pph22, 
	    								pph23: item.pph23, ppn: item.ppn, spm_no: item.spm_no, bukti_no: item.bukti_no, ket: item.ket, pengentry: item.pengentry})
	    						} else {
	    							client.emit('riwayat_tbl_add', [item._id, item._id, '', item.tgl, item.penerima_nama, item.jumlah, item.pph21, item.pph22, 
	    								item.pph23, item.ppn, item.spm_no, item.bukti_no, item.ket, item.pengentry, 
	    								'<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button>']);
	    							return;
	    						}
	    						
	    					}
	    				});
	    				if(data.xlsx || data.pdf){
							if(rows.length == 0){
								cb('');
								return;
							}
							var current_timestamp = Math.round(new Date().getTime()/1000);

							var file_name = current_timestamp+' Riwayat Rincian '+data.detail.replace(/\-\s*/g, '');
							// Load an existing workbook
							XlsxPopulate.fromFileAsync("./template/RiwayatTemplatePOK.xlsx")
						    .then(workbook => {
						    	workbook.definedName("title").value('Riwayat '+data.detail.replace(/\-\s*/g, '')+' ('+(data.periode.match(/\d/)?data.periode:data.periode+' '+client.handshake.session.tahun_anggaran)+')');
						    	var d = new Date();
								var date = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+', '+d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
								workbook.definedName("time").value('Generated by simamov at '+date);

						    	var row = 5;
						    	var nmr = 1;
						    	var sum_pos = 5;
						    	_.each(rows, function(item, index, list){
						    		var r = workbook.sheet(0).range('A'+row+':L'+row);
						    		r.value([[
						    			nmr++, 
						    			item.tgl, 
						    			item.penerima_nama, 
						    			item.jumlah, 
						    			item.pph21 || 0, 
						    			item.pph22 || 0, 
						    			item.pph23 || 0,
						    			item.ppn || 0,
						    			item.spm_no || '-',
						    			item.bukti_no || '-',
						    			item.ket || '-',
						    			item.pengentry
						    		]]);
						    		row++;
						    	});
						    	var jumlahcells = workbook.sheet(0).range('A'+row+':C'+row);
			    				jumlahcells.merged(true).style('horizontalAlignment', 'center');
			    				workbook.sheet(0).cell("A"+row).value('Jumlah');
			    				workbook.sheet(0).cell('D'+row).formula('SUM(D'+sum_pos+':D'+(row-1)+')');
			    				workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
			    				workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
			    				workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
			    				workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');

			    				var r = workbook.sheet(0).range('D'+sum_pos+':H'+row);
			    				r.style({'numberFormat': '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)'});

			    				var r = workbook.sheet(0).range('A'+sum_pos+':L'+row);
			    				r.style({'leftBorder': true, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

			    				if(!data.xlsx){
									r.style('verticalAlignment', 'center');
			    					var r = workbook.sheet(0).range('C'+sum_pos+':C'+row);
									r.style({'wrapText':true, 'verticalAlignment': 'center'});
			    					var r = workbook.sheet(0).range('K'+sum_pos+':K'+row);
									r.style({'wrapText':true, 'verticalAlignment': 'center'});
			    				}

						        return workbook.toFileAsync('./template/output/riwayat/pok/'+file_name+'.xlsx');
						    }).then(dataa => {
						    	msopdf(null, function(error, office) {
									var input = './template/output/riwayat/pok/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
									var output = './template/output/riwayat/pok/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

							    	if(data.xlsx){
							    		cb('/download/pok/'+file_name+'.xlsx')
							    	} else {
										office.excel({'input': input, 'output': output}, function(error, pdf) {
									    	if (err) {
										        console.error(err);
										    }
										    //hapus xlsx setelah terconvert
									    	fs.unlink(input);

										})

										office.close(null, function(error) {
											cb('/download/pok/'+file_name+'.pdf') 							
										})
							    	}
									
								})
					        })
						}
		    		}			    		
	    		} else {
	    			var y = thang || new Date().getFullYear();
		    		var m = data.month || new Date().getMonth();
		    		var lower_ts = data.lower_ts || Math.round(new Date(y, m, 1).getTime()/1000)
		    		var upper_ts = data.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
		    		var rows = [];
	    			_.each(detail.realisasi, function(item, index, list){
	    				if(item.tgl_timestamp >= lower_ts && item.tgl_timestamp <= upper_ts){
	    					if(data.xlsx || data.pdf){
									rows.push({tgl: item.tgl, penerima_nama: item.penerima_nama, jumlah: item.jumlah, pph21: item.pph21, pph22: item.pph22, 
	    								pph23: item.pph23, ppn: item.ppn, spm_no: item.spm_no, bukti_no: item.bukti_no, ket: item.ket, pengentry: item.pengentry})
	    					}else {
	    						client.emit('riwayat_tbl_add', [item._id, '', '', item.tgl, item.penerima_nama, item.jumlah, item.pph21, item.pph22, 
    							item.pph23, item.ppn, item.spm_no, item.bukti_no, item.ket, item.pengentry, '<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button>']);
	    					}
	    				}
    				});
    				if(data.xlsx || data.pdf){
						if(rows.length == 0){
							cb('');
							return;
						}
						var current_timestamp = Math.round(new Date().getTime()/1000);

						var file_name = current_timestamp+' Riwayat Rincian '+data.detail.replace(/\-\s*/g, '');
						// Load an existing workbook
						XlsxPopulate.fromFileAsync("./template/RiwayatTemplatePOK.xlsx")
					    .then(workbook => {
					    	workbook.definedName("title").value('Riwayat '+data.detail.replace(/\-\s*/g, '')+' ('+(data.periode.match(/\d/)?data.periode:data.periode+' '+client.handshake.session.tahun_anggaran)+')');
					    	var d = new Date();
							var date = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+', '+d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
							workbook.definedName("time").value('Generated by simamov at '+date);

					    	var row = 5;
					    	var nmr = 1;
					    	var sum_pos = 5;
					    	_.each(rows, function(item, index, list){
					    		var r = workbook.sheet(0).range('A'+row+':L'+row);
					    		r.value([[
					    			nmr++, 
					    			item.tgl, 
					    			item.penerima_nama, 
					    			item.jumlah, 
					    			item.pph21 || 0, 
					    			item.pph22 || 0, 
					    			item.pph23 || 0,
					    			item.ppn || 0,
					    			item.spm_no || '-',
					    			item.bukti_no || '-',
					    			item.ket || '-',
					    			item.pengentry
					    		]]);
					    		row++;
					    	});
					    	var jumlahcells = workbook.sheet(0).range('A'+row+':C'+row);
		    				jumlahcells.merged(true).style('horizontalAlignment', 'center');
		    				workbook.sheet(0).cell("A"+row).value('Jumlah');
		    				workbook.sheet(0).cell('D'+row).formula('SUM(D'+sum_pos+':D'+(row-1)+')');
		    				workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
		    				workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
		    				workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
		    				workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');

		    				var r = workbook.sheet(0).range('D'+sum_pos+':H'+row);
		    				r.style({'numberFormat': '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)'});

		    				var r = workbook.sheet(0).range('A'+sum_pos+':L'+row);
		    				r.style({'leftBorder': true, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

		    				if(!data.xlsx){
								r.style('verticalAlignment', 'center');
		    					var r = workbook.sheet(0).range('C'+sum_pos+':C'+row);
								r.style({'wrapText':true, 'verticalAlignment': 'center'});
		    					var r = workbook.sheet(0).range('K'+sum_pos+':K'+row);
								r.style({'wrapText':true, 'verticalAlignment': 'center'});
		    				}

					        return workbook.toFileAsync('./template/output/riwayat/pok/'+file_name+'.xlsx');
					    }).then(dataa => {
					    	msopdf(null, function(error, office) {
								var input = './template/output/riwayat/pok/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
								var output = './template/output/riwayat/pok/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

						    	if(data.xlsx){
						    		cb('/download/pok/'+file_name+'.xlsx')
						    	} else {
									office.excel({'input': input, 'output': output}, function(error, pdf) {
								    	if (err) {
									        console.error(err);
									    }
									    //hapus xlsx setelah terconvert
								    	fs.unlink(input);

									})

									office.close(null, function(error) {
										cb('/download/pok/'+file_name+'.pdf') 							
									})
						    	}
								
							})
				        })
					}
	    		}
	    	})
    	} else {
    		var y = client.handshake.session.tahun_anggaran || new Date().getFullYear();
    		var m = data.month || new Date().getMonth();
    		var lower_ts = data.lower_ts || Math.round(new Date(y, m, 1).getTime()/1000)
    		var upper_ts = data.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
    		DetailBelanja.find({'thang': thang, active: true, $or:[ {'realisasi.penerima_id': data.penerima_id}, 
    			{'realisasi.penerima_id': data.kode_dosen},{'realisasi.penerima_id': data.ce}]}, 'nmitem realisasi', function(err, details){
    			var rows = [];
    			_.each(details, function(detail, index, list){
    				_.each(detail.realisasi, function(realisasi, index, list){
    					if((realisasi.penerima_id == data.penerima_id || realisasi.penerima_id == data.kode_dosen|| realisasi.penerima_id == data.ce) && 
		    					(realisasi.tgl_timestamp >= lower_ts && realisasi.tgl_timestamp <= upper_ts)){
	    					if(data.xlsx || data.pdf){
	    						rows.push({tgl: realisasi.tgl, nmitem: detail.nmitem, jumlah:realisasi.jumlah, pph21:realisasi.pph21, pph22:realisasi.pph22, 
		    							pph23:realisasi.pph23, ppn:realisasi.ppn, spm_no:realisasi.spm_no, bukti_no:realisasi.bukti_no, ket:realisasi.ket, pengentry:realisasi.pengentry})
	    					} else {
			    				client.emit('riwayat_tbl_add', [realisasi._id, detail._id, '', realisasi.tgl, detail.nmitem, realisasi.jumlah, realisasi.pph21, realisasi.pph22, 
		    							realisasi.pph23, realisasi.ppn, realisasi.spm_no, realisasi.bukti_no, realisasi.ket, realisasi.pengentry, '<button type="button" class="del-riwayat-tbl"><i class="icon-close"></i></button> <button type="button" class="btn-ubah-penerima"><i class="icon-share-alt"></i></button>']);
    						}
    					}
    				})
				});
				if(data.xlsx || data.pdf){
					if(rows.length == 0){
						cb('');
						return;
					}
					var current_timestamp = Math.round(new Date().getTime()/1000);

					var file_name = current_timestamp+' Riwayat';
					// Load an existing workbook
					XlsxPopulate.fromFileAsync("./template/RiwayatTemplate.xlsx")
				    .then(workbook => {
				    	workbook.definedName("title").value('Riwayat Penerimaan '+data.nama_lengkap+' ('+(data.periode.match(/\d/)?data.periode:data.periode+' '+client.handshake.session.tahun_anggaran)+')');
				    	var d = new Date();
						var date = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()+', '+d.getDate()+'/'+(d.getMonth()+1)+'/'+d.getFullYear();
						workbook.definedName("time").value('Generated by simamov at '+date);

				    	var row = 5;
				    	var nmr = 1;
				    	var sum_pos = 5;
				    	_.each(rows, function(item, index, list){
				    		var r = workbook.sheet(0).range('A'+row+':L'+row);
				    		r.value([[
				    			nmr++, 
				    			item.tgl, 
				    			item.nmitem, 
				    			item.jumlah, 
				    			item.pph21 || 0, 
				    			item.pph22 || 0, 
				    			item.pph23 || 0,
				    			item.ppn || 0,
				    			item.spm_no || '-',
				    			item.bukti_no || '-',
				    			item.ket || '-',
				    			item.pengentry
				    		]]);
				    		row++;
				    	});
				    	var jumlahcells = workbook.sheet(0).range('A'+row+':C'+row);
	    				jumlahcells.merged(true).style('horizontalAlignment', 'center');
	    				workbook.sheet(0).cell("A"+row).value('Jumlah');
	    				workbook.sheet(0).cell('D'+row).formula('SUM(D'+sum_pos+':D'+(row-1)+')');
	    				workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
	    				workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
	    				workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
	    				workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');

	    				var r = workbook.sheet(0).range('D'+sum_pos+':H'+row);
	    				r.style({'numberFormat': '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)'});

	    				var r = workbook.sheet(0).range('A'+sum_pos+':L'+row);
	    				r.style({'leftBorder': true, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

	    				if(!data.xlsx){
							r.style('verticalAlignment', 'center');
	    					var r = workbook.sheet(0).range('C'+sum_pos+':C'+row);
							r.style({'wrapText':true, 'verticalAlignment': 'center'});
	    					var r = workbook.sheet(0).range('K'+sum_pos+':K'+row);
							r.style({'wrapText':true, 'verticalAlignment': 'center'});
	    				}

				        return workbook.toFileAsync('./template/output/riwayat/pegawai/'+file_name+'.xlsx');
				    }).then(dataa => {
				    	msopdf(null, function(error, office) {
							var input = './template/output/riwayat/pegawai/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
							var output = './template/output/riwayat/pegawai/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

					    	if(data.xlsx){
					    		cb('/download/pegawai/'+file_name+'.xlsx')
					    	} else {
								office.excel({'input': input, 'output': output}, function(error, pdf) {
							    	if (err) {
								        console.error(err);
								    }
								    //hapus xlsx setelah terconvert
							    	fs.unlink(input);

								})

								office.close(null, function(error) {
									cb('/download/pegawai/'+file_name+'.pdf') 							
								})
					    	}
							
						})
			        })
				}
				
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
    		var upper_ts = Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399;
    		if(!parent || !parent.realisasi.id(id.target_id)){
    			return;
    		}
    		if(parent.realisasi.id(id.target_id).tgl_timestamp >= lower_ts && parent.realisasi.id(id.target_id).tgl_timestamp <= upper_ts){
    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': id.parent_id, 
    				'realisasi': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'sum': false,
    					'total_sampai_bln_ini': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'broadcast': true, message: '1 item realisasi telah dihapus.'});
    		} else if(parent.realisasi.id(id.target_id).tgl_timestamp <= upper_ts) {
    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': id.parent_id,'realisasi': 0, 'sum': false,
    					'total_sampai_bln_ini': -Math.abs(parent.realisasi.id(id.target_id).jumlah), 'broadcast': true, message: '1 item realisasi telah dihapus.'});
    		}
    		//jika pindah
    		var to_moved = {};
    		var temp = parent.realisasi.id(id.target_id);
    		if(id.new_parent_id){
    			if(temp.tgl_timestamp) to_moved.tgl_timestamp = temp.tgl_timestamp
    			if(temp.penerima_id) to_moved.penerima_id = temp.penerima_id
    			if(temp.tgl) to_moved.tgl = temp.tgl
    			if(temp.penerima_nama) to_moved.penerima_nama = temp.penerima_nama
    			if(temp.jumlah) to_moved.jumlah = temp.jumlah
    			if(temp.pph21) to_moved.pph21 = temp.pph21;
    			if(temp.pph22) to_moved.pph22 = temp.pph22;
    			if(temp.pph23) to_moved.pph23 = temp.pph23;
    			if(temp.ppn) to_moved.ppn = temp.ppn;
    			if(temp.spm_no) to_moved.spm_no = temp.spm_no;
    			if(temp.bukti_no) to_moved.bukti_no = temp.bukti_no;
    			if(temp.ket) to_moved.ket = temp.ket;
    			if(temp.timestamp) to_moved.timestamp = temp.timestamp;
    			if(temp.pengentry) to_moved.pengentry = temp.pengentry;
    		}
    		parent.realisasi.id(id.target_id).remove();
    		parent.save();
    		cb('sukses');

    		if(id.new_parent_id){
    			 sendNotification(client, 'Berhasil dipindahkan.');
    			 DetailBelanja.findOne({'thang': thang, '_id': id.new_parent_id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': to_moved.jumlah, 'penerima_id': to_moved.penerima_id, 
				'tgl': to_moved.tgl}).exec(function(err, result){
					//jika blm pernah
					if(!result){
						DetailBelanja.update({'thang': thang, "_id": id.new_parent_id}, {$push: {"realisasi": to_moved}}, {new: true}, function(err, result){
				    		if (err) {
				    			console.log(err)
				    			errorHandler(client, 'Gagal menyimpan.')
				    			cb('gagal')
				    			return
				    		}
				    		cb('sukses');
			    			User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Pindah realisasi '+id.parent_id+' '+to_moved.penerima_nama+', Rp'+to_moved.jumlah+', Tgl '+to_moved.tgl+' ke '+id.new_parent_id}}}, 
			    				function(err, status){
							})
				    		//sebarkan
				    		total_sampai_bln_ini = 0;
				    		if(to_moved.tgl_timestamp >= lower_ts && to_moved.tgl_timestamp <= upper_ts){
				    			if(to_moved.tgl_timestamp <= upper_ts) total_sampai_bln_ini += to_moved.jumlah;
				    			io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': id.new_parent_id, 'realisasi': to_moved.jumlah, 
				    				'sum': false, 'total_sampai_bln_ini': total_sampai_bln_ini, 'broadcast': true});
				    		}
				    	})
					}
				})
    		}
			if(id.new_parent_id){
	    		User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Hapus riwayat '+id.parent_id+' > '+id.target_id}}}, 
					function(err, status){
				})
			}
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
    		User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Edit riwayat '+user_input.parent_id+' > '+user_input.target_id}}}, 
				function(err, status){
			})
    	})
    })

    client.on('realisasi_change_month', function (month){
    	var y = thang || new Date().getFullYear();
		getRealisasiSum(client, Math.round(new Date(y, month, 1).getTime()/1000), 
			Math.round(new Date(y, +month + 1, 0).getTime()/1000) + 86399);
    })

    client.on('transfer_realisasi', function (ids, cb){
    	DetailBelanja.findOne({_id: ids.detail_id}, 'realisasi', function(err, source){
    		if(err){
    			console.log(err);
    			return;
    		}
    		if(!source || !source.realisasi){
    			cb('sukses')
    			return;
    		}

    		DetailBelanja.findOne({_id: ids.target}, 'realisasi', function(err, target){
    			var new_realisasi = target.realisasi;
    			_.each(source.realisasi, function(realss, index, list){
    				new_realisasi.push(realss);
    			})
				DetailBelanja.update({_id: ids.target}, { $set: {'realisasi': new_realisasi} }, function(err, updated){
					if(err) console.log(err);
					cb('sukses')
				});

				User.update({_id: client.handshake.session.user_id}, {$push: {"act": {label: 'Transfer realisasi '+ids.detail_id+' ==> '+ids.target}}}, 
					function(err, status){
				})
    		})
    	})
    })

    client.on('lihat_akun_data', function (detail_id, cb){
    	DetailBelanja.findOne({_id: new ObjectId(detail_id)}, function(err, detail){
    		if(detail){
    			DetailBelanja.find({kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, 
	    			kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput, kdkmpnen: detail.kdkmpnen, 
	    			kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun}).sort('noitem').exec(function(err, details){
	    			cb(details);
	    		})
    		}
    	});
    })

    client.on('kembalikan_detail', function (detail_id, cb){
    	DetailBelanja.findOne({_id: new ObjectId(detail_id)}, function(err, detail){
    		if(detail){
    			detail.volkeg = detail.old[detail.old.length-1].volkeg;
    			detail.jumlah = detail.old[detail.old.length-1].jumlah;
    			detail.timestamp = Math.round(new Date().getTime()/1000);
    			detail.save(function(err){
    				cb(detail);
    			})
    		}
    	});
    })

    client.on('kembalikan_buatbaru_detail', function (detail_id, cb){
    	DetailBelanja.findOne({_id: new ObjectId(detail_id)}, function(err, detail){
    		if(detail){
    			var timestamp = Math.round(new Date().getTime()/1000);
    			var detail_belanja_var = ['noitem','nmitem','volkeg','satkeg','hargasat','jumlah'];
    			DetailBelanja.findOne({_id: new ObjectId(detail_id)}, function(err, detail){
		    		if(detail){
		    			DetailBelanja.find({kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, 
			    			kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput, kdkmpnen: detail.kdkmpnen, 
			    			kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun}).sort('noitem').exec(function(err, details){
			    				var new_detail = new DetailBelanja({'thang': detail.thang, 'timestamp': timestamp, pengentry: user_aktiv, kdprogram: detail.kdprogram,
    								kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput, kdkmpnen: detail.kdkmpnen,
    								kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun, nmitem: detail.nmitem, volkeg: detail.volkeg, satkeg: detail.satkeg,
    								hargasat: detail.hargasat, jumlah: detail.jumlah, noitem: details.length+1
    							});
    							//kembalikan nilai sblmnya
				    			for (var i = 0; i < detail_belanja_var.length; i++) {
				    				if(detail.old[detail.old.length-1][detail_belanja_var[i]]){
				    					detail[detail_belanja_var[i]] = detail.old[detail.old.length-1][detail_belanja_var[i]];
				    				}
				    			}
				    			detail.timestamp = timestamp;
				    			detail.save(function(err){
				    				new_detail.save(function(err){
				    					console.log(new_detail);
				    					cb({'prev_detail': detail, 'new_detail': new_detail});
				    				})
				    			})
			    		})
		    		}
		    	});
    		}
    	});
    })

    client.on('timpa_need_detail_list', function (detail_id, cb){
    	DetailBelanja.findOne({_id: new ObjectId(detail_id)}, function(err, detail){
    		if(detail){
    			DetailBelanja.find({kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, 
	    			kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput, kdkmpnen: detail.kdkmpnen, 
	    			kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun}).sort('noitem').exec(function(err, details){
	    			cb(details);
	    		})
    		}
    	});
    })

    client.on('timpa_detail', function (ids, cb){
    	DetailBelanja.findOne({_id: new ObjectId(ids.target_id)}, function(err, target){
    		if(target){
    			DetailBelanja.findOne({_id: new ObjectId(ids.source_id)}, function(err, source){
	    			var detail_belanja_var = ['nmitem','volkeg','satkeg','hargasat','jumlah'];
	    			var old = {};
	    			old.nmitem = target.nmitem;
	    			old.volkeg = target.volkeg;
	    			old.satkeg = target.satkeg;
	    			old.hargasat = target.hargasat;
	    			old.jumlah = target.jumlah;
	    			target.old.push(old);
	    			for (var i = 0; i < detail_belanja_var.length; i++) {
	    				if(source[detail_belanja_var[i]]){
	    					target[detail_belanja_var[i]] = source[detail_belanja_var[i]];
	    				}
	    			}
	    			target.save(function(err){
	    				cb(source);
	    				source.remove();
	    			})
	    		})
    		}
    	});
    })
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
		if(pok_setting) res.render('pok/pok', {layout: false, pok_name: pok_setting.toObject().name, admin: req.session.jenis, username: req.session.username, tahun_anggaran: req.session.tahun_anggaran});
			else res.render('pok/pok', {layout: false, pok_name: 'POK', admin: req.session.jenis, username: req.session.username, tahun_anggaran: req.session.tahun_anggaran});
	})
})

pok.get('/refine', function(req, res){
	res.send('ok');
	//ambil semua custom entity (type: Penerima)
	CustomEntity.find({type: 'Penerima', active: true}, function(err, items){
		_.each(items, function(item, idx, list){
			//cek apakah ada yg sama namanya
			CustomEntity.find({nama: item.nama, _id: {$ne: item._id}}, function(err, same_items){
				_.each(same_items, function(it, idx, list){
					console.log(item._id, '>', it._id);
				})
			})

		})
	})


	//jika ditemukan, maka ganti semua penerima_id realisasi dgn _id itu dgn _id yg pertama.

	//hapus yang sama itu








	//1. ambil semua detail yg ada realisasinya
	//2. cek kesesuain nama dgn database pegawai
	//3. jika >0.86 set id, jika id != id sebelumnya dan custom entity, maka hapus ce tsb
	//4. jika tdk, 
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
	var pok_name, file_path, ext, thang;

	async.waterfall([
			function(callback){
				form.parse(req, function(err, fields, file){
					if(err){
						errorHandler(req.session.user_id, 'Form parse Error. Mohon hubungi admin.');
						res.send('ok');
						return;
					}
					pok_name = fields.pok_name;
					thang = fields.thang;
					callback(null, 'File parsed')
				});

				form.on('fileBegin', function (name, file){
					file.path = __dirname+'/../uploaded/pok/'+file.name;
					file_path = file.path;
					ext = file.path.match(/[^.]\w*$/)[0];
				})
			} 
		], function(err, final){
			if(ext == 'xlsx' || ext == 'xls'){
				var pok = new XlsxPOK(file_path, pok_name || 'POK', req.session.username || 'admin', thang || req.session.tahun_anggaran || new Date().getFullYear(), req.session.user_id || 'dummy user');
			}else if(ext.match(/^s/)) {
				var pok = new POK(file_path, pok_name || 'POK', req.session.username || 'admin', req.session.user_id || 'ahsbdjasdbasjd');
			}
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
			ws.cell(row_pos,2).string('- '+item.nmitem.replace(/^\s+|\-/g,'')).style(normal11);
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

function proses_xml(xml_stream, roots_var, var_array, current_timestamp, Model, username, cb, user_id){
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
					if(err) errorHandler(user_id, 'Parse xml error. Mohon hubungi admin.');
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
								item[ var_array[ i ] ] = value[ var_array[ i ] ][ 0 ].replace(/^\s+|\s+$/g,'')
							}
						}

						item.pengentry = username;

						item.isExist(function(err, result) {
							if(err) errorHandler(user_id, 'Item isExist error. Mohon hubungi admin.');
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
										if(err) errorHandler(user_id, result[ '_id' ]+' update error. Mohon hubungi admin.');
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
									if(err) errorHandler(user_id, item[ '_id' ]+' insert error. Mohon hubungi admin.');
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
		    		if(err) errorHandler(user_id, 'Async parallel error. Mohon hubungi admin.');
		    		return;
		    	}
		    	
		    	callback(err, 'Semua item telah disimpan');
		    });

		}]
	}, function(err, result){
		if(err) errorHandler(user_id, 'Async auto error. Mohon hubungi admin.');
    	// Jika timestamp tidak terupdate ==> Telah dihapus
    	Model.update({'thang': thang[0], timestamp: {$ne: current_timestamp}}, {$set: {active: false}}, {"multi": true},function(err, status){
			if(err) errorHandler(user_id, 'Database update error. Mohon hubungi admin.');
		});
		if(cb) cb(thang[0]);
	})
}

function objToDB(Model, obj, var_array, cb, user_id, current_timestamp){
	var item = new Model(obj);
	item.isExist(function(err, result) {
		if(err) errorHandler(user_id, 'Item isExist error. Mohon hubungi admin.');
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
					if(err) errorHandler(user_id, result[ '_id' ]+' update error. Mohon hubungi admin.');
					if(item.nmitem){
						pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
							[result[ '_id' ], '<span class="badge badge-success">update</span>', item.kdprogram+'>'+item.kdgiat+'>'+item.kdoutput+'>'+item.kdsoutput+'>'+item.kdkmpnen+'>'+item.kdskmpnen+'>'+item.kdakun,
							(old.nmitem)?old.nmitem + '==>' + item.nmitem:item.nmitem, 
							(old.volkeg)?formatUang(old.volkeg) + '==>' + formatUang(item.volkeg):formatUang(item.volkeg), (old.satkeg)?old.satkeg + '==>' + item.satkeg:item.satkeg, 
							(old.hargasat)?formatUang(old.hargasat) + '==>' + formatUang(item.hargasat):formatUang(item.hargasat), (old.jumlah)?formatUang(old.jumlah) + '==>' + formatUang(item.jumlah):formatUang(item.jumlah),
							'<button type="button" class="kembalikan-buatbaru-detail" title="kembalikan detail dan buat baru"><i class="icon-action-undo"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
						);
					}
					if(cb) cb(null, '')
				});
			} else {
				// update timestamp terbaru
				Model.update({_id: new ObjectId(result[ '_id' ])}, { $set: {'timestamp': current_timestamp, 'active': true} }, function(err, updated){
					// item_added_callback(err, result[ '_id' ]+' tidak ditambah.');
					if(cb) cb(null, '')
				});
			}
		} else {
			item.timestamp = current_timestamp;
			item.save(function(err, item){
				if(err) errorHandler(user_id, item[ '_id' ]+' insert error. Mohon hubungi admin.');
				if(cb) cb(null, '')
			})
		}
	})
}

function XlsxPOK(file_path, pok_name, username, thang, user_id){
	const data = xlsx.parse(file_path);
	//validasi
	var is_valid = false;
	_.each(data[0].data, function(item, index, list){
		//kode (kolom 0 di excel)
		var c0 = item[0];
		if(!item[0]){
			c0 = '';
		} else{
			c0 = item[0].toString().replace(/^\s+|\s+$/g,'');
		}

		if(c0.match(/^\d{3}\.\d{2}\.\d{2}$/)){ //program
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0.match(/^\d{4}$/)){ //kegiatan
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0.match(/^\d{4}\.\d{3}$/)){ //output
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0.match(/^\d{3}$/)){ //komponen
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0.match(/^\w{1}$/)){ //sub komponen
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0.match(/^\d{6}$/)){ //akun
			if(!item[1]){
				is_valid = true;
				return;
			}
		}else if(c0 == ''){ //detail
			if(!item[1] || item[2] === '' || !item[3] || item[4] === '' || item[5] === ''){
				console.log('boom')
				is_valid = true;
				return;
			}
		}
	})

	if(is_valid){
		pok.connections[user_id].emit('pok_unduh_gagal_xlsx');
		return;
	}

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

	//timestamp utk wkt penyimpanan
	var current_timestamp = Math.round(new Date().getTime()/1000);
	//nomor utk detail
	var current_kdprogram = '';
	var current_kdgiat = '';
	var current_kdoutput = '';
	var current_kdsoutput = '001';
	var current_kdkmpnen = '';
	var current_kdskmpnen = '';
	var current_kdakun = '';

	var detail = 1;

	var program_var = ['kdprogram', 'uraian'];
	var kegiatan_var = ['kdprogram','kdgiat', 'uraian'];
	var output_var = ['thang', 'kdprogram','kdgiat','kdoutput', 'vol', 'satkeg', 'uraian'];
	var sub_output_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput', 'ursoutput'];
	var komponen_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen', 'urkmpnen'];
	var sub_komponen_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','urskmpnen'];
	var akun_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','kdakun', 'uraian'];
	var detail_belanja_var = ['thang', 'kdprogram','kdgiat','kdoutput','kdsoutput','kdkmpnen','kdskmpnen','kdakun','noitem','nmitem','volkeg','satkeg','hargasat','jumlah'];

	var tasks = [];
	//untuk matched nmitem (detail);
	var details_list = [];

	_.each(data[0].data, function(item, index, list){
		//kode (kolom 0 di excel)
		var c0 = item[0];
		if(!item[0]){
			c0 = '';
		} else{
			c0 = item[0].toString().replace(/^\s+|\s+$/g,'');
		}

		if(c0.match(/^\d{3}\.\d{2}\.\d{2}$/)){ //program
			tasks.push(
				function(cb){
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					//1. set atribut utk current item
					new_item.kdprogram = c0.match(/\d{2}$/)[0]; //01,02
					new_item.uraian = item[1].replace(/^\s+|\s+$/g,'');


					//2. save state utk item-item level di bawah
					current_kdprogram = new_item.kdprogram;

					//3. simpan ke db
					objToDB(Program, new_item, program_var, cb, user_id, current_timestamp);
				}
			)
		}else if(c0.match(/^\d{4}$/)){ //kegiatan
			tasks.push(
				function(cb){
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = c0; //2888
					new_item.uraian = item[1].replace(/^\s+|\s+$/g,'');

					current_kdgiat = new_item.kdgiat;

					objToDB(Kegiatan, new_item, kegiatan_var, cb, user_id, current_timestamp);
				}
			)
		}else if(c0.match(/^\d{4}\.\d{3}$/)){ //output
			tasks.push(
				function(cb){
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = c0.match(/\d{3}$/)[0];
					new_item.uraian = item[1].replace(/^\s+|\s+$/g,'');
					new_item.vol = item[2];
					new_item.satkeg = item[3].replace(/^\s+|\s+$/g,'')

					current_kdoutput = new_item.kdoutput;;

					objToDB(Output, new_item, output_var, cb, user_id, current_timestamp);
				}
			)
			tasks.push(
				function(cb){
					//4. create sub output dgn kode 001 (soalnya wajib punya sub output tapi di pok terturlis tanpa sub output)
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = current_kdoutput;
					new_item.kdsoutput = '001';
					new_item.ursoutput = 'tanpa sub output';

					current_kdsoutput = new_item.kdsoutput;

					objToDB(SubOutput, new_item, sub_output_var, cb, user_id, current_timestamp);
				}
			)
		}else if(c0.match(/^\d{3}$/)){ //komponen
			tasks.push(
				function(cb){
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = current_kdoutput;
					new_item.kdsoutput = current_kdsoutput;
					new_item.kdkmpnen = c0;
					new_item.urkmpnen = item[1].replace(/^\s+|\s+$/g,'');

					current_kdkmpnen = new_item.kdkmpnen;

					objToDB(Komponen, new_item, komponen_var, cb, user_id, current_timestamp);
				}
			)
			tasks.push(
				function(cb){
					//utk sub komponen
					//init new item
					var new_item = {};
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = current_kdoutput;
					new_item.kdsoutput = current_kdsoutput;
					new_item.kdkmpnen = current_kdkmpnen;
					new_item.kdskmpnen = 'A';
					new_item.urskmpnen = 'tanpa sub Komponen';

					current_kdskmpnen = new_item.kdskmpnen;

					objToDB(SubKomponen, new_item, sub_komponen_var, cb, user_id, current_timestamp);
				}
			)
		}else if(c0.match(/^\w{1}$/)){ //sub komponen
			tasks.push(
				function(cb){
					if(c0 == 'A'){
						//init new item
						var new_item = {};
						new_item.timestamp = current_timestamp;
						//tahun anggaran
						new_item.thang = thang;

						new_item.kdprogram = current_kdprogram;
						new_item.kdgiat = current_kdgiat;
						new_item.kdoutput = current_kdoutput;
						new_item.kdsoutput = current_kdsoutput;
						new_item.kdkmpnen = current_kdkmpnen;
						new_item.kdskmpnen = c0; //A, B, C

						current_kdskmpnen = new_item.kdskmpnen;

						SubKomponen.update(new_item, {$set: {urskmpnen: item[1].replace(/^\s+|\s+$/g,'')}}, function(err, res){
							cb(null, '')
						})
					} else {
						//init new item
						var new_item = {};
						//tahun anggaran
						new_item.thang = thang;

						new_item.kdprogram = current_kdprogram;
						new_item.kdgiat = current_kdgiat;
						new_item.kdoutput = current_kdoutput;
						new_item.kdsoutput = current_kdsoutput;
						new_item.kdkmpnen = current_kdkmpnen;
						new_item.kdskmpnen = c0; //A, B, C
						new_item.urskmpnen = item[1].replace(/^\s+|\s+$/g,'');

						current_kdskmpnen = new_item.kdskmpnen;

						objToDB(SubKomponen, new_item, sub_komponen_var, cb, user_id, current_timestamp);
					}
				}
			)
		}else if(c0.match(/^\d{6}$/)){ //akun
			tasks.push(
				function(cb){
					//reset nomor detail (krn tiap item berurut)
					detail = 1;
					//init new item
					var new_item = {};
					new_item.timestamp = current_timestamp;
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = current_kdoutput;
					new_item.kdsoutput = current_kdsoutput;
					new_item.kdkmpnen = current_kdkmpnen;
					new_item.kdskmpnen = current_kdskmpnen || 'A';
					new_item.kdakun = c0;
					new_item.uraian = item[1].replace(/^\s+|\s+$/g,'');

					current_kdakun = new_item.kdakun;

					async.series([

						function(cb_akun){
							DetailBelanja.find({kdprogram: current_kdprogram, kdgiat: current_kdgiat, kdoutput: current_kdoutput, kdsoutput: current_kdsoutput, 
								kdkmpnen: current_kdkmpnen, kdskmpnen: new_item.kdskmpnen, kdakun: new_item.kdakun}, function(err, ds){
								if(ds){
									details_list = ds;
								} else {
									details_list = null;
								}
								cb_akun(null, '')
							})
						}

					], function(err, final){
						objToDB(Akun, new_item, akun_var, cb, user_id, current_timestamp);
					})
				}
			)
		}else if(c0 == ''){ //detail
			tasks.push(
				function(cb){
					//init new item
					var new_item = {};
					new_item.timestamp = current_timestamp;
					//tahun anggaran
					new_item.thang = thang;

					new_item.kdprogram = current_kdprogram;
					new_item.kdgiat = current_kdgiat;
					new_item.kdoutput = current_kdoutput;
					new_item.kdsoutput = current_kdsoutput;
					new_item.kdkmpnen = current_kdkmpnen;
					new_item.kdskmpnen = current_kdskmpnen;
					new_item.kdakun = current_kdakun;
					new_item.noitem = detail++;
					new_item.nmitem = item[1].replace(/^\s+|\s+$/g,'');
					new_item.volkeg = getNumber(item[2]);
					new_item.satkeg = item[3].replace(/^\s+|\s+$/g,'');
					new_item.hargasat = getNumber(item[4]);
					new_item.jumlah = getNumber(item[5]);//new_item.volkeg*new_item.hargasat;

					if(details_list.length == 0){//jika blm pernah ada detail yg diupload
						var new_detail = new DetailBelanja(new_item);
						new_detail.save(function(err, det){
							cb(null, '')
							pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
								[new_detail._id, '<span class="badge badge-primary">baru</span>', new_detail.kdprogram+'>'+new_detail.kdgiat+'>'+new_detail.kdoutput+'>'+new_detail.kdsoutput+'>'+new_detail.kdkmpnen+'>'+new_detail.kdskmpnen+'>'+new_detail.kdakun, new_detail.nmitem, 
								formatUang(new_detail.volkeg), new_detail.satkeg, formatUang(new_detail.hargasat), formatUang(new_detail.jumlah),
								'<button type="button" class="timpa-detail" title="timpa ke detail lain"><i class="icon-link"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
							);
						})
					}else { //jika sdh ada uploadan sebelumnya
						var matched = null;
						async.series([
							function(cb_d){
								matched = getMatchDetail(new_item.nmitem, details_list);
								cb_d(null, '')
							},
							function(cb_d){
								if(matched){
									//init old
									var old = {};
									//iterasi variabel yg bisa jadi old
									for (var i = 0; i < detail_belanja_var.length; i++) {
										//jika var terdefinisi
										if(matched[ detail_belanja_var[ i ] ]){
											//jika tdk sama dgn yg baru, var lama jadikan old
											if( matched[ detail_belanja_var[ i ] ] != new_item[ detail_belanja_var[ i ] ] ){
												//bakal push to old
												old[ detail_belanja_var[ i ] ] = matched[ detail_belanja_var[ i ] ];
												//bakal jadi active item
												new_item[ detail_belanja_var[ i ] ] = new_item[ detail_belanja_var[ i ] ]
											}
										}
									}
									if(!_.isEmpty(old)){
										//timestamp utk unique revisi
										old[ 'timestamp' ] = matched[ 'timestamp' ];
										//timestemp update terbaru
										new_item[ 'timestamp' ] = current_timestamp;
										//old yg lama ditransfer
										new_item['old'] = matched[ 'old' ];
										//penambahan old
										new_item['old'].push(old);
										new_item['active'] = true;
										DetailBelanja.update({_id: new ObjectId(matched[ '_id' ])}, { $set: new_item }, function(err, updated){
											if(err) errorHandler(user_id, matched[ '_id' ]+' update error. Mohon hubungi admin.');
											if(old.nmitem || old.volkeg || old.satkeg || old.hargasat || old.jumlah){
												pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
													[matched[ '_id' ], '<span class="badge badge-success">update</span>', new_item.kdprogram+'>'+new_item.kdgiat+'>'+new_item.kdoutput+'>'+new_item.kdsoutput+'>'+new_item.kdkmpnen+'>'+new_item.kdskmpnen+'>'+new_item.kdakun, 
													(old.nmitem)?old.nmitem + ' ==> ' + new_item.nmitem:new_item.nmitem, 
													(old.volkeg)?formatUang(old.volkeg) + ' ==> ' + formatUang(new_item.volkeg):formatUang(new_item.volkeg), (old.satkeg)?old.satkeg + ' ==> ' + new_item.satkeg:new_item.satkeg, 
													(old.hargasat)?formatUang(old.hargasat) + ' ==> ' + formatUang(new_item.hargasat):formatUang(new_item.hargasat), (old.jumlah)?formatUang(old.jumlah) + ' ==> ' + formatUang(new_item.jumlah):formatUang(new_item.jumlah),
													'<button type="button" class="kembalikan-buatbaru-detail" title="kembalikan detail dan buat baru"><i class="icon-action-undo"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
												);
											}
											cb_d(null, '')
										});
									} else {
										// update timestamp terbaru
										DetailBelanja.update({_id: new ObjectId(matched[ '_id' ])}, { $set: {'timestamp': current_timestamp, 'active': true} }, function(err, updated){
											cb_d(null, '')
										});
									}
								} else {
									var detail = new DetailBelanja(new_item);
									detail.save(function(err, det){
										cb_d(null, '')
										pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
											[detail._id, '<span class="badge badge-primary">baru</span>', detail.kdprogram+'>'+detail.kdgiat+'>'+detail.kdoutput+'>'+detail.kdsoutput+'>'+detail.kdkmpnen+'>'+detail.kdskmpnen+'>'+detail.kdakun, detail.nmitem, 
											formatUang(detail.volkeg), detail.satkeg, formatUang(detail.hargasat), formatUang(detail.jumlah),
											'<button type="button" class="timpa-detail" title="timpa ke detail lain"><i class="icon-link"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
										);
									})
								}
							}
						], function(err, final){
							cb(null, '')
						})
					}
				}
			)
		}
	})

	async.series(tasks, function(err, final){
		DetailBelanja.find({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, function(err, removed_details){
			var rows = [];
			_.each(removed_details, function(removed, index, list){
				if(removed.jumlah != 0){
					pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
						[removed._id, '<span class="badge badge-danger">dihapus</span>', removed.kdprogram+'>'+removed.kdgiat+'>'+removed.kdoutput+'>'+removed.kdsoutput+'>'+removed.kdkmpnen+'>'+removed.kdskmpnen+'>'+removed.kdakun, removed.nmitem, 
						formatUang(removed.volkeg) + ' ==> 0', removed.satkeg, formatUang(removed.hargasat), formatUang(removed.jumlah) + ' ==> 0',
						'<button type="button" class="kembalikan-detail" title="kembalikan detail"><i class="icon-action-undo"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
					);
					var old = {};
					old.timestamp = removed.timestamp
					old.volkeg = removed.volkeg
					old.jumlah = removed.jumlah
					removed.old.push(old);
					removed.timestamp = current_timestamp;
					removed.volkeg = 0;
					removed.jumlah = 0;
					removed.save();
				} else {
					pok.connections[user_id].emit('pok_unduh_finish_xlsx_add_change', 
						[removed._id, '<span class="badge badge-danger">dihapus</span>', removed.kdprogram+'>'+removed.kdgiat+'>'+removed.kdoutput+'>'+removed.kdsoutput+'>'+removed.kdkmpnen+'>'+removed.kdskmpnen+'>'+removed.kdakun, removed.nmitem, 
						formatUang(removed.volkeg) + ' ==> 0', removed.satkeg, formatUang(removed.hargasat), formatUang(removed.jumlah) + ' ==> 0',
						'<button type="button" class="kembalikan-detail" title="kembalikan detail"><i class="icon-action-undo"></i></button> <button type="button" class="lihat-akun" title="lihat semua detail dalam akun detail ini"><i class="icon-layers"></i></button>']
					);
				}
			})
			pok.connections[user_id].emit('pok_unduh_finish_xlsx');
		})
		Akun.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		SubKomponen.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		Komponen.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		SubOutput.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		Output.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		Kegiatan.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		Program.update({timestamp: {$ne: current_timestamp}, active: true, 'thang': thang}, {$set:{timestamp: current_timestamp}}, function(err, removed){});
		User.update({_id: user_id}, {$push: {"act": {label: 'Upload File Xlsx POK'}}}, 
			function(err, status){
		})
	})
}


function POK(file_path, pok_name, username, user_id){
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
	    		errorHandler(user_id, 'Archive list error. Mohon hubungi admin.');
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
											pok.connections[user_id].emit('pok_unduh_finish', {'progs': progs, 'kegs': kegs, 
												'akuns': _.sortBy(akuns, function(o) { return o; })});
										})
									})
								})
								sendNotification(user_id, "Item telah diunggah.");
								User.update({_id: user_id}, {$push: {"act": {label: 'Upload File POK'}}}, 
				    				function(err, status){
								})
						})
			    	}, user_id);

			    } else if(akun_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_akun_var, akun_var, current_timestamp, Akun, username, null, user_id);

			    } else if(sub_komponen_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_sub_komponen_var, sub_komponen_var, current_timestamp, SubKomponen, username, null, user_id);

			    } else if(komponen_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_komponen_var, komponen_var, current_timestamp, Komponen, username, null, user_id);

			    } else if(sub_output_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_sub_output_var, sub_output_var, current_timestamp, SubOutput, username, null, user_id);

			    } else if(output_prefix.test(name)){
			    	proses_xml(archive.stream(name), root_index_output_var, output_var, current_timestamp, Output, username, null, user_id);

			    }
			}
	    });

	}

	this.getDetailBelanja = function(){
		return detail_belanja;
	}
}

function getMatchEntity(name, entities){
	name = name.replace(/^\s*/g, '').replace(/^\w{2}\.?\s|^\w{2}\.\s?|\s?\,.*$|\s\w{1,3}\.\s?\w{1,4}\.?|\s\w{2}$/g, '');
	var p = [];
	_.each(entities, function(peg, index, list){
		peg.score = clj_fuzzy.metrics.jaro_winkler(capitalize(name).replace(/\.|\,|\'|\s/g, ''), capitalize(peg.nama).replace(/^\w{2}\.?\s|^\w{2}\.\s?|\s?\,.*$|\s\w{1,3}\.\s?\w{1,4}\.?|\s\w{2}$/g, '').replace(/\.|\,|\'|\s/g, ''));
		p.push(peg);
	})

	var matched = _.max(p, function(peg){ return peg.score; })

	return matched;
}

function getMatchDetail(nmitem, akundetails){
	var p = [];

	_.each(akundetails, function(detail, index, list){
		//jika belum prnah terpilih
		if(!detail.taken){
			detail.score = clj_fuzzy.metrics.jaro_winkler(capitalize(nmitem.replace(/\s|\-/g, '')), capitalize(detail.nmitem.replace(/\s|\-/g, '')));
			p.push(detail);
		}
	})

	var matched = _.max(p, function(detail){ return detail.score; })

	if(matched.score >= 0.91){
		matched.taken = true;
		return matched;
	} else{
		return null;
	}
}

function errorHandler(user_id, message){
	if(_.isString(user_id)) pok.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

function sendNotification(user_id, message){
	if(_.isString(user_id)) pok.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

function formatUang(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function capitalize(s){
    return s.toLowerCase().replace( /.*/g, function(a){ return a.toUpperCase(); } );
};

function getNumber(obj){
    if(!obj || obj == '-' || obj == '') return 0;
    if (typeof obj === 'string' || obj instanceof String) return +obj.replace(/\D/g, '');
    return +obj;
}

module.exports = pok;