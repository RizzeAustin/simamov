var express = require('express');
var loket = express.Router();

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');

var Pegawai = require(__dirname + "/../model/Pegawai.model");

var Program = require(__dirname + "/../model/Program.model");
var Kegiatan = require(__dirname + "/../model/Kegiatan.model");
var Output = require(__dirname + "/../model/Output.model");
var Komponen = require(__dirname + "/../model/Komponen.model");
var Akun = require(__dirname + "/../model/Akun.model");
var DetailBelanja = require(__dirname + "/../model/DetailBelanja.model");

var CustomEntity = require(__dirname + "/../model/CustomEntity.model");
var SettingSPPD = require(__dirname + "/../model/SettingSPPD.model");
var Setting = require(__dirname + "/../model/Setting.model");

var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname + "/../model/User.model");

var Loket = require(__dirname + "/../model/Loket.model");

//Short syntax tool
var _ = require("underscore");
const { json } = require('body-parser');
const { db, count, translateAliases } = require('../model/Loket.model');

//Socket.io
loket.connections;
loket.io;

loket.socket = function(io, connections, client) {

    loket.connections = connections;
    loket.io = io;

    io.on('connection', (socket) => {
        // var pom = noTransaksi('222')
        // console.log(pom)
        // noTransaksi('222')
    })

    //lihat detail tiket
    client.on('mintaDetailTiket', function(id) {
        Loket.findById(id).lean().exec((err, data) => {
            if (err) console.log(err)
            client.emit('terimaDetailTiket', data)
                // console.log(data)
        })
    })

    //ITERASI FORM POK
    client.on('mintaKegiatan', function(id) {
        Kegiatan.find({ kdprogram: id, thang: new Date().getFullYear() }).lean().sort('kdgiat').exec((err, data) => {
            if (err) console.log(err)
            client.emit('terimaKegiatan', data)
        })
    })
    client.on('mintaOutput', function(id) {
        Output.find({ kdprogram: id[0], kdgiat: id[1], thang: new Date().getFullYear() }).lean().sort('kdoutput').exec((err, data) => {
            if (err) console.log(err)
            client.emit('terimaOutput', data)
        })
    })
    client.on('mintaKomponen', function(id) {
        Komponen.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], thang: new Date().getFullYear() }).lean().sort('kdkmpnen').exec((err, data) => {
            if (err) console.log(err)
            client.emit('terimaKomponen', data)
        })
    })
    client.on('mintaAkun', function(id) {
        Akun.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], thang: new Date().getFullYear() }).lean().sort('kdakun').exec((err, data) => {
            if (err) console.log(err)
            client.emit('terimaAkun', data)
        })
    })

}


// --------------------   ROUTER   -----------------------

loket.get('/dashboard', function(req, res) {
    req.session.tiketId = ''
    Loket.find({ status: { $in: ['Belum selesai', 'Ditolak'] } }).lean().exec((err, daftarPengajuan) => {
        if (err) console.log(err)

        Loket.find({ status: 'Selesai' }).lean().exec((err, daftarSelesai) => {
            if (err) console.log(err)

            res.render('loket/loket_dashboard', {
                layout: false,
                admin: req.session.jenis,
                daftarPengajuan: daftarPengajuan,
                daftarSelesai: daftarSelesai,
            })
        });
    });
})

loket.get('/user', function(req, res) {
    res.render('loket/loket_user', {
        layout: false,
        admin: req.session.jenis,
    });
})

loket.get('/ppk', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) console.log(err)
            Program.find({ thang: new Date().getFullYear() }).lean().exec((err, listProgram) => {
                if (err) console.log(err)
                res.render('loket/loket_ppk', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                });
            })
        })
    } else {
        res.render('loket/loket_ppk', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/ppk', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/ppk')
})

loket.get('/ppspm', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) console.log(err)
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                await res.render('loket/loket_ppspm', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                });
            } catch (error) {
                console.log(error)
                throw error
            }
        })
    } else {
        res.render('loket/loket_ppspm', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/ppspm', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/ppspm')
})

loket.get('/reviewer', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) console.log(err)
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                await res.render('loket/loket_reviewer', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                });
            } catch (error) {
                console.log(error)
                throw error
            }
        })
    } else {
        res.render('loket/loket_reviewer', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/reviewer', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/reviewer')
})

loket.get('/bendahara', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) console.log(err)
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                await res.render('loket/loket_bendahara', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                });
            } catch (error) {
                console.log(error)
                throw error
            }
        })
    } else {
        res.render('loket/loket_bendahara', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/bendahara', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/bendahara')
})

loket.get('/bank', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) console.log(err)
            res.render('loket/loket_bank', {
                layout: false,
                admin: req.session.jenis,
                data: tiketData,
            });
        })
    } else {
        res.render('loket/loket_bank', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/bank', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/bank')
})

//----------------- FORM ROUTER----------------------------------------------------------------

loket.post('/unitKirim', function(req, res) {
    try {
        const tiket = new Loket({
            nomorTransaksi: noTransaksi(req.body.loketKodeUnit),
            unit: req.body.loketNamaUnit,
            kodeUnit: req.body.loketKodeUnit,
            operator: req.body.loketOperator,
            kdprogram: '',
            uraianProgram: '',
            kdkegiatan: '',
            uraianKegiatan: '',
            kdoutput: '',
            uraianOutput: '',
            kdkomponen: '',
            uraianKomponen: '',
            kdakun: '',
            uraianAkun: '',
            tanggal: {
                pengajuan: new Date(),
                pelaksanaan: new Date(req.body.loketTglPelaksanaan),
                transfer: '',
                selesai: '',
            },
            detail: req.body.loketDetail,
            nilaiPengajuan: req.body.loketNilai,
            checklist: {
                spj: req.body.checklistSpjUnit,
                daftarHadir: req.body.checklistDaftarHadirUnit,
                dokumentasi: req.body.checklistDokumentasiUnit,
                notulensi: req.body.checklistNotulensiUnit,
                cvNarasumber: req.body.checklistCvUnit,
            },
            fileSpj: req.body.filespj,
            spp: '',
            catatan: {
                ppk: '',
                ppspm: '',
                reviewer: '',
            },
            metodeTransfer: '',
            nilaiPajak: '',
            nilaiTransfer: '',
            statusTransfer: '',
            posisi: 'PPK',
            status: 'Belum selesai'
        });
        // console.log('nomor transaksi: ' + noTransaksi(req.body.loketKodeUnit))
        tiket.save();
        res.redirect('/#loket/dashboard')
    } catch (error) {
        console.log(error)
        throw error
    }

})

loket.post('/ppkTolak', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.catatan.ppk = req.body.loketCatatanPpk
            data.status = 'Ditolak'

            data.save()
            req.session.tiketId = ''
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    //kirim email penolakan
})

loket.post('/ppkKirim', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.checklist.spj = [data.checklist.spj[0], req.body.checklistSpjPpk]
            data.checklist.daftarHadir = [data.checklist.daftarHadir[0], req.body.checklistDaftarHadirPpk]
            data.checklist.dokumentasi = [data.checklist.dokumentasi[0], req.body.checklistDokumentasiPpk]
            data.checklist.notulensi = [data.checklist.notulensi[0], req.body.checklistNotulensiPpk]
            data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], req.body.checklistCvPpk]
            data.spp = req.body.loketSpp
            data.catatan.ppk = req.body.loketCatatanPpk
            data.posisi = 'PPSPM'

            data.save()
            req.session.tiketId = ''
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})

loket.post('/ppspmTolak', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.catatan.ppspm = req.body.loketCatatanPpspm
            data.status = 'Ditolak'

            data.save()
            req.session.tiketId = ''
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    //kirim email penolakan
})

loket.post('/ppspmKirimReviewer', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], req.body.checklistSpjPpspm]
            data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], req.body.checklistDaftarHadirPpspm]
            data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], req.body.checklistDokumentasiPpspm]
            data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], req.body.checklistNotulensiPpspm]
            data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], req.body.checklistCvPpspm]
            data.catatan.ppspm = req.body.loketCatatanPpspm
            data.posisi = 'Reviewer'

            data.save()
            req.session.tiketId = ''
                //res.status(204).send()
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})

loket.post('/ppspmKirimBinagram', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], req.body.checklistSpjPpspm]
            data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], req.body.checklistDaftarHadirPpspm]
            data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], req.body.checklistDokumentasiPpspm]
            data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], req.body.checklistNotulensiPpspm]
            data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], req.body.checklistCvPpspm]
            data.catatan.ppspm = req.body.loketCatatanPpspm

            data.save()
            req.session.tiketId = ''
                //res.status(204).send()
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    //kirim email ke binagram meminta revisi pok
})

loket.post('/reviewerPending', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.catatan.reviewer = req.body.loketCatatanReviewer

            data.save()
            req.session.tiketId = ''
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    //kirim email ke penerima kesalahan/ketidaklengkapan
})

loket.post('/reviewerProses', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.catatan.reviewer = req.body.loketCatatanReviewer
            data.posisi = 'Bendahara'

            data.save()
            req.session.tiketId = ''
                //res.status(204).send()
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})

loket.post('/bendaharaProses', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.metodeTransfer = req.body.loketMetodeTransfer
            data.nilaiPajak = req.body.loketNilaiPajak
            data.nilaiTransfer = req.body.loketNilaiTransfer
            data.posisi = 'Operator Bank'

            data.save()
            req.session.tiketId = ''
            res.status(204).send()
                //res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})

loket.post('/bendaharaKirimArsiparis', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.metodeTransfer = req.body.loketMetodeTransfer
            data.nilaiPajak = req.body.loketNilaiPajak
            data.nilaiTransfer = req.body.loketNilaiTransfer

            req.session.tiketId = ''
            res.status(204).send()
                //res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    // res.redirect('/#loket/dashboard')
    //kirim email ke arsiparis detail tiket
})

loket.post('/bendaharaKirimBmn', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.kdprogram = req.body.loketProgram
            Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianProgram = pro.uraian)
            })
            data.kdkegiatan = req.body.loketKegiatan
            Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKegiatan = pro.uraian)
            })
            data.kdoutput = req.body.loketOutput
            Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianOutput = pro.uraian)
            })
            data.kdkomponen = req.body.loketKomponen
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianKomponen = pro.urkmpnen)
            })
            data.kdakun = req.body.loketAkun
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                data.save(data.uraianAkun = pro.uraian)
            })
            data.metodeTransfer = req.body.loketMetodeTransfer
            data.nilaiPajak = req.body.loketNilaiPajak
            data.nilaiTransfer = req.body.loketNilaiTransfer

            req.session.tiketId = ''
            res.status(204).send()
                //res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
    //res.redirect('/#loket/dashboard')
    //kirim email ke operator bmn
})

loket.post('/bendaharaInputRealisasi', function(req, res) {
    console.log('menuju input realisasi')
})

loket.post('/bendaharaInputPajak', function(req, res) {
    console.log('menuju input pajak')
})

loket.post('/bankKirim', function(req, res) {
    try {
        Loket.findById(req.body.tiketId, (err, data) => {
            if (err) console.log(err)

            data.posisi = '-'
            data.status = 'Selesai'
            if (req.body.loketStatusTransfer == 'ditransfer') data.statusTransfer = 'Telah Ditransfer'
            data.tanggal.transfer = new Date(req.body.loketTglTransfer)
            data.tanggal.selesai = new Date()

            data.save()
            req.session.tiketId = ''
            res.redirect('/#loket/dashboard')
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})

// --------------------   FUNCTION   -----------------------

// javascript create JSON object from two dimensional Array //ga guna
function arrayToJSONObject(arr) {
    //header
    var keys = arr[0];

    //vacate keys from main array
    var newArr = arr.slice(1, arr.length);

    var formatted = [],
        data = newArr,
        cols = keys,
        l = cols.length;
    for (var i = 0; i < data.length; i++) {
        var d = data[i],
            o = {};
        for (var j = 0; j < l; j++)
            o[cols[j]] = d[j];
        formatted.push(o);
    }
    return formatted;
}

// fungsi membuat nomor transaksi //masih salah
function noTransaksi(kodeUnit) {
    var noUrut = 1
    var tahun = new Date().getFullYear()
    var bulan = new Date().getMonth()

    bulan++
    if (bulan < 10) {
        bulan = '0' + bulan
    }

    Loket.count({}, function(err, count) {
        if (err) console.log(err)
        noUrut += count //count=2
        if (noUrut < 10) {
            noUrut = '00' + noUrut
        } else if (noUrut < 100) {
            noUrut = '0' + noUrut
        }
    })

    return `${tahun}${bulan}${kodeUnit}${noUrut}`
}

//membuat tanggal lebih mudah dibaca
function formatTanggal(tgl) {
    let tahun = tgl.getFullYear();
    let bulan = tgl.getMonth() + 1;
    let hari = tgl.getDate();
    return `${hari}/${bulan}/${tahun}`
}

// function noTransaksi(tahun, bulan, kodeUnit) {
//     const noUrut = 1

//     Loket.count({}, function(err, count) {
//         if (err) console.log(err)
//         noUrut =+ count

//     })
//     return `${tahun}${bulan}${kodeUnit}${noUrut}`

// }

// function noTransaksi() {
//     const hitung = () => new Promise((fulfill, reject) => {
//         Loket.count({}, (err, count) => {
//             if (err) return reject(err)
//             return fulfill(count)
//         })
//     })

//     let a = 1
//     hitung()
//         .then(() => {
//             a = a + hasil
//             console.log('hasil: ' + hasil)
//             console.log('a: ' + a)
//         })
// }

// loket.post('/submit', function(req, res){
//     console.log('form penarikan disubmit');
//     // loket.connections[req.session.user_id].emit('form_penarikan');
// })







module.exports = loket;