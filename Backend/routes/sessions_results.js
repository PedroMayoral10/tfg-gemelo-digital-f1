var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1 } = require('../db_mongo');

router.get('/openf1/total_laps/:session_key', async function(req, res) {
    const session_key = req.params.session_key;

    try {
        const db = await connectToDB_OpenF1();
        const data = await db.collection('session_result').findOne({ session_key: parseInt(session_key) });
        
        if (data && data.number_of_laps) {
            console.log(`Total de vueltas para sesión ${session_key}: ${data.number_of_laps}`);
            res.json({ total_laps: data.number_of_laps }); 
        } else {
            res.status(404).json({ error: "No se encontró el número de vueltas" });
        }
    } catch (error) {
        console.error("Error en total_laps:", error);
        res.status(500).json({ error: "Error interno" });
    }
});



router.get('/openf1/results/:session_key', async function(req, res) {
    const session_key = req.params.session_key;

    try {
        const db = await connectToDB_OpenF1();
        const results = await db.collection('session_result').find({ session_key: parseInt(session_key) })
        .project({ 
            driver_number: 1,
            number_of_laps: 1, 
            dnf: 1, 
            dns: 1, 
            dsq: 1, 
            _id: 0 
        }).toArray();
        
        if (results.length > 0) {
            res.json(results); 
        } else {
            res.status(404).json({ error: "No se encontraron resultados para esta sesión" });
        }
    } catch (error) {
        console.error("Error en session_results:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});



module.exports = router;