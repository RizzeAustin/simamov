var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UnitSchema = new Schema({
    'namaUnit': String,
    active: {
        type: Boolean,
        default: true
    },
    'created_at': {
        type: Date,
        default: new Date(),
    },
}, { collection: 'unit' });

module.exports = mongoose.model('Unit', UnitSchema);