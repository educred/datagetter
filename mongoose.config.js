require('dotenv').config();
const mongoose = require('mongoose');
// MONGOOSE - Conectare la MongoDB
mongoose.set('useCreateIndex', true); // Deprecation warning
// Make Mongoose use `findOneAndUpdate()`. Note that this option is `true`
// by default, you need to set it to false.
mongoose.set('useFindAndModify', false);

/*
Am setat o variabilă de mediu `APP_RUNTIME` care va indica dacă aplicația rulează virtualizat sau local.
Valorile pe care această variabilă de mediu le poate avea sunt: `virtual` sau `local`.
*/

const CONFIG = {
    auth: { "authSource": "admin" },
    user: process.env.MONGO_USER,
    pass: process.env.MONGO_PASSWD,
    useNewUrlParser: true, 
    useUnifiedTopology: true
};

mongoose.connect(process.env.MONGO_LOCAL_CONN, CONFIG).then(() => {
    console.log("Conectare cu succes la baza de date locală.");
}).catch((error) => {
    console.warn('Conectarea la MongoDB a eșuat!');
    logger.error(error);
    process.exit(1);    
});

/*
În cazul în care rulezi cu docker, mai intai avand containerele ruland foloseste `docker ps` și apoi comanda `docker inspect nume_container_mongodb`.
Vezi secțiunea dedicată `Networks`. Ia de acolo IP-ul pe care rulează containerul de MongoDB. Dar cel mai repede scrii numele serviciului din fișierul
compose și Docker va atribui în spate IP-ul.
*/ 
// sau
//  mongoose.connect("mongodb://nume_user:parola@ip_container_mongo:27017/?authSource=admin")

module.exports = mongoose;