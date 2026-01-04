var express = require('express');
var router = express.Router();


//Aqui accedemos a la API de OpenF1, no a MongoDB
const OPENF1_BASE = 'https://api.openf1.org';

// --- Función auxiliar Fetch ---
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

// OBTENER INFO DE UNA SESIÓN ESPECÍFICA ---
router.get('/openf1/:session_key', async function(req, res) {
    const session_key = req.params.session_key;

    if (!session_key) {
        return res.status(400).json({ error: "Falta el session_key" });
    }

    try {
        const url = `${OPENF1_BASE}/v1/sessions?session_key=${session_key}`;
        const data = await fetchWithTimeout(url);
        
        // OpenF1 devuelve un array, aunque sea un solo resultado
        if (data.length > 0) {
            res.json(data[0]); // Devolvemos el objeto limpio
        } else {
            res.status(404).json({ error: "Sesión no encontrada" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al conectar con OpenF1" });
    }
});

// OBTENER TODAS LAS CARRERAS DE UN AÑO
router.get('/openf1/year/:year', async function(req, res) {

    const year = req.params.year;

    if (!year) {
        return res.status(400).json({ error: "Falta el año" });
    }

    try {
        // Pedimos a la API externa solo las carreras (session_name=Race) de ese año
        const url = `${OPENF1_BASE}/v1/sessions?year=${year}&session_name=Race`;
        const data = await fetchWithTimeout(url);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener sesiones" });
    }

});




module.exports = router;