var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';

// Configuración de tiempos
const VELOCIDAD_REFRESCO = 270; // La velocidad límite que permite la API 
const BLOQUE_SEGUNDOS = 4;      // Descargamos bloques de datos de 4 segundos


// --- ESTADO GLOBAL ---
let ultimaRespuesta = null; // Última posición recibida
// Dos timers separados para leer y escribir en la cola de datos
let timerConsumo = null;    
let timerLlenado = null;    
let circuitoCache = null;   // Para guardar el trazado del circuito

// Es una cola donde se descargará la posición del coche durante 5 segundos saltandose los huecos vacíos
let colaDatos = []; 

// Estas se llenarán cuando el usuario elija en el Frontend
let session_key = null;   
let driver_number = null; 

// Variables de tiempo para sincronizar los bloques de datos con la simulación
let cursorTiempoAPI = null;        // Fecha de las posiciones que estamos DESCARGANDO (futuro)
let cursorTiempoSimulacion = null; // Fecha que estamos MOSTRANDO en un instante determinado (presente)


// Función auxiliar: Fetch con Timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    clearTimeout(id);
    // [NUEVO] Control específico para error 429 (Límite de API)
    if (res.status === 429) throw new Error("429");
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}



// Función para consumir los datos de la cola (Reloj de Simulación Real)
// Esta función avanza el tiempo de tal manera que simula la reproducción continua en tiempo real
function consumirBuffer() {

    if (!cursorTiempoSimulacion) return;

    // Avanzamos el reloj de simulación de acuerdo a la velocidad de refresco
    cursorTiempoSimulacion = new Date(cursorTiempoSimulacion.getTime() + VELOCIDAD_REFRESCO);

    // Buscamos en la cola el dato más reciente que corresponda a esta hora
    let datoEncontrado = null;
    let indiceCorte = -1; // Marca el último dato que hemos usado 

    for (let i = 0; i < colaDatos.length; i++) {
        const fechaDato = new Date(colaDatos[i].date);
        
        // Si el dato es menor o igual al reloj que representa el presente, es un candidato válido
        if (fechaDato <= cursorTiempoSimulacion) {
            datoEncontrado = colaDatos[i];
            indiceCorte = i; // Marcar para borrar este y los anteriores
        } else {
            // Si el dato es del futuro , cortamos el bucle
            break; 
        }
    }

    // Asignamos el dato exacto a ese instante de tiempo
    if (datoEncontrado) {
        ultimaRespuesta = datoEncontrado;
    }

    /* Todo lo que haya antes al indice, son datos del PASADO
     que ya no sirven porque el reloj ha avanzado y tenemos datos más exactos a ese instante
     Los borramos para liberar memoria y no volver a procesarlos 
     Los datos que están después del índice, se quedan en la cola
     intactos porque son datos futuros que
     se usarán cuando se avance el reloj. */

    if (indiceCorte !== -1) {
        colaDatos.splice(0, indiceCorte + 1);
    }
}


// Función para llenar el buffer de datos desde la API
async function llenarBuffer() {
  
  if (!cursorTiempoAPI || !session_key || !driver_number) return;
  
  // Si vamos muy adelantados paramos de pedir para no saturar la cola (15 segundos de margen)
  if (cursorTiempoSimulacion) {
      const diferencia = cursorTiempoAPI.getTime() - cursorTiempoSimulacion.getTime();
      if (diferencia > 15000) {
          timerLlenado = setTimeout(llenarBuffer, 2000);
          return;
      }
  }
  
  // Calculamos el bloque de datos que hay que pedir (4 segundos desde el reloj del presente)
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
    
    if (nuevosDatos.length > 0) {
      // Sacamos todos los datos que sobraron de la cola y añadimos los nuevos al final para que así estén ordenados por fecha
      // y en el instante anterior que eran futuros ahora empiezan a ser presentes o pasados
      colaDatos = [...colaDatos, ...nuevosDatos];
      console.log(`✅ [API] Buffer: ${colaDatos.length} items (Recibidos ${nuevosDatos.length})`);
      
      cursorTiempoAPI = endObj;  // Avanzamos el cursor del API al final del bloque descargado
      timerLlenado = setTimeout(llenarBuffer, 1000); // Descanso de 1s para la siguiente descarga para que la api no se sature (429)

    } else {
      // Si hay un hueco sin datos, saltamos el tiempo adelantando el cursor directamente
      console.log(`⚠️ [API] Hueco de datos detectado. Saltando...`);
      cursorTiempoAPI = endObj; 
      timerLlenado = setTimeout(llenarBuffer, 100); // Reintento rápido en caso de emergencia porque no haya datos
    }

  } catch (err) {
    if (err.message === "429") {
        console.warn("🛑 API Límite (429). Esperando...");
        timerLlenado = setTimeout(llenarBuffer, 5000);
    } else {
        console.error("❌ Error API:", err.message);
        timerLlenado = setTimeout(llenarBuffer, 2000);
    }
  }
}


// --- RUTAS ---

// POST Recibe los datos del usuario desde el Frontend para empezar
router.post('/start', async (req, res) => {
    const { session_key: nuevaSession, driver_number: nuevoDriver } = req.body;

    if (!nuevaSession || !nuevoDriver) {
        return res.status(400).json({ error: "Faltan datos: session_key y driver_number" });
    }

    try {
        // Limpiamos los nuevos timers y variables
        if (timerConsumo) clearInterval(timerConsumo);
        if (timerLlenado) clearTimeout(timerLlenado);
        colaDatos = [];
        circuitoCache = null; 
        ultimaRespuesta = null;

        // Buscamos la info de la sesión para obtener la fecha de inicio
        console.log(`🔎 Configurando sesión ${nuevaSession}...`);
        const urlInfo = `${OPENF1_BASE}/v1/sessions?session_key=${nuevaSession}`;
        const dataInfo = await fetchWithTimeout(urlInfo);

        if (!dataInfo || dataInfo.length === 0) {
            return res.status(404).json({ error: "Sesión no encontrada" });
        }

        const infoSesion = dataInfo[0];
        const fechaInicio = new Date(infoSesion.date_start); 

        // Una vez tenemos todo, actualizamos las variables globales
        session_key = nuevaSession;
        driver_number = nuevoDriver;
        
        // Inicializamos ambos relojes (Descarga y Simulación) antes de empezar
        cursorTiempoAPI = fechaInicio; 
        cursorTiempoSimulacion = fechaInicio;

        // Iniciamos el intervalo para obtener la posición del coche en cada instante de tiempo
        console.log(`🟢 START: Piloto ${driver_number} en ${infoSesion.country_name}. Hora: ${infoSesion.date_start}`);
        
        // Arrancamos el sistema de buffer para empezar a descargar y consumir datos
        llenarBuffer(); // Productor
        timerConsumo = setInterval(consumirBuffer, VELOCIDAD_REFRESCO); // Consumidor

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

    // Comprobamos cursorTiempoSimulacion y session_key antes de proceder
    if (!session_key || !cursorTiempoSimulacion) {
        return res.status(400).json({ error: "Simulación no iniciada. Pulsa START primero." });
    }

    if (circuitoCache) return res.json(circuitoCache); // Si ya lo tenemos, devolvemos la caché del circuito
    
    try {
        // Pedimos 30 minutos de datos para tener la forma del circuito
        // Usamos el tiempo de simulación como referencia
        const start = cursorTiempoSimulacion.toISOString();
        const end = new Date(cursorTiempoSimulacion.getTime() + 30 * 60 * 1000).toISOString(); // +30 minutos para obtener todo el trazado incluyendo pitlane
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
  if (!timerConsumo || !ultimaRespuesta) {
    return res.json({}); 
  }

  res.json(ultimaRespuesta);
});

module.exports = router;