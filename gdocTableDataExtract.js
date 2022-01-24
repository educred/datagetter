module.exports = function (gdoc) {
    // Preia obiectul care trebuie prelucrat și trece-l prin proceduri de minare
    let rows = gdoc.body.content.map(function step1 (contElem) {
        if ('table' in contElem) {
            let rec = contElem['table']['tableRows'];
            return rec;
        }
    }).filter(e => e !== undefined).flat().map(r => {
        let structure = {}; // structura de date a înregistrării este un obiect
        // tratarea celulelor
        r.tableCells.forEach((cell, idx, arr) => {
            // colectează toate fragmentele de text
            let contentTxt = [];
            // Tratarea unei celule la nivel individual. Aceasta poate avea mai multe paragrafe
            cell.content.forEach(cellContentArr => {            
                let tRuns = ''; // Acumulatorul de textRun-uri
                cellContentArr.paragraph.elements.forEach(lastObi => {
                    // ai un obiect care conține un textRun
                    tRuns = tRuns + lastObi.textRun.content.trim();
                });
                contentTxt.push(tRuns);
            });
            // completează structura finală, obiectul rafinat pe care-l obții
            structure[`idx${idx}`] = contentTxt.join('');
        });
        return structure;
    }).flat();

    let structure = rows.reduce(function (acc, val) {
        // valoarea fiecărui val un obiect
        switch (val.idx0) {
            case 'Titlul Resursei educaționale propuse':
                acc.titlu = val.idx1;
            case 'Disciplina/ Aria curriculară':
                acc.disciplina = val.idx1;
            case 'Clasa':
                acc.clasa = val.idx1;
            case 'Autor':
                acc.autor = val.idx1;
            case 'Competența specifică vizată':
                acc.competenta = val.idx1;
            case 'Descrierea specifică a activității de învățare care folosește resursa educațională propusă':
                acc.descriere = val.idx1;
            case 'Contextul de învățare':
                acc.context = val.idx1; 
        }
        return acc;
        // console.log(val);
    }, {});

    // console.log("Structura din GDoc rafinată este: ", rows);

    // console.log("Noua structură va fi: ", structure);
    console.log(structure);

    return structure;
}