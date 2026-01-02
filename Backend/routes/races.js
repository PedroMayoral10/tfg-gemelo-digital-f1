var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');

// 1. DEFINIMOS LA CONSTANTE BASE (Necesaria para la URL)
const OPENF1_BASE = 'https://api.openf1.org';

// 2. COPIAMOS LA FUNCIÓN FETCHWITHTIMEOUT (Necesaria para hacer la petición)
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

// --- TUS RUTAS ORIGINALES (MongoDB) ---

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

// --- RUTA OPENF1 (CON FETCH) ---
router.get('/openf1/:year', async function(req, res) {
    const year = parseInt(req.params.year);
    
    // Filtro de seguridad
    if (year < 2023 || year > 2025) {
        return res.status(400).json({ 
            error: "Año no soportado. La API solo tiene datos de 2023 a 2025." 
        });
    }

    const url = `${OPENF1_BASE}/v1/sessions?session_type=Race&year=${year}`;
    console.log(`🌐 Pidiendo datos a: ${url}`);

    try {
        // AHORA SÍ FUNCIONARÁ PORQUE LA FUNCIÓN ESTÁ DEFINIDA ARRIBA
        const data = await fetchWithTimeout(url);
        res.json(data);

    } catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ 
            error: "Error al obtener datos de OpenF1",
            details: error.message
        });
    }
});

module.exports = router;