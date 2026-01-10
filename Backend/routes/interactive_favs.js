var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');
const { ObjectId } = require('mongodb');
const { verifyToken } = require('../auth'); 

// Guardar una simulación en favoritos
router.post('/add', verifyToken, async function(req, res) {

    try {
        const db = await connectToDB();
        const { year, round, driverId, circuitName } = req.body;

        if (!year || !round || !driverId) {
            return res.status(400).json({ error: "Faltan datos para guardar" });
        }

        // Comprobamos si ya existe para no duplicarlo
        const existe = await db.collection('interactive_favourites').findOne({
            userId: new ObjectId(req.user._id), 
            year: year,
            round: round,
            driverId: driverId
        });

        if (existe) {
            return res.status(409).json({ message: "Ya lo tienes en favoritos" });
        }

        // Creamos el objeto nuevo
        const newFavourite = {
            userId: new ObjectId(req.user._id), // Guardamos el ID del usuario para poder recuperar sus favoritos más adelante
            year,
            round,
            driverId,
            circuitName, 
            dateAdded: new Date()
        };

        // Lo guardamos en la coleccion
        await db.collection('interactive_favourites').insertOne(newFavourite);

        res.status(200).json({ message: "Guardado en colección separada" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al guardar favorito" });
    }
});

// Obtener la lista de simulaciones favoritas del usuario
router.get('/list', verifyToken, async function(req, res) {
    
    try {
        const db = await connectToDB();

        // Buscamos TODOS los documentos en 'interactive_favourites' que tengan el userId del usuario actual
        const list = await db.collection('interactive_favourites')
            .find({ userId: new ObjectId(req.user._id) })
            .toArray(); // Convertimos el cursor a array

        res.status(200).json({ favorites: list });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener favoritos" });
    }
});

// Borrar de favoritos una simulación específica
router.post('/remove', verifyToken, async function(req, res) {

    try {
        const db = await connectToDB();
        const { year, round, driverId } = req.body;

        // Borramos el documento que coincida con el usuario y los datos de la carrera
        await db.collection('interactive_favourites').deleteOne({
            userId: new ObjectId(req.user._id),
            year: year,
            round: round,
            driverId: driverId
        });

        res.status(200).json({ message: "Eliminado correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar favorito" });
    }
});

module.exports = router;