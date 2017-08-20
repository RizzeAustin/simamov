use simamov;
// show collections
// db.user.update({_id: ObjectId('597d4b39094160252c595640')}, {$set:{jenis: 1}})
// db.user.find().pretty()
// db.custom_entity.find({nip: '13.7960'}).pretty()
// db.pegawai.find({}).pretty()
// db.spj.find({})
// db.user.find().pretty()
// db.pegawai.update({}, {$set: {active: true}}, {multi: true});
// db.custom_entity.findOne()

// db.pok_detailBelanja.findOne({nmitem: '-     dosen dan asisten dosen (Transport Lokal)'})
// show collections
// db.sppd.findOne({})
//==================================================
// db.pok_detailBelanja.drop()
// db.pok_akun.drop()
// db.pok_sub_komponen.drop()
// db.pok_komponen.drop()
// db.pok_sub_output.drop()
// db.pok_output.drop()
// db.pok_kegiatan.drop()
// db.pok_program.drop()
// db.setting.drop()
// db.custom_entity.drop()
// db.surat_tugas.drop()
// db.surat_tugas_biasa.drop()
// db.perhitungan.drop()
// db.setting_sppd.drop()
//==================================================
// db.custom_entity.insert({nama: 'Abdul Ghofar S.Si, MTI.', type: 'Penerima'})
// db.setting_sppd.findOne()

// db.pegawai.drop()
// db.setting.drop()
// db.perhitungan.drop()
// db.surat_tugas.find()

// db.setting_sppd.update({}, {$set: {last_nmr_surat: 897}})
// db.setting_sppd.findOne()

// db.custom_entity.find({type: 'tugas'}).pretty()
// db.kab.find().pretty()
// db.pok_uraian_akun.find({thang: '2017'})
// db.representasi.find().pretty()
// db.representasi.insert({
// 	"_id" : "pejabat_negara",
// 	"uraian" : "Pejabat Negara",
// 	"dalam_kota" : 125000,
// 	"luar_kota" : 250000
// })
// db.representasi.insert({
// 	"_id" : "eselon2",
// 	"uraian" : "Pejabat Eselon II",
// 	"luar_kota" : 150000,
// 	"dalam_kota" : 75000
// })
// db.representasi.insert({
// 	"_id" : "eselon1",
// 	"uraian" : "Pejabat Eselon I",
// 	"luar_kota" : 200000,
// 	"dalam_kota" : 100000
// })
// db.perhitungan.find().pretty()
// db.surat_tugas.find().pretty()
// db.surat_tugas_biasa.drop()
// db.setting.find().pretty()
// db.pok_uraian_akun.drop()
// db.pok_detailBelanja.find({_id: ObjectId('5986b1f0b25dce2bb0210250')}).pretty()
// db.pok_akun.find().pretty()
// db.pok_sub_komponen.find().pretty()
// db.pok_komponen.find().length()
// db.pok_sub_output.findOne()
// db.pok_output.findOne()
// db.pok_kegiatan.find()
// db.pok_program.findOne()
// db.kab.drop()

// db.pok_detailBelanja.aggregate(
//    [
//      {
//        $group:
//          {
//          	_id: {'kd':"$kdprogram", 'act':"$active"},
//            totalAmount: { $sum: "$jumlah" }
//          }
//      }
//    ]
// )

// show collections
// pok_detailBelanja v
// pok_akun
// pok_komponen v
// pok_output
// pok_kegiatan
// pok_program

// {
// 	"_id" : "521211.1",
// 	"version" : "1",
// 	"version_comment" : "Original",
// 	"create_date" : ISODate("2017-03-15T17:08:44.215Z"),
// 	"uraian" : "konsumsi seminar proposal penelitian (Snack)",
// 	"vol" : 675,
// 	"sat" : "O-K",
// 	"hrg_satuan" : 100000,
// 	"jlh" : 67500000,
// 	"old_ver" : [ ]
// }

// var items;

	// async.series([
	// 	function(cb){
	// 		//ambil semua custom entity (type: Penerima)
	// 		CustomEntity.find({type: 'Penerima', active: true}, function(err, aaaaaa){
	// 			items = aaaaaa;
	// 			cb(null, '')
	// 		})
	// 	},
	// 	function(cb){
	// 		var task = [];

	// 		_.each(items, function(item, idx, list){
	// 			task.push(
	// 				function(callb){
	// 					CustomEntity.findOne({_id: new ObjectId(item._id)}, function(err, isExist){
	// 						if(isExist){
	// 							//cek apakah ada yg sama namanya
	// 							CustomEntity.find({nama: item.nama, _id: {$ne: item._id}}, function(err, same_items){
	// 								var task2 = [];

	// 								_.each(same_items, function(it, idx, list){
	// 									//iterasi utk setiap yg sama
	// 									task2.push(
	// 										function(clb){
	// 											console.log(item._id, '>', it._id);
	// 											DetailBelanja.find({'thang': 2017, active: true}, 'realisasi').elemMatch('realisasi', {'penerima_id': it._id}).exec(function(err, result){
	// 							    					if(!result){
	// 							    						//simpan
	// 							    						clb(null, '')
	// 							    					} else {
	// 							    						var tsk = [];
	// 							    						_.each(result, function(detail, idx, list){
	// 							    							_.each(detail.realisasi, function(real, idx, list){
	// 							    								tsk.push(
	// 							    									function(clbk){
	// 								    									if(it._id == real.penerima_id){
	// 										    								real.penerima_id = item._id;
	// 										    								detail.save(function(err){
	// 										    									clbk(null, '')
	// 										    								});
	// 										    							} else {
	// 										    								clbk(null, '')
	// 										    							}
	// 								    								}
	// 							    								)
	// 								    						})
	// 							    						})
	// 							    						async.series(tsk, function(err, final){
	// 							    							clb(null, '')
	// 							    						})
	// 							    					}
	// 							    			})
	// 										}
	// 									)
	// 									//ganti semua penerima_id dgn item id
	// 									//hapus it
	// 								})

	// 								async.series(task2, function(err, final){
	// 									var task_a = [];
	// 									_.each(same_items, function(it, idx, list){
	// 										task_a.push(
	// 											function(callbck){
	// 												CustomEntity.remove({_id: new ObjectId(it._id)}, function(err, status){
	// 													callbck(null, '')
	// 												})
	// 											}
	// 										)
	// 									})

	// 									async.series(task_a, function(err, final){
	// 										callb(null, '')
	// 									})
	// 								})
									
	// 							})
	// 						} else {
	// 							callb(null, '')
	// 						}
	// 					})
	// 				}
	// 			)
	// 		})

	// 		async.series(task, function(err, final){
	// 			cb(null, '')
	// 		})
	// 	}

	// ], function(err, final){
	// 	console.log('finish')
	// })