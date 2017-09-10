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

var Program = require(__dirname+"/../model/Program.model");
var Kegiatan = require(__dirname+"/../model/Kegiatan.model");
var Output = require(__dirname+"/../model/Output.model");
var Komponen = require(__dirname+"/../model/Komponen.model");
var Akun = require(__dirname+"/../model/Akun.model");
var DetailBelanja = require(__dirname+"/../model/DetailBelanja.model");

var CustomEntity = require(__dirname+"/../model/CustomEntity.model");
var SettingSPPD = require(__dirname+"/../model/SettingSPPD.model");
var Setting = require(__dirname+"/../model/Setting.model");

var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname+"/../model/User.model");

//Short syntax tool
var _ = require("underscore");

//similarity between string
var clj_fuzzy = require('clj-fuzzy');

var moment = require('moment');
moment.locale('id');

//modul sql utk koneksi db mysql sipadu
var mysql = require('mysql');

// sipadu_db.connect();

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
    client.on('buat_spj_lainnya', function (spj, cb){
    	console.log(spj)
    	handleSPJLainnya(spj, client, cb)
    	// cb({outputPdf: '/result/spj/lainnya/rekap_sppd.pdf', spj: spj})
    })

}

function handleSPJLainnya(spj, client, cb){
	username = client.handshake.session.username || 'dummy user';
	var header = {};
    var rows = spj.data;
    var file_name, setting;
	async.series([
		//kop
		function(cback){
			DetailBelanja.findOne( {_id: new ObjectId(spj.target_realisasi)}, 'nmitem kdprogram kdgiat kdoutput kdsoutput kdkmpnen kdskmpnen kdakun', function(err, detail){
                header.detail = detail.nmitem;
                Program.findOne( {kdprogram: detail.kdprogram, active: true}, 'uraian', function(err, prog){
                    header.prog = prog.uraian+' ( 054.01.'+detail.kdprogram+' )';
                    Kegiatan.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, active: true}, 'uraian', function(err, giat){
                        header.giat = giat.uraian+' ( '+detail.kdgiat+' )';
                        Output.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, active: true}, 'uraian', function(err, outp){
                            header.outp = outp.uraian+' ( '+detail.kdoutput+' )';
                            Komponen.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput,
	                            kdkmpnen: detail.kdkmpnen, active: true}, 'urkmpnen', function(err, komp){
	                            header.komp = komp.urkmpnen+' ( '+detail.kdoutput+'.'+detail.kdkmpnen+' )';
	                            Akun.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput,
	                            kdkmpnen: detail.kdkmpnen, kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun, active: true}, 'uraian', function(err, akun){
	                                header.akun = akun.uraian+' ( '+detail.kdakun+' )';
	                                cback(null, '')
	                            })
	                        })
                        })
                    })
                })
            })
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
		console.log(header)
		XlsxPopulate.fromFileAsync("./template/spj_template/honor_template.xlsx")
            .then(workbook => {
            //Header
            workbook.definedName("daftar").value(spj.daftar.toUpperCase());
            workbook.definedName("program").value(header.prog.toUpperCase() || ':   ');
            workbook.definedName("kegiatan").value(header.giat.toUpperCase() || ':   ');
            workbook.definedName("output").value(header.outp.toUpperCase() || ':   ');
            workbook.definedName("komponen").value(header.komp.toUpperCase() || ':   ');
            workbook.definedName("akun").value(header.akun.toUpperCase() || ':   ');
            if(spj.periode){
            	workbook.definedName("periode").value(spj.periode.toUpperCase() || '');
            } else {
            	workbook.definedName("periode_title").value('');
            }

            //data
            SPJData(workbook, setting, spj, spj.start_row, spj.next_last_jlh_link, spj.total_row_per_page);

            //simpan
            file_name = Math.round(new Date().getTime()/1000)+' SPJ Honor';
            checkDirAndCreate('./temp_file/spj/');
            workbook.toFileAsync('./temp_file/spj/'+file_name+'.xlsx');
           }).then(dataa => {
           		msopdf(null, function(error, office) {
                    checkDirAndCreate('./temp_file/spj/');
                    checkDirAndCreate('./template/output/spj/lainnya/');
                    var input = './temp_file/spj/'+file_name+'.xlsx';
                    var output = './template/output/spj/lainnya/'+file_name+'.pdf';
	           		if(spj.preview || spj.pdf){
	                    office.excel({'input': input, 'output': output}, function(error, pdf) {
	                        if (err) {
	                            console.error(err);
	                        }
	                        //hapus xlsx setelah terconvert
	                        // fs.unlink(input);
	                    })
	                    office.close(null, function(error) {
	                        cb('/result/spj/lainnya/'+file_name+'.pdf');
	                        setTimeout(function(){
	                            if(checkFS(output)){
                                    fs.unlink(output);
                                }
	                        }, 10000)                        
	                    })
	                } else {
	                    setTimeout(function(){
	                        cb('/result_temp/spj/'+file_name+'.xlsx');
	                    }, 100) 
	                    
	                    setTimeout(function(){
	                        if(checkFS(input)){
                                fs.unlink(input);
                            }
	                    }, 10000)  
	                }
	            })
           })
	})

	//data
	//ttd
}

function SPJData(workbook, setting, spj, start_row, next_last_jlh_link, total_row_per_page){
    var column = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
    var sum_cols = [5,6,7,8];
    var center_cols = [1,3,4]
    var money_cols = [5,6,7,8]
    var last_col = 10;
	var sisa_item = spj.data.length;
     var row = start_row;
     var sum_pos = start_row;
     var nmr = 1;
     var total = 0;
     _.each(spj.data, function(item, index, list){
     	if(!item.jumlah || !item.penerima_nama) return;
         var r = workbook.sheet(0).range('A'+row+':'+column[last_col-1]+row);
         if((sisa_item>(next_last_jlh_link-10) && row == next_last_jlh_link) || (sisa_item>(total_row_per_page-10) && row == next_last_jlh_link)){
            r.value([['',
                'Jumlah dipindahkan', 
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
            //=>rumus
		    _.each(sum_cols, function(col, a, b){
		    	workbook.sheet(0).row(row).cell(col).formula('SUM('+column[col-1]+sum_pos+':'+column[col-1]+(row-1)+')');
		    })
            //=>style
            var jumlahcells = workbook.sheet(0).range('B'+row+':'+column[sum_cols[0]-2]+row);
            jumlahcells.merged(true).style('horizontalAlignment', 'center');
            row++;

            var r = workbook.sheet(0).range('A'+row+':'+column[last_col-1]+row);
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
            //=>rumus
		    _.each(sum_cols, function(col, a, b){
		    	workbook.sheet(0).row(row).cell(col).formula(column[col-1]+(row-1));
		    })
            // workbook.sheet(0).cell('G'+row).formula('G'+(row-1));
            // workbook.sheet(0).cell('H'+row).formula('H'+(row-1));
            //=>style
            var jumlahcells = workbook.sheet(0).range('B'+row+':'+column[sum_cols[0]-2]+row);
            jumlahcells.merged(true).style('horizontalAlignment', 'center');

            //update sum position
            sum_pos = row;
            next_last_jlh_link = sum_pos + total_row_per_page - 1;

            row++;
         } else{
             var value = [nmr,
                 item.penerima_nama,
                 item.gol, 
                 item.jlh_sks,
                 item.honor_persks,
                 getNumber(item.jumlah),
                 getNumber(item.pph21),
                 getNumber(item.dibayarkan)
            ];

    		if(nmr % 2 == 0){
    			value.push('')
    			value.push(nmr+'. ......')
    		} else {
    			value.push(nmr+'. ......')
    			value.push('')
    		}

    		r.value([value]);

    		total+=getNumber(item.jumlah);
            row++;
            nmr++;
         }
     })

    //jumlah
    row += 1;
    var r = workbook.sheet(0).range('A'+row+':'+column[last_col-1]+row);
    r.value([['',
        'Jumlah', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        '', 
        ''
    ]]);
    //terbilang
    workbook.sheet(0).cell('I'+row).value(terbilang(total));
    var terb = workbook.sheet(0).range('I'+row+':'+column[last_col-1]+row);
	terb.merged(true).style({'wrapText': true, 'verticalAlignment': 'center'});
	//center column
    _.each(center_cols, function(col, a, b){
    	workbook.sheet(0).range(column[col-1]+start_row+':'+column[col-1]+row).style('horizontalAlignment', 'center');
    })

    //=>rumus
    _.each(sum_cols, function(col, a, b){
    	workbook.sheet(0).row(row).cell(col).formula('SUM('+column[col-1]+sum_pos+':'+column[col-1]+(row-1)+')');
    })

    _.each(money_cols, function(col, a, b){
    	workbook.sheet(0).range(column[col-1]+start_row+':'+column[col-1]+row).style("numberFormat", "#,##0.-");
    })
    //=>style
    r.style("bold", true);
    var jumlahcells = workbook.sheet(0).range('B'+row+':'+column[sum_cols[0]-2]+row);
    jumlahcells.merged(true);
    workbook.sheet(0).range('B'+row+':H'+row).style({'verticalAlignment': 'center', 'horizontalAlignment': 'center'})
	workbook.sheet(0).row(row).height(78);

    //border
    var datacolls = workbook.sheet(0).range('A'+start_row+':'+column[last_col-1]+(row));
    datacolls.style({'leftBorder': true, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

    //ttd
    //=>bendahara
    row += 2;
    workbook.sheet(0).range('A'+row+':A'+(row+6)).value([['Lunas pada tanggal'], ['Bendahara Pengeluaran STIS,'], [''], [''], [''], [setting.bendahara.nama], ['NIP '+setting.bendahara._id]]);
    //=>>style
    workbook.sheet(0).cell('A'+(row+5)).style('underline', true);

    //=>ppk
    workbook.sheet(0).range('D'+(row+1)+':D'+(row+6)).value([['Pejabat Pembuat Komitmen,'], [''], [''], [''], [setting.ppk.nama], ['NIP '+setting.ppk._id]]);
    //=>>style
    workbook.sheet(0).cell('D'+(row+5)).style('underline', true);
    workbook.sheet(0).range('D'+(row+1)+':F'+(row+1)).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('D'+(row+5)+':F'+(row+5)).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('D'+(row+6)+':F'+(row+6)).merged(true).style('horizontalAlignment', 'center');


    //=>pembuat daftar
    console.log(spj)
    workbook.sheet(0).range('H'+row+':H'+(row+6)).value([['Jakarta, '+spj.tgl_buat_spj], ['Pembuat Daftar,'], [''], [''], [''], [spj.pembuat_daftar], ['NIP '+spj.pembuat_daftar_id]]);
    //=>>style
    workbook.sheet(0).cell('H'+(row+5)).style('underline', true);
    workbook.sheet(0).range('H'+row+':'+column[last_col-1]+row).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('H'+(row+1)+':'+column[last_col-1]+(row+1)).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('H'+(row+1)+':'+column[last_col-1]+(row+1)).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('H'+(row+5)+':'+column[last_col-1]+(row+5)).merged(true).style('horizontalAlignment', 'center');
    workbook.sheet(0).range('H'+(row+6)+':'+column[last_col-1]+(row+6)).merged(true).style('horizontalAlignment', 'center');
}

spj.get('/honor', function(req, res){
	Setting.findOne({type: 'spj'}).exec(function(err, result){
        console.log(result)
		if(result){
			res.render('spj/honor', {layout: false, admin: req.session.jenis, daftar: result.get('honor_daftar'), honor_detail_id: result.get('honor_detail_id'), pembuat_daftar_honor: result.get('pembuat_daftar_honor')});
		} else {
			res.render('spj/honor', {layout: false, admin: req.session.jenis});
		}
	})
});

spj.post('/honor', function(req, res){
	var form = new formidable.IncomingForm();
	var csv_name, file_path, tgl_buat_surat, xlsx, pdf, honor_detail_id, daftar, thang, tgl_buat_honor, pembuat_daftar, pembuat_daftar_id, data = [], header = {};
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
                    daftar = fields.daftar;
                    pembuat_daftar = fields.pembuat_daftar;
                    pembuat_daftar_id = fields.pembuat_daftar_id;
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
					if(!data.length){
						res.send('invalid')
						return;
					} else if (!data[0].nmr.toString().match(/^\d*$/) || !data[0].jml_sks.toString().match(/^\d*$/) || 
						!data[0].bruto.toString().match(/^\d*$/) || !data[0].diterima.toString().match(/^\d*$/)) {
						res.send('invalid')
						return;
					}
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
            function(cb){
                DetailBelanja.findOne( {_id: new ObjectId(honor_detail_id)}, 'nmitem kdprogram kdgiat kdoutput kdsoutput kdkmpnen kdskmpnen kdakun', function(err, detail){
                    header.detail = detail.nmitem;
                    Program.findOne( {kdprogram: detail.kdprogram, active: true}, 'uraian', function(err, prog){
                        header.prog = prog.uraian;
                        header.prog_title = 'PROGRAM (054.01.'+detail.kdprogram+')';
                        Kegiatan.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, active: true}, 'uraian', function(err, giat){
                            header.giat = giat.uraian;
                            header.giat_title = 'KEGIATAN ('+detail.kdgiat+')';
                            Output.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, active: true}, 'uraian', function(err, outp){
                                header.outp = outp.uraian;
                                header.outp_title = 'OUTPUT ('+detail.kdoutput+')';
                                Komponen.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput,
                                    kdkmpnen: detail.kdkmpnen, active: true}, 'urkmpnen', function(err, komp){
                                    header.komp = komp.urkmpnen;
                                    header.komp_title = 'KOMPONEN ('+detail.kdoutput+'.'+detail.kdkmpnen+')';
                                    Akun.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput,
                                    kdkmpnen: detail.kdkmpnen, kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun, active: true}, 'uraian', function(err, akun){
                                        header.akun = akun.uraian;
                                        header.akun_title = 'AKUN ('+detail.kdakun+')';
                                        cb(null, '')
                                    })
                                })
                            })
                        })
                    })
                })
            },
            function(cb){
                Setting.update({type: 'spj'}, {$set: {'honor_daftar': daftar.toUpperCase(), 'pembuat_daftar_honor': {'pembuat_daftar': pembuat_daftar, 'pembuat_daftar_id': pembuat_daftar_id}}}, {upsert: true}, function(err, result){
                    if(err) cb('error', null)
                        else cb(null,'sukses')
                })
            }
		], function(err, final){
			if(err){
				sendNotification(req.session.user_id, err);
				res.sendStatus(404)
				return;
			}
			// Load an existing workbook
			XlsxPopulate.fromFileAsync("./template/HonorTemplate.xlsx")
		    .then(workbook => {
                //Header
                workbook.definedName("daftar").value(daftar.toUpperCase());

                workbook.definedName("prog_title").value(header.prog_title.toUpperCase() || '');
                workbook.definedName("program").value(header.prog.toUpperCase() || '');

                workbook.definedName("giat_title").value(header.giat_title.toUpperCase() || '');
                workbook.definedName("kegiatan").value(header.giat.toUpperCase() || '');

                workbook.definedName("outp_title").value(header.outp_title.toUpperCase() || '');
                workbook.definedName("output").value(header.outp.toUpperCase() || '');

                workbook.definedName("komp_title").value(header.komp_title.toUpperCase() || '');
                workbook.definedName("komponen").value(header.komp.toUpperCase() || '');

                workbook.definedName("akun_title").value(header.akun_title.toUpperCase() || '');
                workbook.definedName("akun").value(header.akun.toUpperCase() || '');

		    	var row = 11;
		    	var nmr = 1;
		    	var sum_pos = 11;
                var last_sum_sisa_item = data.length;
                var last_sum, pair_sum;
                var sisa_item = data.length;
                var next_last_jlh_link = 32;
                var total_row_per_page = 23;
                var end = false;
		    	_.each(data, function(item, index, list){
		    		var r = workbook.sheet(0).range('A'+row+':J'+row);
                    workbook.sheet(0).row(row).height(24);
                    if((sisa_item >= 3 && (row == next_last_jlh_link || row == 32))){
                        total_row_per_page = 29;
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
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
                        workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                        workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                        //posisi checkpoint utk kalibrasi ttd
                        last_sum_sisa_item = sisa_item;

                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
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
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('F'+(row-1));
                        workbook.sheet(0).cell('G'+row).formula('G'+(row-1));
                        workbook.sheet(0).cell('H'+row).formula('H'+(row-1));
                        sum_pos = row;
                        next_last_jlh_link = sum_pos + total_row_per_page - 1;
                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                    }else if((total_row_per_page - last_sum_sisa_item) < 10 && (total_row_per_page - last_sum_sisa_item) >= -1 && sisa_item == 3 && !end){
                        end = true;
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
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
                        workbook.sheet(0).cell('G'+row).formula('SUM(G'+sum_pos+':G'+(row-1)+')');
                        workbook.sheet(0).cell('H'+row).formula('SUM(H'+sum_pos+':H'+(row-1)+')');
                        last_sum = row;
                        row++;
                        for (var i = 0; i < total_row_per_page - last_sum_sisa_item + 1; i++) {
                            workbook.sheet(0).row(row).height(24);
                            row++;
                        }
                        if(total_row_per_page - last_sum_sisa_item + 2 > 1){
                            pair_sum = row;
                        }
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
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
                        workbook.sheet(0).range('B'+row+':B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).cell('F'+row).formula('F'+last_sum);
                        workbook.sheet(0).cell('G'+row).formula('G'+last_sum);
                        workbook.sheet(0).cell('H'+row).formula('H'+last_sum);
                        sum_pos = row;
                        row++;
                        r = workbook.sheet(0).range('A'+row+':J'+row);
                        workbook.sheet(0).row(row).height(24);
                    }
                    //khusus row nama
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
		    			value.push('  '+nmr+'. ....')
		    		} else {
		    			value.push('  '+nmr+'. ....')
		    			value.push('')
		    		}
		    		r.value([value]);
		    		row++;
                    sisa_item--;
                    // console.log((sisa_item))
		    		nmr++;
		    	})
                //format uang
                workbook.sheet(0).range('E11'+':H'+(row-1)).style('numberFormat', '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)');
                workbook.sheet(0).range('A11'+':J'+(row-1)).style({'verticalAlignment': 'center', 'fontSize': 9});
                workbook.sheet(0).range('A11'+':A'+(row-1)).style('horizontalAlignment', 'center');
                workbook.sheet(0).range('C11'+':D'+(row-1)).style('horizontalAlignment', 'center');
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
	    		active_rows.style('border', true);
	    		var ttd_cols1 = workbook.sheet(0).range('I11'+':I'+(row));
	    		ttd_cols1.style({'leftBorder': true, 'rightBorder': false, 'bottomBorder': true, 'topBorder': true})
	    		var ttd_cols2 = workbook.sheet(0).range('J11'+':J'+(row));
	    		ttd_cols2.style({'leftBorder': false, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true})

                //row yang dilompat;
                if(pair_sum){
                    var jumped_rows = workbook.sheet(0).range('A'+(last_sum+1)+':J'+(pair_sum-1));
                    jumped_rows.style({'leftBorder': false, 'rightBorder': false, 'bottomBorder': false, 'topBorder': false})
                }

		    	var r = workbook.sheet(0).range('B'+(row+2)+':H'+(row+8));
		    	r.value([
		    		['Lunas pada tanggal',,'Setuju dibayar',,,,'Jakarta, '+tgl_buat_surat],
		    		['Bendahara Pengeluaran STIS',,'Pejabat Pembuat Komitmen',,,,'Pembuat Daftar,'],
		    		[,,,,,,],
		    		[,,,,,,],
		    		[,,,,,,],
		    		['('+setting.bendahara.nama.capitalize()+')',,'('+setting.ppk.nama.capitalize()+')',,,,'('+pembuat_daftar.capitalize()+')'],
		    		['NIP. '+setting.bendahara._id.capitalize(),,'NIP. '+setting.ppk._id.capitalize(),,,,'NIP. '+pembuat_daftar_id],
		    		]);
		    	r.style('fontSize', 11)

                workbook.sheet(0).range('D'+(row+2)+':G'+(row+2)).merged(true);
                workbook.sheet(0).range('D'+(row+3)+':G'+(row+3)).merged(true);
                workbook.sheet(0).range('D'+(row+7)+':G'+(row+7)).merged(true);
                workbook.sheet(0).range('D'+(row+8)+':G'+(row+8)).merged(true);

                workbook.sheet(0).range('H'+(row+2)+':J'+(row+2)).merged(true);
                workbook.sheet(0).range('H'+(row+3)+':J'+(row+3)).merged(true);
                workbook.sheet(0).range('H'+(row+7)+':J'+(row+7)).merged(true);
                workbook.sheet(0).range('H'+(row+8)+':J'+(row+8)).merged(true);

                workbook.sheet(0).range('D'+(row+2)+':G'+(row+8)).style('horizontalAlignment', 'center');
                workbook.sheet(0).range('H'+(row+2)+':J'+(row+8)).style('horizontalAlignment', 'center');

		    	workbook.sheet(0).range('B'+(row+7)+':H'+(row+7)).style('underline', true);
		    	workbook.sheet(0).range('B'+(row+8)+':H'+(row+8)).style('underline', false);

		    	workbook.definedName("periode").value(periode);
                checkDirAndCreate('./temp_file/');
		        return workbook.toFileAsync('./temp_file/'+file_name+'.xlsx');
		    }).then(dataa => {
		    	var pegs, css, sipadus;
		    	async.series([
		    		function(callb){
		    			msopdf(null, function(error, office) {
                        checkDirAndCreate('./temp_file/');
                        checkDirAndCreate('./template/output/spj/honor/');
						var input = './temp_file/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
						var output = './template/output/spj/honor/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

				    	if(xlsx){
				    		res.download(input);
				    		res.on('finish', function() {
								// hapus xlsx setelah didownload
								if(checkFS(input)){
                                    fs.unlink(input);
                                }
								setTimeout(function(){
									callb(null, '')
								}, 2000)
							});
				    	} else {
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
								if(pdf){
									res.download(output);
									res.on('finish', function() {
										// hapus pdf setelah didownload
										if(checkFS(output)){
                                            fs.unlink(output);
                                        }
										setTimeout(function(){
											callb(null, '')
										}, 2000)
									});
								}else{
									res.send(file_name+'.pdf');
									setTimeout(function(){
										if(checkFS(output)){
                                            fs.unlink(output);
                                        }
									}, 10000)
									setTimeout(function(){
										callb(null, '')
									}, 2000)
								} 							
							})
				    	}
						
						})
		    		},
		    		function(callb){
		    			Pegawai.find({active: true}, 'nama').exec(function(err, pegawai){
		    				pegs = pegawai;
		    				CustomEntity.find({type: 'Penerima', active: true}, 'nama', function(err, cust_ent){
		    					css = cust_ent;
		    					var query = 'SELECT * ' +
									'FROM dosen ' +
									'WHERE aktif = 1 AND unit <> "STIS"';
								var sipadu_db = mysql.createConnection({
									host: '127.0.0.1',
									user: 'root',
									password: '',
									database: 'sipadu_db'
								});
								sipadu_db.connect(function(err){
									sipadu_db.query(query, function (err, dosens, fields) {
										if (err) {
									        console.error(err);
									    }
										sipadus = _.map(dosens, function(o, key){return {_id: o.kode_dosen, nama: o.gelar_depan+((o.gelar_depan?' ':''))+o.nama+' '+o.gelar_belakang, unit: o.unit}});
										sipadu_db.end();
										callb(null, '');
									})
								})
		    				})
		    			})
		    		}

		    	], function(err, final){
		    		//link ke POK realisasi
		    		var research = [];
					_.each(data, function(item, i, list){
						var penerima_id, nama_penerima;

						async.series([
							//ambil id
							function(cb){
								var matched = getMatchEntity(data[i]['nama'], pegs);
								//jika ditemukan, ==> simpan
								if(matched){
									matched.target = data[i]['nama'];
									research.push({nama: matched.nama, target: data[i]['nama'], score: matched.score})
									penerima_id = matched._id;
									nama_penerima = matched.nama;
									cb(null, '');
								} else {
									var matched = getMatchEntity(data[i]['nama'], css);
									//jika ditemukan, ==> simpan
									if(matched){
										penerima_id = matched._id;
										nama_penerima = matched.nama;
										cb(null, '');
									} else {
										var matched = getMatchEntity(data[i]['nama'], sipadus);
										if(matched){
											CustomEntity.create({type:'Penerima', nama: data[i]['nama'], unit: matched.unit}, function(err, from_sipadu){
												penerima_id = from_sipadu._id;
												nama_penerima = matched.nama;
												cb(null, '');
											})
										} else {
											CustomEntity.create({type:'Penerima', nama: data[i]['nama']}, function(err, anonim){
												penerima_id = anonim._id;
												nama_penerima = data[i]['nama'];
												cb(null, '');
											})
										}
									}
								}
							}
						], function(err, final){
							// cek apakah sdh pernah tersimpan
					   		DetailBelanja.findOne({'thang': thang, '_id': honor_detail_id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': getNumber(data[i]['bruto']), 
								'tgl': tgl_buat_honor, penerima_id: penerima_id}).exec(function(err, result){
								//jika blm pernah
								if(!result){
									//init total, user
						    		var total_sampai_bln_ini = 0;
							    	var new_entry = {};
							    	new_entry.pengentry = req.session.username;
							    	new_entry.ket = '['+data[i]['nama']+'] SPJ Honor Dosen periode '+periode;
							    	new_entry.pph21 = data[i]['pph'];
							    	new_entry.penerima_nama = nama_penerima;
							    	new_entry.tgl = tgl_buat_honor;
							    	new_entry.tgl_timestamp = moment(tgl_buat_honor, "D MMMM YYYY").unix();
							    	new_entry.penerima_id = penerima_id;
							    	new_entry.jumlah = data[i]['bruto'];
							    	new_entry.timestamp = current_timestamp;
							    	// return;
							    	DetailBelanja.update({'thang': thang, "_id": honor_detail_id}, {$push: {"realisasi": new_entry}}, {new: true}, function(err, result){
							    		if (err) {
							    			console.log(err)
							    			return
							    		}
							    		sendNotification(req.session.user_id, 'Honor '+data[i]['nama']+' berhasil tercatat di realisasi.')
							    	})
								} else {
									sendNotification(req.session.user_id, 'Honor '+data[i]['nama']+' periode tsb sudah tercatat di realisasi.')
								}
							})
						})
					})

					//riwayat user
					User.update({_id: req.session.user_id}, {$push: {"act": {label: 'Buat SPJ Honor Dosen periode '+periode}}}, 
						function(err, status){
					})
		    	})
	        })
		}
	)
});

spj.get('/transport', function(req, res){
	Setting.findOne({type: 'spj'}).exec(function(err, result){
		if(result){
            res.render('spj/transport', {layout: false, admin: req.session.jenis, daftar: result.get('transport_daftar'), transport_detail_id: result.get('transport_detail_id'), pembuat_daftar_transport: result.get('pembuat_daftar_transport')});
		} else {
			res.render('spj/transport', {layout: false, admin: req.session.jenis});
		}
	})
});

spj.post('/transport', function(req, res){
	var form = new formidable.IncomingForm();
	var csv_name, file_path, daftar, pembuat_daftar, pembuat_daftar_id, tgl_buat_surat, xlsx, pdf, transport_detail_id, thang, tgl_buat_honor, header = {}, data = [];
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
                    daftar = fields.daftar;
                    pembuat_daftar = fields.pembuat_daftar;
                    pembuat_daftar_id = fields.pembuat_daftar_id;
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
					if(!data.length){
						res.send('invalid')
						return;
					} else if (data[0].field6 || !data[0].nmr.toString().match(/^\d*$/) || !data[0].jumlah.toString().match(/^\d*$/)) {
						res.send('invalid')
						return;
					}
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
            function(cb){
                DetailBelanja.findOne( {_id: new ObjectId(transport_detail_id)}, 'nmitem kdprogram kdgiat kdoutput kdsoutput kdkmpnen kdskmpnen kdakun', function(err, detail){
                    header.detail = detail.nmitem;
                    Program.findOne( {kdprogram: detail.kdprogram, active: true}, 'uraian', function(err, prog){
                        header.prog = prog.uraian;
                        header.prog_title = 'PROGRAM (054.01.'+detail.kdprogram+')';
                        Kegiatan.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, active: true}, 'uraian', function(err, giat){
                            header.giat = giat.uraian;
                            header.giat_title = 'KEGIATAN ('+detail.kdgiat+')';
                            Output.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, active: true}, 'uraian', function(err, outp){
                                header.outp = outp.uraian;
                                header.outp_title = 'OUTPUT ('+detail.kdoutput+')';
                                Komponen.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput, kdsoutput: detail.kdsoutput,
                                    kdkmpnen: detail.kdkmpnen, active: true}, 'urkmpnen', function(err, komp){
                                    header.komp = komp.urkmpnen;
                                    header.komp_title = 'KOMPONEN ('+detail.kdoutput+'.'+detail.kdkmpnen+')';
                                    Akun.findOne( {kdprogram: detail.kdprogram, kdgiat: detail.kdgiat, kdoutput: detail.kdoutput,
                                    kdkmpnen: detail.kdkmpnen, kdskmpnen: detail.kdskmpnen, kdakun: detail.kdakun, active: true}, 'uraian', function(err, akun){
                                        header.akun = akun.uraian;
                                        header.akun_title = 'AKUN ('+detail.kdakun+')';
                                        cb(null, '')
                                    })
                                })
                            })
                        })
                    })
                })
            },
            function(cb){
                Setting.update({type: 'spj'}, {$set: {'transport_daftar': daftar.toUpperCase(), 'pembuat_daftar_transport': {'pembuat_daftar': pembuat_daftar, 'pembuat_daftar_id': pembuat_daftar_id}}}, {upsert: true}, function(err, result){
                    if(err) cb('error', null)
                        else cb(null,'sukses')
                })
            }
		], function(err, final){
			// Load an existing workbook
			XlsxPopulate.fromFileAsync("./template/TransportTemplate.xlsx")
		    .then(workbook => {
                //Header
                workbook.definedName("daftar").value(daftar.toUpperCase());

                workbook.definedName("prog_title").value(header.prog_title.toUpperCase() || '');
                workbook.definedName("program").value(header.prog.toUpperCase() || '');

                workbook.definedName("giat_title").value(header.giat_title.toUpperCase() || '');
                workbook.definedName("kegiatan").value(header.giat.toUpperCase() || '');

                workbook.definedName("outp_title").value(header.outp_title.toUpperCase() || '');
                workbook.definedName("output").value(header.outp.toUpperCase() || '');

                workbook.definedName("komp_title").value(header.komp_title.toUpperCase() || '');
                workbook.definedName("komponen").value(header.komp.toUpperCase() || '');

                workbook.definedName("akun_title").value(header.akun_title.toUpperCase() || '');
                workbook.definedName("akun").value(header.akun.toUpperCase() || '');

                var row = 12;
                var nmr = 1;
                var sum_pos = 12;
                var last_sum_sisa_item = data.length;
                var last_sum, pair_sum;
                var sisa_item = data.length;
                var next_last_jlh_link = 33;
                var total_row_per_page = 23;
                var end = false;

		    	_.each(data, function(item, index, list){
		    		var r = workbook.sheet(0).range('A'+row+':H'+row);
		    		// if(row  == 33 || row == 61 || (row > 89 && (row % 29 == 3))){
                    if((sisa_item >= 3 && (row == next_last_jlh_link || row == 33))){
		    			total_row_per_page = 30;
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
                        //posisi checkpoint utk kalibrasi ttd
                        last_sum_sisa_item = sisa_item;

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
                        next_last_jlh_link = sum_pos + total_row_per_page - 1;
			    		workbook.sheet(0).row(row).height(24);
		    			row++;
		    			r = workbook.sheet(0).range('A'+row+':H'+row);
		    		} else if((total_row_per_page - last_sum_sisa_item) < 10 && (total_row_per_page - last_sum_sisa_item) >= -1 && sisa_item == 3 && !end){
                        end = true;
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
                        workbook.sheet(0).cell('F'+row).formula('SUM(F'+sum_pos+':F'+(row-1)+')');
                        workbook.sheet(0).cell('B'+row).style('horizontalAlignment', 'center');
                        workbook.sheet(0).row(row).height(24);
                        // sum_pos = row;
                        last_sum = row

                        row ++;

                        for (var i = 0; i < total_row_per_page - last_sum_sisa_item + 1; i++) {
                            workbook.sheet(0).row(row).height(24);
                            row++;
                        }
                        if(total_row_per_page - last_sum_sisa_item + 2 > 1){
                            pair_sum = row;
                        }

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
                        workbook.sheet(0).cell('F'+row).formula('F'+(last_sum));
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
                    sisa_item--;
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
                console.log(row)
	    		var active_rows = workbook.sheet(0).range('A12'+':H'+row);
	    		active_rows.style({'border': true, 'fontSize': 9, 'verticalAlignment': 'center'})
	    		var ttd_cols1 = workbook.sheet(0).range('G12'+':G'+(row));
	    		ttd_cols1.style({'leftBorder': true, 'rightBorder': false, 'bottomBorder': true, 'topBorder': true, 'fontSize': 9, 'verticalAlignment': 'center'})
	    		var ttd_cols2 = workbook.sheet(0).range('H12'+':H'+(row));
	    		ttd_cols2.style({'leftBorder': false, 'rightBorder': true, 'bottomBorder': true, 'topBorder': true, 'fontSize': 9, 'verticalAlignment': 'center'})

                //row yang dilompat;
                if(pair_sum){
                    var jumped_rows = workbook.sheet(0).range('A'+(last_sum+1)+':H'+(pair_sum-1));
                    jumped_rows.style({'leftBorder': false, 'rightBorder': false, 'bottomBorder': false, 'topBorder': false})
                }

	    		var format_uang = workbook.sheet(0).range('E12'+':F'+(row+1));
	    		format_uang.style('numberFormat', '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)')

		    	var r = workbook.sheet(0).range('B'+(row+2)+':F'+(row+8));
		    	r.value([
		    		['Lunas pada tanggal','Setuju dibayar',,,'Jakarta, '+tgl_buat_surat],
		    		['Bendahara Pengeluaran STIS','Pejabat Pembuat Komitmen',,,'Pembuat Daftar,'],
		    		[,,,,],
		    		[,,,,],
		    		[,,,,],
		    		['('+setting.bendahara.nama.capitalize()+')','('+setting.ppk.nama.capitalize()+')',,,'('+pembuat_daftar.capitalize()+')'],
		    		['NIP. '+setting.bendahara._id+'','NIP. '+setting.bendahara._id+'',,,'NIP. '+pembuat_daftar_id],
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

		    	// if(data.length > 43){
	    		// 	workbook.sheet(0).range('A56:H68').style({'leftBorder': false, 'rightBorder': false, 'bottomBorder': false, 'topBorder': false});
	    		// }

		    	workbook.definedName("periode").value(periode)	  
                checkDirAndCreate('./temp_file/');      
		        return workbook.toFileAsync('./temp_file/'+file_name+'.xlsx');
		    }).then(dataa => {
		    	var pegs, css, sipadus;
		    	async.series([
		    		function(callb){
		    			msopdf(null, function(error, office) {
                        checkDirAndCreate('./temp_file/');
                        checkDirAndCreate('./template/output/spj/transport/');
						var input = './temp_file/'+file_name+'.xlsx';//__dirname + '/../temp_file/'+file_name+'.xlsx';
						var output = './template/output/spj/transport/'+file_name+'.pdf';//__dirname + '/../temp_file/'+file_name+'.pdf';

				    	if(xlsx){
				    		res.download(input);
				    		res.on('finish', function() {
								// hapus xlsx setelah didownload
								if(checkFS(input)){
                                    fs.unlink(input);
                                }
								setTimeout(function(){
									callb(null, '')
								}, 2000)
							});
				    	} else {
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
								if(pdf){
									res.download(output);
									res.on('finish', function() {
										// hapus pdf setelah didownload
										if(checkFS(output)){
                                            fs.unlink(output);
                                        }
										setTimeout(function(){
											callb(null, '')
										}, 2000)
									});
								}else{
									res.send(file_name+'.pdf');
									setTimeout(function(){
										if(checkFS(output)){
                                            fs.unlink(output);
                                        }
									}, 10000)
									setTimeout(function(){
										callb(null, '')
									}, 2000)
								} 							
							})
				    	}
						
					})
		    		},
		    		function(callb){
		    			Pegawai.find({active: true}, 'nama').exec(function(err, pegawai){
		    				pegs = pegawai;
		    				CustomEntity.find({type: 'Penerima', active: true}, 'nama', function(err, cust_ent){
		    					css = cust_ent;
		    					var query = 'SELECT * ' +
									'FROM dosen ' +
									'WHERE aktif = 1 AND unit <> "STIS"';
								var sipadu_db = mysql.createConnection({
									host: '127.0.0.1',
									user: 'root',
									password: '',
									database: 'sipadu_db'
								});
								sipadu_db.connect(function(err){
									sipadu_db.query(query, function (err, dosens, fields) {
										if (err) {
									        console.error(err);
									    }
										sipadus = _.map(dosens, function(o, key){return {_id: o.kode_dosen, nama: o.gelar_depan+((o.gelar_depan?' ':''))+o.nama+' '+o.gelar_belakang, unit: o.unit}});
										sipadu_db.end();
										callb(null, '');
									})
								})
		    				})
		    			})
		    		}
		    	], function(err, final){
		    		//link ke POK realisasi
					_.each(data, function(item, i, list){
						var penerima_id, nama_penerima;

						async.series([
							//ambil id
							function(cb){
								var matched = getMatchEntity(data[i]['nama'], pegs);
								//jika ditemukan, ==> simpan
								if(matched){
									penerima_id = matched._id;
									nama_penerima = matched.nama;
									cb(null, '');
								} else {
									var matched = getMatchEntity(data[i]['nama'], css);
									//jika ditemukan, ==> simpan
									if(matched){
										penerima_id = matched._id;
										nama_penerima = matched.nama;
										cb(null, '');
									} else {
										var matched = getMatchEntity(data[i]['nama'], sipadus);
										if(matched){
											CustomEntity.create({type:'Penerima', nama: data[i]['nama'], unit: matched.unit}, function(err, from_sipadu){
												penerima_id = from_sipadu._id;
												nama_penerima = matched.nama;
												cb(null, '');
											})
										} else {
											CustomEntity.create({type:'Penerima', nama: data[i]['nama']}, function(err, anonim){
												penerima_id = anonim._id;
												nama_penerima = data[i]['nama'];
												cb(null, '');
											})
										}
									}
								}
							}
						], function(err, final){
							// cek apakah sdh pernah tersimpan
					   		DetailBelanja.findOne({'thang': thang, '_id': transport_detail_id, active: true}, 'realisasi').elemMatch('realisasi', {'jumlah': getNumber(data[i]['jumlah'] * 150000), 
								'tgl': tgl_buat_honor, 'penerima_id': penerima_id}).exec(function(err, result){
									//jika blm pernah
									if(!result){
										//init total, user
							    		var total_sampai_bln_ini = 0;
								    	var new_entry = {};
								    	new_entry.pengentry = req.session.username;
								    	new_entry.ket = '['+data[i]['nama']+'] SPJ Transport Dosen periode '+periode;
								    	// new_entry.bukti_no = '';// data.bukti_no || '';
								    	// new_entry.spm_no = '';// data.spm_no || '';
								    	new_entry.penerima_nama = nama_penerima;
								    	new_entry.tgl = tgl_buat_honor;
							    		new_entry.tgl_timestamp = moment(tgl_buat_honor, "D MMMM YYYY").unix();
								    	new_entry.penerima_id = penerima_id;
								    	new_entry.jumlah = data[i]['jumlah'] * 150000;
								    	new_entry.timestamp = current_timestamp;
								    	DetailBelanja.update({'thang': thang, "_id": transport_detail_id}, {$push: {"realisasi": new_entry}}, {new: true}, function(err, result){
								    		if (err) {
								    			console.log(err)
								    			return
								    		}
								    	})
									} else {
										sendNotification(req.session.user_id, 'Transport tsb untuk '+data[i]['nama']+' pernah tercatat di realisasi.')
									}
							})
						})
					})

					// //riwayat user
					User.update({_id: req.session.user_id}, {$push: {"act": {label: 'Buat SPJ Transport Dosen Non STIS periode '+periode}}}, 
						function(err, status){
					})
		    	})
	        })
		}
	)
});

spj.get('/spj_lainnya', function(req, res){
	res.render('spj/lainnya', {layout: false, admin: req.session.jenis});
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

function getMatchEntity(name, entities){
	name = name.replace(/^\s*/g, '').replace(/^\w{2}\.?\s|^\w{2}\.\s?|\s?\,.*$|\s\w{1,3}\.\s?\w{1,4}\.?|\s\w{2}$/g, '');
	var p = [];
	_.each(entities, function(e, index, list){
		e.score = clj_fuzzy.metrics.jaro_winkler(capitalize(name).replace(/\.|\,|\'|\s/g, ''), capitalize(e.nama).replace(/^\w{2}\.?\s|^\w{2}\.\s?|\s?\,.*$|\s\w{1,3}\.\s?\w{1,4}\.?|\s\w{2}$/g, '').replace(/\.|\,|\'|\s/g, ''));
		p.push(e);
	})

	var matched = _.max(p, function(e){ return e.score; })

	if(matched.score >= 0.91){
		return matched;
	} else {
		return null;
	}
}

function capitalize(s){
    return s.toLowerCase().replace( /.*/g, function(a){ return a.toUpperCase(); } );
};

function sendNotification(user_id, message){
	if(_.isString(user_id)) spj.connections[user_id].emit('messages', message)
		else user_id.emit('messages', message)
}

function checkDirAndCreate(addr){
    if (!fs.existsSync(addr)){
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

module.exports = spj;