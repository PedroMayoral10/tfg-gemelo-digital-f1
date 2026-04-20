var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1, connectToDB_F1Historical } = require('../db_mongo');


// Carreras de la base de datos histórica

router.get('/', async function(req, res) {
    try {
        const db = await connectToDB_F1Historical();
        const races = await db.collection('races').find().toArray();
        res.json(races);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar Mongo' });
    }
});

// Carreras de un año específico de la base de datos histórica

router.get('/year/:year', async function(req, res) {
    try {
        const db = await connectToDB_F1Historical();
        const year = parseInt(req.params.year);
        const races = await db.collection('races').find({ year: year }).toArray();
        res.json(races);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar Mongo' });
    }
});

// Carreras de un año  de la base de datos de OpenF1 (solo carreras, no sprints)

router.get('/openf1/year/:year', async function(req, res) {

    const year = parseInt(req.params.year);

    if (!year) {
        return res.status(400).json({ error: "Falta el año" });
    }

    try {
        const db = await connectToDB_OpenF1();
        // Pedimos a nuestra DB local solo las carreras (session_name=Race) de ese año
        const data = await db.collection('sessions').find({ 
            year: year, 
            session_name: "Race" 
        }).toArray();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener sesiones desde DB" });
    }

});

module.exports = router;