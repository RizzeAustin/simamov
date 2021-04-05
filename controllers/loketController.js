var express = require('express');
var loket = express.Router();
var formidable = require('formidable');
var mv = require('mv');

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');

var xl = require('excel4node');

var Program = require(__dirname + "/../model/Program.model");
var Kegiatan = require(__dirname + "/../model/Kegiatan.model");
var Output = require(__dirname + "/../model/Output.model");
var Komponen = require(__dirname + "/../model/Komponen.model");
var Akun = require(__dirname + "/../model/Akun.model");
var DetailBelanja = require(__dirname + "/../model/DetailBelanja.model");

var CustomEntity = require(__dirname + "/../model/CustomEntity.model");
var Setting = require(__dirname + "/../model/Setting.model");

var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname + "/../model/User.model");

var Loket = require(__dirname + "/../model/Loket.model");

var iddetail = '';

//Short syntax tool
var _ = require('underscore');
const { json } = require('body-parser');
const { db, count, translateAliases } = require('../model/Loket.model');

//untuk mengirimkan email
var nodemailer = require('nodemailer');
const { socket } = require('./pok');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_NAME,
        pass: process.env.MAIL_PASS,
    }
});

//Socket.io
loket.io;
loket.connections;

loket.socket = function(io, connections, client) {

    loket.io = io;
    loket.connections = connections;

    //lihat detail tiket
    client.on('mintaDetailTiket', function(id) {
        Loket.findById(id).lean().exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaDetailTiket', data)
                // console.log(data)
        })
    })

    //ITERASI FORM POK // cek pok
    client.on('mintaKegiatan', function(id) {
        Kegiatan.find({ kdprogram: id, thang: new Date().getFullYear() }).lean().sort('kdgiat').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaKegiatan', data)
        })
    })
    client.on('mintaOutput', function(id) {
        Output.find({ kdprogram: id[0], kdgiat: id[1], thang: new Date().getFullYear() }).lean().sort('kdoutput').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaOutput', data)
        })
    })
    client.on('mintaKomponen', function(id) {
        Komponen.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], thang: new Date().getFullYear() }).lean().sort('kdkmpnen').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaKomponen', data)
        })
    })
    client.on('mintaAkun', function(id) {
        Akun.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], thang: new Date().getFullYear() }).lean().sort('kdakun').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaAkun', data)
        })
    })
    client.on('mintaDetailPok', function(id) {
        DetailBelanja.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], kdakun: id[4], thang: new Date().getFullYear() }).lean().sort('noitem').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaDetailPok', data)
        })
    })

    client.on('cekDetailDana', function(id) {
        DetailBelanja.findOne({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], kdakun: id[4], nmitem: id[5], thang: new Date().getFullYear() }).lean().exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaDetailDana', data.jumlah)
        })
    })

    client.on('hapusTiket', function(id) {
        Loket.update({ _id: id }, { active: false }, (err) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            User.update({ _id: client.handshake.session.user_id }, { $push: { "act": { label: 'Menghapus tiket ' + id, timestamp: new Date().getTime() } } },
                function(err, status) {})
        })
    })

}


// --------------------   ROUTER   -----------------------

loket.get('/dashboard', function(req, res) {
    // console.log(req.session.jenis)
    // console.log(req.session.userRole)
    // console.log(req.session.userJabatan)
    // console.log(req.session.userUnit)
    // console.log(req.session.userEmail)

    req.session.tiketId = ''
    if (req.session.userJabatan == '3' && req.session.userRole == '31' && req.session.userUnit == 'BAU') {
        // async.series([
        //     function(callback) {
        //         Loket.find({ status: 'Selesai', thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarSelesai) => {
        //             if (err) {
        //                 console.log(err)
        //                 throw new Error(err)
        //             }
        //             callback(null, daftarSelesai)
        //         })
        //     },
        //     function(callback) {
        //         Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarPengajuan) => {
        //             if (err) {
        //                 console.log(err)
        //                 throw new Error(err)
        //             }
        //             callback(null, daftarPengajuan)
        //         })
        //     }
        // ], function(err, result) {
        //     if (err) {
        //         console.log(err)
        //         throw new Error(err)
        //     }
        //     res.render('loket/loket_dashboard', {
        //         layout: false,
        //         admin: req.session.jenis,
        //         role: req.session.userRole,
        //         daftarSelesai: result[0],
        //         daftarPengajuan: result[1],
        //     })
        // })

        Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarPengajuan) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            Loket.find({ status: 'Selesai', thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarSelesai) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }

                res.render('loket/loket_dashboard', {
                    layout: false,
                    admin: req.session.jenis,
                    role: req.session.userRole,
                    daftarPengajuan: daftarPengajuan,
                    daftarSelesai: daftarSelesai,
                })
            });
        });
    } else if (req.session.userJabatan == '3' && (req.session.userRole == '31' || req.session.userRole == '32')) {
        Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, unit: { $regex: req.session.userUnit, $options: 'i' }, thang: new Date().getFullYear(), active: true }).lean().sort('tanggal.pengajuan').exec((err, daftarPengajuan) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            Loket.find({ status: 'Selesai', unit: { $regex: req.session.userUnit, $options: 'i' }, thang: new Date().getFullYear(), active: true }).lean().sort('tanggal.selesai').exec((err, daftarSelesai) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                res.render('loket/loket_dashboard', {
                    layout: false,
                    admin: req.session.jenis,
                    role: req.session.userRole,
                    daftarPengajuan: daftarPengajuan,
                    daftarSelesai: daftarSelesai,
                })
            });
        });
    } else {
        Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarPengajuan) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            Loket.find({ status: 'Selesai', thang: new Date().getFullYear(), active: true }).lean().exec((err, daftarSelesai) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }

                res.render('loket/loket_dashboard', {
                    layout: false,
                    admin: req.session.jenis,
                    role: req.session.userRole,
                    daftarPengajuan: daftarPengajuan,
                    daftarSelesai: daftarSelesai,
                })
            });
        });
    }
})

loket.get('/permintaan', function(req, res) {
    // DetailBelanja.find({ unit: { $regex: req.session.userUnit, $options: 'i' }, thang: new Date().getFullYear(), active: true }).lean().exec((err, Data) => {
    //     if (err) {
    //         console.log(err)
    //         throw new Error(err)
    //     }
    //     console.log(Data)
    // })
    res.render('loket/loket_permintaan', {
        layout: false,
        admin: req.session.jenis,
        unit: req.session.userUnit,
        penggunaan: Data,
    });
})

loket.get('/user', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            res.render('loket/loket_user', {
                layout: false,
                admin: req.session.jenis,
                unit: req.session.userUnit,
                data: tiketData,
            });
        })
    } else {
        res.render('loket/loket_user', {
            layout: false,
            admin: req.session.jenis,
            unit: req.session.userUnit,
        });
    }

})

loket.post('/unitEdit', function(req, res) {
    req.session.tiketId = req.body.tiketId
    res.redirect('/#loket/user')
})

// -----------

loket.get('/verifikator', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            res.render('loket/loket_verifikator', {
                layout: false,
                admin: req.session.jenis,
                data: tiketData,
            });
        })
    } else {
        res.render('loket/loket_verifikator', {
            layout: false,
            admin: req.session.jenis,
        });
    }
})

loket.post('/verifikator', function(req, res) {
    if (req.session.userRole == 11 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/verifikator')
    } else if (req.session.userRole != 11) {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/ppk', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            Program.find({ thang: new Date().getFullYear() }).lean().exec((err, listProgram) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
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
    if (req.session.userRole == 12 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/ppk')
    } else if (req.session.userRole != 12) {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/ppspm', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, kdakun: tiketData.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_ppspm', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
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
    if (req.session.userRole == 13 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/ppspm')
    } else if (req.session.userRole != 13) {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/reviewer', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, kdakun: tiketData.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_reviewer', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
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
    if (req.session.userRole == 14 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/reviewer')
    } else if (req.session.userRole != 14) {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/bendahara', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, kdakun: tiketData.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                var sDetail = await DetailBelanja.find({ kdprogram: tiketData.kdprogram, kdgiat: tiketData.kdkegiatan, kdoutput: tiketData.kdoutput, kdkmpnen: tiketData.kdkomponen, kdakun: tiketData.kdakun, thang: new Date().getFullYear(), nmitem: tiketData.uraianDetail }).lean()
                console.log(tiketData);
                await res.render('loket/loket_bendahara', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    komponen: listKomponen,
                    akun: listAkun,
                    detail: listDetail,
                    dt: sDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
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
    if (req.session.userRole == 15 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/bendahara')
    } else if (req.session.userRole != 15) {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/bank', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec((err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
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
    if (req.session.userRole == 16 || req.session.jenis == 1) {
        req.session.tiketId = req.body.tiketId
        res.redirect('/#loket/bank')
    } else if (req.session.userRole != 16) {
        res.redirect('/#loket/dashboard')
    }
})

//----------------- FORM ROUTER----------------------------------------------------------------

loket.post('/unitKirim', function(req, res) {
    try {
        var form = new formidable.IncomingForm();
        form.parse(req, function(err, fields, files) { //parse form + file
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            if (fields.tiketId) { //edit tiket
                Loket.findById(fields.tiketId, (err, data) => {
                    if (err) {
                        console.log(err)
                        throw new Error(err)
                    }

                    data.unit = fields.loketNamaUnit
                    data.kodeUnit = fields.loketKodeUnit
                    data.operator = fields.loketOperator
                    data.tanggal.pelaksanaan = new Date(fields.loketTglPelaksanaan)
                    data.detail = fields.loketDetail
                    data.nilaiPengajuan = fields.loketNilai
                    data.checklist.spj = [fields.checklistSpjUnit]
                    data.checklist.daftarHadir = [fields.checklistDaftarHadirUnit]
                    data.checklist.dokumentasi = [fields.checklistDokumentasiUnit]
                    data.checklist.notulensi = [fields.checklistNotulensiUnit]
                    data.checklist.cvNarasumber = [fields.checklistCvUnit]
                    data.fileSpj = files.fileSpjUnit.name

                    const oldpath = files.fileSpjUnit.path
                    const newpath = __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + files.fileSpjUnit.name.match(/[^.]\w*$/i)[0]

                    mv(oldpath, newpath, function(err) {
                        if (err) { throw new Error(err) }
                        console.log('file uploaded and changed successfully')
                        return
                    });

                    userAct(req, 'Edit tiket ' + data.nomorTransaksi)
                    saveRedirect(req, res, data)
                })
            } else { //tiket baru
                async.waterfall([
                    function(callback) { //no urut tiket
                        Loket.count({ thang: new Date().getFullYear() }, function(err, count) {
                            if (err) {
                                console.log(err)
                                throw new Error(err)
                            }
                            var noUrut = 1
                            noUrut += count
                            if (noUrut < 10) {
                                noUrut = '00' + noUrut
                            } else if (noUrut < 100) {
                                noUrut = '0' + noUrut
                            }
                            callback(null, noUrut)
                        })
                    },
                    function(noUrut, callback) { //tahun dan bulan
                        var tahun = new Date().getFullYear()
                        var bulan = new Date().getMonth()

                        bulan++
                        if (bulan < 10) {
                            bulan = '0' + bulan
                        }

                        callback(null, tahun, bulan, noUrut)
                    }
                ], function(err, tahun, bulan, noUrut) { //write to database
                    if (err) {
                        console.log(err)
                        throw new Error(err)
                    }
                    let noTrans = `${tahun}${bulan}${fields.loketKodeUnit}${noUrut}`

                    const tiket = new Loket({
                        nomorTransaksi: noTrans,
                        unit: fields.loketNamaUnit,
                        kodeUnit: fields.loketKodeUnit,
                        operator: fields.loketOperator,
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
                        uraianDetail: '',
                        tanggal: {
                            pengajuan: new Date(),
                            pelaksanaan: new Date(fields.loketTglPelaksanaan),
                            transfer: '',
                            selesai: '',
                        },
                        detail: fields.loketDetail,
                        nilaiPengajuan: fields.loketNilai,
                        checklist: {
                            spj: fields.checklistSpjUnit,
                            daftarHadir: fields.checklistDaftarHadirUnit,
                            dokumentasi: fields.checklistDokumentasiUnit,
                            notulensi: fields.checklistNotulensiUnit,
                            cvNarasumber: fields.checklistCvUnit,
                        },
                        fileSpj: files.fileSpjUnit.name,
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
                        posisi: 'Verifikator',
                        status: 'Belum selesai'
                    });

                    const oldpath = files.fileSpjUnit.path
                    const newpath = __dirname + '/../uploaded/spj/' + noTrans + '-SpjUnit.' + files.fileSpjUnit.name.match(/[^.]\w*$/i)[0]

                    mv(oldpath, newpath, function(err) {
                        if (err) { throw new Error(err) }
                        console.log('file uploaded successfully')
                        return
                    });

                    //console.log('nomor transaksi: ' + noTransaksi(req.body.loketKodeUnit))
                    // console.log(tiket)
                    tiket.save();
                    userAct(req, 'Mengajukan tiket ' + noTrans)
                    res.redirect('/#loket/dashboard')
                        // User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Mengajukan tiket ' + noTrans, timestamp: new Date().getTime() } } },
                        //     function(err, status) {}
                        // )

                })
            }

        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

loket.post('/verifikasi', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            data.unit = req.body.loketNamaUnit
            data.kodeUnit = req.body.loketKodeUnit
            data.operator = req.body.loketOperator
            data.tanggal.pelaksanaan = new Date(req.body.loketTglPelaksanaan)
            data.detail = req.body.loketDetail
            data.nilaiPengajuan = req.body.loketNilai
            data.checklist.spj = [req.body.checklistSpjUnit]
            data.checklist.daftarHadir = [req.body.checklistDaftarHadirUnit]
            data.checklist.dokumentasi = [req.body.checklistDokumentasiUnit]
            data.checklist.notulensi = [req.body.checklistNotulensiUnit]
            data.checklist.cvNarasumber = [req.body.checklistCvUnit]
            data.posisi = 'PPK'

            userAct(req, 'Verifikasi tiket ' + data.nomorTransaksi + ' ke PPK')
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

//-------
loket.post('/ppkTolak', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            data.catatan.ppk = req.body.loketCatatanPpk
            data.status = 'Dikembalikan ke unit'

            //kirim email
            var mailOptions = {
                from: process.env.MAIL_NAME,
                to: '221709865@stis.ac.id',
                subject: 'Pengembalian Tiket Pengajuan SIMAMOV',
                html: 'Maaf pengajuan yang anda lakukan pada simamov dengan nomor transaksi ' + data.nomorTransaksi + ' terdapat kesalahan/dokumen tidak lengkap.<br>' +
                    'Pengajuan telah dikembalikan ke unit oleh PPK dengan catatan "' + data.catatan.ppk + '"',
                attachments: [{
                    path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
                }]
            }
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) throw new Error(err)
                console.log('Email sent: ' + info.response)
            })

            userAct(req, 'Menolak tiket ' + data.nomorTransaksi)
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email penolakan
})

loket.post('/ppkKirim', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.checklist.spj = [data.checklist.spj[0], req.body.checklistSpjPpk]
                data.checklist.daftarHadir = [data.checklist.daftarHadir[0], req.body.checklistDaftarHadirPpk]
                data.checklist.dokumentasi = [data.checklist.dokumentasi[0], req.body.checklistDokumentasiPpk]
                data.checklist.notulensi = [data.checklist.notulensi[0], req.body.checklistNotulensiPpk]
                data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], req.body.checklistCvPpk]
                data.catatan.ppk = req.body.loketCatatanPpk

                if (req.body.loketSpp == 'Belum') {
                    data.spp = req.body.loketSpp
                    data.posisi = 'Bendahara'
                    userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke Bendahara')
                    saveRedirect(req, res, data)
                } else if (req.body.loketSpp == 'Sudah') {
                    data.spp = req.body.loketSpp
                    data.posisi = 'PPSPM'
                    userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke PPSPM')
                    saveRedirect(req, res, data)
                }

            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

//-------
loket.post('/ppspmTolak', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            data.catatan.ppspm = req.body.loketCatatanPpspm
            data.status = 'Dikembalikan ke unit'

            var mailOptions = {
                from: process.env.MAIL_NAME,
                to: '221709865@stis.ac.id',
                subject: 'Pengembalian Tiket Pengajuan SIMAMOV',
                html: 'Maaf pengajuan yang anda lakukan pada simamov dengan nomor transaksi ' + data.nomorTransaksi + ' terdapat kesalahan/dokumen tidak lengkap.<br>' +
                    'Pengajuan telah dikembalikan ke unit oleh PPSPM dengan catatan "' + data.catatan.ppspm + '"',
                attachments: [{
                    path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
                }]
            }
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) throw new Error(err)
                console.log('Email sent: ' + info.response)
            })

            userAct(req, 'Menolak tiket ' + data.nomorTransaksi)
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email penolakan
})

loket.post('/ppspmKirimReviewer', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], req.body.checklistSpjPpspm]
                data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], req.body.checklistDaftarHadirPpspm]
                data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], req.body.checklistDokumentasiPpspm]
                data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], req.body.checklistNotulensiPpspm]
                data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], req.body.checklistCvPpspm]
                data.catatan.ppspm = req.body.loketCatatanPpspm
                data.posisi = 'Reviewer'

                userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke Reviewer')
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

loket.post('/ppspmKirimBinagram', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], req.body.checklistSpjPpspm]
                data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], req.body.checklistDaftarHadirPpspm]
                data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], req.body.checklistDokumentasiPpspm]
                data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], req.body.checklistNotulensiPpspm]
                data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], req.body.checklistCvPpspm]
                data.catatan.ppspm = req.body.loketCatatanPpspm
                    // data.posisi = 'Reviewer'

                userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke Binagram')
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email ke binagram meminta revisi pok
})

//-------
loket.post('/reviewerPending', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.catatan.reviewer = req.body.loketCatatanReviewer

                userAct(req, 'Mempending tiket ' + data.nomorTransaksi)
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email ke penerima kesalahan/ketidaklengkapan
})

loket.post('/reviewerProses', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.catatan.reviewer = req.body.loketCatatanReviewer
                data.posisi = 'Bendahara'

                userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke Bendahara')
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

//-------
loket.post('/bendaharaKirimSpp', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.spp = req.body.loketSpp
                data.posisi = 'PPSPM'
                userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke PPSPM')
                saveRedirect(req, res, data)
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

loket.post('/bendaharaProses', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            async.series([
                function(callback) {
                    Program.findOne({ kdprogram: req.body.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Kegiatan.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Output.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.uraian)
                    })
                },
            ], function(err, result) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                data.kdprogram = req.body.loketProgram
                data.kdkegiatan = req.body.loketKegiatan
                data.kdoutput = req.body.loketOutput
                data.kdkomponen = req.body.loketKomponen
                data.kdakun = req.body.loketAkun

                data.uraianProgram = result[0]
                data.uraianKegiatan = result[1]
                data.uraianOutput = result[2]
                data.uraianKomponen = result[3]
                data.uraianAkun = result[4]
                data.uraianDetail = req.body.loketDetailPok

                data.metodeTransfer = req.body.loketMetodeTransfer
                data.nilaiPajak = req.body.loketNilaiPajak
                data.nilaiTransfer = req.body.loketNilaiTransfer
                data.posisi = 'Operator Bank'

                userAct(req, 'Meneruskan tiket ' + data.nomorTransaksi + ' ke Operator Bank')
                saveStay(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.status(204).send()
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

loket.post('/bendaharaKirimArsiparis', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            res.status(204).send()
            userAct(req, 'Mengirim detail tiket ' + data.nomorTransaksi + ' ke Arsiparis')
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email ke arsiparis detail tiket
})

loket.post('/bendaharaKirimBmn', function(req, res) {
    try {
        Loket.findById(req.session.tiketId, (err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }

            res.status(204).send()
            userAct(req, 'Mengirim detail tiket ' + data.nomorTransaksi + ' ke Operator BMN')
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
    //kirim email ke operator bmn
})

loket.post('/bendaharaInputRealisasi', function(req, res) {
    console.log('menuju input realisasi')
    userAct(req, 'Menginput realisasi tiket ' + data.nomorTransaksi)
})

loket.post('/bendaharaInputPajak', function(req, res) {
    console.log('menuju input pajak')
    userAct(req, 'Menginput pajak tiket ' + data.nomorTransaksi)
})

//-------
loket.post('/bankKirim', function(req, res) {
    try {
        var form = new formidable.IncomingForm();
        form.parse(req, function(err, fields, files) {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            Loket.findById(req.session.tiketId, (err, data) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }

                data.posisi = '-'
                data.status = 'Selesai'
                if (fields.loketStatusTransfer == 'ditransfer') data.statusTransfer = 'Telah Ditransfer'
                data.tanggal.transfer = new Date(fields.loketTglTransfer)
                data.tanggal.selesai = new Date()

                var oldpath = files.dokumenBank.path
                var newpath = __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-dokumenBank.' + files.dokumenBank.name.match(/[^.]\w*$/i)[0]

                mv(oldpath, newpath, function(err) {
                    if (err) { throw new Error(err) }
                    console.log('file uploaded successfully')
                    return
                });

                //kirim email ke penerima
                if (data.metodeTransfer != 'CMS') {
                    var mailOptions = {
                        from: process.env.MAIL_NAME,
                        to: '221709865@stis.ac.id',
                        subject: 'Penyelesaian Tiket Pengajuan SIMAMOV',
                        html: 'Pengajuan yang anda lakukan pada simamov dengan nomor transaksi ' + data.nomorTransaksi + ' telah diselesaikan oleh petugas BAU.<br>' +
                            'Silahkan cek rekening/ambil uang Anda',
                        attachments: [{
                            path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-dokumenBank.' + files.dokumenBank.name.match(/[^.]\w*$/i)[0]
                        }]
                    }
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) throw new Error(err)
                        console.log('Email sent: ' + info.response)
                    })
                }

                userAct(req, 'Menyelesaikan tiket ' + data.nomorTransaksi)
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } catch (err) {
        console.log(err)
        throw new Error(err)
    }
})

//----------------- DOWNLOAD ROUTER----------------------------------------------------------------

loket.post('/downloadSpjTiket', function(req, res) {
    Loket.findById(req.body.tiketId).exec((err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }
        if (data.fileSpj.match(/[^.]\w*$/i)[0] == 'xls') {
            const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-SpjUnit.xls`
            fs.access(file, fs.F_OK, (err) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                res.download(file); // Set disposition and send it.
            })
        } else if (data.fileSpj.match(/[^.]\w*$/i)[0] == 'xlsx') {
            const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-SpjUnit.xlsx`
            fs.access(file, fs.F_OK, (err) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                res.download(file); // Set disposition and send it.
            })
        } else {
            res.status(404);
            return
        }
    })
})

loket.get('/downloadTiketSelesai', function(req, res) {
    var wb = new xl.Workbook({
        defaultFont: {
            size: 11
        }
    })

    var ws = wb.addWorksheet('Rekap Pengajuan', {
        'pageSetup': {
            'orientation': 'landscape',
            'paperHeight': '15in', // Value must a positive Float immediately followed by unit of measure from list mm, cm, in, pt, pc, pi. i.e. '10.5cm'
            'paperSize': 'LEGAL_PAPER', // see lib/types/paperSize.js for all types and descriptions of types. setting paperSize overrides paperHeight and paperWidth settings
            'paperWidth': '8.5in'
        },
        'margins': {
            'bottom': 0.1,
            'footer': 0.1,
            'header': 0.1,
            'left': 0.1,
            'right': 0.1,
            'top': 0.1
        }
    })

    //header
    ws.cell(4, 1).string('No Transaksi').style()
    ws.cell(4, 2).string('Tgl Pengajuan').style()
    ws.cell(4, 3).string('Tgl Pelaksanaan').style()
    ws.cell(4, 4).string('Tgl Pembayaran').style()
    ws.cell(4, 5).string('Kode Unit').style()
    ws.cell(4, 6).string('Operator').style()
    ws.cell(4, 7).string('Kode Akun').style()
    ws.cell(4, 8).string('Detail POK').style()
    ws.cell(4, 9).string('Detail SPJ').style()
    ws.cell(4, 10).string('Nilai Pengajuan (Bruto)').style()
    ws.cell(4, 11).string('Metode Pembayaran').style()
    ws.cell(4, 12).string('Nilai Pajak').style()


    var row_pos = 6

    wb.write('Excel.xlsx');
})

// loket.post('/downloadSpjTiketBank', function(req, res) {
//     Loket.findById(req.body.tiketId).exec((err, data) => {
//         const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xlsx`
//         fs.access(file, fs.F_OK, (err) => {
//             if (err) {
//                 console.log(err)
//                 const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xls`
//                 fs.access(file, fs.F_OK, (err) => {
//                     if (err) {
//                         console.log(err)
//                         res.render('404', { layout: false });
//                         return
//                     }
//                     res.download(file); // Set disposition and send it.
//                 })
//             }
//             res.download(file); // Set disposition and send it.
//         })
//     })
// })

// --------------------   FUNCTION   -----------------------

function saveRedirect(req, res, data) {
    data.save()
    req.session.tiketId = ''
    res.redirect('/#loket/dashboard')
}

function saveStay(req, res, data) {
    data.save()
    req.session.tiketId = ''
    res.status(204).send()
}

function userAct(req, act) {
    User.update({ _id: req.session.user_id }, { $push: { 'act': { label: act, timestamp: new Date().getTime() } } },
        function(err, status) {}
    )
}

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

//membuat tanggal lebih mudah dibaca
function formatTanggal(tgl) {
    let tahun = tgl.getFullYear();
    let bulan = tgl.getMonth() + 1;
    let hari = tgl.getDate();
    return `${hari}/${bulan}/${tahun}`
}

// loket.post('/submit', function(req, res){
//     console.log('form penarikan disubmit');
//     // loket.connections[req.session.user_id].emit('form_penarikan');
// })



module.exports = loket;