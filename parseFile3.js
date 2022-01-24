const fs = require('fs');
const { parse } = require('path');
const result = JSON.parse(fs.readFileSync('./sample.json'));
const objectScan = require('object-scan');

let r = objectScan(['body.content.**.table.tableRows.**.tableCells.**.content'], { joined: true, filterFn: ({value}) => {
    let info = '';
    if (Array.isArray(value)) {
        info = info + '#';
    }
    info = info + value;
    console.log(info);
} })(result);

console.log(r);