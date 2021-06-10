var express = require('express');
var loket = express.Router();
var formidable = require('formidable');
var mv = require('mv');

//Flow control
var async = require('async');

//modul fs utk rw file
var fs = require('fs');
var xl = require('excel4node');
//Xlsx to Pdf
var msopdf = require('node-msoffice-pdf');

var Program = require(__dirname + "/../model/Program.model");
var Kegiatan = require(__dirname + "/../model/Kegiatan.model");
var Output = require(__dirname + "/../model/Output.model");
var SubOutput = require(__dirname + "/../model/SubOutput.model");
var Komponen = require(__dirname + "/../model/Komponen.model");
var SubKomponen = require(__dirname + "/../model/SubKomponen.model");
var Akun = require(__dirname + "/../model/Akun.model");
var DetailBelanja = require(__dirname + "/../model/DetailBelanja.model");

//var ObjectId = require('mongoose').Types.ObjectId;

var User = require(__dirname + "/../model/User.model");
var Unit = require(__dirname + "/../model/Unit.model");
var Loket = require(__dirname + "/../model/Loket.model");
var Usulan = require(__dirname + "/../model/UsulanDana.model");

const emailBinagram = process.env.MAIL_BINAGRAM

//Short syntax tool
var _ = require('underscore');
const { json } = require('body-parser');
const { db, count, translateAliases } = require('../model/Loket.model');

//const { JSONParser } = require('formidable');
//untuk mengirimkan email
var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_SISTEM_NAME,
        pass: process.env.MAIL_SISTEM_PASS,
    }
});

//Socket.io
loket.io;
loket.connections;

loket.socket = function(io, connections, client) {

    loket.io = io;
    loket.connections = connections;

    var thang = client.handshake.session.tahun_anggaran || new Date().getFullYear()

    client.on('detailid', function(dt) {
        console.log(dt);
        DetailBelanja.findOne({ kdprogram: dt.kdprogram, kdgiat: dt.kdgiat, kdoutput: dt.kdoutput, kdsoutput: dt.kdsoutput, kdkmpnen: dt.kdkmpnen, kdskmpnen: dt.kdskmpnen, kdakun: dt.kdakun, nmitem: dt.nmitem }, function(err, detail) {
            console.log(detail);
            var dts = {};
            dts.id = detail._id;
            dts.nmitem = detail.nmitem;
            dts.jumlah = detail.jumlah;
            console.log(dts);
            client.emit('id_response', dts, function() {
                //jika sudah  append, iterasi tiap output
            })
        })
    })

    //lihat detail tiket
    client.on('mintaDetailTiket', function(id, response) {
        Loket.findById(id).lean().exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaDetailTiket', data)

            //response(data)
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
    client.on('mintasOutput', function(id) {
        SubOutput.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], thang: new Date().getFullYear() }).lean().sort('kdsoutput').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimasOutput', data)
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
    client.on('mintasKomponen', function(id) {
        SubKomponen.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], thang: new Date().getFullYear() }).lean().sort('kdskmpnen').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimasKomponen', data)
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
    client.on('mintaDetailPokUnit', function(id) {
        DetailBelanja.find({ kdprogram: id[0], kdgiat: id[1], kdoutput: id[2], kdkmpnen: id[3], kdakun: id[4], unit: { $regex: `${client.handshake.session.userUnit}`, $options: 'i' }, thang: new Date().getFullYear() }).lean().sort('noitem').exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            client.emit('terimaDetailPokUnit', data)
        })
    })

    // client.on('hapusTiket', function(id) {
    //     Loket.update({ _id: id }, { active: false }, (err) => {
    //         if (err) {
    //             console.log(err)
    //             throw new Error(err)
    //         }
    //         User.update({ _id: client.handshake.session.user_id }, { $push: { "act": { label: 'Menghapus tiket ' + id, timestamp: new Date().getTime() } } },
    //             function(err, status) {})
    //     })
    // })

    client.on('realisasiUnit', function(month, unit, cb) {
        var y = thang || new Date().getFullYear();
        var lower_ts = Math.round(new Date(y, month, 1).getTime() / 1000);
        DetailBelanja.aggregate([
            { $match: { active: true, thang: +thang, unit: { $regex: `${unit}`, $options: 'i' } } },
            { $project: { realisasi: { tgl_timestamp: 1, jumlah: 1 } } },
            { $unwind: '$realisasi' },
            {
                $group: {
                    _id: null,
                    sampai_bln_lalu: { $sum: { $cond: [{ $lte: ['$realisasi.tgl_timestamp', lower_ts] }, '$realisasi.jumlah', 0] } },
                    sampai_bln_ini: { $sum: '$realisasi.jumlah' }
                }
            }
        ], function(err, result) {
            if (err) {
                console.log(err)
                return;
            }
            if (result.length == 0) {
                result.push({ sampai_bln_lalu: 0, sampai_bln_ini: 0 });
            }
            DetailBelanja.aggregate([
                { $match: { active: true, thang: +thang, unit: { $regex: `${unit}`, $options: 'i' } } },
                { $project: { jumlah: 1 } },
                {
                    $group: {
                        _id: null,
                        pagu: { $sum: '$jumlah' }
                    }
                }
            ], function(err, pagu) {
                if (err) {
                    console.log(err);
                    return;
                }
                DetailBelanja.aggregate([
                    { $match: { active: true, thang: +thang, realisasi: { $exists: true, $ne: [] }, unit: { $regex: `${unit}`, $options: 'i' } } },
                    {
                        $project: {
                            nmitem: 1,
                            sisa_dana: { $multiply: [100, { $divide: [{ $subtract: ['$jumlah', { $sum: '$realisasi.jumlah' }] }, '$jumlah'] }] },
                            sisa_dana_rp: { $subtract: ['$jumlah', { $sum: '$realisasi.jumlah' }] }
                        }
                    },
                    { $sort: { sisa_dana: 1 } },
                    { $limit: 5 }
                ], function(err, res1) {
                    if (err) {
                        console.log(err)
                        return;
                    }
                    result[0].pagu = (pagu.length == 0) ? 0 : pagu[0].pagu;
                    result[0].terendah = (res1.length == 0) ? [{ nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }] : res1;
                    cb(result[0]);
                })
            });
        });
    })
    client.on('realisasiAll', function(month, cb) {
        var y = thang || new Date().getFullYear();
        var lower_ts = Math.round(new Date(y, month, 1).getTime() / 1000);
        DetailBelanja.aggregate([
            { $match: { active: true, thang: +thang } },
            { $project: { realisasi: { tgl_timestamp: 1, jumlah: 1 } } },
            { $unwind: '$realisasi' },
            {
                $group: {
                    _id: null,
                    sampai_bln_lalu: { $sum: { $cond: [{ $lte: ['$realisasi.tgl_timestamp', lower_ts] }, '$realisasi.jumlah', 0] } },
                    sampai_bln_ini: { $sum: '$realisasi.jumlah' }
                }
            }
        ], function(err, result) {
            if (err) {
                console.log(err)
                return;
            }
            if (result.length == 0) {
                result.push({ sampai_bln_lalu: 0, sampai_bln_ini: 0 });
            }
            DetailBelanja.aggregate([
                { $match: { active: true, thang: +thang } },
                { $project: { jumlah: 1 } },
                {
                    $group: {
                        _id: null,
                        pagu: { $sum: '$jumlah' }
                    }
                }
            ], function(err, pagu) {
                if (err) {
                    console.log(err);
                    return;
                }
                DetailBelanja.aggregate([
                    { $match: { active: true, thang: +thang, realisasi: { $exists: true, $ne: [] } } },
                    {
                        $project: {
                            nmitem: 1,
                            sisa_dana: { $multiply: [100, { $divide: [{ $subtract: ['$jumlah', { $sum: '$realisasi.jumlah' }] }, '$jumlah'] }] },
                            sisa_dana_rp: { $subtract: ['$jumlah', { $sum: '$realisasi.jumlah' }] }
                        }
                    },
                    { $sort: { sisa_dana: 1 } },
                    { $limit: 5 }
                ], function(err, res1) {
                    if (err) {
                        console.log(err)
                        return;
                    }
                    result[0].pagu = (pagu.length == 0) ? 0 : pagu[0].pagu;
                    result[0].terendah = (res1.length == 0) ? [{ nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }, { nmitem: 'Blm ada item', sisa_dana: 0 }] : res1;
                    cb(result[0]);
                })
            });
        });
    })
    client.on('tabelRealisasiUnit', function(unit, responseUsulan) {
        DetailBelanja.aggregate([
            { $match: { active: true, thang: +thang, unit: { $regex: `${unit}`, $options: 'i' } } },
            { $project: { kdakun: 1, nmitem: 1, pagu: '$jumlah' } },
            { $sort: { _id: 1 } }
        ], function(err, listItem) {
            if (err) {
                console.log(err)
                    //res.status(404).send()
                return
            }
            _.each(listItem, function(list) {
                DetailBelanja.aggregate([
                    { $match: { active: true, thang: +thang, _id: list._id } },
                    { $project: { realisasi: { jumlah: 1 } } },
                    { $unwind: '$realisasi' },
                    {
                        $group: {
                            _id: '$_id',
                            realisasiBelanja: { $sum: '$realisasi.jumlah' }
                        }
                    },
                ], function(err, real) {
                    if (err) {
                        console.log(err)
                            //`res.status(404).send()
                        return
                    }
                    if (real.length == 1) {
                        list.realis = real[0].realisasiBelanja
                        list.sisa = list.pagu - real[0].realisasiBelanja
                        client.emit('tabelRealisasiUnitRes', list, responseUsulan)
                    } else {
                        list.realis = 0
                        list.sisa = list.pagu
                        client.emit('tabelRealisasiUnitRes', list, responseUsulan)
                    }
                })
            })
        })
    })

    client.on('rincianUsulan', function(id, response) {
        Usulan.findById(id).lean().exec((err, data) => {
            response(data)
        })
    })
    client.on('konfirmUsulan', function(id, response) {
        Usulan.update({ _id: id }, { status: 'Disetujui PPK', timestamp: new Date().getTime() }, function(err, data) {
            if (err) {
                response('gagal')
                return false
            }
            response('berhasil')
            Usulan.findById(id).lean().exec((err, data) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                var mailOptions = {
                    from: process.env.MAIL_SISTEM_NAME,
                    to: data.userEmail,
                    subject: 'Konfirmasi Usulan',
                    html: tempUsulanUnit(data.nomorUsulan, formatTanggal(data.tanggalmasuk), 'dikonfirmasi'),
                }
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) throw new Error(err)
                    console.log('(Konfirm usulan ke unit) Email sent: ' + info.response)
                })
            })
            User.update({ _id: client.handshake.session.user_id }, { $push: { 'act': { label: 'Konfirmasi Usulan ' + id, timestamp: new Date().getTime() } } },
                function(err, status) {}
            )
        })
    })
    client.on('tolakUsulan', function(id, catatanPpk, response) {
        Usulan.update({ _id: id }, { status: 'Ditolak', catatanPpk: catatanPpk, timestamp: new Date().getTime() }, function(err, data) {
            if (err) {
                response('gagal')
                return false
            }
            response('berhasil')
            Usulan.findById(id).lean().exec((err, data) => {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                var mailOptions = {
                    from: process.env.MAIL_SISTEM_NAME,
                    to: data.userEmail,
                    subject: 'Konfirmasi Usulan',
                    html: tempUsulanUnit(data.nomorUsulan, formatTanggal(data.tanggalmasuk), 'ditolak'),
                }
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) throw new Error(err)
                    console.log('(Konfirm usulan ke unit) Email sent: ' + info.response)
                })
            })
            User.update({ _id: client.handshake.session.user_id }, { $push: { 'act': { label: 'Konfirmasi Usulan ' + id, timestamp: new Date().getTime() } } },
                function(err, status) {}
            )
        })
    })
}


// --------------------    PAGE ROUTER   -----------------------

loket.get('/dashboard', async function(req, res) {
    // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    

    // -------------------------------------------------------------------------------------------------------------------------------------------------------------------------

    // console.log(req.session.jenis)
    // console.log(req.session.userJabatan)
    // console.log(req.session.userRole)
    // console.log(req.session.userUnit)
    // console.log(req.session.userEmail)

    req.session.tiketId = ''
    if (req.session.jenis == '1' || req.session.userJabatan == '1' || req.session.userJabatan == '2' || (req.session.userRole == '31' && req.session.userUnit == 'BAU')) {
        try {
            let daftarPengajuan = await Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, thang: req.session.tahun_anggaran, active: true }).lean().sort({ 'tanggal.pengajuan': -1 })
            let daftarSelesai = await Loket.find({ status: 'Selesai', thang: req.session.tahun_anggaran, active: true }).lean().sort({ 'tanggal.selesai': -1 })
            let daftarUsulan = await Usulan.find({ active: true, thang: req.session.tahun_anggaran }).lean().sort({ timestamp: -1 })
            let daftarUnit = await Unit.find({ active: true }).lean()
                // let listThang = await Loket.find({ status: 'Selesai', active: true }).sort('thang').distinct('thang')
            await res.render('loket/loket_dashboard', {
                layout: false,
                admin: req.session.jenis,
                jabatan: req.session.userJabatan,
                role: req.session.userRole,
                unit: req.session.userUnit,
                daftarPengajuan: daftarPengajuan,
                daftarSelesai: daftarSelesai,
                daftarUnit: daftarUnit,
                tahunAktif: req.session.tahun_anggaran,
                usulan: daftarUsulan,
                // tahun: JSON.stringify(listThang),
            })
        } catch (err) {
            console.log(err)
            res.status(500)
        }
    } else if (req.session.userJabatan == '3') {
        try {
            let daftarPengajuan = await Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, "unit.nama": { $regex: `${req.session.userUnit}`, $options: 'i' }, thang: req.session.tahun_anggaran, active: true }).lean().sort('tanggal.pengajuan')
            let daftarSelesai = await Loket.find({ status: 'Selesai', "unit.nama": { $regex: `${req.session.userUnit}`, $options: 'i' }, thang: req.session.tahun_anggaran, active: true }).lean().sort('tanggal.selesai')
            let daftarUsulan = await Usulan.find({ unit: req.session.userUnit, thang: req.session.tahun_anggaran, active: true }).lean().sort({ timestamp: -1 })
            await res.render('loket/loket_dashboard', {
                layout: false,
                admin: req.session.jenis,
                jabatan: req.session.userJabatan,
                role: req.session.userRole,
                unit: req.session.userUnit,
                daftarPengajuan: daftarPengajuan,
                daftarSelesai: daftarSelesai,
                tahunAktif: req.session.tahun_anggaran,
                usulan: daftarUsulan,
            })
        } catch (err) {
            console.log(err)
            res.status(500)
        }
    } else {
        try {
            let daftarPengajuan = await Loket.find({ status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }, "unit.nama": { $regex: `${req.session.userUnit}`, $options: 'i' }, jabatan: req.session.userJabatan, thang: req.session.tahun_anggaran, active: true }).lean().sort('tanggal.pengajuan')
            let daftarSelesai = await Loket.find({ status: 'Selesai', "unit.nama": { $regex: `${req.session.userUnit}`, $options: 'i' }, jabatan: req.session.userJabatan, thang: req.session.tahun_anggaran, active: true }).lean().sort('tanggal.selesai')
            let daftarUsulan = await Usulan.find({ unit: req.session.userUnit, jabatan: req.session.userJabatan, thang: req.session.tahun_anggaran, active: true }).lean().sort({ timestamp: -1 })
            await res.render('loket/loket_dashboard', {
                layout: false,
                admin: req.session.jenis,
                jabatan: req.session.userJabatan,
                role: req.session.userRole,
                unit: req.session.userUnit,
                daftarPengajuan: daftarPengajuan,
                daftarSelesai: daftarSelesai,
                tahunAktif: req.session.tahun_anggaran,
                usulan: daftarUsulan,
            })
        } catch (err) {
            console.log(err)
            res.status(500)
        }
    }
})

loket.get('/pengusulan', function(req, res) {
    // if (req.session.jenis == 1) {
    //     //res.redirect('/#loket/dashboard')
    //     res.status(404).send()
    // } else {
    // }
    if (req.session.tiketId && (req.session.userRole == 12 || req.session.jenis == 1)) {
        Usulan.findById(req.session.tiketId).lean().exec(async(err, usulanData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: usulanData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, kdakun: usulanData.pok.kdakun, unit: usulanData.unit, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_pengusulan', {
                    layout: false,
                    admin: req.session.jenis,
                    unit: req.session.userUnit,
                    data: usulanData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
        })
    } else {
        Program.find({ thang: new Date().getFullYear(), active: true }).lean().exec((err, program) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            res.render('loket/loket_pengusulan', {
                layout: false,
                admin: req.session.jenis,
                unit: req.session.userUnit,
                program: program,
            });
        })
    }
})

loket.post('/pengusulan', function(req, res) {
    if (req.session.userRole == 12 || req.session.jenis == 1) {
        req.session.tiketId = req.body.idUsulan
        res.redirect('/#loket/pengusulan')
    } else {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/user', function(req, res) {
    if (req.session.tiketId) {
        Usulan.findById(req.session.tiketId).lean().exec(async(err, usulanData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: usulanData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: usulanData.pok.kdprogram, kdgiat: usulanData.pok.kdaktivitas, kdoutput: usulanData.pok.kdkro, kdkmpnen: usulanData.pok.kdkomponen, kdakun: usulanData.pok.kdakun, unit: { $regex: `${req.session.userUnit}`, $options: 'i' }, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_user', {
                    layout: false,
                    admin: req.session.jenis,
                    unit: req.session.userUnit,
                    data: usulanData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
        })
    } else {
        res.render('loket/loket_user', {
            layout: false,
            admin: req.session.jenis,
            unit: req.session.userUnit,
        });
    }

})

loket.post('/user', function(req, res) {
    if (req.session.userJabatan != 1 || req.session.userJabatan != 2 || req.session.jenis == 1) {
        req.session.tiketId = req.body.idUsulan
        res.redirect('/#loket/user')
    } else {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/verifikator', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_verifikator', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
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
    } else {
        res.redirect('/#loket/dashboard')
    }
})

loket.get('/ppk', function(req, res) {
    if (req.session.tiketId) {
        Loket.findById(req.session.tiketId).lean().exec(async(err, tiketData) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            try {
                var listProgram = await Program.find({ thang: new Date().getFullYear() }).lean()
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_ppk', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
                    akun: listAkun,
                    detail: listDetail,
                });
            } catch (err) {
                console.log(err)
                throw new Error(err)
            }
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
    } else {
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
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_ppspm', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
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
    } else {
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
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                await res.render('loket/loket_reviewer', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
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
    } else {
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
                var listKegiatan = await Kegiatan.find({ kdprogram: tiketData.pok.kdprogram, thang: new Date().getFullYear() }).lean().sort('kdgiat')
                var listOutput = await Output.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, thang: new Date().getFullYear() }).lean().sort('kdoutput')
                var listSubOutput = await SubOutput.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdsoutput')
                var listKomponen = await Komponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, thang: new Date().getFullYear() }).lean().sort('kdkmpnen')
                var listSubKomponen = await SubKomponen.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdskmpnen')
                var listAkun = await Akun.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, thang: new Date().getFullYear() }).lean().sort('kdakun')
                var listDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear() }).lean().sort('noitem')
                var sDetail = await DetailBelanja.find({ kdprogram: tiketData.pok.kdprogram, kdgiat: tiketData.pok.kdaktivitas, kdoutput: tiketData.pok.kdkro, kdkmpnen: tiketData.pok.kdkomponen, kdakun: tiketData.pok.kdakun, thang: new Date().getFullYear(), nmitem: tiketData.pok.uraianDetil }).lean()
                await res.render('loket/loket_bendahara', {
                    layout: false,
                    admin: req.session.jenis,
                    data: tiketData,
                    program: listProgram,
                    kegiatan: listKegiatan,
                    output: listOutput,
                    suboutput: listSubOutput,
                    komponen: listKomponen,
                    subkomponen: listSubKomponen,
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
    } else {
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
    } else {
        res.redirect('/#loket/dashboard')
    }
})

//----------------- FORM ROUTER----------------------------------------------------------------

loket.post('/usulanKirim', function(req, res) {
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
            SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                callback(null, pro.ursoutput)
            })
        },
        function(callback) {
            Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                callback(null, pro.urkmpnen)
            })
        },
        function(callback) {
            SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                if (pro) {
                    callback(null, pro.urskmpnen)
                } else {
                    callback(null, '-')
                }
            })
        },
        function(callback) {
            Akun.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdakun: req.body.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                callback(null, pro.uraian)
            })
        },
        function(callback) {
            Usulan.countDocuments({ thang: new Date().getFullYear(), active: true }, function(err, count) {
                var tahun = new Date().getFullYear()
                var bulan = new Date().getMonth()
                bulan++
                if (bulan < 10) {
                    bulan = '0' + bulan
                }
                if (err) {
                    console.log(err)
                    return
                }
                var noUrut = 1 + count
                if (noUrut < 10) {
                    noUrut = '000' + noUrut
                } else if (noUrut < 100) {
                    noUrut = '00' + noUrut
                } else if (noUrut < 1000) {
                    noUrut = '0' + noUrut
                }
                callback(null, `${tahun}${bulan}${noUrut}`)
            })
        },
    ], function(err, result) {
        if (err) {
            console.log(err)
            return false
        }
        if (req.body.tiketId) {
            Usulan.update({ _id: req.session.tiketId }, {
                pok: {
                    kdprogram: req.body.loketProgram,
                    uraianProgram: result[0],
                    kdaktivitas: req.body.loketKegiatan,
                    uraianAktivitas: result[1],
                    kdkro: req.body.loketOutput,
                    uraianKro: result[2],
                    kdro: req.body.loketsOutput,
                    uraianRo: result[3],
                    kdkomponen: req.body.loketKomponen,
                    uraianKomponen: result[4],
                    kdsubkomponen: req.body.loketsKomponen || '',
                    uraianSubKomponen: result[5],
                    kdakun: req.body.loketAkun,
                    uraianAkun: result[6],
                    detil: {
                        u1: req.body.loketDetailPok1,
                        n1: req.body.nilaiDetil1,
                        u2: req.body.loketDetailPok2 || '',
                        n2: req.body.nilaiDetil2 || 0,
                        u3: req.body.loketDetailPok3 || '',
                        n3: req.body.nilaiDetil3 || 0,
                        u4: req.body.loketDetailPok4 || '',
                        n4: req.body.nilaiDetil4 || 0,
                        u5: req.body.loketDetailPok5 || '',
                        n5: req.body.nilaiDetil5 || 0,
                    },
                    detilBaru: req.body.detilBaruInput || '-',
                },
                nilaiBruto: req.body.loketNilai,
                status: "Disetujui PPK",
                timestamp: new Date().getTime(),
            }, function(err, status) {
                if (err) {
                    console.log(err)
                    throw new Error(err)
                }
                Usulan.findById(req.session.tiketId).lean().exec((err, data) => {
                    if (err) {
                        console.log(err)
                        throw new Error(err)
                    }
                    var mailOptions = {
                        from: process.env.MAIL_SISTEM_NAME,
                        to: data.userEmail,
                        subject: 'Konfirmasi Usulan',
                        html: tempUsulanUnit(data.nomorUsulan, formatTanggal(data.tanggalmasuk), 'dikonfirmasi'),
                    }
                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) throw new Error(err)
                        console.log('(Konfirm usulan ke unit) Email sent: ' + info.response)
                    })
                })
            })
            userAct(req, 'Mengubah dan konfirmasi POK Usulan ' + req.session.tiketId)
            res.redirect('/#loket/dashboard')
        } else {
            const us = new Usulan({
                thang: new Date().getFullYear(),
                timestamp: new Date().getTime(),
                nomorUsulan: `${result[7]}`,
                jenis: req.body.jenisPermintaan,
                penyelenggara: req.body.penyelenggara,
                bagian: req.body.bagian,
                pok: {
                    kdprogram: req.body.loketProgram,
                    uraianProgram: result[0],
                    kdaktivitas: req.body.loketKegiatan,
                    uraianAktivitas: result[1],
                    kdkro: req.body.loketOutput,
                    uraianKro: result[2],
                    kdro: req.body.loketsOutput,
                    uraianRo: result[3],
                    kdkomponen: req.body.loketKomponen,
                    uraianKomponen: result[4],
                    kdsubkomponen: req.body.loketsKomponen,
                    uraianSubKomponen: result[5],
                    kdakun: req.body.loketAkun,
                    uraianAkun: result[6],
                    detil: {
                        u1: req.body.loketDetailPok1,
                        n1: req.body.nilaiDetil1,
                        u2: req.body.loketDetailPok2 || '',
                        n2: req.body.nilaiDetil2 || 0,
                        u3: req.body.loketDetailPok3 || '',
                        n3: req.body.nilaiDetil3 || 0,
                        u4: req.body.loketDetailPok4 || '',
                        n4: req.body.nilaiDetil4 || 0,
                        u5: req.body.loketDetailPok5 || '',
                        n5: req.body.nilaiDetil5 || 0,
                    },
                    detilBaru: req.body.detilBaruInput || '-',
                },
                volume: req.body.volume,
                nilaiBruto: req.body.loketNilai,
                materi: req.body.materi,
                catatanUnit: req.body.loketCatatanUnit,
                status: "Belum disetujui PPK",
                unit: req.session.userUnit,
                jabatan: req.session.userJabatan,
                userEmail: req.session.userEmail,
                tanggalmasuk: new Date(),
            })

            us.save();
            userAct(req, 'Mengusulkan kegiatan ' + us._id)
            res.redirect('/#loket/dashboard')
        }
    })
})

loket.post('/unitKirim', function(req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) { //parse form + file
        if (err) {
            console.log(err)
            throw new Error(err)
        }
        async.series([
            function(callback) {
                var tahun = new Date().getFullYear()
                var bulan = new Date().getMonth()
                bulan++
                if (bulan < 10) {
                    bulan = '0' + bulan
                }
                callback(null, `${tahun}${bulan}`)
            },
            function(callback) { //no urut tiket
                Loket.countDocuments({ thang: new Date().getFullYear(), active: true }, function(err, count) {
                    if (err) {
                        console.log(err)
                        return
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
            function(callback) {
                Program.findOne({ kdprogram: fields.loketProgram, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.uraian)
                })
            },
            function(callback) {
                Kegiatan.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.uraian)
                })
            },
            function(callback) {
                Output.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, kdoutput: fields.loketOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.uraian)
                })
            },
            function(callback) {
                SubOutput.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, kdoutput: fields.loketOutput, kdsoutput: fields.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, kdoutput: fields.loketOutput, kdkmpnen: fields.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, kdoutput: fields.loketOutput, kdkmpnen: fields.loketKomponen, kdskmpnen: fields.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
                })
            },
            function(callback) {
                Akun.findOne({ kdprogram: fields.loketProgram, kdgiat: fields.loketKegiatan, kdoutput: fields.loketOutput, kdkmpnen: fields.loketKomponen, kdakun: fields.loketAkun, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.uraian)
                })
            },
        ], function(err, result) { //write to database
            if (err) {
                console.log(err)
                return
            }
            let noTrans = `${result[0]}${fields.loketKodeUnit}${result[1]}`
            const tiket = new Loket({
                thang: new Date().getFullYear(),
                idUsulan: req.session.tiketId || '',
                nomorTransaksi: noTrans,
                jabatan: req.session.userJabatan,
                unit: {
                    nama: fields.loketNamaUnit,
                    kode: fields.loketKodeUnit,
                },
                operator: fields.loketOperator,
                email: req.session.userEmail,
                pok: {
                    kdprogram: fields.loketProgram,
                    uraianProgram: result[2],
                    kdaktivitas: fields.loketKegiatan,
                    uraianAktivitas: result[3],
                    kdkro: fields.loketOutput,
                    uraianKro: result[4],
                    kdro: fields.loketsOutput,
                    uraianRo: result[5],
                    kdkomponen: fields.loketKomponen,
                    uraianKomponen: result[6],
                    kdsubkomponen: fields.loketsKomponen,
                    uraianSubKomponen: result[7],
                    kdakun: fields.loketAkun,
                    uraianAkun: result[8],
                    detil: {
                        u1: fields.loketDetailPok1,
                        n1: fields.nilaiDetil1,
                        u2: fields.loketDetailPok2 || '',
                        n2: fields.nilaiDetil2 || 0,
                        u3: fields.loketDetailPok3 || '',
                        n3: fields.nilaiDetil3 || 0,
                        u4: fields.loketDetailPok4 || '',
                        n4: fields.nilaiDetil4 || 0,
                        u5: fields.loketDetailPok5 || '',
                        n5: fields.nilaiDetil5 || 0,
                    },
                },
                detail: fields.loketDetail,
                nilai: {
                    bruto: fields.loketNilai,
                    pajak: '',
                    transfer: '',
                },
                checklist: {
                    spj: bol(fields.checklistSpjUnit),
                    daftarHadir: bol(fields.checklistDaftarHadirUnit),
                    dokumentasi: bol(fields.checklistDokumentasiUnit),
                    notulensi: bol(fields.checklistNotulensiUnit),
                    cvNarasumber: bol(fields.checklistCvUnit),
                },
                fileSpj: noTrans + '-SpjUnit.' + files.fileSpjUnit.name.match(/[^.]\w*$/i)[0],
                dokumenBank: '',
                spp: '',
                catatan: {
                    ppk: '',
                    ppspm: '',
                    reviewer: '',
                },
                metodeTransfer: '',
                statusTransfer: '',
                tanggal: {
                    pengajuan: new Date(),
                    pelaksanaan: new Date(fields.loketTglPelaksanaan),
                    transfer: '',
                    selesai: '',
                },
                posisi: 'Verifikator',
                status: 'Belum selesai',
                idUsulan: fields.tiketId
            });

            const oldpath = files.fileSpjUnit.path
            const newpath = __dirname + '/../uploaded/spj/' + noTrans + '-SpjUnit.' + files.fileSpjUnit.name.match(/[^.]\w*$/i)[0]

            mv(oldpath, newpath, function(err) {
                if (err) {
                    console.log(err)
                    return
                }
                console.log('file SPJ unit uploaded successfully')
            });

            tiket.save();
            Usulan.update({ _id: fields.tiketId }, { status: 'Proses permintaan dana', timestamp: new Date().getTime() }, function(err, data) {})
            userAct(req, 'Mengajukan permintaan ' + noTrans)
            res.redirect('/#loket/dashboard')
                // User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Mengajukan tiket ' + noTrans, timestamp: new Date().getTime() } } },
                //     function(err, status) {}
                // )

        })
    })
})

loket.post('/verifikasi', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.detail = req.body.loketDetail
            data.tanggal.pelaksanaan = new Date(req.body.loketTglPelaksanaan)
            data.nilai.bruto = req.body.loketNilai

            data.checklist.spj = [bol(req.body.checklistSpjUnit)]
            data.checklist.daftarHadir = [bol(req.body.checklistDaftarHadirUnit)]
            data.checklist.dokumentasi = [bol(req.body.checklistDokumentasiUnit)]
            data.checklist.notulensi = [bol(req.body.checklistNotulensiUnit)]
            data.checklist.cvNarasumber = [bol(req.body.checklistCvUnit)]
            data.posisi = 'PPK'

            userAct(req, 'Verifikasi permintaan ' + data.nomorTransaksi + ' ke PPK')
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    })
})

//-------
loket.post('/ppkTolak', function(req, res) {
    Loket.findById(req.session.tiketId, (err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }

        data.catatan.ppk = req.body.loketCatatanPpk
        data.status = 'Dikembalikan ke unit'

        //kirim email
        var mailOptions = {
            from: process.env.MAIL_SISTEM_NAME,
            to: data.email,
            subject: 'Pengembalian Permintaan Dana dengan SIMAMOV',
            html: tempTolak(data.nomorTransaksi, formatTanggal(data.tanggal.pengajuan), data.catatan.ppk),
            //'Maaf permintaan dana yang Anda lakukan pada SIMAMOV dengan nomor transaksi ' + data.nomorTransaksi + ' terdapat kesalahan/dokumen tidak lengkap.<br>' +
            //'Permintaan telah dikembalikan ke unit oleh PPK dengan catatan "' + data.catatan.ppk + '"',
            attachments: [{
                path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
            }]
        }
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw new Error(err)
            console.log('(Tolak Unit) Email sent: ' + info.response)
        })

        userAct(req, 'Menolak permintaan ' + data.nomorTransaksi)
        saveRedirect(req, res, data)
            // data.save()
            // req.session.tiketId = ''
            // res.redirect('/#loket/dashboard')
    })
})

loket.post('/ppkKirim', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai

            data.checklist.spj = [data.checklist.spj[0], bol(req.body.checklistSpjPpk)]
            data.checklist.daftarHadir = [data.checklist.daftarHadir[0], bol(req.body.checklistDaftarHadirPpk)]
            data.checklist.dokumentasi = [data.checklist.dokumentasi[0], bol(req.body.checklistDokumentasiPpk)]
            data.checklist.notulensi = [data.checklist.notulensi[0], bol(req.body.checklistNotulensiPpk)]
            data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], bol(req.body.checklistCvPpk)]
            data.catatan.ppk = req.body.loketCatatanPpk

            if (req.body.loketSpp == 'Belum') {
                data.spp = req.body.loketSpp
                data.posisi = 'Bendahara'
                userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke Bendahara')
                saveRedirect(req, res, data)
            } else if (req.body.loketSpp == 'Sudah') {
                data.spp = req.body.loketSpp
                data.posisi = 'PPSPM'
                userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke PPSPM')
                saveRedirect(req, res, data)
            }

        })
    })
})

loket.post('/ppkKirimBinagram', function(req, res) {
    if (req.session.tiketId) { //permintaan dana
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
                    SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.ursoutput)
                    })
                },
                function(callback) {
                    Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urkmpnen)
                    })
                },
                function(callback) {
                    SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                        callback(null, pro.urskmpnen)
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
                    return
                }
                data.pok.kdprogram = req.body.loketProgram
                data.pok.kdaktivitas = req.body.loketKegiatan
                data.pok.kdkro = req.body.loketOutput
                data.pok.kdro = req.body.loketsOutput
                data.pok.kdkomponen = req.body.loketKomponen
                data.pok.kdsubkomponen = req.body.loketsKomponen
                data.pok.kdakun = req.body.loketAkun

                data.pok.uraianProgram = result[0]
                data.pok.uraianAktivitas = result[1]
                data.pok.uraianKro = result[2]
                data.pok.uraianRo = result[3]
                data.pok.uraianKomponen = result[4]
                data.pok.uraianSubKomponen = result[5]
                data.pok.uraianAkun = result[6]

                data.pok.detil.u1 = req.body.loketDetailPok1
                data.pok.detil.n1 = req.body.nilaiDetil1
                data.pok.detil.u2 = req.body.loketDetailPok2 || ''
                data.pok.detil.n2 = req.body.nilaiDetil2 || 0
                data.pok.detil.u3 = req.body.loketDetailPok3 || ''
                data.pok.detil.n3 = req.body.nilaiDetil3 || 0
                data.pok.detil.u4 = req.body.loketDetailPok4 || ''
                data.pok.detil.n4 = req.body.nilaiDetil4 || 0
                data.pok.detil.u5 = req.body.loketDetailPok5 || ''
                data.pok.detil.n5 = req.body.nilaiDetil5 || 0

                data.nilai.bruto = req.body.loketNilai

                data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], bol(req.body.checklistSpjPpspm)]
                data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], bol(req.body.checklistDaftarHadirPpspm)]
                data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], bol(req.body.checklistDokumentasiPpspm)]
                data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], bol(req.body.checklistNotulensiPpspm)]
                data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], bol(req.body.checklistCvPpspm)]
                data.catatan.ppk = req.body.loketCatatanPpk

                var mailOptions = {
                    from: process.env.MAIL_SISTEM_NAME,
                    to: emailBinagram,
                    subject: 'Permintaan Revisi POK',
                    html: tempToBinagram2(req.body.loketProgram, req.body.loketKegiatan, req.body.loketOutput, req.body.loketsOutput, req.body.loketKomponen, req.body.loketsKomponen, req.body.loketAkun,
                        result[0], result[1], result[2], result[3], result[4], result[5], result[6],
                        req.body.loketDetailPok1, req.body.loketDetailPok2, req.body.loketDetailPok3, req.body.loketDetailPok4, req.body.loketDetailPok5,
                        req.body.nilaiDetil1, req.body.nilaiDetil2, req.body.nilaiDetil3, req.body.nilaiDetil4, req.body.nilaiDetil5,
                        req.body.loketCatatanPpk, data.unit.nama, data.nilai.bruto),
                    // 'PPK meminta perubahan dana pada POK:<br>' +
                    // '.....Program: ' + req.body.loketProgram + ' ' + result[0] + '<br>' +
                    // '.....Aktivitas: ' + req.body.loketKegiatan + ' ' + result[1] + '<br>' +
                    // '.....KRO: ' + req.body.loketOutput + ' ' + result[2] + '<br>' +
                    // '.....Komponen: ' + req.body.loketKomponen + ' ' + result[3] + '<br>' +
                    // '.....Akun: ' + req.body.loketAkun + ' ' + result[4] + '<br>' +
                    // '.....Detail POK: ' + req.body.loketDetailPok + '<br>' +
                    // 'dengan Catatan PPK "' + req.body.loketCatatanPpk + '"<br>' +
                    // 'Rincian permintaan dana unit:<br>' +
                    // '.....Nama Unit: ' + data.unit + '<br>' +
                    // '.....Nilai pengajuan bruto: ' + data.nilaiPengajuan + '<br>' +
                    // '.....SPJ: Terlampir',
                    attachments: [{
                        path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
                    }]
                }
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) throw new Error(err)
                    console.log('(Binagram) Email sent: ' + info.response)
                })

                userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke Binagram')
                saveRedirect(req, res, data)
                    // data.save()
                    // req.session.tiketId = ''
                    // res.redirect('/#loket/dashboard')
            })
        })
    } else { //usulan
        Usulan.findById(req.body.idUsulan).lean().exec((err, data) => {
            if (err) {
                console.log(err)
                throw new Error(err)
            }
            var mailOptions = {
                from: process.env.MAIL_SISTEM_NAME,
                to: emailBinagram,
                subject: 'Permintaan Revisi POK',
                html: tempToBinagram(data.pok.kdprogram, data.pok.kdaktivitas, data.pok.kdkro, data.pok.kdro, data.pok.kdkomponen, data.pok.kdsubkomponen, data.pok.kdakun,
                    data.pok.uraianProgram, data.pok.uraianAktivitas, data.pok.uraianKro, data.pok.uraianRo, data.pok.uraianKomponen, data.pok.uraianSubKomponen, data.pok.uraianAkun,
                    data.pok.detil.u1, data.pok.detil.u2, data.pok.detil.u3, data.pok.detil.u4, data.pok.detil.u5,
                    data.pok.detil.n1, data.pok.detil.n2, data.pok.detil.n3, data.pok.detil.n4, data.pok.detil.n5,
                    req.body.catatanPPKUsulanUnit, data.unit, data.nilaiBruto, data.catatanUnit),
                // 'Permintaan perubahan dana pada POK:<br>' +
                // '.....Program       : ' + data.pok.kdprogram + ' ' + data.pok.uraianProgram + '<br>' +
                // '.....Aktivitas     : ' + data.pok.kdaktivitas + ' ' + data.pok.uraianAktivitas + '<br>' +
                // '.....KRO           : ' + data.pok.kdkro + ' ' + data.pok.uraianKro + '<br>' +
                // '.....Komponen      : ' + data.pok.kdkomponen + ' ' + data.pok.uraianKomponen + '<br>' +
                // '.....Akun          : ' + data.pok.kdakun + ' ' + data.pok.uraianAkun + '<br>' +
                // '.....Detail POK    : ' + data.pok.uraianDetil + '<br>' +
                // 'dengan Catatan PPK "' + req.body.catatanPPKUsulanUnit + '"<br>' +
                // 'Rincian permintaan dana:<br>' +
                // '.....Unit                  : ' + data.unit + '<br>' +
                // '.....Nilai pengajuan bruto : ' + data.nilaiBruto + '<br>' +
                // '.....Catatan Unit          : ' + data.catatanUnit + '<br>'
            }
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) throw new Error(err)
                console.log('(Binagram) Email sent: ' + info.response)
            })
            userAct(req, 'Meneruskan usulan ' + data._id + ' ke Binagram')
            res.status(200).send()
        })
    }

})

//-------
loket.post('/ppspmTolak', function(req, res) {
    Loket.findById(req.session.tiketId, (err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }

        data.catatan.ppspm = req.body.loketCatatanPpspm
        data.status = 'Dikembalikan ke unit'

        var mailOptions = {
            from: process.env.MAIL_SISTEM_NAME,
            to: data.email,
            subject: 'Pengembalian Permintaan Dana dengan SIMAMOV',
            html: tempTolak(data.nomorTransaksi, formatTanggal(data.tanggal.pengajuan), data.catatan.ppspm),
            //'Maaf permintaan dana yang Anda lakukan pada SIMAMOV dengan nomor transaksi ' + data.nomorTransaksi + ' terdapat kesalahan/dokumen tidak lengkap.<br>' +
            //'Permintaan telah dikembalikan ke unit oleh PPSPM dengan catatan "' + data.catatan.ppspm + '"',
            attachments: [{
                path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
            }]
        }
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) throw new Error(err)
            console.log('Email sent: ' + info.response)
        })

        userAct(req, 'Menolak permintaan ' + data.nomorTransaksi)
        saveRedirect(req, res, data)
            // data.save()
            // req.session.tiketId = ''
            // res.redirect('/#loket/dashboard')
    })
})

loket.post('/ppspmKirimReviewer', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai

            data.checklist.spj = [data.checklist.spj[0], data.checklist.spj[1], bol(req.body.checklistSpjPpspm)]
            data.checklist.daftarHadir = [data.checklist.daftarHadir[0], data.checklist.daftarHadir[1], bol(req.body.checklistDaftarHadirPpspm)]
            data.checklist.dokumentasi = [data.checklist.dokumentasi[0], data.checklist.dokumentasi[1], bol(req.body.checklistDokumentasiPpspm)]
            data.checklist.notulensi = [data.checklist.notulensi[0], data.checklist.notulensi[1], bol(req.body.checklistNotulensiPpspm)]
            data.checklist.cvNarasumber = [data.checklist.cvNarasumber[0], data.checklist.cvNarasumber[1], bol(req.body.checklistCvPpspm0)]
            data.catatan.ppspm = req.body.loketCatatanPpspm
            data.posisi = 'Reviewer'

            userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke Reviewer')
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    })
})

//-------
loket.post('/reviewerPending', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai
            data.catatan.reviewer = req.body.loketCatatanReviewer

            userAct(req, 'Mempending permintaan ' + data.nomorTransaksi)
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    })
})

loket.post('/reviewerProses', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai

            data.catatan.reviewer = req.body.loketCatatanReviewer
            data.posisi = 'Bendahara'

            userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke Bendahara')
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    })
})

//-------
loket.post('/bendaharaKirimSpp', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai

            data.spp = req.body.loketSpp
            data.posisi = 'PPSPM'
            userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke PPSPM')
            saveRedirect(req, res, data)
        })
    })
})

loket.post('/bendaharaProses', function(req, res) {
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
                SubOutput.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdsoutput: req.body.loketsOutput, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.ursoutput)
                })
            },
            function(callback) {
                Komponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urkmpnen)
                })
            },
            function(callback) {
                SubKomponen.findOne({ kdprogram: req.body.loketProgram, kdgiat: req.body.loketKegiatan, kdoutput: req.body.loketOutput, kdkmpnen: req.body.loketKomponen, kdskmpnen: req.body.loketsKomponen, thang: new Date().getFullYear() }).lean().exec((err, pro) => {
                    callback(null, pro.urskmpnen)
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
                return
            }
            data.pok.kdprogram = req.body.loketProgram
            data.pok.kdaktivitas = req.body.loketKegiatan
            data.pok.kdkro = req.body.loketOutput
            data.pok.kdro = req.body.loketsOutput
            data.pok.kdkomponen = req.body.loketKomponen
            data.pok.kdsubkomponen = req.body.loketsKomponen
            data.pok.kdakun = req.body.loketAkun

            data.pok.uraianProgram = result[0]
            data.pok.uraianAktivitas = result[1]
            data.pok.uraianKro = result[2]
            data.pok.uraianRo = result[3]
            data.pok.uraianKomponen = result[4]
            data.pok.uraianSubKomponen = result[5]
            data.pok.uraianAkun = result[6]

            data.pok.detil.u1 = req.body.loketDetailPok1
            data.pok.detil.n1 = req.body.nilaiDetil1
            data.pok.detil.u2 = req.body.loketDetailPok2 || ''
            data.pok.detil.n2 = req.body.nilaiDetil2 || 0
            data.pok.detil.u3 = req.body.loketDetailPok3 || ''
            data.pok.detil.n3 = req.body.nilaiDetil3 || 0
            data.pok.detil.u4 = req.body.loketDetailPok4 || ''
            data.pok.detil.n4 = req.body.nilaiDetil4 || 0
            data.pok.detil.u5 = req.body.loketDetailPok5 || ''
            data.pok.detil.n5 = req.body.nilaiDetil5 || 0

            data.nilai.bruto = req.body.loketNilai

            data.metodeTransfer = req.body.loketMetodeTransfer
            data.nilai.pajak = req.body.loketNilaiPajak
            data.nilai.transfer = req.body.loketNilaiTransfer
            data.posisi = 'Operator Bank'

            userAct(req, 'Meneruskan permintaan ' + data.nomorTransaksi + ' ke Operator Bank')
            saveStay(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.status(204).send()
        })
    })
})

loket.post('/bendaharaKirimArsiparis', function(req, res) {
    Loket.findById(req.session.tiketId, (err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }
        console.log("mengirim ke arsiparis")
        res.status(200).send()
        userAct(req, 'Mengirim detail permintaan ' + data.nomorTransaksi + ' ke Arsiparis')
    })
})

loket.post('/bendaharaKirimBmn', function(req, res) {
    Loket.findById(req.session.tiketId, (err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }
        console.log("mengirim ke operator BMN")
        res.status(200).send()
        userAct(req, 'Mengirim detail permintaan ' + data.nomorTransaksi + ' ke Operator BMN')
    })
})

//-------
loket.post('/bankKirim', function(req, res) {
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
            data.dokumenBank = data.nomorTransaksi + '-dokumenBank.' + files.dokumenBank.name.match(/[^.]\w*$/i)[0]

            var oldpath = files.dokumenBank.path
            var newpath = __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-dokumenBank.' + files.dokumenBank.name.match(/[^.]\w*$/i)[0]

            mv(oldpath, newpath, function(err) {
                if (err) { throw new Error(err) }
                console.log('file dokumen Bank uploaded successfully')
                return
            });

            //kirim email ke penerima
            if (data.metodeTransfer != 'CMS') {
                var mailOptions = {
                    from: process.env.MAIL_SISTEM_NAME,
                    to: data.email,
                    subject: 'Penyelesaian Permintaan Dana dengan SIMAMOV',
                    html: tempSelesai(data.nomorTransaksi, formatTanggal(data.tanggal.pengajuan), formatTanggal(data.tanggal.selesai), formatUang(data.nilai.transfer)),
                    //'Permintaan dana yang Anda lakukan pada SIMAMOV dengan nomor transaksi ' + data.nomorTransaksi + ' telah diselesaikan oleh petugas BAU.<br>' +
                    //'Silahkan cek rekening/ambil uang Anda',
                    attachments: [{
                            path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-dokumenBank.' + files.dokumenBank.name.match(/[^.]\w*$/i)[0]
                        },
                        {
                            path: __dirname + '/../uploaded/spj/' + data.nomorTransaksi + '-SpjUnit.' + data.fileSpj.match(/[^.]\w*$/i)[0]
                        }
                    ]
                }
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) throw new Error(err)
                    console.log('(Permintaan selesai) Email sent: ' + info.response)
                })
            }

            Usulan.update({ _id: data.idUsulan }, { status: 'Permintaan dana selesai', timestamp: new Date().getTime() }, function(err, data) {})
            userAct(req, 'Menyelesaikan permintaan ' + data.nomorTransaksi)
            saveRedirect(req, res, data)
                // data.save()
                // req.session.tiketId = ''
                // res.redirect('/#loket/dashboard')
        })
    })
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
                    res.status(404).send()
                    return
                }
                res.download(file); // Set disposition and send it.
            })
        } else if (data.fileSpj.match(/[^.]\w*$/i)[0] == 'xlsx') {
            const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-SpjUnit.xlsx`
            fs.access(file, fs.F_OK, (err) => {
                if (err) {
                    console.log(err)
                    res.status(404).send()
                    return
                }
                res.download(file); // Set disposition and send it.
            })
        } else {
            res.status(404).send()
            return
        }
    })
})

loket.post('/downloadSpjTiketBank', function(req, res) {
    Loket.findById(req.body.tiketId).exec((err, data) => {
        if (err) {
            console.log(err)
            throw new Error(err)
        }
        if (data.dokumenBank.match(/[^.]\w*$/i)[0] == 'xls') {
            const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xls`
            fs.access(file, fs.F_OK, (err) => {
                if (err) {
                    console.log(err)
                    res.status(404).send()
                    return
                }
                res.download(file); // Set disposition and send it.
            })
        } else if (data.dokumenBank.match(/[^.]\w*$/i)[0] == 'xlsx') {
            const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xlsx`
            fs.access(file, fs.F_OK, (err) => {
                if (err) {
                    console.log(err)
                    res.status(404).send()
                    return
                }
                res.download(file); // Set disposition and send it.
            })
        } else {
            res.status(404).send()
            return
        }
        // const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xlsx`
        // fs.access(file, fs.F_OK, (err) => {
        //     if (err) {
        //         console.log(err)
        //         const file = `${__dirname}/../uploaded/spj/${data.nomorTransaksi}-dokumenBank.xls`
        //         fs.access(file, fs.F_OK, (err) => {
        //             if (err) {
        //                 console.log(err)
        //                 res.render('404', { layout: false });
        //                 return
        //             }
        //             res.download(file); // Set disposition and send it.
        //         })
        //     }
        //     res.download(file); // Set disposition and send it.
        // })
    })
})

loket.get('/downloadPermintaanDana/:tabel/:format', function(req, res) { //belum selesai
    var jenisTabel = req.params.tabel
    var format = req.params.format;
    var wb = new xl.Workbook({
        defaultFont: {
            size: 11,
            name: 'Times New Roman',
        }
    })

    var ws = wb.addWorksheet('Rekap Permintaan Dana', {
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
            'left': 0.4,
            'right': 0.4,
            'top': 0.1
        }
    })

    //style
    var header = wb.createStyle({
        font: {
            bold: true,
            color: 'white',
        },
        alignment: {
            wrapText: true,
            horizontal: 'center',
            vertical: 'center',
            shrinkToFit: true,
        },
        border: {
            left: {
                style: 'thin'
            },
            right: {
                style: 'thin'
            },
            top: {
                style: 'thin'
            },
            bottom: {
                style: 'thin'
            },
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: '#20a8d8',
        } 
    })
    var text_center = wb.createStyle({
        alignment: {
            wrapText: true,
            horizontal: 'center',
            vertical: 'center'
        },
        border: {
            left: {
                style: 'thin'
            },
            right: {
                style: 'thin'
            },
            top: {
                style: 'thin'
            },
            bottom: {
                style: 'thin'
            },
        }
    })

    var text_left = wb.createStyle({
        alignment: {
            wrapText: true,
            horizontal: 'left',
            vertical: 'center'
        },
        border: {
            left: {
                style: 'thin'
            },
            right: {
                style: 'thin'
            },
            top: {
                style: 'thin'
            },
            bottom: {
                style: 'thin'
            },
        }
    })

    var number = wb.createStyle({
        alignment: {
            wrapText: true,
            horizontal: 'right',
            vertical: 'center'
        },
        border: {
            left: {
                style: 'thin'
            },
            right: {
                style: 'thin'
            },
            top: {
                style: 'thin'
            },
            bottom: {
                style: 'thin'
            },
        },
        numberFormat: '_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)',
    })

    var row_tolak = wb.createStyle({
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: '#dce2c8',
        } 
    })

    
    var row_pos = 6
    
    if(jenisTabel == 'proses'){
        Loket.find({status: { $in: ['Belum selesai', 'Dikembalikan ke unit'] }}, {nomorTransaksi:1, tanggal:{pengajuan:1, pelaksanaan:1}, unit:1, operator:1, pok:{kdakun:1, detil:1}, detail:1, status:1, nilai:{bruto:1}}).lean().sort('tanggal.pengajuan').exec((err, data)=>{
            //width
            ws.column(1).setWidth(13)
            ws.column(2).setWidth(12)
            ws.column(3).setWidth(16)
            ws.column(4).setWidth(16)
            ws.column(5).setWidth(13)
            ws.column(6).setWidth(13)
            ws.column(7).setWidth(30)
            ws.column(8).setWidth(13)
            ws.column(9).setWidth(10)
            ws.column(10).setWidth(30)
        
            //title
            ws.cell(2, 1, 2, 10, true).string('Daftar Permintaan Dana').style({ font: { bold: true, size: 14 }, alignment: { horizontal: 'center' } });
            //header
            ws.cell(4, 1, 5, 1, true).string('Unit').style(header)
            ws.cell(4, 2, 5, 2, true).string('No Transaksi').style(header)
            ws.cell(4, 3, 4, 4, true).string('Tanggal').style(header)
            ws.cell(5, 3).string('Pengajuan').style(header)
            ws.cell(5, 4).string('Pelaksanaan').style(header)
            ws.cell(4, 5, 5, 5, true).string('Nilai Pengajuan').style(header)
            ws.cell(4, 6, 5, 6, true).string('Operator').style(header)
            ws.cell(4, 7, 5, 7, true).string('Deskripsi').style(header)
            ws.cell(4, 8, 5, 8, true).string('Status').style(header)
            ws.cell(4, 9, 5, 9, true).string('Kode Akun').style(header)
            ws.cell(4, 10, 5, 10, true).string('Detil POK').style(header)
            //body
            for (let i = 0; i < data.length; i++) {
                let ddd = `="${data[i].pok.detil.u1}"`
                if (data[i].pok.detil.u2){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u2}"`
                }
                if (data[i].pok.detil.u3){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u3}"`
                }
                if (data[i].pok.detil.u4){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u4}"`
                }
                if (data[i].pok.detil.u5){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u5}"`
                }
    
                if (data[i].status == 'Dikembalikan ke unit'){
                    ws.cell(row_pos+i, 1).string(data[i].unit.nama).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 2).string(data[i].nomorTransaksi).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 3).string(formatTanggal(data[i].tanggal.pengajuan)).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 4).string(formatTanggal(data[i].tanggal.pelaksanaan)).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 5).number(data[i].nilai.bruto).style(number).style(row_tolak)
                    ws.cell(row_pos+i, 6).string(data[i].operator).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 7).string(data[i].detail).style(text_left).style(row_tolak)
                    ws.cell(row_pos+i, 8).string(data[i].status).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 9).string(data[i].pok.kdakun).style(text_center).style(row_tolak)
                    ws.cell(row_pos+i, 10).formula(ddd).style(text_left).style(row_tolak)
                } else {
                    ws.cell(row_pos+i, 1).string(data[i].unit.nama).style(text_center)
                    ws.cell(row_pos+i, 2).string(data[i].nomorTransaksi).style(text_center)
                    ws.cell(row_pos+i, 3).string(formatTanggal(data[i].tanggal.pengajuan)).style(text_center)
                    ws.cell(row_pos+i, 4).string(formatTanggal(data[i].tanggal.pelaksanaan)).style(text_center)
                    ws.cell(row_pos+i, 5).number(data[i].nilai.bruto).style(number)
                    ws.cell(row_pos+i, 6).string(data[i].operator).style(text_center)
                    ws.cell(row_pos+i, 7).string(data[i].detail).style(text_left)
                    ws.cell(row_pos+i, 8).string(data[i].status).style(text_center)
                    ws.cell(row_pos+i, 9).string(data[i].pok.kdakun).style(text_center)
                    ws.cell(row_pos+i, 10).formula(ddd).style(text_left)
                }
            }
    
            UnduhPermintaan(format, wb, res)
        })
    } else if (jenisTabel == 'selesai'){
        Loket.find({status: 'Selesai'}, {nomorTransaksi:1, tanggal:{transfer:1, selesai:1}, unit:1, pok:{kdakun:1, detil:1}, detail:1, metodeTransfer:1, nilai:{bruto:1, pajak:1}}).lean().sort('tanggal.selesai').exec((err, data)=>{
            //width
            ws.column(1).setWidth(13)
            ws.column(2).setWidth(12)
            ws.column(3).setWidth(16)
            ws.column(4).setWidth(16)
            ws.column(5).setWidth(13)
            ws.column(6).setWidth(13)
            ws.column(7).setWidth(13)
            ws.column(8).setWidth(30)
            ws.column(9).setWidth(10)
            ws.column(10).setWidth(30)
        
            //title
            ws.cell(2, 1, 2, 10, true).string('Daftar Permintaan Dana Selesai').style({ font: { bold: true, size: 14 }, alignment: { horizontal: 'center' } });
            //header
            ws.cell(4, 1, 5, 1, true).string('Unit').style(header)
            ws.cell(4, 2, 5, 2, true).string('No Transaksi').style(header)
            ws.cell(4, 3, 4, 4, true).string('Tanggal').style(header)
            ws.cell(5, 3).string('Selesai').style(header)
            ws.cell(5, 4).string('Pembayaran').style(header)
            ws.cell(4, 5, 4, 6).string('Nilai').style(header)
            ws.cell(5, 5).string('Pengajuan').style(header)
            ws.cell(5, 6).string('Pajak').style(header)
            ws.cell(4, 7, 5, 7, true).string('Metode Pembayaran').style(header)
            ws.cell(4, 8, 5, 8, true).string('Deskripsi').style(header)
            ws.cell(4, 9, 5, 9, true).string('Kode Akun').style(header)
            ws.cell(4, 10, 5, 10, true).string('Detil POK').style(header)
            //body
            for (let i = 0; i < data.length; i++) {
                let ddd = `="${data[i].pok.detil.u1}"`
                if (data[i].pok.detil.u2){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u2}"`
                }
                if (data[i].pok.detil.u3){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u3}"`
                }
                if (data[i].pok.detil.u4){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u4}"`
                }
                if (data[i].pok.detil.u5){
                    ddd = ddd + `&CHAR(10)&"${data[i].pok.detil.u5}"`
                }
    
                ws.cell(row_pos+i, 1).string(data[i].unit.nama).style(text_center)
                ws.cell(row_pos+i, 2).string(data[i].nomorTransaksi).style(text_center)
                ws.cell(row_pos+i, 3).string(formatTanggal(data[i].tanggal.selesai)).style(text_center)
                ws.cell(row_pos+i, 4).string(formatTanggal(data[i].tanggal.transfer)).style(text_center)
                ws.cell(row_pos+i, 5).number(data[i].nilai.bruto).style(number)
                ws.cell(row_pos+i, 6).number(data[i].nilai.pajak).style(number)
                ws.cell(row_pos+i, 7).string(data[i].metodeTransfer).style(text_center)
                ws.cell(row_pos+i, 8).string(data[i].detail).style(text_left)
                ws.cell(row_pos+i, 9).string(data[i].pok.kdakun).style(text_center)
                ws.cell(row_pos+i, 10).formula(ddd).style(text_left)
            }
    
            UnduhPermintaan(format, wb, res)
        })
    }

})

// --------------------   FUNCTION   -----------------------

function saveRedirect(req, res, data) {
    data.save()
    req.session.tiketId = ''
    res.redirect('/#loket/dashboard')
}

function saveStay(req, res, data) {
    data.save()
    res.status(200).send()
}

function userAct(req, act) {
    User.update({ _id: req.session.user_id }, { $push: { 'act': { label: act, timestamp: new Date().getTime() } } },
        function(err, status) {}
    )
}

function bol(val) {
    if (val == "True") {
        return true
    } else if (val == "False") {
        return false
    }
}

function formatTanggal(date) {
    let dat = new Date(date)
    let monthNames = [
        "Januari", "Februari", "Maret",
        "April", "Mei", "Juni", "Juli",
        "Agustus", "September", "Oktober",
        "November", "Desember"
    ];
    let day = dat.getDate()
    let monthIndex = dat.getMonth()
    let year = dat.getFullYear()
    if (date) {
        return day + ' ' + monthNames[monthIndex] + ' ' + year;
    } else {
        return ''
    }
}

function formatUang(x) {
    if (x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    } else return ''
}

function UnduhPermintaan(format, wb, res){
    if (format == 'xlsx')
        wb.write('Daftar Permintaan Dana.xlsx', res)
    else {
        msopdf(null, function(error, office) {
            if (error) { 
                console.log("Init failed", error);
                return
            }
            let input = __dirname + '/../temp_file/Daftar Permintaan Dana.xlsx'
            let output = __dirname + '/../temp_file/Daftar Permintaan Dana.pdf'

            wb.write(input, function(err, stats) {
                if (err) {
                    console.log(err)
                    res.status(500).send()
                }
                office.excel({ input: input, output: output }, function(err, pdf) {
                    if (err) {
                        console.log(err)
                    }
                })
                office.close(null, function(err) { 
                    if (err) { 
                        console.log(err);
                    } else { 
                        res.download(output, (err)=>{
                            if (err) {
                                console.log(err)
                            }
                            fs.unlink(input, (err)=>{})
                            fs.unlink(output, (err)=>{})
                        })
                    }
                });
            })
        })
    }
}

//format email
function tempToBinagram(k1, k2, k3, k4, k5, k6, k7, u1, u2, u3, u4, u5, u6, u7, d1, d2, d3, d4, d5, nd1, nd2, nd3, nd4, nd5, cppk, nu, np, cu) { //usulan
    return `<table width="100%" height="100" bgcolor="#E4F1EB" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="40"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Raleway', sans-serif; font-size:37px; color:#3B3561; line-height:44px; font-weight: bold; letter-spacing: 5px;">` +
        `Permintaan Revisi POK` +
        `</td>` +
        `</tr>` +
        `<tr height="10"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:15px; color:#3B3561; line-height:24px; font-weight: 300;">` +
        `Oleh: PPK` +
        `</td>` +
        `</tr>` +
        `<tr height="40"></tr>` +
        `</tbody>` +
        `</table>` +
        `<div style="background-color: #F0F7F4;">` +
        `<table align="center" width="70%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td height="35"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:14px; color:#757575; line-height:24px; font-weight: 300;">` +
        `Email ini dikirimkan otomatis oleh sistem. <br> Email ini bertujuan untuk memberitahukan kepada Binagram bahwa Petugas Pembuat Komitmen (PPK) membutuhkan revisi Petunjuk Operasional Kegiatan (POK).` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `<table align="center" width="50%" cellspacing="0" cellpadding="0" style="border: 1px solid;">` +
        `<tbody>` +
        `<tr>` +
        `<td width="5%"></td>` +
        `<td width="25%"></td>` +
        `<td width="70%"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="3" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Rincian POK yang membutuhkan revisi` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Program` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k1} - ${u1}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Aktivitas` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k2} - ${u2}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `KRO` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k3} - ${u3}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `RO` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k4} - ${u4}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Komponen` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k5} - ${u5}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Sub Komponen` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k6} - ${u6}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Akun` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k7} - ${u7}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 1` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd1}) ${d1}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 2` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd2 || '-'}) ${d2 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 3` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd3 || '-'}) ${d3 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 4` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd4 || '-'}) ${d4 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 5` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd5 || '-'}) ${d5 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="2" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Catatan PPK` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300;  vertical-align:top;">` +
        `: ${cppk}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="3" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Rincian Unit yang melakukan usulan kegiatan` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Unit` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${nu }` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Total Nilai Bruto` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: Rp ${np}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Catatan Unit` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${cu || '-'}` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>` +
        `<table>` +
        `<tbody>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `</div>` +
        `<table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td align="center" bgcolor="#E4F1EB">` +
        `<table class="col" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="15"></tr>` +
        `<tr>` +
        `<td align="left" style="font-family: 'Raleway',  sans-serif; font-size:26px; font-weight: 500; color:#3B3561; padding-left: 15px;">${new Date().getFullYear()} - SIMAMOV</td>` +
        `</tr>` +
        `<tr height="15"></tr>` +
        `</tbody>` +
        `</table>` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>`
}

function tempToBinagram2(k1, k2, k3, k4, k5, k6, k7, u1, u2, u3, u4, u5, u6, u7, d1, d2, d3, d4, d5, nd1, nd2, nd3, nd4, nd5, cppk, nu, np) { //pemrintaan dana
    return `<table width="100%" height="100" bgcolor="#E4F1EB" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="40"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Raleway', sans-serif; font-size:37px; color:#3B3561; line-height:44px; font-weight: bold; letter-spacing: 5px;">` +
        `Permintaan Revisi POK` +
        `</td>` +
        `</tr>` +
        `<tr height="10"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:15px; color:#3B3561; line-height:24px; font-weight: 300;">` +
        `Oleh: PPK` +
        `</td>` +
        `</tr>` +
        `<tr height="40"></tr>` +
        `</tbody>` +
        `</table>` +
        `<div style="background-color: #F0F7F4;">` +
        `<table align="center" width="70%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td height="35"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:14px; color:#757575; line-height:24px; font-weight: 300;">` +
        `Email ini dikirimkan otomatis oleh sistem. <br> Email ini bertujuan untuk memberitahukan kepada Binagram bahwa Petugas Pembuat Komitmen (PPK) membutuhkan revisi Petunjuk Operasional Kegiatan (POK).` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `<table align="center" width="50%" cellspacing="0" cellpadding="0" style="border: 1px solid;">` +
        `<tbody>` +
        `<tr>` +
        `<td width="5%"></td>` +
        `<td width="25%"></td>` +
        `<td width="70%"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="3" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Rincian POK yang membutuhkan revisi` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Program` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k1} - ${u1}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Aktivitas` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k2} - ${u2}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `KRO` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k3} - ${u3}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `RO` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k4} - ${u4}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Komponen` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k5} - ${u5}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Sub Komponen` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k6} - ${u6}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Akun` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${k7} - ${u7}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 1` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd1}) ${d1}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 2` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd2 || '-'}) ${d2 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 3` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd3 || '-'}) ${d3 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 4` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd4 || '-'}) ${d4 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Detil 5` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: (Rp ${nd5 || '-'}) ${d5 || ''}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="2" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Catatan PPK` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300;  vertical-align:top;">` +
        `: ${cppk}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td align="left" colspan="3" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Rincian Unit yang melakukan permintaan` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Unit` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: ${nu }` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `Total Nilai Bruto` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: Rp ${np}` +
        `</td>` +
        `</tr>` +
        `<tr>` +
        `<td></td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `SPJ` +
        `</td>` +
        `<td align="left" style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; vertical-align:top;">` +
        `: Terlampir` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>` +
        `<table>` +
        `<tbody>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `</div>` +
        `<table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td align="center" bgcolor="#E4F1EB">` +
        `<table class="col" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="15"></tr>` +
        `<tr>` +
        `<td align="left" style="font-family: 'Raleway',  sans-serif; font-size:26px; font-weight: 500; color:#3B3561; padding-left: 15px;">${new Date().getFullYear()} - SIMAMOV</td>` +
        `</tr>` +
        `<tr height="15"></tr>` +
        `</tbody>` +
        `</table>` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>`
}

function tempUsulanUnit(notrans, tanggalmasuk, keputusan) {
    return `<table width="100%" height="100" bgcolor="#E4F1EB" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="40"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Raleway', sans-serif; font-size:37px; color:#3B3561; line-height:44px; font-weight: bold; letter-spacing: 5px;">` +
        `Konfirmasi Usulan` +
        `</td>` +
        `</tr>` +
        `<tr height="40"></tr>` +
        `</tbody>` +
        `</table>` +
        `<div style="background-color: #F0F7F4;">` +
        `<table align="center" width="70%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td height="35"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:14px; color:#757575; line-height:24px; font-weight: 300;">` +
        `Email ini dikirimkan otomatis oleh sistem. <br> Email ini bertujuan untuk memberitahukan kepada Unit bahwa usulan kegiatan yang dilakukan pada SIMAMOV telah dikonfirmasi.` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `<table align="center" width="50%" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; text-align: justify;">` +
        `Pengusulan kegiatan yang Anda lakukan pada SIMAMOV dengan nomor transaksi <strong>${notrans}</strong> pada ${tanggalmasuk} telah <strong>${keputusan}</strong> oleh PPK. Silahkan login pada SIMAMOV untuk mengeceknya.` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `</div>` +
        `<table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td align="center" bgcolor="#E4F1EB">` +
        `<table class="col" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="15"></tr>` +
        `<tr>` +
        `<td align="left" style="font-family: 'Raleway',  sans-serif; font-size:26px; font-weight: 500; color:#3B3561; padding-left: 15px;">${new Date().getFullYear()} - SIMAMOV</td>` +
        `</tr>` +
        `<tr height="15"></tr>` +
        `</tbody>` +
        `</table>` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>`
}

function tempTolak(notrans, tanggal, catatan) {
    return `<table width="100%" height="100" bgcolor="#E4F1EB" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="40"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Raleway', sans-serif; font-size:37px; color:#3B3561; line-height:44px; font-weight: bold; letter-spacing: 5px;">` +
        `Pengembalian Permintaan Dana` +
        `</td>` +
        `</tr>` +
        `<tr height="40"></tr>` +
        `</tbody>` +
        `</table>` +
        `<div style="background-color: #F0F7F4;">` +
        `<table align="center" width="70%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td height="35"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:14px; color:#757575; line-height:24px; font-weight: 300;">` +
        `Email ini dikirimkan otomatis oleh sistem. <br> Email ini bertujuan untuk memberitahukan kepada Unit bahwa permintaan dana yang dilakukan pada SIMAMOV tidak dapat diproses.` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `<table align="center" width="50%" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; text-align: justify;">` +
        `Permintaan dana yang Anda lakukan pada SIMAMOV dengan nomor transaksi <strong>${notrans}</strong> pada ${tanggal} terdapat kesalahan/dokumen tidak lengkap sehingga tidak dapat diproses. Permintaan telah dikembalikan kepada unit oleh petugas dengan catatan "${catatan}".` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `</div>` +
        `<table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td align="center" bgcolor="#E4F1EB">` +
        `<table class="col" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="15"></tr>` +
        `<tr>` +
        `<td align="left" style="font-family: 'Raleway',  sans-serif; font-size:26px; font-weight: 500; color:#3B3561; padding-left: 15px;">${new Date().getFullYear()} - SIMAMOV</td>` +
        `</tr>` +
        `<tr height="15"></tr>` +
        `</tbody>` +
        `</table>` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>`
}

function tempSelesai(notrans, tanggalmasuk, tanggalselesai, nilaibayar) {
    return `<table width="100%" height="100" bgcolor="#E4F1EB" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="40"></tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Raleway', sans-serif; font-size:37px; color:#3B3561; line-height:44px; font-weight: bold; letter-spacing: 5px;">` +
        `Penyelesaian Permintaan Dana` +
        `</td>` +
        `</tr>` +
        `<tr height="40"></tr>` +
        `</tbody>` +
        `</table>` +
        `<div style="background-color: #F0F7F4;">` +
        `<table align="center" width="70%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td height="35"></td>` +
        `</tr>` +
        `<tr>` +
        `<td align="center" style="font-family: 'Lato', sans-serif; font-size:14px; color:#757575; line-height:24px; font-weight: 300;">` +
        `Email ini dikirimkan otomatis oleh sistem. <br> Email ini bertujuan untuk memberitahukan kepada Unit bahwa permintaan dana yang dilakukan pada SIMAMOV telah selesai diproses.` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `<table align="center" width="50%" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td style="font-family: 'Lato', sans-serif; font-size:14px; color:#3B3561; line-height:24px; font-weight: 300; text-align: justify;">` +
        `Permintaan dana yang Anda lakukan pada SIMAMOV dengan nomor transaksi <strong>${notrans}</strong> pada ${tanggalmasuk} telah diselesaikan oleh petugas pada ${tanggalselesai} dengan nilai pembayaran sebesar <strong> Rp ${nilaibayar}</strong>` +
        `</td>` +
        `</tr>` +
        `<tr height="50"></tr>` +
        `</tbody>` +
        `</table>` +
        `</div>` +
        `<table align="center" width="100%" border="0" cellspacing="0" cellpadding="0">` +
        `<tbody>` +
        `<tr>` +
        `<td align="center" bgcolor="#E4F1EB">` +
        `<table class="col" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">` +
        `<tbody>` +
        `<tr height="15"></tr>` +
        `<tr>` +
        `<td align="left" style="font-family: 'Raleway',  sans-serif; font-size:26px; font-weight: 500; color:#3B3561; padding-left: 15px;">${new Date().getFullYear()} - SIMAMOV</td>` +
        `</tr>` +
        `<tr height="15"></tr>` +
        `</tbody>` +
        `</table>` +
        `</td>` +
        `</tr>` +
        `</tbody>` +
        `</table>`
}

module.exports = loket;