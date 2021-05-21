var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var ProvSchema = new Schema({
    "_id" : String,
    "nama" : String,
    taksi_dn: Number,
    har_dn_lk: Number,
    har_dn_dk: Number,
    har_dn_dik: Number,
    inap_dn_es1: Number,
    inap_dn_es2: Number,
    inap_dn_es3_g4: Number,
    inap_dn_es4_g3: Number,
    inap_dn_g12: Number
}, { collection: 'prov'});

ProvSchema.methods.isExist = function(cb) {
  return this.model('Prov').findOne({ _id: this._id }, cb);
};

ProvSchema.statics.getAll = function(cb) {
  return this.model('Prov').find({}, null, {sort: {nama:1}}, cb);
};

module.exports = mongoose.model('Prov', ProvSchema);