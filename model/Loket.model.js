const { date } = require('jszip/lib/defaults');
const { string } = require('jszip/lib/support');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'active': {
        type: Boolean,
        default: true
    },
    'nomorTransaksi': String,
    'unit': String,
    'kodeUnit': String,
    'operator': String,
    'kdprogram': String,
    'uraianProgram': String,
    'kdkegiatan': String,
    'uraianKegiatan': String,
    'kdoutput': String,
    'uraianOutput': String,
    'kdkomponen': String,
    'uraianKomponen': String,
    'kdakun': String,
    'uraianAkun': String,
    'uraianDetail': String,
    'detail': String,
    'nilaiPengajuan': Number,
    'checklist': {
        'spj': [{ type: Boolean }],
        'daftarHadir': [{ type: Boolean }],
        'dokumentasi': [{ type: Boolean }],
        'notulensi': [{ type: Boolean }],
        'cvNarasumber': [{ type: Boolean }],
    },
    'fileSpj': String,
    'spp': String, //sudah
    'catatan': {
        'ppk': String,
        'ppspm': String,
        'reviewer': String,
    },
    'metodeTransfer': String,
    'nilaiPajak': Number,
    'nilaiTransfer': Number,
    'statusTransfer': String, //sudah
    'tanggal': {
        'pengajuan': Date,
        'pelaksanaan': Date,
        'transfer': Date,
        'selesai': Date,
    },
    'posisi': String, //verifikator, ppk, ppspm, reviewer, bendahara, operatorBank
    'status': String, //belum selesai, selesai, dikembalikan ke unit, dibatalkan


}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);