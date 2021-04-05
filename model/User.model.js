var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: String,
    password: String,
    jenis: Number,
    jabatan: Number,
    role: Number,
    unit: String,
    email: String,
    ip_address: String,
    last_login_time: String,
    act: [{
        label: String,
        timestamp: {
            type: Number,
            default: new Date().getTime()
        }
    }],
    active: {
        type: Boolean,
        default: true
    }
}, { collection: 'user' });

UserSchema.methods.isExist = function(cb) {
    return this.model('User').findOne({ _id: this._id }, cb);
};

UserSchema.statics.getAll = function(cb) {
    return this.model('User').find({}, null, { sort: { username: 1 } }, cb);
};

module.exports = mongoose.model('User', UserSchema);