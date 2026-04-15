var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1 } = require('../db_mongo');

// Obtener información de una sesión específica OpenF1 (solo de 2023 a 2025). Por ahora sin utilizar ---

router.get('/openf1/:session_key', async function(req, res) {
    const session_key = req.params.session_key;

    if (!session_key) {
        return res.status(400).json({ error: "Falta el session_key" });
    }

    try {
        const db = await connectToDB_OpenF1();
        
        // Buscamos en nuestra colección local 'sessions'
        // Usamos parseInt porque en la base de datos el session_key es un número
        const data = await db.collection('sessions').findOne({ session_key: parseInt(session_key) });
        
        if (data) {
            // Devolvemos el objeto directamente como hacía tu lógica original
            res.json(data); 
        } else {
            res.status(404).json({ error: "Sesión no encontrada en la base de datos local" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al consultar la sesión en MongoDB" });
    }
});

module.exports = router;