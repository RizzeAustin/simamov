var fs = require('fs');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SuratTugasSchema = new Schema({
    "_id": Number,

    "tugas": String,
    "output": String,
    "kode_output": String,

    "org": {
        type: String,
        ref: 'CustomEntity'
    },
    "prov": {
        type: String,
        ref: 'Prov'
    },
    "kab": {
        type: String,
        ref: 'Kab'
    },

    "posisi_kota": String,

    "tgl_berangkat": String,
    "tgl_kembali": String,
    "jumlah_hari": Number,

    "jenis_ang": String,

    "ttd_surat_tugas": {
        type: String,
        ref: 'Pegawai'
    },
    "ttd_legalitas": {
        type: String,
        ref: 'Pegawai'
    },
    "tgl_ttd_st": String,

    "nama_lengkap": {
        type: String,
        ref: 'Pegawai'
    },
    "timestamp": {
        type: Number,
        default: Math.round(new Date().getTime() / 1000),
    }
}, { collection: 'surat_tugas' });

SuratTugasSchema.virtual('nomor_surat').get(function() {
    return this._id + '/SPD/STIS/' + this.tgl_berangkat.match(/\d{4}$/)[0];
});

SuratTugasSchema.virtual('atas_nama_ketua_stis').get(function() {
    var atas_nama_ketua_stis = "";

    if (this.ttd_surat_tugas.jabatan == "Ketua STIS" || this.ttd_surat_tugas.jabatan == "Direktur Politeknik Statistika STIS") {
        atas_nama_ketua_stis = "Direktur Politeknik Statistika STIS";
        this.ttd_surat_tugas.jabatan = '';
    } else {
        atas_nama_ketua_stis = "A.n. Direktur Politeknik Statistika STIS";
        this.ttd_surat_tugas.jabatan = this.ttd_surat_tugas.jabatan + ',';
    }
    return atas_nama_ketua_stis;
});

SuratTugasSchema.virtual('lokasi').get(function() {

    // this.populate('prov kab org', function(err, result){
    var lokasi_ = [];

    if (this.org) {
        lokasi_.push(this.org.nama);
    }

    if (this.kab) {
        lokasi_.push(this.kab.nama)
    }

    if (this.prov) {
        lokasi_.push(this.prov.nama)
    }

    return lokasi_.join(", ");
    // })

});

SuratTugasSchema.statics.getAll = function(cb) {
    return this.model('SuratTugas').find({}, null, { sort: { _id: 1 } }, cb);
};

SuratTugasSchema.methods.getSurat = function() {
    var sppdTemplate = fs.readFileSync(__dirname + "/../template/surat_tugas.docx", "binary");
    return fileName;
}

module.exports = mongoose.model('SuratTugas', SuratTugasSchema);