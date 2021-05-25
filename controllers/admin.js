//====== MODUL ======//
//load framework express
var express = require('express');
//buat router khusus admin
var admin = express.Router();

//load model User
var User = require(__dirname + "/../model/User.model");
var Jabatan = require(__dirname + "/../model/Jabatan.model");
var Role = require(__dirname + "/../model/Role.model");
var Unit = require(__dirname + "/../model/Unit.model");
var ObjectId = require('mongoose').Types.ObjectId;

//load crypto utk hashing password
var crypto = require('crypto');

//Short syntax tool
var _ = require("underscore");

//Socket.io
admin.connections;
admin.io;

admin.socket = function(io, connections, client) {
    admin.connections = connections;

    admin.io = io;

    client.on('list_user_acts', function(syarat, cb) {
        User.findOne({ '_id': syarat._id }, 'act').exec(function(err, result) {
            var real = [];
            if (result) {
                var y = client.handshake.session.tahun_anggaran || new Date().getFullYear();
                var m = syarat.month || new Date().getMonth();
                var lower_ts = syarat.lower_ts || Math.round(new Date(y, m, 1).getTime())
                var upper_ts = syarat.upper_ts || Math.round(new Date(y, +m + 1, 0).getTime()) + 86399000;
                _.each(result.act, function(row, index, list) {
                    if (row.timestamp >= lower_ts && row.timestamp <= upper_ts) {
                        real.push(row);
                    }
                })
                real = _.sortBy(real, function(o) { return -o.timestamp; })
            }
            cb(real);
        })
    })

    client.on('mintaJabatan', function(response) {
        Jabatan.find({ active: true }).lean().sort('kodeJabatan').exec(function(err, result) {
            response(result)
        })
    })

    client.on('mintaRole', function(response) {
        Role.find({ active: true }).lean().sort('kodeRole').exec(function(err, result) {
            response(result)
        })
    })

    client.on('mintaRoleKhusus', function(id, response) {
        Role.find({ active: true, kodeJabatan: id }).lean().sort('kodeRole').exec(function(err, result) {
            response(result)
        })
    })

    client.on('mintaUnit', function(response) {
        Unit.find({ active: true }).lean().sort('namaUnit').exec(function(err, result) {
            response(result)
        })
    })

    client.on('mintaUser', function(id, response) {
        User.findById(id).lean().distinct('email').exec((err, result) => {
            response(result)
        })
    })
}

//route GET /admin
admin.get('/', function(req, res) {
    if (!req.session.jenis) {
        sendNotification(req.session.user_id, 'Maaf, Anda tidak memiliki hak akses.');
        res.sendStatus(403);
        return;
    }
    User.find({ jenis: 1, active: true }, null, { sort: { username: 1 } }).lean().exec(function(err, adm_user) {
        User.find({ jenis: 0, active: true }, null, { sort: { username: 1 } }).lean().exec(function(err, user) {
            Jabatan.find({ active: true }, null, { sort: { kodeJabatan: 1 } }).lean().exec(function(err, jabatan) {
                Role.find({ active: true }, null, { sort: { kodeRole: 1 } }).lean().exec(function(err, role) {
                    Unit.find({ active: true }, null, { sort: { namaUnit: 1 } }).lean().exec(function(err, unit) {
                        res.render('admin', {
                            layout: false,
                            adm_user: adm_user,
                            user: user,
                            jabatan: jabatan,
                            role: role,
                            unit: unit,
                        })
                    })
                })
            })
        });
    });
});
//route tambah user
admin.post('/tambah_user', function(req, res) {
    req.body.password = crypto.createHmac('sha256', req.body.password).digest('hex');
    var user = new User(req.body);
    User.findOne({ username: user.username, active: true }, function(err, result) {
        if (result) {
            //jika sudah ada
            res.send('existed');
        } else {
            user.save(function(err, result) {
                res.send(result._id);
                User.update({ _id: req.session.user_id }, {
                    $push: { "act": { label: 'Tambah user ' + result._id, timestamp: new Date().getTime() } }
                }, function(err, status) {})
            })
        }
    })
});

//route hapus user
admin.delete('/hapus_user/:id', function(req, res) {
    User.update({ _id: new ObjectId(req.params.id) }, { active: false }, function(err, numAffected) {
        if (err) {
            res.send('Database bermasalah, mohon hubungi admin');
            return;
        }
        res.send('Berhasil dihapus.');
        User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Hapus user ' + req.params.id, timestamp: new Date().getTime() } } },
            function(err, status) {})
    });
});

//route edit user
admin.post('/edit/:_id', function(req, res) {
    if (req.body.password) {
        req.body.password = crypto.createHmac('sha256', req.body.password)
            .digest('hex');
    } else delete req.body.password;
    User.update({ _id: new ObjectId(req.params._id) },
        req.body, { upsert: false },
        function(err, numAffected) {
            if (err) {
                res.send('Database bermasalah, mohon hubungi admin');
                return;
            }
            res.send('Berhasil diubah.')
            User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Edit user ' + req.params._id, timestamp: new Date().getTime() } } },
                function(err, status) {})
        }
    );
});

//tambah jabatan
admin.post('/tambahJabatan', function(req, res) {
    const jabatan = new Jabatan({
        namaJabatan: req.body.namaJabatan,
        kodeJabatan: req.body.kodeJabatan,
    })

    jabatan.save()
    res.status(200).send()
    User.update({ _id: req.session.user_id }, {
        $push: { "act": { label: `Tambah jabatan ${req.body.kodeJabatan}-${req.body.namaJabatan}`, timestamp: new Date().getTime() } }
    }, function(err, status) {})
})

//hapus jabatan
admin.delete('/hapusJabatan/:id', function(req, res) {
    Jabatan.update({ _id: new ObjectId(req.params.id) }, { active: false }, function(err) {
        if (err) {
            res.send('Database bermasalah, mohon hubungi admin');
            return;
        }
        res.send('Berhasil dihapus');
        User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Hapus jabatan ' + req.params.id, timestamp: new Date().getTime() } } },
            function(err, status) {})
    });
});

//tambah role
admin.post('/tambahRole', function(req, res) {
    const role = new Role({
        kodeJabatan: req.body.kodeJabatanRole,
        namaRole: req.body.namaRole,
        kodeRole: req.body.kodeRole,
    })

    role.save()
    res.status(200).send()
    User.update({ _id: req.session.user_id }, {
        $push: { "act": { label: `Tambah role ${req.body.kodeRole}-${req.body.namaRole}`, timestamp: new Date().getTime() } }
    }, function(err, status) {})
})

//hapus role
admin.delete('/hapusRole/:id', function(req, res) {
    Role.update({ _id: new ObjectId(req.params.id) }, { active: false }, function(err) {
        if (err) {
            res.send('Database bermasalah, mohon hubungi admin');
            return;
        }
        res.send('Berhasil dihapus');
        User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Hapus role ' + req.params.id, timestamp: new Date().getTime() } } },
            function(err, status) {})
    });
});

//tambah unit
admin.post('/tambahUnit', function(req, res) {
    const unit = new Unit({
        namaUnit: req.body.namaUnit,
    })

    unit.save()
    res.status(200).send()
    User.update({ _id: req.session.user_id }, {
        $push: { "act": { label: `Tambah unit ${req.body.namaUnit}`, timestamp: new Date().getTime() } }
    }, function(err, status) {})
})

//hapus unit
admin.delete('/hapusUnit/:id', function(req, res) {
    Unit.update({ _id: new ObjectId(req.params.id) }, { active: false }, function(err) {
        if (err) {
            res.send('Database bermasalah, mohon hubungi admin');
            return;
        }
        res.send('Berhasil dihapus');
        User.update({ _id: req.session.user_id }, { $push: { "act": { label: 'Hapus unit ' + req.params.id, timestamp: new Date().getTime() } } },
            function(err, status) {})
    });
});

function sendNotification(user_id, message) {
    if (!admin.connections[user_id]) return;
    if (_.isString(user_id)) admin.connections[user_id].emit('messages', message)
    else user_id.emit('messages', message)
}

module.exports = admin;