var express = require('express');
var router = express.Router();


const locationRouter = require('./location'); // Importar el enrutador de location para poder detener su intervalo
                                              // al cambiar de endpoint



//Aqui accedemos a la API de OpenF1, no a MongoDB
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

router.get('/', async function(req, res) {
    
    try {

        locationRouter.detenerIntervalo(); // Detenemos el intervalo de location al cambiar de endpoint
        const { country_name, session_name, year } = req.query;

        // Validamos que todos los parámetros obligatorios estén presentes
        if (!country_name || !session_name || !year) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: country_name, session_name, year' });
        }
        
        // Usa URLSearchParams para construir correctamente la query string
        const params = new URLSearchParams();
        params.append('country_name', country_name);
        params.append('session_name', session_name);
        params.append('year', year);

        const url = `${OPENF1_BASE}/v1/sessions?${params.toString()}`;

        const data = await fetchWithTimeout(url);
        
        res.json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar OpenF1' });
    }

});


//Solo pueden obtenerse de la API sesiones del 2023 en adelante

router.get('/:date', async function(req, res) {

    try {

      const date = req.params.date;
      const url = `${OPENF1_BASE}/v1/sessions?date_start=${date}&session_name=Race&session_type=Race`;
      const data = await fetchWithTimeout(url);
      res.json(data);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Error al consultar OpenF1' });
    }


});




module.exports = router;