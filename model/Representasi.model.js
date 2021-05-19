var fs = require('fs');

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var RepresentasiSchema = new Schema({
	'_id': String,
	'uraian': String,
	'luar_kota': Number,
	'dalam_kota': Number
}, { collection: 'representasi' });

module.exports = mongoose.model('Representasi', RepresentasiSchema);