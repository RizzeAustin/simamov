var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ProgramSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'kdprogram': String,
    'uraian': String,
    'jumlah': Number,
    'timestamp': Number,
    'active': {
        default: true,
        type: Boolean
    },
    'old': [],
    'pengentry': {
        type: String,
        ref: 'User'
    }
}, { collection: 'pok_program' });

ProgramSchema.methods.isExist = function(cb) {
    return this.model('Program').findOne({ thang: this.thang, 'kdprogram': this.kdprogram }, cb);
};

module.exports = mongoose.model('Program', ProgramSchema);