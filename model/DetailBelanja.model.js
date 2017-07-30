var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var DetailBelanjaSchema = new Schema({
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
    'noitem': Number,
    'nmitem': String,
    'volkeg': String,
    'satkeg': String,
    'hargasat': Number,
    'jumlah': Number,
    'timestamp': {
        type: Number,
        required: true
    },
    'active': {
        default: true,
        type: Boolean
    },
    'old': [],
    'realisasi': [{
        'timestamp': Number,
        'jumlah': Number,
        'penerima_nama': String,
        'penerima_id': String,
        'spm_no': String,
        'bukti_no': String,
        'pph21': Number,
        'pph22': Number,
        'pph23': Number,
        'ppn': Number,
        'bukti_no': String,
        'tgl': String,
        'tgl_timestamp': Number,
        'ket': String,
        'pengentry': String
    }],
    'pengentry': {
        type: String,
        ref: 'User'
    }
}, { collection: 'pok_detailBelanja', strict: false });

DetailBelanjaSchema.methods.isExist = function(cb) {
    return this.model('DetailBelanja').findOne({ thang: this.thang, 'kdprogram': this.kdprogram, 'kdgiat': this.kdgiat, 'kdoutput': this.kdoutput, 
        'kdsoutput': this.kdsoutput, 'kdkmpnen': this.kdkmpnen, 'kdskmpnen': this.kdskmpnen, 'kdakun': this.kdakun, 'noitem': this.noitem }, cb);
};

DetailBelanjaSchema.statics.getAll = function(cb) {
    return this.model('DetailBelanja').find({}, null, {sort: {nmr:1}}, cb);
};

DetailBelanjaSchema.path('realisasi').schema.path('pph21').set(function (x) {
    if(!x) x = 0;
    if(!isNaN(x)) return x; 
    return parseInt(x.replace(/\D/g, ""));
});
DetailBelanjaSchema.path('realisasi').schema.path('pph22').set(function (x) {
    if(!x) x = 0;
    if(!isNaN(x)) return x; 
    return parseInt(x.replace(/\D/g, ""));
});
DetailBelanjaSchema.path('realisasi').schema.path('pph23').set(function (x) {
    if(!x) x = 0;
    if(!isNaN(x)) return x; 
    return parseInt(x.replace(/\D/g, ""));
});
DetailBelanjaSchema.path('realisasi').schema.path('ppn').set(function (x) {
    if(!x) x = 0;
    if(!isNaN(x)) return x; 
    return parseInt(x.replace(/\D/g, ""));
});

module.exports = mongoose.model('DetailBelanja', DetailBelanjaSchema);

