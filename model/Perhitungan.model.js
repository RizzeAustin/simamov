var fs = require('fs');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PerhitunganSchema = new Schema({
    "_id" : Number,

    "surtug": {
        type: String,
        ref: 'SuratTugas'
    },

    "akun": String,
    "detail": String,

    "jenis_pgw": String,
    "representasi": Number,

    "jumlah_menginap": Number,
    "biaya_inap": Number,
    "totalb_inap": Number,

    "harga_tiket": Number,

    "harian_hari": Number,
    "harian_biaya": Number,
    "harian_total": Number,

    "hotel_hari": Number,
    "hotel_biaya": Number,
    "b_inap_price": Number,
    "hotel_biaya_maks": Number,
    "hotel_total": Number,

    // "w_dari_t4_asal": String,
    "t_dari_t4_asal": Number,

    "w_dari_t4_tujuan": String,
    "t_dari_t4_tujuan": Number,

    "tgl_buat_perhit": String,

    "total_riil": Number,

    "total_rincian": Number,

    "w_tiket_tujuan": String,

    "timestamp": {
        type: Number,
        default: Math.round(new Date().getTime()/1000)
    }
}, { collection: 'perhitungan' });

PerhitunganSchema.path('biaya_inap').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('totalb_inap').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('harga_tiket').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('harian_biaya').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('harian_total').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('hotel_biaya').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('hotel_total').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('total_riil').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('total_rincian').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('t_dari_t4_asal').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('t_dari_t4_tujuan').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('b_inap_price').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('hotel_biaya_maks').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});
PerhitunganSchema.path('representasi').set(function (x) {
    if(!x) x = '0';
    return parseInt(x.replace(/\D/g, ""));
});

module.exports = mongoose.model('Perhitungan', PerhitunganSchema);