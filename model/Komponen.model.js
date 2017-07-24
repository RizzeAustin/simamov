var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var KomponenSchema = new Schema({
    'thang': {
        type: Number,
        default: new Date().getFullYear()
    },
    'kdprogram': String,
    'kdgiat': String,
    'kdoutput': String,
    'kdsoutput': String,
    'kdkmpnen': String,
    'urkmpnen': String,
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
}, { collection: 'pok_komponen' });

KomponenSchema.methods.isExist = function(cb) {
    return this.model('Komponen').findOne({ thang: this.thang, 'kdprogram': this.kdprogram, 'kdgiat': this.kdgiat, 'kdoutput': this.kdoutput, 
        'kdsoutput': this.kdsoutput, 'kdkmpnen': this.kdkmpnen }, cb);
};

KomponenSchema.statics.getAll = function(cb) {
  return this.model('Komponen').find({}, null, {sort: {_id:1}}, cb);
};

module.exports = mongoose.model('Komponen', KomponenSchema);