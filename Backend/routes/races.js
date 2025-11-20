var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');

router.get('/', async function(req, res) {

    try {

        const db = await connectToDB();
        const races = await db.collection('races').find().toArray();
        res.json(races);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar OpenF1' });
    }

});


router.get('/year/:year', async function(req, res) {

    try {

        const db = await connectToDB();
        const year = parseInt(req.params.year);
        const races = await db.collection('races').find({ year: year }).toArray();
        res.json(races);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar OpenF1' });
    }

});


module.exports = router;