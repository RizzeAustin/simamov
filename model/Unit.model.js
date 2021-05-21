var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UnitSchema = new Schema({
    'namaUnit': String,
    'kodeUnit': String,
    active: {
        type: Boolean,
        default: true
    },
}, { collection: 'unit' });

module.exports = mongoose.model('Unit', UnitSchema);