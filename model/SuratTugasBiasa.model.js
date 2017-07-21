var fs = require('fs');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SuratTugasBiasaSchema = new Schema({
    "_id" : Number,
    "tahun" : Number,

    "anggota": [{
        _id: String,
        value: String
    }],
    "lokasi": {
        type: String,
        ref: 'CustomEntity'
    },

    "nama_lengkap" : {
        type: String,
        ref: 'Pegawai'
    },

    "tgl_berangkat" : String,
    "tgl_kembali" : String,

    "tgl_ttd_st" : String,

    "ttd_surat_tugas" : {
        type: String,
        ref: 'Pegawai'
    },
    "ttd_legalitas" : {
        type: String,
        ref: 'Pegawai'
    },

    "tugas": String,
    "timestamp": {
        type: Number,
        default: Math.round(new Date().getTime()/1000)
    }
}, { collection: 'surat_tugas_biasa' });

SuratTugasBiasaSchema.statics.getAll = function(cb) {
  return this.model('SuratTugasBiasa').find({}, null, {sort: {_id:1}}, cb);
};

SuratTugasBiasaSchema.virtual('atas_nama_ketua_stis').get(function () {
    var atas_nama_ketua_stis = "";

    if(this.ttd_surat_tugas.jabatan == "Ketua STIS" || this.ttd_surat_tugas.jabatan == "Ketua Sekolah Tinggi Ilmu Statistik"){
        atas_nama_ketua_stis = "Ketua Sekolah Tinggi Ilmu Statistik";
        this.ttd_surat_tugas.jabatan = '';
    } else{
        atas_nama_ketua_stis = "A.n. Ketua Sekolah Tinggi Ilmu Statistik";
        this.ttd_surat_tugas.jabatan = this.ttd_surat_tugas.jabatan+',';
    }
    return atas_nama_ketua_stis;
});

SuratTugasBiasaSchema.virtual('waktu_pelaksanaan').get(function () {
    var wkt = '';
    if(this.tgl_berangkat == this.tgl_kembali){
        wkt = this.tgl_berangkat;
    } else{
        wkt = this.tgl_berangkat.match(/^\d*\s/)[0]+'- '+this.tgl_kembali;
    }
    return wkt;
});

module.exports = mongoose.model('SuratTugasBiasa', SuratTugasBiasaSchema);