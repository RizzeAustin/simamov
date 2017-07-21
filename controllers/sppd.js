var express = require('express');
var sppd = express.Router();

//Flow control
var async = require('async');

//modul path utk concenate path
var path = require('path');

//modul fs utk rw file
var fs = require('fs');

//modul utk dynamic docx & convert to pdf
var Docxtemplater = require('docxtemplater');
var JSZip = require('jszip');

//PDF Merge
var PDFMerge = require('pdf-merge');
var pdftkPath = 'C:\\Program Files (x86)\\PDFtk Server\\bin\\pdftk.exe';

//Docx to Pdf
var msopdf = require('node-msoffice-pdf');

var Komponen = require(__dirname+"/../model/Komponen.model");

var Prov = require(__dirname+"/../model/Prov.model");
var Kab = require(__dirname+"/../model/Kab.model");
var Setting = require(__dirname+"/../model/Setting.model");
var SettingSPPD = require(__dirname+"/../model/SettingSPPD.model");
var SuratTugas = require(__dirname+"/../model/SuratTugas.model");
var SuratTugasBiasa = require(__dirname+"/../model/SuratTugasBiasa.model");
var Perhitungan = require(__dirname+"/../model/Perhitungan.model");

var CustomEntity = require(__dirname+"/../model/CustomEntity.model");

var _ = require("underscore");

var moment = require('moment');

var levenshtein = require('fast-levenshtein');

//Socket.io
sppd.connections;

sppd.io;

sppd.socket = function(io, connections){
	sppd.connections = connections;

	sppd.io = io;

	io.sockets.on('connection', function (client) {
		client.on('komponen_list', function (q, cb){
	    	Komponen.find({"urkmpnen": new RegExp(q, "i"), 'active': true}, 'kdoutput kdkmpnen urkmpnen', function(err, custs){
	    		_.each(custs, function(item, index, list){
	    			custs[index].d = levenshtein.get(q, item.urkmpnen);
	    		})
	    		custs = _.sortBy(custs, function(o) { return o.d; })
	    		cb(custs);
	    	})
	    })
		client.on('komponen_list_extra', function (q, cb){
	    	Komponen.find({"urkmpnen": new RegExp(q, "i"), 'active': true}, 'kdkmpnen urkmpnen', function(err, custs1){
	    		CustomEntity.find({"nama": new RegExp(q, "i"), 'type': 'komp'}, function(err, custs2){
		    		_.each(custs1, function(item, index, list){
		    			custs1[index].d = levenshtein.get(q, item.urkmpnen);
		    		})
		    		_.each(custs2, function(item, index, list){
		    			custs2[index].d = levenshtein.get(q.query, item.nama);
		    		})
		    		custs = _.sortBy(custs1.concat(custs2), function(o) { return o.d; })
		    		cb(custs);
		    	})
	    	})
	    })
		client.on('lokasi_list', function (q, cb){
	    	CustomEntity.find({"nama": new RegExp(q, "i"), 'type': 'lokasi'}, function(err, custs){
	    		_.each(custs, function(item, index, list){
	    			custs[index].d = levenshtein.get(q, item.nama);
	    		})
	    		custs = _.sortBy(custs, function(o) { return o.d; })
	    		cb(custs);
	    	})
	    })
		client.on('prov_list', function (q, cb){
			var where = {};
			if(!q.kab) where = {"nama": new RegExp(q.q, "i")};
			 else where = {"nama": new RegExp(q.q, "i"), _id: q.kab.match(/^\d{2}/)[0]};
	    	Prov.find(where, function(err, prov){
	    		_.each(prov, function(item, index, list){
	    			prov[index].d = levenshtein.get(q.q, item.nama);
	    		})
	    		prov = _.sortBy(prov, function(o) { return o.d; })
	    		cb(prov);
	    	})
	    })
		client.on('kab_list', function (q, cb){
			var where = {};
			if(!q.prov) where = {"nama": new RegExp(q.q, "i")};
			 else where = {"nama": new RegExp(q.q, "i"), "id_propinsi": q.prov};
	    	Kab.find(where, 'nama', function(err, kab){
	    		_.each(kab, function(item, index, list){
	    			kab[index].d = levenshtein.get(q.q, item.nama);
	    		})
	    		kab = _.sortBy(kab, function(o) { return o.d; })
	    		cb(kab);
	    	})
	    })
		client.on('kab_tiket_list', function (q, cb){
	    	Kab.find({"nama": new RegExp(q, "i"), 'tiket_jkt_b': { $exists: true, $ne: 0 },'tiket_jkt_e': { $exists: true, $ne: 0 }}, function(err, kab){
	    		_.each(kab, function(item, index, list){
	    			kab[index].d = levenshtein.get(q, item.nama);
	    		})
	    		kab = _.sortBy(kab, function(o) { return o.d; })
	    		cb(kab);
	    	})
	    })
		client.on('org_list', function (q, cb){
	    	CustomEntity.find({"nama": new RegExp(q, "i"), type: 'org'}, 'nama', function(err, kab){
	    		cb(kab);
	    	})
	    })
		client.on('add_ttd_st', function (new_ttd, cb){
	    	SettingSPPD.findOne({}, function(err, setting){
	    		if(!setting){
	    			var new_setting = new SettingSPPD({ttd_st: [new_ttd]});
	    			new_setting.save(function(err, res){
	    				cb('sukses');
	    			});
	    		} else {
	    			SettingSPPD.update({}, {$push: {"ttd_st": new_ttd}}, {new: true}, function(err, result){
	    				cb('sukses');
	    			})
	    		}
	    		
	    	})
	    })
		client.on('add_ttd_leg', function (new_ttd, cb){
	    	SettingSPPD.findOne({}, function(err, setting){
	    		if(!setting){
	    			var new_setting = new SettingSPPD({ttd_leg: [new_ttd]});
	    			new_setting.save(function(err, res){
	    				cb('sukses');
	    			});
	    		} else {
	    			SettingSPPD.update({}, {$push: {"ttd_leg": new_ttd}}, {new: true}, function(err, result){
	    				cb('sukses');
	    			})
	    		}
	    		
	    	})
	    })
		client.on('set_ppk', function (new_ppk, cb){
	    	SettingSPPD.findOne({}, function(err, setting){
	    		if(!setting){
	    			var new_setting = new SettingSPPD({ppk: new_ppk});
	    			new_setting.save(function(err, res){
	    				cb('sukses');
	    			});
	    		} else {
	    			SettingSPPD.update({}, {$set: {ppk: new_ppk}}, {new: true}, function(err, result){
	    				cb('sukses');
	    			})
	    		}
	    		
	    	})
	    })
		client.on('set_bend', function (new_bend, cb){
	    	SettingSPPD.findOne({}, function(err, setting){
	    		if(!setting){
	    			var new_setting = new SettingSPPD({bendahara: new_bend});
	    			new_setting.save(function(err, res){
	    				cb('sukses');
	    			});
	    		} else {
	    			SettingSPPD.update({}, {$set: {bendahara: new_bend}}, {new: true}, function(err, result){
	    				cb('sukses');
	    			})
	    		}
	    		
	    	})
	    })
		client.on('set_default_ttd_st', function (nip, cb){
	    	SettingSPPD.update({}, {ttd_st_default: nip}, function(err, status){
	    		cb('sukses');
	    	})
	    })
		client.on('set_default_ttd_leg', function (nip, cb){
	    	SettingSPPD.update({}, {ttd_leg_default: nip}, function(err, status){
	    		cb('sukses');
	    	})
	    })
		client.on('ttd_st_remove', function (nip, cb){
	    	SettingSPPD.update({}, {$pull: {ttd_st: nip}}, function(err, status){
	    		cb('sukses');
	    	})
	    })
		client.on('ttd_leg_remove', function (nip, cb){
	    	SettingSPPD.update({}, {$pull: {ttd_leg: nip}}, function(err, status){
	    		cb('sukses');
	    	})
	    })
		client.on('surat_tugas', function (data, cb){
			handleSuratTugas(data, cb, null);
	    })
		client.on('surat_tugas_biasa', function (data, cb){
			handleSuratTugasBiasa(data, cb, null);
	    })
		client.on('perhitungan', function (data, cb){
			handlePerhitungan(data, cb, null);
	    })
	    client.on('riwayat_surat_tugas', function (data, cb){
	    	var Model = {};
	    	if(data.type == 'surat_tugas'){
	    		Model = SuratTugas;
	    	} else {
	    		Model = SuratTugasBiasa;
	    	}
	    	var y = client.handshake.session.tahun_anggaran || new Date().getFullYear();
    		var m = data.month || new Date().getMonth();
    		var lower_ts = data.lower_ts || Math.round(new Date(y, m, 1).getTime()/1000)
    		var upper_ts = data.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()/1000) + 86399
    		Model.find({ "timestamp": {$gte : lower_ts, $lte : upper_ts}}).sort({'_id': -1}).populate('nama_lengkap').exec(function(err, surats){
    			cb(surats);
    		})
	    })
	    client.on('get_surat_tugas', function (data, cb){
	    	if(data.type == 'surat_tugas'){
	    		SuratTugas.findOne({ "_id": data.nomor}).populate('nama_lengkap prov kab org').exec(function(err, surat){
	    			cb(surat);
	    		})
	    	} else {
	    		SuratTugasBiasa.findOne({ "_id": data.nomor}).populate('nama_lengkap lokasi').exec(function(err, surat){
	    			cb(surat);
	    		})
	    	}
	    })
	    client.on('get_perhitungan', function (nomor, cb){
	    	Perhitungan.findOne({ "_id": nomor}).exec(function(err, perhit){
    			SuratTugas.findOne({ "_id": nomor}).populate('nama_lengkap prov kab org').exec(function(err, st){
    				var data = {};
    				data.st = st;
    				data.perhit = perhit;
	    			cb(data);
	    		})
    		})
	    })
	    client.on('last_nmr_surat', function (nomor, cb){
    		SettingSPPD.findOne({}, 'last_nmr_surat').exec(function(err, result){
				cb(result.last_nmr_surat);
			})
	    })
	    client.on('biaya2_list', function (data, cb){
    		Prov.find({}).exec(function(err, result){
				cb(result);
			})
	    })
	    client.on('prov_biaya2_edit', function (data, cb){
    		Prov.update({_id: data._id},{$set: data.data}, {upsert: true}).exec(function(err, result){
				cb('sukses');
			})
	    })
	    client.on('tiket_list', function (data, cb){
    		Kab.find({}).exec(function(err, result){
				cb(result);
			})
	    })
	    client.on('kab_tiket_edit', function (data, cb){
	    	console.log(data)
    		Kab.update({_id: data._id},{$set: data.data}, {upsert: true}).exec(function(err, result){
				cb('sukses');
			})
	    })
	})

};

sppd.get('/surat_tugas', function(req, res){
	SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk').exec(function(err, result){
		if(!result.last_nmr_surat){
			SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
				result.last_nmr_surat = 1;
				res.render('sppd/surat_tugas', {layout: false,  setting: result});
			})
		} else {
			res.render('sppd/surat_tugas', {layout: false,  setting: result});
		}		
	})
});

sppd.post('/surat_tugas', function(req, res){
	handleSuratTugas(req.body, null, res);
});

sppd.get('/surat_tugas_biasa', function(req, res){
	SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk').exec(function(err, result){
		if(!result.last_nmr_surat){
			SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
				result.last_nmr_surat = 1;
				res.render('sppd/surat_tugas_biasa', {layout: false,  setting: result});
			})
		} else {
			res.render('sppd/surat_tugas_biasa', {layout: false,  setting: result});
		}		
	})
});

sppd.post('/surat_tugas_biasa', function(req, res){
	handleSuratTugasBiasa(req.body, null, res);
});

sppd.get('/perhitungan', function(req, res){
	SuratTugas.findOne({}).sort({'_id': -1}).populate('nama_lengkap').exec( function(err, st) {
		Prov.findOne({_id: '31'}, function(err, prov){
			res.render('sppd/perhitungan', {layout: false, 'st': st, 'prov': prov});
		})
	});
});

sppd.post('/perhitungan', function(req, res){
	handlePerhitungan(req.body, null, res);
});

sppd.get('/perhitungan-old', function(req, res){
	res.render('sppd/perhitungan-old', {layout: false});
});

sppd.get('/pengaturan', function(req, res){
	SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk').exec(function(err, result){
		res.render('sppd/pengaturan', {layout: false, setting: result});
	})	
});

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function buatSurat(data, outputDocx, doc, cb){
	//#### docx generator
	//set data
	doc.setData(data);
	//render
	doc.render();
	var buf = doc.getZip()
	             .generate({type:"nodebuffer"});
	
	fs.writeFileSync(outputDocx,buf);
	cb(null, '');
}

function handleSuratTugas(data, cb, res){
	if(data.docx || data.pdf){
		data.nama_lengkap = JSON.parse(data.nama_lengkap_temp);
	}
	data.yang_bepergian = [];
	var current_timestamp = Math.round(new Date().getTime()/1000);
	var sppd_template = fs.readFileSync(__dirname+"/../template/surat_tugas.docx","binary");
	var last_nmr_surat = 1;
	var outputDocx = '';
	var sppd_setting = {};

	var zip = new JSZip(sppd_template);
	var doc = new Docxtemplater().loadZip(zip);
	
	if(!data.kab) delete data.kab;

	async.series([

		function(cb){
			if(!data.org_name){
				delete data.org
				cb(null, '');
			} else{
				if(!data.org){
					CustomEntity.create({ type: 'org', nama: data.org_name }, function (err, org) {
					  if (err) return handleError(err);
					  data.org = org._id;
					  cb(null, '')
					})
				} else {
					cb(null, '')
				}
			};
		},

		function(cb){
			SettingSPPD.findOne({}, 'ppk last_nmr_surat').populate('ppk').exec(function(err, result){
				// sppd_setting = result;
				data.ppk = result.ppk;
				last_nmr_surat = result.last_nmr_surat;
				cb(null, '');
			})
		},

		function(cb){

			var tasks = [];

			_.each(data.nama_lengkap, function(pegawai, index, list){
				tasks.push(function(cb){
					//nama lengkap
					data.nama_lengkap = pegawai._id;

					//nomor surat
					if(list.length == 1 && data.nomor.match(/^\d*/)[0] != last_nmr_surat){
						SuratTugas.update({_id: data.nomor.match(/^\d*/)[0]}, {$set: data}, function(err, status){
							data._id = data.nomor.match(/^\d*/)[0];
						})
					} else{
						data._id = last_nmr_surat;
					}
					//surtug instance
					var st = new SuratTugas(data);
					//simpan db
					st.save(function(err, result){
						st.populate('nama_lengkap ttd_legalitas ttd_surat_tugas prov kab org', function(err2){
							// console.log(data.nama_lengkap.length)
							console.log(st._id)
							if(list.length == 1){
								if(!st._id) st._id = data._id;
								outputDocx = __dirname+"/../template/output/sppd/"+current_timestamp+"_"+st._id+"-SPD-STIS-"
											+(st.tgl_berangkat.match(/\d{4}$/)[0])+"-"
											+st.nama_lengkap.nama+".docx";
							} else {
								if(index == 0) outputDocx = __dirname+"/../template/output/sppd/"+current_timestamp+"_Surat Tugas No. "+st._id;
									else if (index == list.length - 1) outputDocx += ' - '+st._id+'.docx';
							}
							function assignData(){
								data.yang_bepergian.push({nomor_surat: st.nomor_surat, nama: st.nama_lengkap.nama
									, _id: st.nama_lengkap._id, gol: st.nama_lengkap.gol, jabatan: st.nama_lengkap.jabatan})
								data.ttd_surat_tugas = st.ttd_surat_tugas;
								data.ttd_legalitas = st.ttd_legalitas;
								data.lokasi = st.lokasi;
								data.atas_nama_ketua_stis = st.atas_nama_ketua_stis;
								//end
								cb(null, '');
							}
							//update nomor surat
							if(list.length == 1 && data.nomor.match(/^\d*/)[0] != last_nmr_surat){
								assignData();
							} else {
								SettingSPPD.update({}, { $inc: { last_nmr_surat: 1 }}, function(err, status){
									last_nmr_surat ++;
									assignData();
								});
							}
						})
					})
				})
				
			})

			async.series(tasks, function(err, finish){
				buatSurat(data, outputDocx, doc, cb);
			})
		}], 
		function(err, finish){
			if(data.docx){
				res.download(outputDocx);
				res.on('finish', function() {
					fs.unlink(outputDocx);
				});
				return;
			} else{
				var outputPdf = outputDocx.replace(/docx$/, 'pdf');
				async.series([function(cb){
					convertToPDF(outputDocx, outputPdf, cb)
				}], function(err, finish){
					if(data.pdf){
						res.download(outputPdf);
						res.on('finish', function() {
							fs.unlink(outputPdf);
						});
					} else {
						cb({'last_nmr_surat': last_nmr_surat, 'outputPdf': "/result/"+outputPdf.match(/sppd\/.*/)[0]});
					}
				})
			}
	})
}

function handleSuratTugasBiasa(data, cb, res){
	if(data.docx || data.pdf){
		data.anggota = JSON.parse(data.anggota_temp);
		data.pelaksanaan = JSON.parse(data.pelaksanaan);
	}
	var current_timestamp = Math.round(new Date().getTime()/1000);
	var sppd_template = fs.readFileSync(__dirname+"/../template/surat_tugas_biasa.docx","binary");
	var last_nmr_surat = 1;
	var outputDocx = '';
	var sppd_setting = {};

	var zip = new JSZip(sppd_template);
	var doc = new Docxtemplater().loadZip(zip);

	async.series([

		function(cb){
			SettingSPPD.findOne({}, 'last_nmr_surat').exec(function(err, result){
				last_nmr_surat = result.last_nmr_surat;
				cb(null, '')
			})
		},
		
		function(cb){
			if(!data.lokasi){
				CustomEntity.create({ type: 'lokasi', nama: data.lokasi_label }, function (err, lok) {
				  if (err) return handleError(err);
				  data.lokasi = lok._id;
				  cb(null, '')
				})
			} else {
				cb(null, '')
			}
		},
		
		function(cb){
			var tasks = [];
			_.each(data.anggota, function(item, index, list){
				tasks.push(
					function(cb){
						if(!item._id){
		    				CustomEntity.create({ type: 'Penerima', nama: item.value }, function (err, angg) {
							  if (err) return handleError(err);
							  item._id = angg._id;
							  cb(null, '')
							})
		    			} else {
		    				cb(null, '');
		    			}
					}
				)
    		})

    		async.series(tasks, function(err, finish){
    			cb(null, '');
    		})
		},
		
		function(cb){
			if(data.nomor.match(/\d*$/)[0] != last_nmr_surat){
				SuratTugasBiasa.update({_id: data.nomor.match(/\d*$/)[0]}, {$set: data}, function(err, status){
					data._id = data.nomor.match(/\d*$/)[0];
					cb(null, '');
				})
			} else {
				data._id = last_nmr_surat;
				cb(null, '');
			}
		},

		function(cb){
			//surtug instance
			var st = new SuratTugasBiasa(data);

			//simpan db
			st.save(function(err, result){
				st.populate('nama_lengkap lokasi ttd_legalitas ttd_surat_tugas', function(err2){
					// console.log(data.nama_lengkap.length)
					outputDocx = __dirname+"/../template/output/sppd_biasa/"+current_timestamp+"_02722."+st._id+"-"
									+(st.tgl_berangkat.match(/\d{4}$/)[0])+"-"
									+st.nama_lengkap.nama+".docx";
					function assignData(){
						data.nama_lengkap = st.nama_lengkap.nama;
						data.jabatan = st.nama_lengkap.jabatan;
						data.ttd_surat_tugas = st.ttd_surat_tugas;
						data.ttd_legalitas = st.ttd_legalitas;
						data.lokasi = st.lokasi;
						data.waktu_pelaksanaan = st.waktu_pelaksanaan;
						data.atas_nama_ketua_stis = st.atas_nama_ketua_stis;
						data.page2 = data.anggota;
						if(data.anggota.length == 0){
							data.anggota.push({value: ''});
						}
						//end
						cb(null, '');
					}
					//update nomor surat
					if(data.nomor.match(/\d*$/)[0] != last_nmr_surat){
						assignData();
					} else {
						SettingSPPD.update({}, { $inc: { last_nmr_surat: 1 }}, function(err, status){
							last_nmr_surat++;
							assignData();
						});
					}
				})
			})
		},
		function(cb){
			buatSurat(data, outputDocx, doc, cb);
		}],
		function(err, finish){
			if(data.docx){
				res.download(outputDocx);
				res.on('finish', function() {
					fs.unlink(outputDocx);
				});
				return;
			} else{
				var outputPdf = outputDocx.replace(/docx$/, 'pdf');
				async.series([function(cb){
					convertToPDF(outputDocx, outputPdf, cb)
				}], function(err, finish){
					if(data.pdf){
						res.download(outputPdf);
						res.on('finish', function() {
							fs.unlink(outputPdf);
						});
					} else {
						cb({'last_nmr_surat': last_nmr_surat, 'outputPdf': "/result/"+outputPdf.match(/sppd_biasa\/.*/)[0]});
					}
				})
			}
		}
	);
}

function handlePerhitungan(data, cb, res){
	var current_timestamp = Math.round(new Date().getTime()/1000);
	var sppd_template = fs.readFileSync(__dirname+"/../template/sppd_perhitungan.docx","binary");
	var outputDocx = '';
	var sppd_setting = {};

	var zip = new JSZip(sppd_template);
	var doc = new Docxtemplater().loadZip(zip);

	async.series([

		function(cb){
			SettingSPPD.findOne({}).populate('ppk bendahara').exec(function(err, result){
				data.setting = result;
				cb(null, '')
			})
		},

		// function(cb){
		// 	Perhitungan.findOne({_id: data.nomor.match(/^\d*/)[0]}, function(err, perhit){
		// 		if(!perhit){
		// 			Perhitungan.update({_id: data.nomor.match(/^\d*/)[0]}, {$set: data}, function(err, status){
		// 				data._id = data.nomor.match(/\d*$/)[0];
		// 				cb(null, '');
		// 			})
		// 		}
		// 	})
		// },

		function(cb){
			//surtug instance
			data.surtug = data.nomor.match(/^\d*/)[0];
			var st = new Perhitungan(data);
			Perhitungan.findOne({_id: data.nomor.match(/^\d*/)[0]}, function(err, perhit){
				if(perhit){
					Perhitungan.update({_id: data.nomor.match(/^\d*/)[0]}, {$set: st}, function(err, status){
						console.log(status)
					})
				}
			})
			st._id = data.surtug;

			//simpan db
			st.save(function(err, result){
				st.populate({path: 'surtug', populate: { path: 'nama_lengkap prov kab org'}}, function(err2){

					outputDocx = __dirname+"/../template/output/perhitungan/"+current_timestamp+" Perhitungan "+st._id+"-"
									+(st.tgl_buat_perhit.match(/\d{4}$/)[0])+"-"
									+st.surtug.nama_lengkap.nama+".docx";

						data.surtug = st.surtug;
						data.total_rincian_terbilang = terbilang(st.total_rincian);
						data.total_riil_terbilang = terbilang(st.total_riil);

						data.tabel_perincian = [];

						var nomor = 2;
						if(st.harga_tiket > 0){
							data.tabel_perincian.push({
								"no":nomor,
								"pb": "Tiket "+data.surtug.jenis_ang,
								detail: "",
								"jumlah": data.harga_tiket
							})

							nomor += 1;
						}

						data.tabel_perincian.push({
							"no":nomor,
							"pb": "Uang harian",
							"detail": data.harian_hari+" hari @ Rp "+data.harian_biaya,
							"jumlah": data.harian_total
						})

						nomor += 1;	

						if(st.hotel_total > 0){			

							data.tabel_perincian.push({
								"no":nomor,
								"pb": "Hotel",
								"detail": data.hotel_hari+" hari @ Rp. "+data.hotel_biaya,
								"jumlah": data.hotel_total
							})

							nomor += 1;	

						}				

						data.tabel_perincian.push({
							"no":nomor,
							"pb": "Biaya pengeluaran riil",
							"detail": "",
							"jumlah": data.total_riil
						})

						data.tabel_riil = []; 

						var no = 1;
						if(data.surtug.prov.nama == "DKI Jakarta" || data.surtug.prov._id == '31'){
							data.tabel_riil.push({
								"no":no,
								"label":"Transport Lokal",
								"jumlah": (st.t_dari_t4_asal+st.t_dari_t4_tujuan).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
							})

							no += 1;
						} else{

							data.tabel_riil.push({
								"no":no,
								"label":"Transport Lokal dari tempat asal",
								"jumlah": data.t_dari_t4_asal
							});

							no += 1;

							data.tabel_riil.push({
								"no":no,
								"label":"Transport Lokal ke tempat tujuan",
								"jumlah": data.t_dari_t4_tujuan
							});

							no += 1;

						}

						if(st.totalb_inap > 0){
							data.tabel_riil.push({
								"no":no,
								"label":"B. Penginapan "+data.jumlah_menginap+" hari @ "+data.b_inap_price+" × 30%",
								"jumlah": data.totalb_inap
							})
						}

						//end
						console.log(data)
						cb(null, '');
				})
			})
		},
		function(cb){
			buatSurat(data, outputDocx, doc, cb);
		}],
		function(err, finish){
			if(data.docx){
				res.download(outputDocx);
				res.on('finish', function() {
					fs.unlink(outputDocx);
				});
				return;
			} else{
				var outputPdf = outputDocx.replace(/docx$/, 'pdf');
				async.series([function(cb){
					convertToPDF(outputDocx, outputPdf, cb)
				}], function(err, finish){
					if(data.pdf){
						res.download(outputPdf);
						res.on('finish', function() {
							fs.unlink(outputPdf);
						});
					} else {
						cb({'outputPdf': "/result/"+outputPdf.match(/perhitungan\/.*/)[0]});
					}
				})
			}
		}
	);
}

function convertToPDF(outputDocx, outputPdf, cb){
	msopdf(null, function(error, office) {
		office.word({input: outputDocx, output: outputPdf}, function(error, pdf) {
	      if (error) {
	        	res.send("Error");
	       } else { 
	       		fs.unlink(outputDocx);
	       }
	   });

		office.close(null, function(error) { 
	       if (error) { 
	           console.log("Woops", error);
	       } else {
	       		cb(null, '');
	       }
	   });
	});
}

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

  // kaLimat = kaLimat.replace(/\s+Rupiah$/, " Rupiah")

  return kaLimat.replace(/^\s*/g, "");
}

module.exports = sppd;