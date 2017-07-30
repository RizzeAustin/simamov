var express = require('express');
var spj = express.Router();

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');

//modul formidable utk parse POST file
var formidable = require('formidable');

var csv = require('csvtojson')

// Require library 
var xl = require('excel4node');

const XlsxPopulate = require('xlsx-populate');

//Xlsx to Pdf
var msopdf = require('node-msoffice-pdf');

var Pegawai = require(__dirname+"/../model/Pegawai.model");

var DetailBelanja = require(__dirname+"/../model/DetailBelanja.model");
var CustomEntity = require(__dirname+"/../model/CustomEntity.model");
var SettingSPPD = require(__dirname+"/../model/SettingSPPD.model");
var Setting = require(__dirname+"/../model/Setting.model");

var User = require(__dirname+"/../model/User.model");

//Short syntax tool
var _ = require("underscore");

//modul sql utk koneksi db mysql sipadu
var mysql = require('mysql');
var sipadu_db = mysql.createConnection({
	host: '127.0.0.1',
	user: 'root',
	password: '',
	database: 'sipadu_db'
});

sipadu_db.connect();

//Socket.io
spj.connections;

spj.io;

spj.socket = function(io, connections, client){

	spj.connections = connections;

	spj.io = io;

	
	client.on('set_honor_detail', function (data, cb) {
		Setting.update({type: 'spj'}, {$set: {'honor_detail_id': data.honor_detail_id}}, {upsert: true}, function(err, result){
			if(err) cb('error')
				else cb('sukses')
		})
	})
	client.on('set_transport_detail', function (data, cb) {
		Setting.update({type: 'spj'}, {$set: {'transport_detail_id': data.transport_detail_id}}, {upsert: true}, function(err, result){
			if(err) cb('error')
				else cb('sukses')
		})
	})
    client.on('spj_pulihkan_template', function (jenis, cb){
    	var path = __dirname+'/../template/';
		if(jenis == 'honor'){
			fs.createReadStream(path + 'cadangan/HonorTemplate.xlsx').pipe(fs.createWriteStream(path + 'HonorTemplate.xlsx'));
			cb('sukses');
		} else if(jenis == 'transport'){
			fs.createReadStream(path + 'cadangan/TransportTemplate.xlsx').pipe(fs.createWriteStream(path + 'TransportTemplate.xlsx'));
			cb('sukses');
		}
    })

}

spj.get('/honor', function(req, res){
	Setting.findOne({type: 'spj'}).exec(function(err, result){
		if(result){
			res.render('spj/honor', {layout: false, admin: req.session.jenis, honor_detail_id: result.get('honor_detail_id')});
		} else {
			res.render('spj/honor', {layout: false, admin: req.session.jenis});
		}
	})
});

spj.post('/honor', function(req, res){
	var form = new formidable.IncomingForm();
	var csv_name, file_path, tgl_buat_surat, xlsx, pdf, honor_detail_id, thang, tgl_buat_honor, data = [];
	var setting = {};

	var current_timestamp = Math.round(new Date().getTime()/1000);

	var file_name = current_timestamp+' Honor';

	var periode = '';
	var total_terima = 0;

	async.series([
			function(cb){
				form.parse(req, function(err, fields, file){
					if(err){
						errorHandler(req.session.user_id, 'Form parse Error. Mohon hubungi admin.');
						return;
					}
					tgl_buat_surat = fields.tgl_buat_surat;
					xlsx = fields.xlsx_file;
					pdf = fields.pdf_file;
					csv_name = fields.csv_name;
					honor_detail_id = fields.honor_detail_id;
					cb(null, 'File parsed')
				});

				form.on('fileBegin', function (name, file){
					file.path = __dirname+'/../uploaded/csv/'+file.name;
					file_path = file.path;
				})
			},
			function(cb){
				Setting.findOne({'honor_detail_id': honor_detail_id, type: 'spj'}).exec(function(err, result){
					if(!result){
						Setting.create({'honor_detail_id': honor_detail_id, type: 'spj'},function(err, result){
							cb(null, '');
						})
					} else {
						cb(null, '');
					}
				})
			},
			function(cb){
				function pushObj(item){
					item.jml_sks = +item.jml_sks;
					item.rate = +item.rate;
					item.bruto = +item.bruto;
					item.pph = +item.pph;
					item.diterima = +item.diterima;
					data.push(item);
					total_terima += item.bruto;
				}

				csv({
					headers: ['unit', 'nmr', 'nama', 'gol', 'jml_sks', 'rate', 'bruto', 'pph', 'diterima']
				})
				.fromFile(file_path)
				.on('json',(item)=>{
					+item.diterima > 0 && pushObj(item);
					if(/^Periode/.test(item.unit)) periode = item.unit;
				})
				.on('done',(error)=>{
					var period_elem = periode.match(/(\d{1,2})\s(\w*)\s(\d{4}).*\,\s(\d{1,2})/);
					thang = period_elem[3];
					tgl_buat_honor = period_elem[4] +' '+ period_elem[2] +' '+ period_elem[3];
					periode = period_elem[1] +' - '+ period_elem[4] +' '+ period_elem[2].toUpperCase() +' '+ period_elem[3];
				    cb(null, 'end')
				})
			},
			function(cb){
				SettingSPPD.findOne({}, 'ppk bendahara').populate('ppk bendahara').exec(function(err, result){
					if(!result || !result.ppk || !result.bendahara){
						cb('Pengaturan PPK/Bendahara belum ada. Harap tentukan di pengaturan SPPD.', null);
						return;
					}
					setting = result;
					cb(null, '');
				})
			},
		], function(err, final){
			if(err){
				sendNotification(req.session.user_id, err);
				res.sendStatus(404)
				return;
			}
			// Load an existing workbook
			XlsxPopulate.fromFileAsync("./template/HonorTemplate.xlsx")
		    .then(workbook => {
		    	var row = 11;
		    	var nmr = 1;
		    	var sum_pos = 11;
		    	_.each(data, function(item, index, list){
		    		var r = workbook.sheet(0).range('A'+row+':J'+row);
		    		if(row  == 32 || row == 61 || (row > 89 && (row % 29 == 3))){
		    			r.value([['',
			    			'Jumlah dipindahkan', 
			    			'', 
			    			'', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'',
			    			''
			    		]]);
			    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
			    		workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
			    		workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
		    			row++;
			    		r = workbook.sheet(0).range('A'+row+':J'+row);
		    			r.value([['',
			    			'Jumlah pindahan', 
			    			'', 
			    			'', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'',
			    			''
			    		]]);
			    		workbook.sheet(0).cell('F'+row).formula('F'+(row-1));
			    		workbook.sheet(0).cell('G'+row).formula('G'+(row-1));
			    		workbook.sheet(0).cell('H'+row).formula('H'+(row-1));
			    		sum_pos = row;
		    			row++;
		    			r = workbook.sheet(0).range('A'+row+':J'+row);
		    		}
		    		var value = [nmr,
		    			data[index]['nama'], 
		    			data[index]['gol'], 
		    			data[index]['jml_sks'], 
		    			data[index]['rate'], 
		    			data[index]['bruto'], 
		    			data[index]['pph'], 
		    			data[index]['diterima']
		    		];
		    		if(nmr % 2 == 0){
		    			value.push('')
		    			value.push('  '+nmr+'. …..')
		    		} else {
		    			value.push('  '+nmr+'. …..')
		    			value.push('')
		    		}
		    		r.value([value]);
		    		row++;
		    		nmr++;
		    	})
		    	var r = workbook.sheet(0).range('A'+row+':J'+row);
		    	r.value([['',
	    			'JUMLAH', 
	    			'', 
	    			'', 
	    			'', 
	    			'', 
	    			'', 
	    			'',
	    			'',
	    			''
	    		]]);
	    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
	    		workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
	    		workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
	    		workbook.sheet(0).cell('I'+row).value(terbilang(total_terima));
	    		var jumlahcells = workbook.sheet(0).range('B'+row+':E'+row);
	    		jumlahcells.merged(true).style('horizontalAlignment', 'center');
	    		r.style({'verticalAlignment': 'center', 'numberFormat': '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)', 'fontSize': 9});
	    		var terb = workbook.sheet(0).range('I'+row+':J'+row);
	    		terb.merged(true).style('wrapText', true);
	    		workbook.sheet(0).row(row).height(78);
	    		var active_rows = workbook.sheet(0).range('A11'+':H'+row);
	    		active_rows.style('border', true)
	    		var ttd_cols1 = workbook.sheet(0).range('I11'+':I'+(row));
	    		ttd_cols1.style({'leftBorder': true, 'rightBorder': false, 'bottomBorder': true, 'topBorder': true})
	    		var ttd_cols2 = workbook.sheet(0).range('J11'+':J'+(row));
	    		ttd_cols2.style({'leftBorder': false, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

		    	var r = workbook.sheet(0).range('B'+(row+2)+':H'+(row+8));
		    	r.value([
		    		['Lunas pada tanggal',,'Setuju dibayar',,,,'Jakarta, '+tgl_buat_surat],
		    		['Bendahara Pengeluaran STIS',,'Pejabat Pembuat Komitmen',,,,'Pembuat Daftar,'],
		    		[,,,,,,],
		    		[,,,,,,],
		    		[,,,,,,],
		    		['('+setting.bendahara.nama.capitalize()+')',,'('+setting.ppk.nama.capitalize()+')',,,,'(SOFYAN AYATULLOH, SST)'],
		    		['NIP. '+setting.bendahara._id.capitalize(),,'NIP. '+setting.ppk._id.capitalize(),,,,'NIP. 197208221994121001'],
		    		]);
		    	r.style('fontSize', 11)

		    	workbook.sheet(0).range('B'+(row+7)+':H'+(row+7)).style('underline', true);
		    	workbook.sheet(0).range('B'+(row+8)+':H'+(row+8)).style('underline', false);

		    	workbook.definedName("periode").value(periode);

		        return workbook.toFileAsync('./temp_file/'+file_name+'.xlsx');
		    }).then(dataa => {
		    	msopdf(null, function(error, office) {
					var input = './temp_file/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
					var output = './template/output/spj/honor/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

			    	if(xlsx){
			    		res.download(input);
			    		res.on('finish', function() {
							// hapus xlsx setelah didownload
							fs.unlink(input);
						});
			    	} else {
						office.excel({'input': input, 'output': output}, function(error, pdf) {
					    	if (err) {
						        console.error(err);
						    }
						    //hapus xlsx setelah terconvert
					    	fs.unlink(input);

						})

						office.close(null, function(error) {
							if(pdf){
								res.download(output);
								res.on('finish', function() {
									// hapus pdf setelah didownload
									fs.unlink(output);
								});
							}else{
								res.send(file_name+'.pdf');
							} 							
						})
			    	}
					
				})
				// var query = 'SELECT * ' +
							// 'FROM dosen ' +
							// 'WHERE nama = ?';
				var query = 'SELECT * ' +
							'FROM dosen ';
				sipadu_db.query(query, function (err, dosen_sipadu, fields) {//(query, item.penerima_nama, function (err, dosen, fields) {
					if (err){
					  	console.log(err)
					  	return;
					}

					_.each(data, function(item, i, list){
						var penerima_id;
			    		// simpan database
			    		//ambil id
			    		async.series([
			    			function(cb){
			    				Pegawai.findOne({nama: data[i]['nama']}, function(err, peg){
					    			// console.log(peg)
					    			//jika tdk ada d database pegawai
					    			if(!peg){
					    				CustomEntity.findOne({nama: data[i]['nama']}, function(err, cust){
					    					// console.log(cust)
							    			//jika tdk ada d database c e
							    			if(!cust){
												_.each(dosen_sipadu, function(dos, index, list){
													var nama_sipadu = dos.gelar_depan+((dos.gelar_depan?' ':''))+dos.nama+' '+dos.gelar_belakang;
													if(nama_sipadu.replace(/^\s+|\s+$/g,'') == data[i]['nama'].replace(/^\s+|\s+$/g,'')){
														penerima_id = dos.kode_dosen;
														cb(null, '')
													}
												})
												if(!penerima_id){
													CustomEntity.create({type:'Penerima', nama: data[i]['nama']}, function(err, ce){
														penerima_id = ce._id;
														cb(null, '');
													})
												}
							    			} else {
							    				penerima_id = cust._id;
					    						cb(null, '')
							    			}
							    		})
					    			} else {
					    				penerima_id = peg._id;
					    				cb(null, '')
					    			}
					    		})
			    			}

			    		], function(err, finish){
			    			// cek apakah sdh pernah tersimpan
				    		// console.log({'thang': thang, '_id': honor_detail_id, tgl_buat_honor: tgl_buat_honor})
					   		DetailBelanja.findOne({'thang': thang, '_id': honor_detail_id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': getNumber(data[i]['bruto']), 'penerima_nama': data[i]['nama'], 
								'tgl': tgl_buat_honor}).exec(function(err, result){
									//jika blm pernah
									if(!result){
										//init total, user
							    		var total_sampai_bln_ini = 0;
								    	var new_entry = {};
								    	new_entry.pengentry = req.session.username;
								    	new_entry.ket = 'SPJ Honor Dosen periode '+periode;
								    	new_entry.pph21 = data[i]['pph'];
								    	// new_entry.bukti_no = '';// data.bukti_no || '';
								    	// new_entry.spm_no = '';// data.spm_no || '';
								    	new_entry.penerima_nama = data[i]['nama'];
								    	new_entry.tgl = tgl_buat_honor;
								    	new_entry.tgl_timestamp = current_timestamp;
								    	new_entry.penerima_id = penerima_id;
								    	new_entry.jumlah = data[i]['bruto'];
								    	new_entry.timestamp = current_timestamp;
								    	// console.log(new_entry)
								    	// return;
								    	DetailBelanja.update({'thang': thang, "_id": honor_detail_id}, {$push: {"realisasi": new_entry}}, {new: true}, function(err, result){
								    		if (err) {
								    			console.log(err)
								    			return
								    		}
								    		// spj.io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': honor_detail_id, 'realisasi': data[i]['bruto'], 
								    		// 		'sum': false, 'total_sampai_bln_ini': 0, 'broadcast': true});
								    	})
									} else {
										sendNotification(req.session.user_id, 'Honor tsb untuk '+data[i]['nama']+' pernah tercatat di realisasi.')
									}
							})
								// console.log(i)
			    		})
					})
				});
				//riwayat user
				User.update({_id: req.session.user_id}, {$push: {"act": {label: 'Buat SPJ Honor Dosen periode '+periode}}}, 
					function(err, status){
				})
	        })





			// res.send('ok');
		}
	)
});

spj.get('/transport', function(req, res){
	Setting.findOne({type: 'spj'}).exec(function(err, result){
		if(result){
			res.render('spj/transport', {layout: false, admin: req.session.jenis, transport_detail_id: result.get('transport_detail_id')});
		} else {
			res.render('spj/transport', {layout: false, admin: req.session.jenis});
		}
	})
});

spj.post('/transport', function(req, res){
	var form = new formidable.IncomingForm();
	var csv_name, file_path, tgl_buat_surat, xlsx, pdf, transport_detail_id, thang, tgl_buat_honor, data = [];
	var setting = {};

	var current_timestamp = Math.round(new Date().getTime()/1000);

	var file_name = current_timestamp+' Transport';

	var periode = '';
	var total_terima = 0;

	async.series([
			function(cb){
				form.parse(req, function(err, fields, file){
					if(err){
						errorHandler(req.session.user_id, 'Form parse Error. Mohon hubungi admin.');
						return;
					}
					tgl_buat_surat = fields.tgl_buat_surat;
					xlsx = fields.xlsx_file;
					pdf = fields.pdf_file;
					csv_name = fields.csv_name;
					transport_detail_id = fields.transport_detail_id;
					cb(null, 'File parsed')
				});

				form.on('fileBegin', function (name, file){
					file.path = __dirname+'/../uploaded/csv/'+file.name;
					file_path = file.path;
				})
			},
			function(cb){
				Setting.findOne({'transport_detail_id': transport_detail_id, type: 'spj'}).exec(function(err, result){
					if(!result){
						Setting.create({'transport_detail_id': transport_detail_id, type: 'spj'},function(err, result){
							cb(null, '');
						})
					} else {
						cb(null, '');
					}
				})
			},
			function(cb){
				function pushObj(item){
					item.jumlah = +item.jumlah;
					data.push(item);
				}

				csv({
					headers: ['unit', 'nmr', 'nama', 'gol', 'jumlah']
				})
				.fromFile(file_path)
				.on('json',(item)=>{
					(+item.jumlah > 0 && item.unit != 'STIS') && pushObj(item);
					if(/^Periode/.test(item.unit)) periode = item.unit;
				})
				.on('done',(error)=>{
					var period_elem = periode.match(/(\d{1,2})\s(\w*)\s(\d{4}).*\,\s(\d{1,2})/);
					thang = period_elem[3];
					tgl_buat_honor = period_elem[4] +' '+ period_elem[2] +' '+ period_elem[3];
					periode = period_elem[1] +' - '+ period_elem[4] +' '+ period_elem[2].toUpperCase() +' '+ period_elem[3];
				    cb(null, 'end')
				})
			},
			function(cb){
				SettingSPPD.findOne({}, 'ppk bendahara').populate('ppk bendahara').exec(function(err, result){
					setting = result;
					cb(null, '');
				})
			},
		], function(err, final){
			// Load an existing workbook
			XlsxPopulate.fromFileAsync("./template/TransportTemplate.xlsx")
		    .then(workbook => {
		    	var row = 12;
		    	var nmr = 1;
		    	var sum_pos = 12;
		    	_.each(data, function(item, index, list){
		    		if(list.length > 43 && nmr == 42){
		    			var r = workbook.sheet(0).range('A'+row+':H'+row);
		    			r.value([['',
			    			'Jumlah dipindahkan', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'', 
			    			''
			    		]]);
			    		// workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
			    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
			    		workbook.sheet(0).cell('B'+row).style('horizontalAlignment', 'center');
			    		workbook.sheet(0).row(row).height(24);
			    		sum_pos = row;

		    			row += 14;

		    			r = workbook.sheet(0).range('A'+row+':H'+row);
		    			r.value([['',
			    			'Jumlah pindahan', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'', 
			    			''
			    		]]);
			    		// workbook.sheet(0).cell('E'+row).formula('E'+(row-1));
			    		workbook.sheet(0).cell('F'+row).formula('F'+(sum_pos));
			    		workbook.sheet(0).cell('B'+row).style('horizontalAlignment', 'center');
			    		sum_pos = row;
			    		workbook.sheet(0).row(row).height(24);
		    			row++;
		    			r = workbook.sheet(0).range('A'+row+':H'+row);

		    		}
		    		var r = workbook.sheet(0).range('A'+row+':H'+row);
		    		if(row  == 33 || row == 61 || (row > 89 && (row % 29 == 3))){
		    			r.value([['',
			    			'Jumlah dipindahkan', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'', 
			    			''
			    		]]);
			    		// workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
			    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
			    		workbook.sheet(0).cell('B'+row).style('horizontalAlignment', 'center');
			    		workbook.sheet(0).row(row).height(24);
		    			row++;
			    		r = workbook.sheet(0).range('A'+row+':H'+row);
		    			r.value([['',
			    			'Jumlah pindahan', 
			    			'', 
			    			'', 
			    			'', 
			    			'',
			    			'', 
			    			''
			    		]]);
			    		// workbook.sheet(0).cell('E'+row).formula('E'+(row-1));
			    		workbook.sheet(0).cell('F'+row).formula('F'+(row-1));
			    		workbook.sheet(0).cell('B'+row).style('horizontalAlignment', 'center');
			    		sum_pos = row;
			    		workbook.sheet(0).row(row).height(24);
		    			row++;
		    			r = workbook.sheet(0).range('A'+row+':H'+row);
		    		}
		    		var value = [nmr,
		    			data[index]['nama'], 
		    			data[index]['gol'], 
		    			data[index]['jumlah'], 
		    			150000,
		    			''
		    		];
			    	total_terima += (data[index]['jumlah'] * 150000);
		    		if(nmr % 2 == 0){
		    			value.push('')
		    			value.push('  '+nmr+'. …..')
		    		} else {
		    			value.push('  '+nmr+'. …..')
		    			value.push('')
		    		}
		    		r.value([value]);
		    		workbook.sheet(0).cell('F'+row).formula('D'+row+'*E'+row);
		    		workbook.sheet(0).cell('A'+row).style('horizontalAlignment', 'center')
		    		workbook.sheet(0).cell('C'+row).style('horizontalAlignment', 'center')
		    		workbook.sheet(0).cell('D'+row).style('horizontalAlignment', 'center')
			    	workbook.sheet(0).row(row).height(24);
		    		row++;
		    		nmr++;
		    	})
		    	var r = workbook.sheet(0).range('A'+row+':H'+row);
		    	r.value([['',
	    			'JUMLAH', 
	    			'', 
	    			'', 
	    			'', 
	    			'', 
	    			''
	    		]]);

	    		workbook.sheet(0).cell('D'+row).formula('SUM(D'+sum_pos+':D'+(row-1)+')').style('horizontalAlignment', 'center');
	    		// workbook.sheet(0).cell('E'+row).formula('SUM(E'+sum_pos+':E'+(row-1)+')');
	    		workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
	    		workbook.sheet(0).cell('G'+row).value(terbilang(total_terima));
	    		var jumlahcells = workbook.sheet(0).range('B'+row+':C'+row);
	    		jumlahcells.merged(true).style('horizontalAlignment', 'center');
	    		// r.style({'verticalAlignment': 'center', 'fontSize': 9});
	    		var terb = workbook.sheet(0).range('G'+row+':H'+row);
	    		terb.merged(true).style('wrapText', true);
	    		workbook.sheet(0).row(row).height(40.50);
	    		var active_rows = workbook.sheet(0).range('A12'+':H'+row);
	    		active_rows.style({'border': true, 'fontSize': 9, 'verticalAlignment': 'center'})
	    		var ttd_cols1 = workbook.sheet(0).range('G12'+':G'+(row));
	    		ttd_cols1.style({'leftBorder': true, 'rightBorder': false, 'bottomBorder': true, 'topBorder': true, 'fontSize': 9, 'verticalAlignment': 'center'})
	    		var ttd_cols2 = workbook.sheet(0).range('H12'+':H'+(row));
	    		ttd_cols2.style({'leftBorder': false, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true, 'fontSize': 9, 'verticalAlignment': 'center'})


	    		var format_uang = workbook.sheet(0).range('E12'+':F'+(row+1));
	    		format_uang.style('numberFormat', '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)')

		    	var r = workbook.sheet(0).range('B'+(row+2)+':F'+(row+8));
		    	r.value([
		    		['Lunas pada tanggal','Setuju dibayar',,,'Jakarta, '+tgl_buat_surat],
		    		['Bendahara Pengeluaran STIS','Pejabat Pembuat Komitmen',,,'Pembuat Daftar,'],
		    		[,,,,],
		    		[,,,,],
		    		[,,,,],
		    		['('+setting.bendahara.nama.capitalize()+')','('+setting.ppk.nama.capitalize()+')',,,'(SOFYAN AYATULLOH, SST)'],
		    		['NIP. '+setting.bendahara._id+'','NIP. '+setting.bendahara._id+'',,,'NIP. 197208221994121001'],
		    		]);
		    	r.style('fontSize', 11);

		    	workbook.sheet(0).range('C'+(row+2)+':E'+(row+2)).merged(true);
		    	workbook.sheet(0).range('C'+(row+3)+':E'+(row+3)).merged(true);
		    	workbook.sheet(0).range('C'+(row+7)+':E'+(row+7)).merged(true);
		    	workbook.sheet(0).range('C'+(row+8)+':E'+(row+8)).merged(true);

		    	workbook.sheet(0).range('F'+(row+2)+':H'+(row+2)).merged(true);
		    	workbook.sheet(0).range('F'+(row+3)+':H'+(row+3)).merged(true);
		    	workbook.sheet(0).range('F'+(row+7)+':H'+(row+7)).merged(true);
		    	workbook.sheet(0).range('F'+(row+8)+':H'+(row+8)).merged(true);

		    	workbook.sheet(0).range('C'+(row+2)+':C'+(row+8)).style('horizontalAlignment', 'center');
		    	workbook.sheet(0).range('F'+(row+2)+':F'+(row+8)).style('horizontalAlignment', 'center');

		    	workbook.sheet(0).range('B'+(row+7)+':F'+(row+7)).style('underline', true);

		    	if(data.length > 43){
	    			workbook.sheet(0).range('A56:H68').style({'leftBorder': false, 'rightBorder': false, 'bottomBorder': false, 'topBorder': false});
	    		}

		    	workbook.definedName("periode").value(periode)	        
		        return workbook.toFileAsync('./temp_file/'+file_name+'.xlsx');
		    }).then(dataa => {
		    	msopdf(null, function(error, office) {
					var input = './temp_file/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
					var output = './template/output/spj/transport/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

			    	if(xlsx){
			    		res.download(input);
			    		res.on('finish', function() {
							// hapus xlsx setelah didownload
							fs.unlink(input);
						});
			    	} else {
						office.excel({'input': input, 'output': output}, function(error, pdf) {
					    	if (err) {
						        console.error(err);
						    }
						    //hapus xlsx setelah terconvert
					    	fs.unlink(input);

						})

						office.close(null, function(error) {
							if(pdf){
								res.download(output);
								res.on('finish', function() {
									// hapus pdf setelah didownload
									fs.unlink(output);
								});
							}else{
								res.send(file_name+'.pdf');
							} 							
						})
			    	}
					
				})

				var query = 'SELECT * ' +
							'FROM dosen ';
				sipadu_db.query(query, function (err, dosen_sipadu, fields) {//(query, item.penerima_nama, function (err, dosen, fields) {
					if (err){
					  	console.log(err)
					  	return;
					}

					_.each(data, function(item, i, list){
						var penerima_id;
			    		// simpan database
			    		//ambil id
			    		async.series([
			    			function(cb){
			    				Pegawai.findOne({nama: data[i]['nama']}, function(err, peg){
					    			// console.log(peg)
					    			//jika tdk ada d database pegawai
					    			if(!peg){
					    				CustomEntity.findOne({nama: data[i]['nama']}, function(err, cust){
					    					// console.log(cust)
							    			//jika tdk ada d database c e
							    			if(!cust){
												_.each(dosen_sipadu, function(dos, index, list){
													var nama_sipadu = dos.gelar_depan+((dos.gelar_depan?' ':''))+dos.nama+' '+dos.gelar_belakang;
													if(nama_sipadu.replace(/^\s+|\s+$/g,'') == data[i]['nama'].replace(/^\s+|\s+$/g,'')){
														penerima_id = dos.kode_dosen;
														cb(null, '')
													}
												})
												if(!penerima_id){
													CustomEntity.create({type:'Penerima', nama: data[i]['nama']}, function(err, ce){
														penerima_id = ce._id;
														cb(null, '');
													})
												}
							    			} else {
							    				penerima_id = cust._id;
					    						cb(null, '')
							    			}
							    		})
					    			} else {
					    				penerima_id = peg._id;
					    				cb(null, '')
					    			}
					    		})
			    			}

			    		], function(err, finish){
			    			// cek apakah sdh pernah tersimpan
				    		// console.log({'thang': thang, '_id': honor_detail_id, tgl_buat_honor: tgl_buat_honor})
					   		DetailBelanja.findOne({'thang': thang, '_id': transport_detail_id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': getNumber(data[i]['jumlah'] * 150000), 'penerima_nama': data[i]['nama'], 
								'tgl': tgl_buat_honor}).exec(function(err, result){
									//jika blm pernah
									if(!result){
										//init total, user
							    		var total_sampai_bln_ini = 0;
								    	var new_entry = {};
								    	new_entry.pengentry = req.session.username;
								    	new_entry.ket = 'SPJ Transport Dosen periode '+periode;
								    	// new_entry.bukti_no = '';// data.bukti_no || '';
								    	// new_entry.spm_no = '';// data.spm_no || '';
								    	new_entry.penerima_nama = data[i]['nama'];
								    	new_entry.tgl = tgl_buat_honor;
								    	new_entry.tgl_timestamp = current_timestamp;
								    	new_entry.penerima_id = penerima_id;
								    	new_entry.jumlah = data[i]['jumlah'] * 150000;
								    	new_entry.timestamp = current_timestamp;
								    	DetailBelanja.update({'thang': thang, "_id": transport_detail_id}, {$push: {"realisasi": new_entry}}, {new: true}, function(err, result){
								    		if (err) {
								    			console.log(err)
								    			return
								    		}
								    		// spj.io.sockets.to(thang).emit('pok_entry_update_realisasi', {'parent_id': honor_detail_id, 'realisasi': data[i]['bruto'], 
								    		// 		'sum': false, 'total_sampai_bln_ini': 0, 'broadcast': true});
								    	})
									} else {
										sendNotification(req.session.user_id, 'Transport tsb untuk '+data[i]['nama']+' pernah tercatat di realisasi.')
									}
							})
			    		})
					})
				})
				//riwayat user
				User.update({_id: req.session.user_id}, {$push: {"act": {label: 'Buat SPJ Transport Dosen Non STIS periode '+periode}}}, 
					function(err, status){
				})
	        })
			// res.send('ok');
		}
	)
});

spj.get('/pengaturan', function(req, res){
	res.render('spj/pengaturan', {layout: false});
});

spj.post('/pengaturan/unggah_template/:type', function(req, res){
	var form = new formidable.IncomingForm();
	var file_path;

	async.waterfall([
			function(callback){
				form.parse(req, function(err, fields, file){
					if(err){
						errorHandler(req.session.user_id, 'Form parse Error. Mohon hubungi admin.');
						return;
					}
					callback(null, 'File parsed')
				});

				form.on('fileBegin', function (name, file){
					var type = req.params.type;
					file.path = __dirname+'/../template/';
					if(type == 'honor'){
						file.path += 'HonorTemplate.xlsx';
					} else if(type == 'transport'){
						file.path += 'TransportTemplate.xlsx';
					}
				})
			} 
		], function(err, final){
			res.send('sukses');
		}
	)
});

function terbilang(bilangan) {
  bilangan    = String(bilangan);
  var angka   = new Array('0','0','0','0','0','0','0','0','0','0','0','0','0','0','0','0');
  var kata    = new Array('','Satu','Dua','Tiga','Empat','Lima','Enam','Tujuh','Delapan','Sembilan');
  var tingkat = new Array('','Ribu','Juta','Milyar','Triliun');

  var panjang_bilangan = bilangan.length;

  /* pengujian panjang bilangan */
  if (panjang_bilangan > 15) {
    kaLimat = "Diluar Batas";
    return kaLimat;
  }

  /* mengambil angka-angka yang ada dalam bilangan, dimasukkan ke dalam array */
  for (i = 1; i <= panjang_bilangan; i++) {
    angka[i] = bilangan.substr(-(i),1);
  }

  i = 1;
  j = 0;
  kaLimat = "";


  /* mulai proses iterasi terhadap array angka */
  while (i <= panjang_bilangan) {

    subkaLimat = "";
    kata1 = "";
    kata2 = "";
    kata3 = "";

    /* untuk Ratusan */
    if (angka[i+2] != "0") {
      if (angka[i+2] == "1") {
        kata1 = "Seratus";
      } else {
        kata1 = kata[angka[i+2]] + " Ratus";
      }
    }

    /* untuk Puluhan atau Belasan */
    if (angka[i+1] != "0") {
      if (angka[i+1] == "1") {
        if (angka[i] == "0") {
          kata2 = "Sepuluh";
        } else if (angka[i] == "1") {
          kata2 = "Sebelas";
        } else {
          kata2 = kata[angka[i]] + " Belas";
        }
      } else {
        kata2 = kata[angka[i+1]] + " Puluh";
      }
    }

    /* untuk Satuan */
    if (angka[i] != "0") {
      if (angka[i+1] != "1") {
        kata3 = kata[angka[i]];
      }
    }

    /* pengujian angka apakah tidak nol semua, lalu ditambahkan tingkat */
    if ((angka[i] != "0") || (angka[i+1] != "0") || (angka[i+2] != "0")) {
      subkaLimat = kata1+" "+kata2+" "+kata3+" "+tingkat[j]+" ";
    }

    /* gabungkan variabe sub kaLimat (untuk Satu blok 3 angka) ke variabel kaLimat */
    kaLimat = subkaLimat + kaLimat;
    i = i + 3;
    j = j + 1;

  }

  /* mengganti Satu Ribu jadi Seribu jika diperlukan */
  if ((angka[5] == "0") && (angka[6] == "0")) {
    kaLimat = kaLimat.replace("Satu Ribu","Seribu");
  }
  kaLimat = kaLimat.replace(/\s+/g, " ") + "Rupiah";

  return kaLimat.replace(/^\s/g, "");
}

String.prototype.capitalize = function() {
    return this.replace(/\w/g, function(l){ return l.toUpperCase() })
};

function getNumber(obj){
    if(!obj || obj == '-' || obj == '') return 0;
    if (typeof obj === 'string' || obj instanceof String) return +obj.replace(/\D/g, '');
    return +obj;
}

function errorHandler(user_id, message){
	if(_.isString(user_id)) pok.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

function sendNotification(user_id, message){
	if(_.isString(user_id)) spj.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

module.exports = spj;