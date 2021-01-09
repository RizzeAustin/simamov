const { date } = require('jszip/lib/defaults');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'tanggalpersetujuan': {
        'validator': Date,
        'reviewer': Date,
        'bendahara': Date,
        'bank': Date,
        'arsiparis': Date,
    },
    'jumlah': Number,
    'keterangandana': String,
    'dokumen': {
        'A': Boolean,
        'B': Boolean,
        'C': Boolean,
    },
    'status': {
        type: String,
        default: 'validator'
    },
    'timestamp': {
        type: Number,
        required: true
    },
    'pengentry': {
        type: String,
        ref: 'User'
    },
    'unit': String,
    'namapetugas': {
        'validator': String,
        'reviewer': String,
        'bendahara': String,
        'bank': String,
        'arsiparis': String,
    },
    'keteranganpetugas': String,
    'kdprogram': String,
    'kdkegiatan': String,
    'kdoutput': String,
    'kdsoutput': String,
    'kdkomponen': String,
    'kdskomponen': String,
    'kdakun': String,
    'detail': String,
}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);