var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';

// Configuración de tiempos
const VELOCIDAD_REFRESCO = 270; // Tasa de la API
const BLOQUE_SEGUNDOS = 4; // Cuando pidamos datos, vamos a pedir los datos de los próximos 4 segundos


// --- ESTADO GLOBAL ---
let ultimaRespuesta = null; 
// Temporizadores que controlan la simulación
let timerConsumo = null; // Tiempo que se tarda en consumir el buffer y avanzar la simulación
let timerLlenado = null; // Tiempo que se tarda en llenar el buffer con nuevos datos de la API
let circuitoCache = null; 

let colaDatos = []; // Buffer de datos de localización que se van consumiendo para avanzar la simulación, ordenados por fecha de la API

let session_key = null;   
let driver_number = null; 

let cursorTiempoAPI = null; // Tiempo hasta el que hemos consumido datos de la API.       
let cursorTiempoSimulacion = null; // Tiempo actual de la simulación, que avanza consumiendo el buffer.


// Función auxiliar: Fetch con Timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    clearTimeout(id);
    if (res.status === 429) throw new Error("429");
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json(); // Aqui se hace la solicitud a la API externa
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

/*  
    *************************************************************            
        LLENAR DE DATOS EL BUFFER PARA AVANZAR LA SIMULACIÓN
    *************************************************************
*/

async function llenarBuffer() {
  // Si han parado la simulación, no seguimos
  if (!session_key || !driver_number) return; 
  
  if (cursorTiempoSimulacion) {
      const diferencia = cursorTiempoAPI.getTime() - cursorTiempoSimulacion.getTime(); 
      if (diferencia > 15000) { // Si la API va más de 15 segundos por delante de la simulación, esperamos un poco antes de pedir más datos para no saturar el buffer
          timerLlenado = setTimeout(llenarBuffer, 9000); // Ponemos 9 segundos para que baje esa diferencia a unos 6 segundos
          return;
      }
  }
  
  const start = cursorTiempoAPI.toISOString();
  const endObj = new Date(cursorTiempoAPI.getTime() + BLOQUE_SEGUNDOS * 1000); 
  const end = endObj.toISOString();

  const params = new URLSearchParams();
  params.append("session_key", session_key); 
  params.append("driver_number", driver_number);
  params.append("date>", start);
  params.append("date<", end);

  const url = `${OPENF1_BASE}/v1/location?${params.toString()}`;

  try {
    const nuevosDatos = await fetchWithTimeout(url);
    
    // Comprobar si nse ha detenido mientras se espesraba el fetch
    if (!session_key) return; 

    if (nuevosDatos.length > 0) {
      colaDatos = [...colaDatos, ...nuevosDatos]; // Añadimos al buffer los nuevos datos, que ya vienen ordenados por fecha
      console.log(`✅ [API] Buffer: ${colaDatos.length} items (Recibidos ${nuevosDatos.length})`);
      cursorTiempoAPI = endObj; // Avanzamos el cursor de la API al bloque siguiente de datos
      timerLlenado = setTimeout(llenarBuffer, 1000); 

    } else {
      console.log(`⚠️ [API] Hueco de datos detectado. Saltando...`);
      cursorTiempoAPI = endObj; 
      timerLlenado = setTimeout(llenarBuffer, 100); // Timeout menor para encontrar datos lo antes posible
    }

  } catch (err) {
    if (!session_key) return; // Si está parado, ignoramos el error

    if (err.message === "429") {
        console.warn("🛑 API Límite de solicitudes(429). Esperando...");
        timerLlenado = setTimeout(llenarBuffer, 5000);
    } else {
        console.error("❌ Error API:", err.message);
        timerLlenado = setTimeout(llenarBuffer, 2000);
    }
  }
}

/*  
    *************************************************************            
        CONSUMIR DATOS DEL BUFFER PARA AVANZAR LA SIMULACIÓN
    *************************************************************
*/

function consumirBuffer() {
    if (!cursorTiempoSimulacion) return;

    cursorTiempoSimulacion = new Date(cursorTiempoSimulacion.getTime() + VELOCIDAD_REFRESCO); 

    let datoEncontrado = null; 
    let indiceCorte = -1; 

    // Bucle para encontrar el último dato válido y más reciente al tiempo de simulación, y cortar el buffer hasta ese punto         

    for (let i = 0; i < colaDatos.length; i++) {
        const fechaDato = new Date(colaDatos[i].date);
        
        if (fechaDato <= cursorTiempoSimulacion) {
            datoEncontrado = colaDatos[i]; // Si el dato es anterior o igual al tiempo de simulación, lo guardamos como última respuesta válida
            indiceCorte = i; 
        } else {
            break; // Si el dato es posterior al tiempo de simulación, paramos de buscar
        }
    }

    if (datoEncontrado) {
        ultimaRespuesta = datoEncontrado;
    }

    if (indiceCorte !== -1) {
        colaDatos.splice(0, indiceCorte + 1);
    }
}

/*  
    *************************************************************            
                        DETENER SIMULACION
    *************************************************************
*/

function detenerSimulacion() {
    // Terminamos temporizadores
    if (timerConsumo) {
        clearInterval(timerConsumo); 
        timerConsumo = null;
    }
    if (timerLlenado) {
        clearTimeout(timerLlenado);
        timerLlenado = null;
    }

    // Limpiar variables críticas para que el bucle 'llenarBuffer' se detenga
    session_key = null;
    driver_number = null;
    
    // Limpiar datos
    colaDatos = [];
    circuitoCache = null; 
    ultimaRespuesta = null;
    cursorTiempoAPI = null;
    cursorTiempoSimulacion = null;
}

// --- RUTAS ---

// Arrancar simulación

router.post('/start', async (req, res) => {
    const { session_key: nuevaSession, driver_number: nuevoDriver } = req.body;

    if (!nuevaSession || !nuevoDriver) {
        return res.status(400).json({ error: "Faltan datos" });
    }

    try {
        // 1. Limpieza PREVIA por si había algo corriendo
        detenerSimulacion();

        console.log(`🔎 Configurando sesión ${nuevaSession}...`);
        const urlInfo = `${OPENF1_BASE}/v1/sessions?session_key=${nuevaSession}`;
        const dataInfo = await fetchWithTimeout(urlInfo);

        if (!dataInfo || dataInfo.length === 0) {
            return res.status(404).json({ error: "Sesión no encontrada" });
        }

        const infoSesion = dataInfo[0];
        const fechaInicio = new Date(infoSesion.date_start); 

        session_key = nuevaSession;
        driver_number = nuevoDriver;
        
        cursorTiempoAPI = fechaInicio; 
        cursorTiempoSimulacion = fechaInicio;

        console.log(`🟢 START: Piloto ${driver_number} en ${infoSesion.country_name}`);
        
        // Arrancamos
        llenarBuffer(); 
        timerConsumo = setInterval(consumirBuffer, VELOCIDAD_REFRESCO); 

        res.json({ 
            msg: "Simulación iniciada", 
            startTime: infoSesion.date_start 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al iniciar simulación" });
    }
});

// Para detener simulación

router.post('/stop', (req, res) => {
    console.log("🛑 Deteniendo simulación...");
    
    detenerSimulacion(); // Llamamos a la función que limpia TODO de verdad
    
    res.json({ message: "Simulación detenida correctamente" });
});

// Para obtener la forma del circuito y poder representarlo

router.get('/track-data', async (req, res) => {
    if (!session_key || !cursorTiempoSimulacion) {
        return res.status(400).json({ error: "Simulación no iniciada." });
    }

    if (circuitoCache) return res.json(circuitoCache); 
    
    try {
        const start = cursorTiempoSimulacion.toISOString();
        const end = new Date(cursorTiempoSimulacion.getTime() + 30 * 60 * 1000).toISOString(); 
        const url = `${OPENF1_BASE}/v1/location?session_key=${session_key}&driver_number=${driver_number}&date>=${start}&date<${end}`;
        
        const data = await fetchWithTimeout(url);
        circuitoCache = data;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Para obtener la posición del coche en un instante de tiempo

router.get("/current", (req, res) => {
  if (!timerConsumo || !ultimaRespuesta) {
    return res.json({}); 
  }
  res.json(ultimaRespuesta);
});

module.exports = router;