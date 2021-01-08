const { date } = require('jszip/lib/defaults');
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'tanggalpersetujuan':{
        'validator': Date,
        'reviewer': Date,
        'bendahara': Date,
        'ditolak': Array,
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
        default: 'validasi'
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
    'namapetugas': String,
    'keteranganpetugas': String,
}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);