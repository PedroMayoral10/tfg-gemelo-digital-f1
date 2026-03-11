var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');

router.get('/total_laps/:session_key', async function(req, res) {
    const session_key = req.params.session_key;

    try {
        const db = await connectToDB();
        // Buscamos la sesión. He quitado 'position: 1' por si acaso aún no hay resultados finales, 
        // pero si tu DB siempre tiene el ganador con number_of_laps, déjalo.
        const data = await db.collection('session_result').findOne({ 
            $or: [
                { session_key: parseInt(session_key) },
                { session_key: session_key.toString() }
            ]
        });
        
        if (data && data.number_of_laps) {
            res.json({ total_laps: data.number_of_laps }); 
        } else {
            res.status(404).json({ error: "No se encontró el número de vueltas" });
        }
    } catch (error) {
        console.error("Error en total_laps:", error);
        res.status(500).json({ error: "Error interno" });
    }
});

module.exports = router;