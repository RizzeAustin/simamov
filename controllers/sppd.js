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

const XlsxPopulate = require('xlsx-populate');

var ObjectId = require('mongoose').Types.ObjectId;
var Komponen = require(__dirname+"/../model/Komponen.model");

var Prov = require(__dirname+"/../model/Prov.model");
var Kab = require(__dirname+"/../model/Kab.model");
var Setting = require(__dirname+"/../model/Setting.model");
var SettingSPPD = require(__dirname+"/../model/SettingSPPD.model");
var SuratTugas = require(__dirname+"/../model/SuratTugas.model");
var SuratTugasBiasa = require(__dirname+"/../model/SuratTugasBiasa.model");
var Perhitungan = require(__dirname+"/../model/Perhitungan.model");
var Representasi = require(__dirname+"/../model/Representasi.model");

var CustomEntity = require(__dirname+"/../model/CustomEntity.model");

var Program = require(__dirname+"/../model/Program.model");
var Kegiatan = require(__dirname+"/../model/Kegiatan.model");
var Output = require(__dirname+"/../model/Output.model");
var Komponen = require(__dirname+"/../model/Komponen.model");
var Akun = require(__dirname+"/../model/Akun.model");
var DetailBelanja = require(__dirname+"/../model/DetailBelanja.model");

var User = require(__dirname+"/../model/User.model");

var _ = require("underscore");

var moment = require('moment');

var levenshtein = require('fast-levenshtein');

var moment = require('moment');
moment.locale('id');

//modul formidable utk parse POST gambar
var formidable = require('formidable');

//Socket.io
sppd.connections;

sppd.io;

sppd.socket = function(io, connections, client){
    sppd.connections = connections;

    sppd.io = io;

    var thang = client.handshake.session.tahun_anggaran;
    var user_aktiv = client.handshake.session.username || 'dummy user';


    client.on('komponen_list', function (q, cb){
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
        Komponen.find({"thang": thang, "urkmpnen": new RegExp(q, "i"), 'active': true}, 'kdoutput kdkmpnen urkmpnen', function(err, custs){
            _.each(custs, function(item, index, list){
                custs[index].d = levenshtein.get(q, item.urkmpnen);
            })
            custs = _.sortBy(custs, function(o) { return o.d; })
            cb(custs);
        })
    })
    client.on('komponen_list_extra', function (q, cb){
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
        Komponen.find({"thang": thang, "urkmpnen": new RegExp(q, "i"), 'active': true}, 'kdkmpnen urkmpnen', function(err, custs1){
            CustomEntity.find({"nama": new RegExp(q, "i"), 'type': 'tugas'}, function(err, custs2){
                _.each(custs1, function(item, index, list){
                    custs1[index].d = levenshtein.get(q, item.urkmpnen);
                })
                _.each(custs2, function(item, index, list){
                    custs2[index].d = levenshtein.get(q, item.nama);
                })
                custs = _.sortBy(custs1.concat(custs2), function(o) { return o.d; })
                cb(custs);
            })
        })
    })
    client.on('lokasi_list', function (q, cb){
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
        CustomEntity.find({"nama": new RegExp(q, "i"), 'type': 'lokasi'}, function(err, custs){
            _.each(custs, function(item, index, list){
                custs[index].d = levenshtein.get(q, item.nama);
            })
            custs = _.sortBy(custs, function(o) { return o.d; })
            cb(custs);
        })
    })
    client.on('prov_list', function (q, cb){
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
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
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
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
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
        Kab.find({"nama": new RegExp(q, "i"), 'tiket_jkt_b': { $exists: true, $ne: 0 },'tiket_jkt_e': { $exists: true, $ne: 0 }}, function(err, kab){
            _.each(kab, function(item, index, list){
                kab[index].d = levenshtein.get(q, item.nama);
            })
            kab = _.sortBy(kab, function(o) { return o.d; })
            cb(kab);
        })
    })
    client.on('org_list', function (q, cb){
        if(q.query){
            q.query = q.query.replace(/\\/g, '');
        } else if(q.q){
            q.q = q.q.replace(/\\/g, '');
        } else{
            q = q.replace(/\\/g, '');
        }
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
    client.on('set_pembdaf', function (new_pembdaf, cb){
        console.log(new_pembdaf)
        SettingSPPD.findOne({}, function(err, setting){
            if(!setting){
                var new_setting = new SettingSPPD({pembdaf: new_bend});
                new_setting.save(function(err, res){
                    cb('sukses');
                });
            } else {
                SettingSPPD.update({}, {$set: {pembdaf: new_pembdaf}}, {new: true}, function(err, result){
                    console.log(result)
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
        handleSuratTugas(data, cb, null, client.handshake.session.user_id);
    })
    client.on('surat_tugas_biasa', function (data, cb){
        handleSuratTugasBiasa(data, cb, null, client.handshake.session.user_id);
    })
    client.on('perhitungan', function (data, cb){
        handlePerhitungan(data, cb, null, user_aktiv, client.handshake.session.user_id);
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
            var tasks = [];
            _.each(surats, function(srt, index, list){
                tasks.push(
                    function(cb){
                        if(!srt.nama_lengkap){
                            Model.findOne({_id: srt._id}, 'nama_lengkap', function(err, res){
                                CustomEntity.findOne({_id: new ObjectId(res.nama_lengkap)}, function(err, peg){
                                    if(!peg){
                                        delete surats[index];
                                        cb(null, '');
                                    } else {
                                        srt.nama_lengkap = peg.toObject();
                                        cb(null, '')
                                    }
                                })
                            })
                        } else {
                            cb(null, '')
                        }
                    }
                )
            })
            async.series(tasks, function(err, final){
                cb(surats);
            })
        })
    })
    client.on('get_surat_tugas', function (data, cb){
        if(data.type == 'surat_tugas'){
            SuratTugas.findOne({ "_id": data.nomor}).populate('nama_lengkap prov kab org').exec(function(err, surat){
                if(!surat.nama_lengkap){
                    SuratTugas.findOne({_id: surat._id}, 'nama_lengkap', function(err, res){
                        CustomEntity.findOne({_id: res.nama_lengkap}, function(err, peg){
                            surat.nama_lengkap = peg.toObject();
                            cb(surat);
                        })
                    })
                } else {
                    cb(surat);
                }
            })
        } else {
            SuratTugasBiasa.findOne({ "_id": data.nomor}).populate('nama_lengkap').exec(function(err, surat){
                if(!surat.nama_lengkap){
                    SuratTugasBiasa.findOne({_id: surat._id}, 'nama_lengkap', function(err, res){
                        CustomEntity.findOne({_id: res.nama_lengkap}, function(err, peg){
                            surat.nama_lengkap = peg.toObject();
                            cb(surat);
                        })
                    })
                } else {
                    cb(surat);
                }
            })
        }
    })
    client.on('get_perhitungan', function (nomor, cb){
        var data = {};
        Perhitungan.findOne({ "_id": nomor}).exec(function(err, perhit){
            SuratTugas.findOne({ "_id": nomor}).populate('prov kab org').exec(function(err, st){
                var temp_id = st.nama_lengkap;
                st.populate('nama_lengkap', function(err){
                    if(!st.nama_lengkap){
                        CustomEntity.findOne({_id: temp_id}, function(err, peg){
                            st.nama_lengkap = peg.toObject();
                            data.st = st;
                            data.perhit = perhit;
                            cb(data);
                        })
                    }else {
                        data.st = st;
                        data.perhit = perhit;
                        cb(data);
                    }
                })
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
            Representasi.find({}).exec(function(err, reps){
                cb({'prov': result, 'reps': reps});
            })
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
        Kab.update({_id: data._id},{$set: data.data}, {upsert: true}).exec(function(err, result){
            cb('sukses');
        })
    })
    client.on('representasi_edit', function (data, cb){
        Representasi.update({_id: data._id},{$set: data.data}, {upsert: true}).exec(function(err, result){
            cb('sukses');
        })
    })
    client.on('representasi_biaya', function (data, cb){
        Representasi.findOne({_id: data.jenis_pgw}, data.posisi_kota).exec(function(err, result){
            if(result) cb(result[data.posisi_kota])
                else cb(0);
        })
    })
    client.on('populate_akun', function (kdkmpnen, cb){
        if(kdkmpnen == ''){
            Akun.find({'thang': thang}).sort('kdakun').exec(function(err, akuns){
                cb(akuns || [])
            })
        } else {
            Akun.find({'kdkmpnen': kdkmpnen, 'thang': thang}).sort('kdakun').exec(function(err, akuns){
                cb(akuns || [])
            })
        }
    })
    client.on('populate_detail', function (kode, cb){
        DetailBelanja.find({'kdkmpnen': kode.kdkmpnen, "kdakun": kode.kdakun, 'thang': thang}).sort('noitem').exec(function(err, details){
            cb(details || {})
        })
    })
    client.on('pulihkan_template', function (jenis, cb){
        var path = __dirname+'/../template/';
        if(jenis == 'st'){
            fs.createReadStream(path + 'cadangan/surat_tugas.docx').pipe(fs.createWriteStream(path + 'surat_tugas.docx'));
            cb('sukses');
        } else if(jenis == 'stb'){
            fs.createReadStream(path + 'cadangan/surat_tugas_biasa.docx').pipe(fs.createWriteStream(path + 'surat_tugas_biasa.docx'));
            cb('sukses');
        } else {
            fs.createReadStream(path + 'cadangan/sppd_perhitungan.docx').pipe(fs.createWriteStream(path + 'sppd_perhitungan.docx'));
            cb('sukses');
        }
    })
    client.on('buat_rekap', function (data, cb){
        //utk surtug
        if(data.type == 'surat_tugas'){
            var header = {};
            var rows, suratTugass, file_name, setting;
            async.series([

                function(cback){
                    Perhitungan.find( {_id: {$in: data.ids}}).populate({path: 'surtug', populate: { path: 'nama_lengkap prov kab org'}}).exec(function(err, perhits){
                        rows = perhits;
                        SuratTugas.find( {_id: {$in: data.ids}}).populate('nama_lengkap prov kab org').exec(function(err, surtugs){
                            suratTugass = surtugs;
                            cback(null, '')
                        })
                    })
                },

                function(cback){
                    //  _.each(suratTugass, function(datum, index, list){
                    //     console.log('Nama : '+datum.nama_lengkap.nama,'Keterangan: '+datum.tugas, 'Lokasi : '+datum.lokasi, 'Tgl Berangkat : '+datum.tgl_berangkat, 'Tgl Kembali : '+datum.tgl_kembali)
                    // })
                    //jika null
                    if(!rows){
                        // sendNotification(client, 'Tidak ada data perhitungan.')
                        cback('Tidak ada data perhitungan.', null);
                        return;
                    }
                    //jika kosong
                    if(rows.length == 0){
                        // sendNotification(client, 'Tidak ada data perhitungan.')
                        cback('Tidak ada data perhitungan.', null)
                        return;
                    }
                    //cek kesamaan detail
                    var isDifferent = false;
                    var detail_id = rows[0].detail;
                            // _.each(rows, function(datum, index, list){
                            //     data.ids = _.filter(data.ids, function(id){ return id != datum._id; })
                            //     if(datum.detail && (detail_id != datum.detail) && !isDifferent){
                            //         client.emit('messagesNoTimeout', 'Surtug No. '+datum._id+' memiliki detail realisasi yang berbeda.');
                            //         cback('Rekap tidak dibuat.', null);
                            //         isDifferent = true;
                            //         return;
                            //     }
                            // })

                    //jika ada yg blm punya detail
                            // if(data.ids.length != 0){
                            //     client.emit('messagesNoTimeout', 'Perhatian: Surtug No. '+data.ids.join(", ")+' blm memiliki perhitungan.');
                            // }

                    //is different spy tdk tereksekusi. return pada each tdk membreak all codes
                            // if(!isDifferent){
                            //     DetailBelanja.findOne( {_id: new ObjectId(detail_id)}, 'nmitem kdprogram kdgiat kdoutput kdsoutput kdkmpnen kdskmpnen kdakun', function(err, detail){
                            //         header.detail = detail.nmitem;
                            //         Program.findOne( {kdprogram: detail.kdprogram, active: true}, 'uraian', function(err, prog){
                            //             header.prog = ':   '+prog.uraian+' ( 054.01.'+detail.kdprogram+' )';
                            //             Kegiatan.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, active: true}, 'uraian', function(err, giat){
                            //                 header.giat = ':   '+giat.uraian+' ( '+detail.kdgiat+' )';
                            //                 Komponen.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput,
                            //                     kdkmpnen: detail.kdkmpnen, active: true}, 'urkmpnen', function(err, komp){
                            //                     header.outp = ':   '+komp.urkmpnen+' ( '+detail.kdoutput+'.'+detail.kdkmpnen+' )';
                            //                     Akun.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput,
                            //                     kdkmpnen: detail.kdkmpnen, kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun, active: true}, 'uraian', function(err, akun){
                            //                         header.akun = ':   '+akun.uraian+' ( '+detail.kdakun+' )';
                            //                         cback(null, '')
                            //                     })
                            //                 })
                            //             })
                            //         })
                            //     })
                            // }
                            cback(null, '')
                },
                function(cback){
                    SettingSPPD.findOne({}, 'ppk bendahara').populate('ppk bendahara').exec(function(err, result){
                        if(!result || !result.ppk || !result.bendahara){
                            cback('Pengaturan PPK/Bendahara belum ada. Harap tentukan di pengaturan SPPD.', null);
                            return;
                        }
                        setting = result;
                        cback(null, '');
                    })
                }

            ], function(err, final){
                if(err){
                    sendNotification(client, err)
                    cb('')
                    return;
                }
                XlsxPopulate.fromFileAsync("./template/spj_template/rekap_sppd.xlsx")
                        .then(workbook => {

                        //Header
                        workbook.definedName("detail").value('Rekap '+rows[0].surtug.tugas);
                        workbook.definedName("program").value(header.prog || ':   ');
                        workbook.definedName("kegiatan").value(header.giat || ':   ');
                        workbook.definedName("output").value(header.outp || ':   ');
                        workbook.definedName("akun").value(header.akun || ':   ');

                        //data
                        var sisa_item = rows.length;
                        var next_last_jlh_link = 40;
                         var row = 18;
                         var sum_pos = 18;
                         var nmr = 1;
                         // _.each(suratTugass, function(datum, index, list){
                         //    console.log('Nama : '+item.nama_lengkap.nama,'Keterangan: '+item.tugas, 'Lokasi : '+item.lokasi, 'Tgl Berangkat : '+item.tgl_berangkat, 'Tgl Kembali : '+item.tgl_kembali)
                         // })
                         _.each(suratTugass, function(item, index, list){
                             var r = workbook.sheet(0).range('A'+row+':K'+row);

                             var nama;

                             if(!item.nama_lengkap){
                                nama = 'Nama tdk ada'
                             } else{
                                nama = item.nama_lengkap.nama;
                             }

                             r.value([[nmr,
                                 nama,
                                 item.tugas, 
                                 item.lokasi,
                                 item.tgl_berangkat,
                                 item.tgl_kembali,
                                 '',
                                 '',
                                 '',
                                 '',
                                 ''
                             ]]);
                             nmr++
                             row++;

                             // if((sisa_item>11 && row == 40) || (sisa_item>29 && row == next_last_jlh_link)){
                             //    r.value([['',
                             //        'Jumlah dipindahkan', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        ''
                             //    ]]);
                             //    //=>rumus
                             //    workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                             //    workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                             //    workbook.sheet(0).cell('I'+row).formula('SUM(I'+sum_pos+':I'+(row-1)+')');
                             //    workbook.sheet(0).cell('J'+row).formula('SUM(J'+sum_pos+':J'+(row-1)+')');
                             //    workbook.sheet(0).cell('K'+row).formula('SUM(K'+sum_pos+':K'+(row-1)+')');
                             //    //=>style
                             //    var jumlahcells = workbook.sheet(0).range('B'+row+':F'+row);
                             //    jumlahcells.merged(true).style('horizontalAlignment', 'center');
                             //    row++;

                             //    var r = workbook.sheet(0).range('A'+row+':K'+row);
                             //    r.value([['',
                             //        'Jumlah pindahan', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        '', 
                             //        ''
                             //    ]]);
                             //    //=>rumus
                             //    workbook.sheet(0).cell('G'+row).formula('G'+(row-1));
                             //    workbook.sheet(0).cell('H'+row).formula('H'+(row-1));
                             //    workbook.sheet(0).cell('I'+row).formula('I'+(row-1));
                             //    workbook.sheet(0).cell('J'+row).formula('J'+(row-1));
                             //    workbook.sheet(0).cell('K'+row).formula('K'+(row-1));
                             //    //=>style
                             //    var jumlahcells = workbook.sheet(0).range('B'+row+':F'+row);
                             //    jumlahcells.merged(true).style('horizontalAlignment', 'center');

                             //    //update sum position
                             //    sum_pos = row;
                             //    next_last_jlh_link = sum_pos + 39;

                             //    row++;
                             // } else{
                             //     r.value([[nmr,
                             //         item.surtug.nama_lengkap.nama,
                             //         item.surtug.nama_lengkap.gol, 
                             //         item.surtug.jumlah_hari,
                             //         item.surtug.lokasi,
                             //         item.surtug.tgl_berangkat,
                             //         item.total_rincian,
                             //         item.harga_tiket || 0,
                             //         0,
                             //         item.hotel_total || 0,
                             //         item.total_rincian
                             //     ]]);
                             //     //=>rumus
                             //     workbook.sheet(0).cell('K'+row).formula('G'+row+'-H'+row+'-I'+row+'-J'+row);
                             //     row++;
                             //     nmr++;
                             // }
                         })

                        //jumlah
                        row += 1;
                        var r = workbook.sheet(0).range('A'+row+':K'+row);
                        r.value([['',
                            'Jumlah', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            '', 
                            ''
                        ]]);
                        workbook.sheet(0).range('A18:A'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).range('C18:C'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).range('D18:D'+row).style('horizontalAlignment', 'center');


                        //=>rumus
                                // workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                                // workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                                // workbook.sheet(0).cell('I'+row).formula('SUM(I'+sum_pos+':I'+(row-1)+')');
                                // workbook.sheet(0).cell('J'+row).formula('SUM(J'+sum_pos+':J'+(row-1)+')');
                                // workbook.sheet(0).cell('K'+row).formula('SUM(K'+sum_pos+':K'+(row-1)+')');
                                // workbook.sheet(0).range('G18:K'+row).style("numberFormat", "#,##0.-");
                        //=>style
                        r.style("bold", true);
                        var jumlahcells = workbook.sheet(0).range('B'+row+':F'+row);
                        jumlahcells.merged(true).style('horizontalAlignment', 'center');

                        //border
                        var datacolls = workbook.sheet(0).range('A18'+':K'+(row));
                        datacolls.style({'leftBorder': true, 'rightBorder': true, 'bottomBorder': true, 'topBorder': false})


                         //ttd
                         //=>bendahara
                         row += 2;
                         workbook.sheet(0).range('A'+row+':A'+(row+6)).value([['Lunas pada tanggal'], ['Bendahara Pengeluaran STIS,'], [''], [''], [''], [setting.bendahara.nama], ['NIP '+setting.bendahara._id]]);
                         //=>>style
                         workbook.sheet(0).cell('A'+(row+5)).style('underline', true);

                         //=>ppk
                         workbook.sheet(0).range('E'+(row+1)+':E'+(row+6)).value([['Pejabat Pembuat Komitmen,'], [''], [''], [''], [setting.ppk.nama], ['NIP '+setting.ppk._id]]);
                         //=>>style
                         workbook.sheet(0).cell('E'+(row+5)).style('underline', true);
                         workbook.sheet(0).range('E'+(row+1)+':G'+(row+1)).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('E'+(row+5)+':G'+(row+5)).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('E'+(row+6)+':G'+(row+6)).merged(true).style('horizontalAlignment', 'center');


                         //=>pembuat daftar
                         workbook.sheet(0).range('I'+row+':I'+(row+6)).value([['Jakarta, '+data.tgl_buat_rekap], ['Pembuat Daftar,'], [''], [''], [''], [data.pembuat_daftar], ['NIP '+data.pembuat_daftar_id]]);
                         //=>>style
                         workbook.sheet(0).cell('I'+(row+5)).style('underline', true);
                         workbook.sheet(0).range('I'+row+':K'+row).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('I'+(row+1)+':K'+(row+1)).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('I'+(row+1)+':K'+(row+1)).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('I'+(row+5)+':K'+(row+5)).merged(true).style('horizontalAlignment', 'center');
                         workbook.sheet(0).range('I'+(row+6)+':K'+(row+6)).merged(true).style('horizontalAlignment', 'center');


                         //simpan
                        file_name = Math.round(new Date().getTime()/1000)+' Rekap SPPD '+rows[0]._id+' - '+rows[rows.length-1]._id;
                        checkDirAndCreate(__dirname+'/../temp_file/rekap/sppd');
                        workbook.toFileAsync('./temp_file/rekap/sppd/'+file_name+'.xlsx');
                 }).then(dataa => {
                    msopdf(null, function(error, office) {
                        var input = './temp_file/rekap/sppd/'+file_name+'.xlsx';
                        var output = './template/output/rekap/sppd/'+file_name+'.pdf';
                        
                        if(data.preview || data.pdf){
                            office.excel({'input': input, 'output': output}, function(error, pdf) {
                                if (err) {
                                    console.error(err);
                                }
                                //hapus xlsx setelah terconvert
                                if(checkFS(input)){
                                    fs.unlink(input);
                                }
                            })
                            office.close(null, function(error) {
                                cb('/result/rekap/sppd/'+file_name+'.pdf');
                                setTimeout(function(){
                                    if(checkFS(output)){
                                        fs.unlink(output);
                                    }
                                }, 10000)                        
                            })
                        } else {
                            setTimeout(function(){
                                cb('/result_temp/rekap/sppd/'+file_name+'.xlsx');
                            }, 100) 
                            
                            setTimeout(function(){
                                if(checkFS(input)){
                                    fs.unlink(input);
                                }
                            }, 10000)  
                        }
                    })
                 })
                User.update({_id: new ObjectId(client.handshake.session.user_id)}, {$push: {"act": {label: 'Buat Rekap SPPD No. '+rows[0]._id+' - '+rows[rows.length-1]._id}}}, 
                    function(err, status){
                })
            })
        }
    })

    client.on('get_pembuat_daftar', function (data, cb){
        SettingSPPD.findOne({}).populate('pembdaf').exec(function(err, result){
            cb(result);
        })  
    })


};

sppd.get('/surat_tugas', function(req, res){
    SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk').exec(function(err, result){
        if(!result){
            SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
                result = {};
                result.last_nmr_surat = 1;
                res.render('sppd/surat_tugas', {layout: false,  setting: result, admin: req.session.jenis});
            })
            return;
        }
        if(!result.last_nmr_surat){
            SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
                result.last_nmr_surat = 1;
                res.render('sppd/surat_tugas', {layout: false,  setting: result, admin: req.session.jenis});
            })
        } else {
            res.render('sppd/surat_tugas', {layout: false,  setting: result, admin: req.session.jenis});
        }       
    })
});

sppd.post('/surat_tugas', function(req, res){
    handleSuratTugas(req.body, null, res, req.session.user_id);
});

sppd.get('/surat_tugas_biasa', function(req, res){
    SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk').exec(function(err, result){
        if(!result){
            SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
                result = {};
                result.last_nmr_surat = 1;
                res.render('sppd/surat_tugas_biasa', {layout: false,  setting: result, admin: req.session.jenis});
            })
            return;
        }
        if(!result.last_nmr_surat){
            SettingSPPD.update({}, {last_nmr_surat: 1}, {upsert: true}, function(err, last){
                result.last_nmr_surat = 1;
                res.render('sppd/surat_tugas_biasa', {layout: false,  setting: result, admin: req.session.jenis});
            })
        } else {
            res.render('sppd/surat_tugas_biasa', {layout: false,  setting: result, admin: req.session.jenis});
        }       
    })
});

sppd.post('/surat_tugas_biasa', function(req, res){
    handleSuratTugasBiasa(req.body, null, res, req.session.user_id);
});

sppd.get('/perhitungan', function(req, res){
    SuratTugas.findOne({}).sort({'_id': -1}).populate('nama_lengkap').exec( function(err, st) {
        if(!st){
            Prov.findOne({_id: '31'}, function(err, prov){
                prov.taksi_dn = +prov.taksi_dn*2;
                res.render('sppd/perhitungan', {layout: false, 'st': st, 'prov': prov, admin: req.session.jenis});
            })
            return;
        }
        if(!st.nama_lengkap){
            SuratTugas.findOne({_id: st._id}, function(err, sutu) {
                CustomEntity.findOne({_id: sutu.nama_lengkap}, function(err, ce){
                    if(!ce){
                        res.render('sppd/perhitungan', {layout: false, admin: req.session.jenis});
                    } else {
                        st.nama_lengkap = ce.toObject();
                        Prov.findOne({_id: '31'}, function(err, prov){
                            prov.taksi_dn = +prov.taksi_dn*2;
                            res.render('sppd/perhitungan', {layout: false, 'st': st, 'prov': prov, admin: req.session.jenis});
                        })
                    }
                })
            })
        } else {
            Prov.findOne({_id: '31'}, function(err, prov){
                prov.taksi_dn = +prov.taksi_dn*2;
                res.render('sppd/perhitungan', {layout: false, 'st': st, 'prov': prov, admin: req.session.jenis});
            })
        }
    });
});

sppd.post('/perhitungan', function(req, res){
    handlePerhitungan(req.body, null, res, req.session.username || 'dummy user', req.session.user_id);
});

sppd.get('/perhitungan-old', function(req, res){
    res.render('sppd/perhitungan-old', {layout: false});
});

sppd.get('/pengaturan', function(req, res){
    SettingSPPD.findOne({}).populate('ttd_st ttd_leg bendahara ppk pembdaf').exec(function(err, result){
        res.render('sppd/pengaturan', {layout: false, setting: result});
    })  
});

sppd.post('/pengaturan/unggah_template/:type', function(req, res){
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
                    if(type == 'st'){
                        file.path += 'surat_tugas.docx';
                    } else if(type == 'stb'){
                        file.path += 'surat_tugas_biasa.docx';
                    } else {
                        file.path += 'sppd_perhitungan.docx';
                    }
                })
            } 
        ], function(err, final){
            res.send('sukses');
        }
    )
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

function handleSuratTugas(data, cb, res, user_id){
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
                    CustomEntity.findOne({_id: data.org}, function(err, org){
                        if(org.nama != data.org_name){
                            CustomEntity.create({ type: 'org', nama: data.org_name }, function (err, org) {
                              if (err) return handleError(err);
                              data.org = org._id;
                              cb(null, '')
                            })
                        } else{
                            cb(null, '')
                        }
                    })
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
                    if(list.length == 1 && data.nomor.match(/^\d*/)[0] != last_nmr_surat && (+data.nomor.match(/^\d*/)[0] < last_nmr_surat)){
                        data._id = data.nomor.match(/^\d*/)[0];
                        SuratTugas.update({_id: data.nomor.match(/^\d*/)[0]}, {$set: data}, function(err, status){
                            data._id = data.nomor.match(/^\d*/)[0];
                        })
                    } else if(+data.nomor.match(/^\d*/)[0] > last_nmr_surat){
                        data._id = data.nomor.match(/^\d*/)[0];
                        last_nmr_surat = data._id;
                    } else{
                        data._id = last_nmr_surat;
                    }
                    if(!data.kab_name){
                        delete data.kab_name;
                        delete data.kab;
                    }
                    
                    //surtug instance
                    var st = new SuratTugas(data);
                    //simpan db
                    st.save(function(err, result){
                        st.populate('nama_lengkap ttd_legalitas ttd_surat_tugas prov kab org', function(err2){
                            if(!data.kab_name){
                                SuratTugas.update({_id: data._id}, {$unset: {kab: 1, kab_name: 1 }}, function(err, status){
                                })
                            }
                            if(!data.org_name){
                                SuratTugas.update({_id: data._id}, {$unset: {org: 1, org_name: 1 }}, function(err, status){
                                })
                            }
                            //cek apakah dari tabel Pegawai
                            async.series([
                                function(cb){
                                    if(!st.nama_lengkap){
                                        CustomEntity.findOne({_id: pegawai._id}, function(err, peg){
                                            st.nama_lengkap = peg.toObject();
                                            cb(null, '')
                                        })
                                    } else {
                                        cb(null, '')
                                    }
                                }

                            ], function(err, finish){
                                checkDirAndCreate(__dirname+'/../template/output/sppd')
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
                                if(list.length == 1 && data.nomor.match(/^\d*/)[0] != last_nmr_surat && (+data.nomor.match(/^\d*/)[0] < last_nmr_surat)){
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
                
            })

            async.series(tasks, function(err, finish){
                buatSurat(data, outputDocx, doc, cb);
            })
        }], 
        function(err, finish){
            User.update({_id: user_id}, {$push: {"act": {label: 'Buat Surat Tugas '+data.nomor}}}, 
                function(err, status){
            })
            CustomEntity.update(
                {'nama': data.tugas, type: 'tugas'}, 
                {$setOnInsert: {'nama': data.tugas}}, 
                {upsert: true}, 
                function(err, numAffected) {
                }
            );
            if(data.docx){
                res.download(outputDocx);
                res.on('finish', function() {
                    if(checkFS(outputDocx)){
                        fs.unlink(outputDocx);
                    }
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
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        });
                    } else {
                        cb({'last_nmr_surat': last_nmr_surat, 'outputPdf': "/result/"+outputPdf.match(/sppd\/.*/)[0]});
                        setTimeout(function(){
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        }, 10000)  
                    }
                })
            }
    })
}

function handleSuratTugasBiasa(data, cb, res, user_id){
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
            CustomEntity.update(
                {'nama': data.lokasi, type: 'lokasi'}, 
                {$setOnInsert: {'nama': data.lokasi}}, 
                {upsert: true}, 
                function(err, numAffected) {
                    cb(null, '')
                }
            );
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
                    if(data.nomor.match(/\d*$/)[0] > last_nmr_surat){
                        last_nmr_surat = data.nomor.match(/\d*$/)[0];
                    }
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
                st.populate('nama_lengkap ttd_legalitas ttd_surat_tugas', function(err2){
                    checkDirAndCreate(__dirname+"/../template/output/sppd_biasa")
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
                    if(data.nomor.match(/\d*$/)[0] != last_nmr_surat && (data.nomor.match(/\d*$/)[0] < last_nmr_surat)){
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
            User.update({_id: user_id}, {$push: {"act": {label: 'Buat Surat Tugas Biasa '+data.nomor}}}, 
                function(err, status){
            })            
            CustomEntity.update(
                {'nama': data.tugas, type: 'tugas'}, 
                {$setOnInsert: {'nama': data.tugas}}, 
                {upsert: true}, 
                function(err, numAffected) {
                }
            );
            if(data.docx){
                res.download(outputDocx);
                res.on('finish', function() {
                    if(checkFS(outputDocx)){
                        fs.unlink(outputDocx);
                    }
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
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        });
                    } else {
                        cb({'last_nmr_surat': last_nmr_surat, 'outputPdf': "/result/"+outputPdf.match(/sppd_biasa\/.*/)[0]});
                        setTimeout(function(){
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        }, 10000)  
                    }
                })
            }
        }
    );
}

function handlePerhitungan(data, cb, res, username, user_id){
    var current_timestamp = Math.round(new Date().getTime()/1000);
    var sppd_template = fs.readFileSync(__dirname+"/../template/sppd_perhitungan.docx","binary");
    var outputDocx = '';
    var sppd_setting = {};
    var gup_id;

    var zip = new JSZip(sppd_template);
    var doc = new Docxtemplater().loadZip(zip);

    async.series([

        function(cb){
            SettingSPPD.findOne({}).populate('ppk bendahara').exec(function(err, result){
                data.setting = result;
                CustomEntity.findOne({nama: 'GUP', active: true}, function(err, gup){
                    if(gup){
                        gup_id = gup._id;
                        cb(null, '')
                    } else {
                        CustomEntity.create({ type: 'Penerima', nama: 'GUP' }, function (err, gup) {
                          if (err) return handleError(err);
                          gup_id = gup._id;
                          cb(null, '')
                        })
                    }
                })
            })
        },

        function(cb){
            //surtug instance
            data.surtug = data.nomor.match(/^\d*/)[0];
            var st = new Perhitungan(data);
            Perhitungan.findOne({_id: data.nomor.match(/^\d*/)[0]}, function(err, perhit){
                if(perhit){
                    Perhitungan.update({_id: data.nomor.match(/^\d*/)[0]}, {$set: st}, function(err, status){
                    })
                }
            })
            st._id = data.surtug;

            //simpan db
            st.save(function(err, result){
                st.populate({path: 'surtug', populate: { path: 'nama_lengkap prov kab org'}}, function(err2){

                    async.series([
                        function(cb){
                            if(!st.surtug.nama_lengkap){
                                SuratTugas.findOne({_id: st.surtug._id}, 'nama_lengkap', function(err, sutu){
                                    CustomEntity.findOne({_id: sutu.nama_lengkap}, function(err, ce){
                                        st.surtug.nama_lengkap = ce.toObject();
                                        st.surtug.nama_lengkap._id = st.surtug.nama_lengkap.nip;
                                        cb(null, '');
                                    })
                                })
                            } else {
                                cb(null, '');
                            }
                        }
                    ], function(err, final){
                        checkDirAndCreate(__dirname+"/../template/output/perhitungan")
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
                        if(data.surtug.prov.nama == "DKI Jakarta" || data.surtug.prov._id == '31' || data.t_dari_t4_tujuan == 0){
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
                            });

                            no += 1;
                        }

                        if(st.representasi > 0){
                            data.tabel_riil.push({
                                "no":no,
                                "label":"B. Representasi",
                                "jumlah": data.representasi
                            })
                        }

                        //end
                        cb(null, '');
                        var thang = st.tgl_buat_perhit.match(/\d{4}$/)[0];
                        DetailBelanja.findOne({'thang': thang, '_id': st.detail, active: true}, 'realisasi').elemMatch('realisasi', {ket: new RegExp('SPPD No\. '+st._id+'\:', "i")}).exec(function(err, result){
                                //jika blm pernah
                                //init total, user
                                var total_sampai_bln_ini = 0;
                                var new_entry = {};
                                new_entry.pengentry =   username;
                                new_entry.ket = 'SPPD No. '+st._id+': '+data.surtug.tugas+', a.n. '+data.nama_lengkap;
                                new_entry.bukti_no = data.bukti_no || '';
                                new_entry.spm_no = data.spm_no || '';
                                new_entry.penerima_nama = 'GUP';//data.nama_lengkap;
                                new_entry.tgl = data.surtug.tgl_ttd_st;
                                new_entry.tgl_timestamp = moment(data.surtug.tgl_ttd_st, "D MMMM YYYY").unix();
                                new_entry.penerima_id = gup_id;//;data.surtug.nama_lengkap._id;
                                new_entry.jumlah = st.total_rincian;
                                new_entry.timestamp = current_timestamp;
                                if(!result){
                                    DetailBelanja.update({'thang': thang, "_id": data.detail}, {$push: {"realisasi": new_entry}}, {new: true}, function(err, result){
                                        if (err) {
                                            console.log(err)
                                            sendNotification(user_id, 'Gagal menyimpan.')
                                            return
                                        }
                                        sendNotification(user_id, 'Realisasi berhasil disimpan.')
                                    })
                                } else {
                                    console.log(result)
                                    _.each(result.realisasi, function(real, idx, list){
                                        if(real.ket.match(new RegExp('SPPD No\. '+st._id+'\:', "i"))){
                                            DetailBelanja.findOneAndUpdate({'thang': thang, "_id": data.detail, 'realisasi._id': real._id}, 
                                                {$set: {'realisasi.$.pengentry': new_entry.pengentry, 'realisasi.$.ket': new_entry.ket,
                                                'realisasi.$.penerima_nama': new_entry.penerima_nama, 'realisasi.$.tgl': new_entry.tgl, 
                                                'realisasi.$.tgl_timestamp': new_entry.tgl_timestamp, 'realisasi.$.penerima_id': new_entry.penerima_id, 
                                                'realisasi.$.jumlah': new_entry.jumlah, 'realisasi.$.timestamp': new_entry.timestamp}}, function(err, result){
                                                    console.log(result)
                                                    sendNotification(user_id, 'Realisasi berhasil diupdate.')
                                            })
                                        }
                                    })
                                }
                        })
                    })
                })
            })
        },
        function(cb){
            buatSurat(data, outputDocx, doc, cb);
        }],
        function(err, finish){
            User.update({_id: user_id}, {$push: {"act": {label: 'Buat Surat Perhitungan '+data.surtug.nomor_surat}}}, 
                function(err, status){
            })
            if(data.docx){
                res.download(outputDocx);
                res.on('finish', function() {
                    if(checkFS(outputDocx)){
                        fs.unlink(outputDocx);
                    }
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
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        });
                    } else {
                        cb({'outputPdf': "/result/"+outputPdf.match(/perhitungan\/.*/)[0]});
                        setTimeout(function(){
                            if(checkFS(outputPdf)){
                                fs.unlink(outputPdf);
                            }
                        }, 10000)  
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
                if(checkFS(outputDocx)){
                    fs.unlink(outputDocx);
                }
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

function sendNotification(user_id, message){
    if(!user_id) return;
    if(_.isString(user_id)){
        sppd.connections[user_id].emit('messages', message)
    } else user_id.emit('messages', message)
}

function checkDirAndCreate(addr){
    console.log('===>>>>>', addr)
    if (!fs.existsSync(addr)){
        console.log(addr)
        fs.mkdirSync(addr);
    }
}


function checkFS(addr){
    if (fs.existsSync(addr)){
        return true;
    } else{
        return false;
    }
}

module.exports = sppd;