var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1 } = require('../db_mongo');

const VELOCIDAD_REFRESCO = 200;
const BLOQUE_SEGUNDOS = 15; 

// --- ESTADO GLOBAL ---
let ultimaRespuesta = {};
let timerConsumo = null;
let timerLlenado = null;
let circuitoCache = null;
let colaDatos = [];
let session_key = null;
let cursorTiempoAPI = null;
let cursorTiempoSimulacion = null;

let session_start_time = null;
let session_end_time = null;

// Getter para que otros módulos puedan acceder al estado de la simulación
function getTiempoSimulacion() {
    return { cursorTiempoSimulacion, session_key };
}

/* 
************************************************************* 
    LLENAR DE DATOS EL BUFFER PARA AVANZAR LA SIMULACIÓN
*************************************************************
*/
async function llenarBuffer() {

    if (!session_key) return;

    if (cursorTiempoSimulacion) {
        const diferencia = cursorTiempoAPI.getTime() - cursorTiempoSimulacion.getTime();
        // Si el buffer está muy lleno (15 seg de ventaja), esperamos
        if (diferencia > 15000) {
            timerLlenado = setTimeout(llenarBuffer, 5000);
            return;
        }
    }

    const start = cursorTiempoAPI;
    const end = new Date(cursorTiempoAPI.getTime() + BLOQUE_SEGUNDOS * 1000);

    try {
        
        const db = await connectToDB_OpenF1();

        const nuevosDatos = await db.collection('location').find({
            session_key: parseInt(session_key),
            date: { $gte: start, $lt: end }
        })
        .hint({ session_key: 1, date: 1 }) // Usamos el índice compuesto para acelerar la consulta 
        .project({ date: 1, driver_number: 1, x: 1, y: 1, _id: 0 }) // Project hace que MongoDB solo devuelva los campos necesarios
        .sort({ date: 1 }) 
        .toArray(); 

        cursorTiempoAPI = end;

        if (nuevosDatos.length > 0) {
            colaDatos = [...colaDatos, ...nuevosDatos];
            timerLlenado = setTimeout(llenarBuffer, 1000);
        } else {
            console.log(`⚠️ [DB] Hueco de datos o fin de sesión. Saltando...`);
            timerLlenado = setTimeout(llenarBuffer, 100);
        }

    } catch (err) {
        if (!session_key) return; // Si la sesión se detuvo mientras se hacía la consulta, no hacemos nada.
        console.error("❌ Error Crítico DB:", err.message);
        timerLlenado = setTimeout(llenarBuffer, 3000);
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

    let datosPorPiloto = {};
    let indiceCorte = -1;

    for (let i = 0; i < colaDatos.length; i++) {
        const fechaDato = new Date(colaDatos[i].date);

        if (fechaDato <= cursorTiempoSimulacion) {
            const driverNum = parseInt(colaDatos[i].driver_number);
            if (driverNum > 0 && driverNum < 100) {
                datosPorPiloto[colaDatos[i].driver_number] = {
                    x: colaDatos[i].x,
                    y: colaDatos[i].y
                };
            }
            indiceCorte = i;
        } else {
            break; 
        }
    }

    if (Object.keys(datosPorPiloto).length > 0) {
        ultimaRespuesta = { 
            ...ultimaRespuesta, // Mantenemos las posiciones anteriores para que no parpadeen los coches
            ...datosPorPiloto,  // Sobrescribimos con las nuevas posiciones detectadas
        };
    }

    if (indiceCorte !== -1) { 
        colaDatos.splice(0, indiceCorte + 1); 
    }
}

function detenerSimulacion() {
    if (timerConsumo) clearInterval(timerConsumo);
    if (timerLlenado) clearTimeout(timerLlenado);
    timerConsumo = null;
    timerLlenado = null;
    session_key = null;
    colaDatos = [];
    circuitoCache = null;
    ultimaRespuesta = {};
    cursorTiempoAPI = null;
    cursorTiempoSimulacion = null;
}

// Comienzo de la simulación con una sesión específica

router.post('/start', async (req, res) => {
    const { session_key: nuevaSession } = req.body;

    try {
        detenerSimulacion();
        const db = await connectToDB_OpenF1();

        const infoSesion = await db.collection('sessions').findOne({ session_key: parseInt(nuevaSession) });
        if (!infoSesion) return res.status(404).json({ error: "Sesión no encontrada" });
        
        const ultimoRegistro = await db.collection('location')
            .find({ session_key: parseInt(nuevaSession) })
            .hint({ session_key: 1, date: 1 }) 
            .sort({ date: -1 }) 
            .project({ date: 1, _id: 0 })
            .limit(1)
            .toArray();

        if (ultimoRegistro.length === 0) {
            return res.status(404).json({ error: "No hay telemetría para esta sesión" });
        }

        session_key = nuevaSession;
        session_start_time = new Date(infoSesion.date_start);
        session_end_time = new Date(ultimoRegistro[0].date) 
        cursorTiempoAPI = session_start_time;
        cursorTiempoSimulacion = session_start_time;

        // Calculamos la duración para la barra del frontend para poder avanzar o retroceder en el tiempo de la carrera
        const duracionRealSegundos = Math.floor((session_end_time - session_start_time) / 1000);

        llenarBuffer();
        timerConsumo = setInterval(consumirBuffer, VELOCIDAD_REFRESCO);

        res.json({
            msg: "Simulación iniciada",
            totalDuration: duracionRealSegundos,
            startTime: session_start_time
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al iniciar" });
    }
});

// Para detener la simulación y limpiar el estado de las variables globales

router.post('/stop', (req, res) => {
    detenerSimulacion();
    res.json({ message: "Simulación detenida" });
});

// Obtenemos los datos de trazado de un piloto para poder pintar el circuito

router.get('/track-data', async (req, res) => {

    if (!session_key) return res.status(400).json({ error: "No hay sesión activa" });
    if (circuitoCache) return res.json(circuitoCache);

    try {
        const db = await connectToDB_OpenF1();
        let driverNum = req.query.driver_number;

        if (!driverNum) {
            const ejemplo = await db.collection('location').findOne({ session_key: parseInt(session_key) });
            driverNum = ejemplo ? ejemplo.driver_number : 1;
        }

        console.log(`🗺️ Generando trazado (Piloto #${driverNum})...`);
        const data = await db.collection('location').find({
            session_key: parseInt(session_key),
            driver_number: parseInt(driverNum),
            x: { $ne: 0 }, 
            y: { $ne: 0 }
        })
        .hint({ session_key: 1, date: 1 }) // Usamos el índice compuesto para acelerar la consulta
        .project({ x: 1, y: 1, _id: 0 })
        .sort({ date: 1 })
        .skip(500)
        .limit(20000)
        .toArray();

        circuitoCache = data;
        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/current", (req, res) => {

    // Elimina los 304 para que el cliente siempre reciba todo y no le devuelvan respuestas que no son actualizadas
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (!session_key || Object.keys(ultimaRespuesta).length === 0) {
        return res.json({});
    }
    res.json({
        ...ultimaRespuesta,
        sim_time: cursorTiempoSimulacion,
        startTime: session_start_time,
        session_key: session_key
    });
});

router.post('/modify', async (req, res) => {
    const { offsetSeconds } = req.body;
    
    if (!session_key || !session_start_time) {
        return res.status(400).json({ error: "No hay simulación activa" });
    }

    try {

        // Tiempo al que se quiere saltar
        const nuevaFecha = new Date(session_start_time.getTime() + (offsetSeconds * 1000));

        if (nuevaFecha > session_end_time) {
            return res.status(400).json({ error: "El tiempo solicitado excede el final de la carrera" });
        }

        // Reiniciamos todo para que se empiece a simular desde el nuevo tiempo
        if (timerLlenado) clearTimeout(timerLlenado);
        
        colaDatos = [];               
        cursorTiempoAPI = nuevaFecha; 
        cursorTiempoSimulacion = nuevaFecha; 
        ultimaRespuesta = {};         

        llenarBuffer();

        res.json({ 
            message: "Tiempo actualizado", 
            currentSimTime: nuevaFecha 
        });

    } catch (error) {
        console.error("Error en /modify:", error);
        res.status(500).json({ error: "Error al modificar el tiempo" });
    }
});

module.exports = router;
module.exports.getTiempoSimulacion = getTiempoSimulacion;