require('dotenv').config();

// Node specific
const os = require('os');
const path = require('path');
const http = require('http');
const { randomUUID } = require('crypto');
const url = require('url');
const Buffer = require('buffer').Buffer;
const opn = require('open');
const destroyer = require('server-destroy');
const readline = require('readline');

/* === MONGOOSE === */
const mongoose = require('./mongoose.config');
let db = mongoose.connection;
const Resursa = require('./models/resursa-red');

const express = require('express');
const cookies = require('cookie-parser');
const session = require('express-session');

const { Readable } = require('stream');
const fs = require('fs');
const fsPromises = fs.promises;
const Papa = require('papaparse');

// CREAREA APLICAȚIEI
const httpserver = require('./util/httpserver');
const app        = httpserver.app();
const httpapp    = httpserver.http(app);

// DEPENDINȚE LOCALE
const gdocTableDataExtract = require('./gdocTableDataExtract');

/* === BODY PARSER === */
app.use(express.urlencoded({extended: true}));
app.use(express.json());

/* === FIȘIERELE statice === */
app.use(express.static(path.join(__dirname, '/public'), {
    index: false, 
    immutable: true, 
    cacheControl: true,
    maxAge: "30d"
}));

/* === HANDLEBARS :: SETAREA MOTORULUI DE ȘABLONARE === */
const hbs = require('express-hbs');
hbs.registerHelper('json', function clbkHbsHelperJSON (obi) {
    // console.log(JSON.stringify(obi.content));
    return JSON.stringify(obi);
});
app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials',
    layoutsDir:  __dirname + '/views/layouts',
    beautify: true
}));
app.set('views', __dirname + '/views'); // cu app.set se vor seta valori globale pentru aplicație
app.set('view engine', 'hbs');

const { google } = require('googleapis');
// const docs = require('@googleapis/docs');
// const drive = require('@googleapis/drive');
// const sheets = require('@googleapis/sheets');
// const youtube= require('@googleapis/youtube');

/**
 * To use OAuth2 authentication, we need access to a a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI.  
 * To get these credentials for your application, visit https://console.cloud.google.com/apis/credentials.
 */
const keyPath = path.join(__dirname, 'client_secret_495743720227-v4icv48v71q2nke4gf82lc99dvb7ek32.apps.googleusercontent.com.json'); // credențiale CRED
let keys = {redirect_uris: ['']};
if (fs.existsSync(keyPath)) {
    keys = require(keyPath).web;
}
const oauth2Client = new google.auth.OAuth2(
    keys.client_id,
    keys.client_secret,
    keys.redirect_uris[0]
);
/**
 * This is one of the many ways you can configure googleapis to use authentication credentials.
 * In this method, we're setting a global reference for all APIs. 
 * Any other API you use here, like google.drive('v3'), will now use this auth client. 
 * You can also override the auth client at the service and method call levels.
 */
google.options({
    auth: oauth2Client
});

const sheetsClient = google.sheets('v4');
const gdocs = google.docs('v1');
const driveClient = google.drive('v3');

/**
 * Script origin: https://github.com/googleapis/google-api-nodejs-client/blob/master/samples/oauth2.js
 * Open an http server to accept the oauth callback. 
 * In this simple example, the only request to our webserver is to /callback?code=<code>
 */
async function authenticate (scopes) {
    return new Promise((resolve, reject) => {
        // grab the url that will be used for authorization
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes.join(' '),
        });

        // Creează un server care servește doar autentificării
        const server = http.createServer(async (req, res) => {
            try {
                if (req.url.indexOf('/oauth2callback') > -1) {
                    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
                    res.end('<h3>Autentificare reușită! Mergi la consolă acum.</h3>'); // _TODO: AICI la  un moment dat, să faci un redirect către o pagină de control a resurselor.
                    server.destroy();
                    const {tokens} = await oauth2Client.getToken(qs.get('code'));
                    oauth2Client.credentials = tokens;
                    resolve(oauth2Client);
                }
            } catch (e) {
                reject(e);
            }
        }).listen(3000, () => {
            // open the browser to the authorize url to start the workflow
            opn(authorizeUrl, {wait: false}).then(cp => cp.unref());
        });
        destroyer(server);
    });
}

const scopes = [
    'https://www.googleapis.com/auth/contacts.readonly',
    'https://www.googleapis.com/auth/user.emails.read',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/drive.photos.readonly',
    'profile',
];


async function runAPP () {
    let counterRec = 0; // contor pentru numărul înregistrărilor prelucrate

    const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEETID,
        range:         'Form Responses 1'
    });

    // let data = response.data.values.slice(1).join('\n');
    let data = response.data.values.slice(1); // data devine un array fără primele elemente care sunt numele coloanelor
    // let data = response.data.values; // data devine un array fără primul elemente care sunt numele coloanelor

    var csv = Papa.unparse(data); // Papaparse constituie CSV-ul.

    //res.send(csv); // trimite datele în format CSV în client (Postman)
    // _NOTE: Nu uita că `csv` conține toate datele

    const readableStream = Readable.from(csv);

    // Papa.parse(Papa.unparse(data), {
    Papa.parse(readableStream, {
        step: async function (row, parser) {
            parser.pause(); // imediat ce ai tras un rând, te oprești

            // STRUCTURA RÂNDULUI!!! Vezi că e la nivel de index. Orice variație, STRICĂ TOT

            // console.log(results[0]);
            let line       = row.data; // un array cu valorile fiecărui câmp
            let rectime    = new Date(line[0]).getTime();       // în milisecunde
            let time2iso   = new Date(line[0]).toISOString();   // în format ISO

            let gDocParas  = new URL(line[12]).searchParams;
            let disciplina = `${line[4]}${line[5]}`;
            // descriere = line[12];
            let descriere  = '';
            let newLine    = `${time2iso}, ${line[1]}, ${line[2]}, ${line[6]}, ${disciplina}, ${line[13]}, ${descriere}, ${line[12]} ${line[10]} ${line[11]} ${line[14]}`;
            let tags       = ['expert', line[6]];

            // Dacă în bază există vreo înregistrare care deja poartă timestamp-ul uneia care deja este în bază, treci mai departe. 
            // _ TODO: Reanalizează, e periculos. Este cazul a mai multe înregistrări în același timestamp. Poate ar trebui constituit un fingerprint.
            if (await Resursa.exists({date: time2iso})) {
                return newLine; // scoate linia din step
                parser.resume();
            }

            // OBIECTUL CONȚINUTULUI DUPĂ EDITORJS
            // AICI TREBUIE INTRODUS PARAGRAF DUPĂ PARAGRAF CEEA CE ESTE ÎN DESCRIERE
            let content = {
                time:    rectime,
                blocks:  [],
                version: '2.21.0'
            };

            async function createUpdateRecord () {
                let testTile = await Resursa.findOne({title: line[2]}).where('emailContrib', line[1]).exec(); // testează dacă nu cumva deja resursa este în baza de date.
                let newRecord = new Resursa({
                    date:         time2iso,
                    emailContrib: line[1],
                    autori:       '',
                    uuid:         randomUUID(),
                    title:        line[2],
                    discipline:   [disciplina],
                    level:        [line[6]],
                    competenteS:  [line[13]],
                    description:  descriere,
                    content:      content,
                    etichete:     tags
                });
                // în cazul în care ai de-a face cu o înregistrare nouă, salveaz-o în bază
                if (!testTile) {
                    const dbrec = await newRecord.save();
                    // dacă s-a salvat, obiectul document salvat trebuie să fie același cu cel format înaintea salvării
                    if (dbrec === newRecord) {
                        ++counterRec;   // INCREMENTEAZĂ contorul înregistrărilor prelucrate
                        parser.resume();
                    }
                } else {
                    // dacă înregistrarea deja există, detectează ce-i lipsește
                    // vezi dacă ai câmpul `autori` gol, atunci înseamnă că nu a fost prelucrată fișa descriptor.
                }
            }

            /**
             * Funcția area rolul de a extrage datele din tabelul existent în fișele descriptive
             * De interes sunt datele asociate următoarelor câmpuri cu denumirile originale:
             * - `Autor`
             * - `Descrierea specifică a activității de învățare care folosește resursa educațională propusă`
             * - `Contextul de învățare`
             * - `Extinderi sau dezvoltări ale utilizării resursei propuse`
             * @param {String} id Este identificatorul noului document Gdoc
             */
            async function extractData (id) {
                /*
                * _NOTE: Controlează să existe numele câmpurilor în corpul de text. Unii nu au respectat și au pus la descriptor conținut fără nicio structură. 
                * Dacă nu există, creează fișa în baza de date și introdu tot textul la conținut pentru a-l valorifica cumva.
                * 
                */
                console.log("în  `extractData` am primit ", id);

                // `document` va fi un obiect care va conține toți descriptorii.
                let document = await gdocs.documents.get({
                    documentId: id
                }).then((response) => {
                    // let doc = JSON.stringify(response.result.body, null, 4);
                    console.log("Documentul accesat după conversie are titlul: ", response.data.title, ' identificat cu ', response.data.documentId);
                    // modul importat `gdocTableDataExtract.js`
                    gdocTableDataExtract(response.data);
                    // response.content este un array de obiecte care trebuie parcurs
                }).catch((error) => {
                    console.log("EROARE la aducerea documentului", error);
                    throw error;
                });
                return document;
            }

            switch (line[3].trim()) {
                case "Descriptor material":
                    /*
                    // Acesta este cazul în care vom completa fișa deja existentă în baza de date, 
                    // Dacă nu există înregistrarea în db, va fi creată folosind datele din fișa descriptor.
                     */
                    

                    // obține informații despre fișier. Acesta este posibil să fie în format docx, pdf sau gdoc.
                    await driveClient.files.get({
                        fileId: gDocParas.get('id')
                    }).then(async (d) => {
                        console.log("Documentul care este fișă descriptivă are următoarele detalii: ", d.data);

                        // Documentul este Microsoft Word și trebuie mai întâi să fie transformat în GDoc
                        if (d.data.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                            // copiază documentul original în format GDoc indiferent de formatul original, că este pdf sau docx
                            // https://stackoverflow.com/questions/49313477/using-drive-api-driveapp-to-convert-from-pdfs-to-google-documents
                            await driveClient.files.copy({
                                fileId: d.data.id,
                                requestBody: {
                                    mimeType: 'application/vnd.google-apps.document'
                                }
                            }).then(async (d) => {
                                console.log("Noul document creat are următoarele date: ", d.data.id, d.data.mimeType);
                                
                                // extrage datele necesare din copia documentului
                                let record = extractData(d.data.id);

                                // _TODO: AICI AI ÎNREGISTRAREA!!! NOTE: CAUTĂ EXEMPLELE de fișiere încărcate care nu sunt video-uri, ci zip-uri, pptx-uri, etc.
                            }).catch((error) => {
                                if (error) {
                                    console.log(error);
                                }
                            })
                        }

                        // dacă nu este .docx
                        console.log("ESTE ALT TIP DE FISIER ACOLO. DEOCAMDATA Prelucrăm doar GDoc-uri"); // Completează fișa cu ceea ce este doar în ROW. Restul datelor le completezi de mână.

                        // tratarea erorilor care ar putea apărea la transformarea documentului word in GDoc și la prelucrare.
                        if (d.errors) {
                            throw new Error(d.errors);
                        }
                    }).catch((error) => {
                        console.log(error.errors);
                    });

                    // _TODO: Schimbă conținutul lui `line[12]` cu ceea ce există în tabelul din document.
                    break;
                case "Material final":
                    /*
                    * Caută fișa în baza de date. Dacă nu e, creeaz-o.
                    * Actualizează câmpurile fișei de date din db cu link către fișierul pe care în creezi pe hdd
                    */

                    content.blocks.push({
                        type: "paragraph",
                        data: {
                            text: `${line[12]} \n ${line[10]} \n ${line[11]} \n ${line[14]}`
                        }
                    });
                    break;
            }

            
            
            if (row.errors.length > 0) {
                console.log("În prelucrarea rândului am avut următoarele erori: ", row.errors);
            }

            // _FIXME: ACTIVEAZĂ ATUNCI CÂND AI REZOLVAT EXTRAGEREA DATELOR DIN Tabel                
            // let testTile = await Resursa.findOne({title: line[2]}).where('emailContrib', line[1]).exec(); // testează dacă nu cumva deja resursa este în baza de date.
            // let counterRec = 0;
            // if (!testTile) {
            //     let record = new Resursa({
            //         date: time2iso,
            //         emailContrib: line[1],
            //         autori: '',
            //         uuid: '',
            //         title: line[2],
            //         discipline: [disciplina],
            //         level: [line[6]],
            //         competenteS: [line[13]],
            //         description: descriere,
            //         content: content,
            //         etichete: tags
            //     });
            //     const dbrec = await record.save();
            //     if (dbrec === record) {
            //         ++counterRec;
            //         parser.resume();
            //     }
            // }

            // console.log("LINIE::", newLine);

            parser.resume();

            return new Uint8Array(Buffer.from(newLine));
            // return newLine;
            
            // _NOTE: este locul în care ai putea băga în baza de date. Inspirație: https://github.com/mholt/PapaParse/issues/718
            // console.log(row);

            // const data = new Uint8Array(Buffer.from(newLine));
            // console.log("A rezultat:", row);

            // _TODO: Verifica cum adaugi date într-un fișier
            // console.log(data);
        },
        complete: async function (results, file) {
            // Scrie results.data -> is an array of rows.If header is false, rows are arrays; otherwise they are objects of data keyed by the field name
            // console.log(results.data);
            //_NOTE: Scrie datele în fișier :)

            try {
                await fsPromises.appendFile('./data.csv', results.data);
            } catch (error) {
                console.error("Eroare la scriere", error);
            }
        },
        error: function (err) {
            console.log("Eroarea apărută este: ", err);
        }
    });
}

app.get('/', async (req, res) => {
    // codul care citește datele din sheet
    try {
        authenticate(scopes).then((client) => {
            runAPP(client);
        }).catch(console.error);
    } catch(e) {
        console.log("Eroarea generală: ", e);
    }
});

/**
 * Funcția are rolul de a transforma numărul de bytes într-o valoare human readable
 * @param {Number} bytes 
 */
function formatBytes (bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    if (bytes == 0) {
        return "n/a";
    }

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

    if (i == 0) {
        return bytes + " " + sizes[i];
    }

    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
}

// Afișează informații utile la start
console.info("Memoria RAM alocată la pornire este de:  \x1b[32m", formatBytes(process.memoryUsage().rss), `\x1b[37m`);
if( process.env.NODE_ENV === 'production') {
    console.info("Aplicația rulează în modul \x1b[32m", app.get("env"), `\x1b[37m`);
} else if (process.env.NODE_ENV === 'development') {
    console.info("Aplicația rulează în modul \x1b[32m", app.get("env"), `\x1b[37m`);
}

/* === Pornește serverul! === */
let port = process.env.PORT || 3000;
let hostname = os.hostname();
var server = httpapp.listen(port, '0.0.0.0', function cbConnection () {
    console.log('Data getter ', process.env.APP_VER);
    console.log(`Hostname: \x1b[32m ${hostname}\x1b[37m, \n port: \x1b[32m${process.env.PORT}\x1b[37m, \n proces no: \x1b[32m${process.pid}\x1b[37m, \n node: \x1b[32m${process.version}\x1b[37m, \n mongoose: \x1b[32m${mongoose.version}\x1b[37m.`);
});
server.on('error', onError);

/**
 * Event listener for HTTP server "error" event.
 * https://stackoverflow.com/questions/65823016/i-cant-seem-to-make-a-socket-io-connection
 */

 function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/* === GESTIONAREA evenimentelor pe `process` și a SEMNALELOR === */

// gestionează erorile care ar putea aprea în async-uri netratate corespunzător sau alte promisiuni.
process.on('uncaughtException', (err) => {
    console.log('[app.js] A apărut un "uncaughtException" cu detaliile: ', err.message);
    // process.kill(process.pid, 'SIGTERM');
    process.nextTick( function exitProcess () {
        mongoose.disconnect(() => {
            console.log('Am închis conexiunea la MongoDb!');
        });
        process.exit(1);
    });
});

// tratarea promisiunilor respinse
process.on('unhandledRejection', (reason, promise) => {
    console.log('[app.js] O promisiune a fost respinsă fără a fi tratată respingerea', promise, ` având motivul ${reason}`);
    process.nextTick( function exitProcess () {
        mongoose.disconnect(() => {
            console.log('Am închis conexiunea la MongoDb!');
        });
        process.exit(1);
    });
});

process.on('SIGINT', function onSiginit (signal) {
    mongoose.disconnect(() => {
        console.log('Am închis conexiunea la MongoDb!');
    });
    console.info(`Procesul a fost întrerupt (CTRL+C). Închid procesul ${process.pid}! Data: `, new Date().toISOString());
    process.exit(0);
});

process.on('SIGTERM', function onSiginit () {
    mongoose.disconnect(() => {
        console.log('Am închis conexiunea la MongoDb!');
    });
    console.info('Am prins un SIGTERM (stop). Închid procesul! Data: ', new Date().toISOString());
    shutdownserver();
});

process.on('exit', code => {
    console.log(`Procesul a fost încheiat având codul: `, code);
});

function shutdownserver () {
    server.close(function onServerClosed (err) {
        if (err) {
            console.error(err.message, err.stack);
            process.exitCode = 1;            
        }
        process.exit(1);
    });
}