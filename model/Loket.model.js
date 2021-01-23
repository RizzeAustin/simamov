const { date } = require('jszip/lib/defaults');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'nomorTransaksi': String,
    'unit': String,
    'kodeUnit': String,
    'operator': String,
    'kdprogram': String,
    'kdkegiatan': String,
    'kdoutput': String,
    'kdsoutput': String,
    'kdkomponen': String,
    'kdskomponen': String,
    'kdakun': String,
    'detail': String,
    'nilaiPengajuan': Number,
    'checklist': {
        'spj': [{ type: Boolean }],
        'daftarHadir': [{ type: Boolean }],
        'dokumentasi': [{ type: Boolean }],
        'notulensi': [{ type: Boolean }],
        'cvNarasumber': [{ type: Boolean }],
    },
    'fileSpj': Buffer,
    'spp': String,
    'catatanPetugas': {
        'ppk': String,
        'ppspm': String,
        'reviewer': String,
    },
    'metodeTransfer': String,
    'nilaiPajak': Number,
    'nilaiTransfer': Number,
    'statusTransfer': String,
    'tanggal': {
        'pengajuan': String,
        'pelaksanaan': String,
        'transfer': String,
        'selesai': String,
    },
    'posisi': String,
    'status': String,


}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);