var express = require('express');
var router = express.Router();
const { connectToDB_F1Historical } = require('../db_mongo');

// Lista de escuderías históricas
router.get('/lista', async function(req, res) {
    try {
        const db = await connectToDB_F1Historical();
        const constructors = await db.collection('constructors')
            .find()
            .sort({ name: 1 })
            .toArray();
        res.json(constructors);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los constructores");
    }
});

// Cronología de una escudería específica
router.get('/cronologia/:constructorId', async function(req, res) {
    try {
        const db = await connectToDB_F1Historical();
        const constructorId = req.params.constructorId;

        // Buscamos en la colección constructors-chronology
        // Filtramos por parentConstructorId para obtener el linaje completo
        const chronology = await db.collection('constructors-chronology')
            .find({ parentConstructorId: constructorId })
            .sort({ yearFrom: -1 }) // De lo más reciente a lo más antiguo
            .toArray();

        res.json(chronology);
    } catch (err) {
        console.error("Error en /constructors/cronologia:", err);
        res.status(500).send("Error al obtener la cronología del constructor");
    }
});

// Pilotos que han pasado por la escudería 
router.get('/pilotos/:constructorId', async function(req, res) {
    try {
        const db = await connectToDB_F1Historical();
        const constructorId = req.params.constructorId;

        // La colección de drivers no tiene información sobre las escuderías, pero
        // seasons-entrants-drivers si, por lo que haremos una consulta en esa colección
        // para obtener los IDs de los pilotos que han estado en esa escudería
        const driverIds = await db.collection('seasons-entrants-drivers')
            .distinct('driverId', { constructorId: constructorId }); 

        const drivers = await db.collection('drivers')
            .find({ id: { $in: driverIds } })
            .project({ fullName: 1, id: 1, nationalityCountryId: 1 })
            .sort({ fullName: 1 })
            .toArray();

        res.json(drivers);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener los pilotos");
    }
});

module.exports = router;