var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UsulanSchema = new Schema({
    'thang': Number,
    'active': {
        type: Boolean,
        default: true
    },
    'nomorUsulan': String,
    'jenis': String,
    'eselon': {
        'i': {
            type: String,
            default: 'Sekretariat Utama'
        },
        'ii': {
            type: String,
            default: 'Politeknik Statistika STIS'
        },
    },
    'penyelenggara': String,
    'bagian': {
        type: String,
        default: 'BAU'
    },
    'pok': {
        'kdprogram': String,
        'uraianProgram': String,
        'kdaktivitas': String,
        'uraianAktivitas': String,
        'kdkro': String,
        'uraianKro': String,
        'kdro': String,
        'uraianRo': String,
        'kdkomponen': String,
        'uraianKomponen': String,
        'kdsubkomponen': String,
        'uraianSubKomponen': String,
        'kdakun': String,
        'uraianAkun': String,
        'detil': {
            'u1': String,
            'n1': Number,
            'u2': String,
            'n2': Number,
            'u3': String,
            'n3': Number,
            'u4': String,
            'n4': Number,
            'u5': String,
            'n5': Number,
        },
        'detilBaru': String,
    },
    'volume': String,
    'nilaiBruto': Number,
    'materi': String,
    'catatanUnit': String,
    'catatanPpk': String,
    'status': String, //Belum disetujui PPK, Disetujui PPK, Ditolak, Proses permintaan dana, Permintaan dana selesai
    'unit': String,
    'jabatan': String,
    'userEmail': String,
    'tanggalMasuk': Date,
    'timestamp': Number,
}, { collection: 'usulan', strict: false })

module.exports = mongoose.model('Usulan', UsulanSchema);