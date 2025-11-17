var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');


/* GET drivers page. */
router.get('/', async function(req, res, next) {
    try {
        const db = await connectToDB(); // Conexión a la base de datos
        const drivers = await db.collection('drivers').find().toArray(); // Traemos todos los drivers
        res.json(drivers); // Respondemos con los datos en JSON
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener drivers");
    }
});

module.exports = router;
