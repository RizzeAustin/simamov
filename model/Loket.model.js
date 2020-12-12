var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var LoketSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'kdprogram': String,
    'kdgiat': String,
    'kdoutput': String,
    'kdsoutput': String,
    'kdkmpnen': String,
    'kdskmpnen': String,
    'kdakun': String,
    // 'noitem': Number,
    'uraian': String,
    'uraianbaru': String,
    'jumlah': Number,
    'status': {
        type: String,
        default: 'menunggu'
    },
    'ditolak': Array,
    'timestamp': {
        type: Number,
        required: true
    },
    'pengentry': {
        type: String,
        ref: 'User'
    }
}, { collection: 'loket', strict: false });

module.exports = mongoose.model('Loket', LoketSchema);