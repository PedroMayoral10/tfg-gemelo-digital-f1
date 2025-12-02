var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';


let ultimaRespuesta = null; // Última respuesta (posición) recibida
let intervaloId = null; // ID del intervalo activo


//Parámetros del piloto y sesión del cual vamos a hacer el tracking
const session_key = 9869;
const driver_number = 14;
let tiempoActual = new Date("2025-11-09T17:00:00+00:00"); // Tiempo inicial de la carrera


// Función para detener el intervalo actual si se hace F5 en esta pagina
// para que no se cree más de un intervalo para la misma sesión del endpoint
// ya que eso sobrecargaría el servidor.
function detenerIntervalo() {
  if (intervaloId !== null) {
    clearInterval(intervaloId);
    intervaloId = null;
    console.log("🛑 Intervalo de location detenido");
  }
}

// Exportar para que otros módulos puedan detenerlo llamando directamente a la funcion PENDIENTE DE REVISAR
// router.detenerIntervalo = detenerIntervalo;

// Función para realizar la consulta con timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {

  //Controlador para parar la petición si se excede el timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  //Es una propiedad del controlador que se añade a las opciones de fetch
  //para que fetch pueda abortar la petición en caso de timeout
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options); //Cuando reciba la respuesta pasa a la siguiente línea
    clearTimeout(id);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json(); // COn el await, esperamos a que todo se transforme a JSON
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Función para obtener el frame de ubicación del piloto en ese instante de tiempo
async function getLocationFrame() {

  // formatear fechas en ISO y agregar a los parámetros
  const date_gt = tiempoActual.toISOString();
  const date_lt = new Date(tiempoActual.getTime() + 300).toISOString();

  // Construir URL con parámetros
  const params = new URLSearchParams();
  params.append("session_key", session_key);
  params.append("driver_number", driver_number);
  params.append("date>", date_gt);
  params.append("date<", date_lt);

  const url = `${OPENF1_BASE}/v1/location?${params.toString()}`;

  // Realizar la solicitud fetch con timeout
  try {
    const json = await fetchWithTimeout(url);
    if (json.length > 0) {
      ultimaRespuesta = json[json.length - 1];
      console.log("📍 Nueva posición:", ultimaRespuesta.x, ultimaRespuesta.y);
    }
  } catch (err) {
    console.error("❌ Error obteniendo frame:", err.message);
  }

  // El nuevo tiempo actual será el tiempo actual + 300 ms
  tiempoActual = new Date(tiempoActual.getTime() + 300);
}

// Endpoint para iniciar el tracking de la ubicación del piloto
router.get("/", (req, res) => {
  
  // Detener cualquier intervalo activo antes de iniciar uno nuevo para no sobrecargar el servidor
  detenerIntervalo();

  // Iniciar nuevo intervalo
  intervaloId = setInterval(getLocationFrame, 300);
  console.log("Recibiendo ubicación del piloto ", driver_number);

  if (!ultimaRespuesta) {
    return res.json({ msg: "Aún no hay datos..." });
  }

  res.json(ultimaRespuesta); // Mostramos la última respuesta almacenada

});

module.exports = router;

