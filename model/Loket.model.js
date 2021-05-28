const { ObjectID } = require('bson');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'idUsulan': String,
    'thang': Number,
    'active': {
        type: Boolean,
        default: true
    },
    'nomorTransaksi': String,
    'jabatan': String,
    'unit': {
        'nama': String,
        'kode': String,
    },
    'operator': String,
    'email': String,
    'pok': {
        'kdprogram': String,
        'uraianProgram': String,
        'kdaktivitas': String,
        'uraianAktivitas': String,
        'kdkro': String,
        'uraianKro': String,
        'kdro': String,
        'uraianRo': String,
        'kdkomponen': String,
        'uraianKomponen': String,
        'kdsubkomponen': String,
        'uraianSubKomponen': String,
        'kdakun': String,
        'uraianAkun': String,
        'detil': {
            'u1': String,
            'n1': Number,
            'u2': String,
            'n2': Number,
            'u3': String,
            'n3': Number,
            'u4': String,
            'n4': Number,
            'u5': String,
            'n5': Number,
        },
    },
    'detail': String,
    'nilai': {
        'bruto': Number,
        'pajak': Number,
        'transfer': Number,
    },
    'checklist': {
        'spj': [{ type: Boolean }],
        'daftarHadir': [{ type: Boolean }],
        'dokumentasi': [{ type: Boolean }],
        'notulensi': [{ type: Boolean }],
        'cvNarasumber': [{ type: Boolean }],
    },
    'fileSpj': String,
    'dokumenBank': String,
    'spp': String, //sudah, belum
    'catatan': {
        'ppk': String,
        'ppspm': String,
        'reviewer': String,
    },
    'metodeTransfer': String,
    'statusTransfer': String, //sudah
    'tanggal': {
        'pengajuan': Date,
        'pelaksanaan': Date,
        'transfer': Date,
        'selesai': Date,
    },
    'posisi': String, //verifikator, ppk, ppspm, reviewer, bendahara, operatorBank
    'status': String, //belum selesai, selesai, dikembalikan ke unit

}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);