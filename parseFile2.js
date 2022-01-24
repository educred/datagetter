const { table } = require('console');
const fs = require('fs');
const { parse } = require('path');
const result = JSON.parse(fs.readFileSync('./sample.json'));

function* prelucrare (arr, fnTransf) {
    let elem;
    for (elem of arr) {
        yield fnTransf(elem);
    }
};

const prelucrareGen = prelucrare(result, part => {      
    let content = part.body.content, elem; 
    for (elem of content) {
        if ('table' in elem) {
            console.log("În tabel avem: ", elem.table.tableRows);
        }
    }
});

let rezultat;
for (rezultat of prelucrareGen) {
    console.log("Acesta este rezultatul", rezultat);
}












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