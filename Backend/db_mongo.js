require("dotenv").config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
const dbName = process.env.DB_NAME;

let db;

async function connectToDB() {
    try {
        if(db) return db; // Si estamos ya conectados, retornamos la conexión existente
        await client.connect();
        console.log("Conexión exitosa a MongoDB");
        db = client.db(dbName);
        return db;
    } catch (err) {
        console.error("Error al conectar a MongoDB", err);
    }
}

//Exportar la función para usarla en otros archivos
module.exports = { connectToDB };