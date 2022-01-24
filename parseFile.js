const { table } = require('console');
const fs = require('fs');
const { parse } = require('path');
const result = [JSON.parse(fs.readFileSync('./sample.json'))];

// console.log(result);

let lines = '';


function rowExtractor (row) {
    let elem;
    for (elem of row) {

        // NIVELUL FIECĂRUI RÂND
        if ('tableCells' in elem) {
            // lines = lines + `\n`;            
            rowExtractor(elem.tableCells);
        }

        if ('content' in elem) {
            // ESTE CONȚINUTUL UNEI CELULE
            if (Array.isArray(elem.content)) {
                rowExtractor(elem.content);
            };
        }

        // DEJA SUNT LA NIVEL DE CELULA
        if ('paragraph' in elem) {
            // DIN CELULĂ TOATE POSIBILELE PARAGRAFE
            let txt = '';

            for (let fragment of elem.paragraph.elements) {
                if ('textRun' in fragment) {
                    txt = txt + fragment.textRun.content;
                }
            }
            lines = lines + txt;
        }

        // if ('textRun' in elem) {
        //     lines = lines + elem.textRun.content + '"';
        //     line.push(elem.textRun.content);
        // }
    }
    return lines;
}

function parser (arr) {
    let elem, r = '';
    for (elem of arr) {
        if ('body' in elem) {
            // console.log("Avem urmatoarea structura la body.content ", elem.body.content);
            parser (elem.body.content);
        }return r;
        if ('table' in elem) {
            r = rowExtractor(elem.table.tableRows);
            return r;
        }
        // if (Array.isArray(elem)) {
        //     parser(elem);
        // }
    }
    // console.log(r);
};

console.log("Ce avem aici", parser(result));

// console.log(line);
// console.log(info);
// console.log(tblCells);

















// .[0].body.content[] Este un array cu paragrafe, tabele și alte posibile elemente. Fiecare dintre aceste elemente sunt reprezentate ca obiecte.
// Ne interesează doar obiectele care au o proprietate numită `table`. Pe acestea le vom exploata.
/*
{
    "startIndex": 303,
    "endIndex": 1788,
    "table": {
        "rows": 9,
        "columns": 2,
        "tableRows": [
            {
                tableCells": [
                    {
                        content: [
                            {
                                paragraph: {
                                    elements: [
                                        {
                                            textRun: {
                                                content: 'Bucată din text'
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    },
                    {

                    }
                ]
            }
        ]
    }
*/

// Elementele de text al unei celule vor fi o concatenare de textRun.content-uri pentru toate elements ale unui paragraph -->.[0].body.content[].table.tableRows[0].tableCells[0].content[0].paragraph.elements[0].textRun.content
// for (fragment of objGen) {
//     // console.log(fragment);
//     lines = lines + fragment;
// }

// console.log(lines);
/*
Structura la care vreau să ajung este:
{   
    title: "Titlul RED-ului",
    autor: "Nume Prenume"
}
*/