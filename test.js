var xlxs = require('node-xlsx').default;
var XLSX = require('xlsx');
var path = require('path');
const util = require('util');

const { read } = require('fs');
path = 'C:/Users/Rifki/Downloads/REV_DIPA_4_2020-master.xlsx';

var cek1 = xlxs.parse(path);
var data = cek1[0].data.filter(o => !Object.keys(o).every(k => !o[k]));

var cek2 = XLSX.utils.sheet_to_json(path, { header: 1, blankrows: false });

console.log(util.inspect(data, { maxArrayLength: null }));