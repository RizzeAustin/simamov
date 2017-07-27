use simamov;
// show collections
// db.user.remove({jenis:0})
// db.user.find({})
// db.user.insert({_id: 'admin', password: '9a9e0d33fa0d884224f816e2e9691ee9267208399d18d17095253555791fa975', display_name: "Admin"})
// db.surat_tugas_biasa.findOne();

// db.old_pok_detailBelanja.drop()
// db.old_pok_akun.drop()
// db.old_pok_sub_komponen.drop()
// db.old_pok_komponen.drop()
// db.old_pok_sub_output.drop()
// db.old_pok_output.drop()
// db.old_pok_kegiatan.drop()
// db.old_pok_program.drop()
// show collections
// db.sppd.findOne({})

// db.pok_detailBelanja.drop()
// db.pok_akun.drop()
// db.pok_sub_komponen.drop()
// db.pok_komponen.drop()
// db.pok_sub_output.drop()
// db.pok_output.drop()
// db.pok_kegiatan.drop()
// db.pok_program.drop()
// db.setting.remove({type:'spj'})
// db.custom_entity.drop()
// db.pegawai.drop()
// db.setting.drop()
// db.perhitungan.drop()
// db.surat_tugas.drop()

// db.custom_entity.find({nama: 'Lukman Azhari, SST'}).pretty()
// db.kab.find().pretty()
// db.pok_uraian_akun.find({thang: '2017'})
// db.representasi.find().pretty()
// db.perhitungan.find().pretty()
// db.surat_tugas.find().pretty()
// db.setting.find().pretty()
// db.pok_uraian_akun.update({}, {$set: {thang: 2016}}, {multi: true})
// db.pok_detailBelanja.find().pretty()
// db.pok_akun.findOne()
// db.pok_sub_komponen.findOne()
// db.pok_komponen.findOne()
// db.pok_sub_output.findOne()
// db.pok_output.findOne()
// db.pok_kegiatan.find()
// db.pok_program.findOne()
// db.kab.drop()

// db.old_pok_detailBelanja.find()
// db.old_pok_akun.findOne({'kdkmpnen': '002'})
// db.old_pok_sub_komponen.findOne()
// db.old_pok_komponen.findOne()
// db.old_pok_sub_output.findOne()
// db.old_pok_output.findOne()
// db.old_pok_kegiatan.findOne()
// db.old_pok_program.findOne() 1498667824 1498588982518

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