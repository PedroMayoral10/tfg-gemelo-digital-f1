var express = require('express');
var router = express.Router();
const { connectToDB } = require('../db_mongo');
const OPENF1_BASE = 'https://api.openf1.org';

//Función para hacer fetch con timeout porque la api dice que las sentencias estan limitadas a 10 segundos
//y que si tarda mas de ese tiempo que hagamos la consulta en varias mas pequeñas.

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();          // Creamos un controlador para poder abortar la petición
  const id = setTimeout(() => controller.abort(), timeout);  // Programamos un "timeout" que aborta la petición

  options.signal = controller.signal;                // Pasamos la señal al fetch

  try {
    const res = await fetch(url, options);          // Hacemos la petición
    clearTimeout(id);                               // Si respondió a tiempo, limpiamos el timeout
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);  // Error si la respuesta HTTP no es 200-299
    return await res.json();                        // Devolvemos los datos JSON
  } catch (err) {
    clearTimeout(id);                               // Limpiamos timeout si hubo error
    throw err;                                      // Lanzamos el error para que lo maneje quien llama a la función
  }
}

/* GET drivers page. */ // Obtener todos los drivers de MongoDB

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


//Obtener los pilotos de una carrera mediante OpenF1 API

router.get('/openf1/:session_key', async function(req, res, next) {
    try {

        const session_key = req.params.session_key;
        const url = `${OPENF1_BASE}/v1/drivers?session_key=${session_key}`;
        const data = await fetchWithTimeout(url);
        res.json(data);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error al obtener drivers de la sesión");
    }
});

module.exports = router;
