var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1, connectToDB_F1Historical } = require('../db_mongo');

/* GET drivers page. */ // Drivers de la base de datos histórica

router.get('/pilotos_historicos', async function(req, res, next) {
    try {
        const db = await connectToDB_F1Historical(); // Conexión a la base de datos
        const drivers = await db.collection('drivers').find().sort({ full_name: 1 }).toArray(); 
        res.json(drivers); // Respondemos con los datos en JSON
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los pilotos");
    }
});

// Escuderías por las que ha pasado el piloto

router.get('/trayectoria/:driverId', async function(req, res, next) {
    try {
        const db = await connectToDB_F1Historical();
        const driverId = req.params.driverId; // Recibimos el id tipo "fernando-alonso"

        // Buscamos en la colección que indicaste
        const history = await db.collection('seasons-entrants-drivers')
            .find({ driverId: driverId })
            .sort({ year: -1 }) // De la temporada más nueva a la más antigua
            .toArray();

        res.json(history);
    } catch (err) {
        console.error("Error en /trayectoria:", err);
        res.status(500).send("Error al obtener la trayectoria del piloto");
    }
});

//Obtener los pilotos de una carrera de la base de datos de OpenF1

router.get('/openf1/:session_key', async function(req, res, next) {
    try {
        const db = await connectToDB_OpenF1();
        const session_key = parseInt(req.params.session_key);
        
        // Buscamos en la colección drivers filtrando por la session_key
        const data = await db.collection('drivers').find({ session_key: session_key }).toArray();
        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener pilotos de la sesión.");
    }
});

module.exports = router;
