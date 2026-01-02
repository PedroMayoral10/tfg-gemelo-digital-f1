var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';

// --- ESTADO GLOBAL ---
let ultimaRespuesta = null; // Última posición recibida
let intervaloId = null;     // ID del intervalo activo
let circuitoCache = null;   // Para guardar el trazado del circuito

// Estas se llenarán cuando el usuario elija en el Frontend
let session_key = null;   
let driver_number = null; 
let tiempoActual = null; 


// Función auxiliar: Fetch con Timeout
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

// Función principal: Obtener un frame de ubicación del coche
async function getLocationFrame() {
  
  // Primero comprobamos que tenemos todo lo necesario, si no no hacemos nada
  if (!tiempoActual || !session_key || !driver_number) return;
  
  
  // Step es una variable que define el intervalo de tiempo entre cada frame, entonces en función a este será más o menos fluido el movimiento
  // el problema es que hay que saber cuando empiezan a moverse los coches, porque si no va a tardar un buen rato en comenzar a moverse el punto.
  const step = 270; 
  const date_gt = tiempoActual.toISOString();
  const date_lt = new Date(tiempoActual.getTime() + step).toISOString();

  // Construir la URL para hacer consulta a la API de openF1
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
      console.log(`✅ [${driver_number}] Moviendo a: ${ultimaRespuesta.x}, ${ultimaRespuesta.y}`);
    } else {
      console.log(`⚠️ Sin datos para: ${date_gt}`);
    }
  } catch (err) {
    console.error("❌ Error API:", err.message);
  }

  // Avanzamos el reloj pase lo que pase
  tiempoActual = new Date(tiempoActual.getTime() + step);
}


// --- RUTAS ---

// POST Recibe los datos del usuario desde el Frontend para empezar
router.post('/start', async (req, res) => {
    const { session_key: nuevaSession, driver_number: nuevoDriver } = req.body;

    if (!nuevaSession || !nuevoDriver) {
        return res.status(400).json({ error: "Faltan datos: session_key y driver_number" });
    }

    try {
        // A. Limpieza previa
        if (intervaloId) clearInterval(intervaloId);
        circuitoCache = null; 
        ultimaRespuesta = null;

        // B. BUSCAR HORA DE INICIO (Automático)
        console.log(`🔎 Configurando sesión ${nuevaSession}...`);
        const urlInfo = `${OPENF1_BASE}/v1/sessions?session_key=${nuevaSession}`;
        const dataInfo = await fetchWithTimeout(urlInfo);

        if (!dataInfo || dataInfo.length === 0) {
            return res.status(404).json({ error: "Sesión no encontrada" });
        }

        const infoSesion = dataInfo[0];
        const fechaInicio = new Date(infoSesion.date_start); // <--- MAGIA AQUÍ

        // C. Configurar variables globales
        session_key = nuevaSession;
        driver_number = nuevoDriver;
        tiempoActual = fechaInicio; 

        // D. Arrancar motor
        console.log(`🟢 START: Piloto ${driver_number} en ${infoSesion.country_name}. Hora: ${infoSesion.date_start}`);
        intervaloId = setInterval(getLocationFrame, 270); // Velocidad de actualización

        res.json({ 
            msg: "Simulación iniciada", 
            startTime: infoSesion.date_start 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al iniciar simulación" });
    }
});






// Ruta para obtener la forma del circuito
router.get('/track-data', async (req, res) => {

    if (!session_key || !tiempoActual) {
        return res.status(400).json({ error: "Simulación no iniciada. Pulsa START primero." });
    }

    if (circuitoCache) return res.json(circuitoCache); // Si ya lo tenemos, devolvemos cache
    
    try {
        // Pedimos 2 minutos de datos para tener la forma del circuito
        const start = tiempoActual.toISOString();
        const end = new Date(tiempoActual.getTime() + 30 * 60 * 1000).toISOString(); // +30 minutos
        const url = `${OPENF1_BASE}/v1/location?session_key=${session_key}&driver_number=${driver_number}&date>=${start}&date<${end}`;
        
        const data = await fetchWithTimeout(url);
        circuitoCache = data;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener la posición actual del piloto
router.get("/current", (req, res) => {
  
  // Si no hay intervalo activo O no hay datos aún, devolvemos vacío
  if (!intervaloId || !ultimaRespuesta) {
    return res.json({}); 
  }

  res.json(ultimaRespuesta);
});

module.exports = router;