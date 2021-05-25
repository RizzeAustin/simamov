var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var RoleSchema = new Schema({
    'kodeJabatan': String,
    'kodeRole': String,
    'namaRole': String,
    active: {
        type: Boolean,
        default: true
    },
    'created_at': {
        type: Date,
        default: new Date(),
    },
}, { collection: 'role' });

module.exports = mongoose.model('Role', RoleSchema);