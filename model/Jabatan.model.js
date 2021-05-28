var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var JabatanSchema = new Schema({
    'kodeJabatan': String,
    'namaJabatan': String,
    active: {
        type: Boolean,
        default: true
    },
    'created_at': {
        type: Date,
        default: new Date(),
    },
}, { collection: 'jabatan' });

module.exports = mongoose.model('Jabatan', JabatanSchema);