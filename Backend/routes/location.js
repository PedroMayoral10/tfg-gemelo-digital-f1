var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';

let ultimaRespuesta = null;
let intervaloId = null;

const session_key = 9869;
const driver_number = 14;
let tiempoActual = new Date("2025-11-09T17:00:00+00:00");

// Función para detener el intervalo que será llamada por los otros endpoints.
function detenerIntervalo() {
  if (intervaloId !== null) {
    clearInterval(intervaloId);
    intervaloId = null;
    console.log("🛑 Intervalo de location detenido");
  }
}

// Exportar para que otros módulos puedan detenerlo llamando directamente a la funcion
router.detenerIntervalo = detenerIntervalo;

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

async function getLocationFrame() {
  const date_gt = tiempoActual.toISOString();
  const date_lt = new Date(tiempoActual.getTime() + 300).toISOString();

  const params = new URLSearchParams();
  params.append("session_key", session_key);
  params.append("driver_number", driver_number);
  params.append("date>", date_gt);
  params.append("date<", date_lt);

  const url = `${OPENF1_BASE}/v1/location?${params.toString()}`;

  try {
    const json = await fetchWithTimeout(url);
    if (json.length > 0) {
      ultimaRespuesta = json[json.length - 1];
      console.log("📍 Nueva posición:", ultimaRespuesta.x, ultimaRespuesta.y);
    }
  } catch (err) {
    console.error("❌ Error obteniendo frame:", err.message);
  }

  tiempoActual = new Date(tiempoActual.getTime() + 300);
}

router.get("/", (req, res) => {
  // Detener intervalo anterior si existe
  detenerIntervalo();

  // Iniciar nuevo intervalo
  intervaloId = setInterval(getLocationFrame, 300);
  console.log("▶️ Intervalo de location iniciado");

  if (!ultimaRespuesta) {
    return res.json({ msg: "Aún no hay datos..." });
  }

  res.json(ultimaRespuesta);
});

module.exports = router;

//📍 Nueva posición: 567 3195