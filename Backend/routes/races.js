var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');
const OPENF1_BASE = 'https://api.openf1.org';

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    clearTimeout(id);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Carreras - MongoDB

router.get('/', async function(req, res) {
    try {
        const db = await connectToDB();
        const races = await db.collection('races').find().toArray();
        res.json(races);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar Mongo' });
    }
});

// Carreras de un año específico MongoDB

router.get('/year/:year', async function(req, res) {
    try {
        const db = await connectToDB();
        const year = parseInt(req.params.year);
        const races = await db.collection('races').find({ year: year }).toArray();
        res.json(races);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar Mongo' });
    }
});

// --- RUTA OPENF1 carreras de un año ---

router.get('/openf1/year/:year', async function(req, res) {

    const year = req.params.year;

    if (!year) {
        return res.status(400).json({ error: "Falta el año" });
    }

    try {
        // Pedimos a la API externa solo las carreras (session_name=Race) de ese año (no sprints)
        const url = `${OPENF1_BASE}/v1/sessions?year=${year}&session_name=Race`;
        const data = await fetchWithTimeout(url);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener sesiones" });
    }

});

module.exports = router;