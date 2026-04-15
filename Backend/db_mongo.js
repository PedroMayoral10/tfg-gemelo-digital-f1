require("dotenv").config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbNameOpenF1 = process.env.DB_NAME_OPENF1;
const dbNameF1Historical = process.env.DB_NAME_F1HISTORICAL;

let dbOpenF1;
let dbF1Historical;

async function connectToDB_OpenF1() {
    try {
        if(dbOpenF1) return dbOpenF1; // Si estamos ya conectados, retornamos la conexión existente
        await client.connect();
        console.log("Conexión exitosa a MongoDB - OpenF1");
        dbOpenF1 = client.db(dbNameOpenF1);
        return dbOpenF1;
    } catch (err) {
        console.error("Error al conectar a MongoDB - OpenF1", err);
    }
}

async function connectToDB_F1Historical() {
    try {
        if(dbF1Historical) return dbF1Historical; // Si estamos ya conectados, retornamos la conexión existente
        await client.connect();
        console.log("Conexión exitosa a MongoDB - F1Historical");
        dbF1Historical = client.db(dbNameF1Historical);
        return dbF1Historical;
    } catch (err) {
        console.error("Error al conectar a MongoDB - F1Historical", err);
    }
}

//Exportar la función para usarla en otros archivos
module.exports = { connectToDB_OpenF1, connectToDB_F1Historical };