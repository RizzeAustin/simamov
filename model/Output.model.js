var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var OutputSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'kdprogram': String,
    'kdgiat': String,
    'kdoutput': String,
    'vol': Number,
    'satkeg': String,
    uraian: String,
    jumlah: Number,
    timestamp: Number,
    active: {
        default: true,
        type: Boolean
    },
    old: [],
    pengentry: {
        type: String,
        ref: 'User'
    }
}, { collection: 'pok_output' });

OutputSchema.methods.isExist = function(cb) {
    return this.model('Output').findOne({ thang: this.thang, 'kdprogram': this.kdprogram, 'kdgiat': this.kdgiat, 'kdoutput': this.kdoutput }, cb);
};

OutputSchema.statics.getAll = function(cb) {
  return this.model('Output').find({}, null, {sort: {_id:1}}, cb);
};

module.exports = mongoose.model('Output', OutputSchema);