var express = require('express');
var router = express.Router();
const { connectToDB_OpenF1 } = require('../db_mongo');
const { getRaceSnapshot } = require('./race_data');

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
let ultimoSnapshotCarrera = {};

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

        // Antes de llenar el buffer, obtenemos un snapshot actualizado de la carrera para tener la info de vuelta, stint, posición, etc. de cada piloto
        const { race_table } = await getRaceSnapshot(parseInt(session_key), start);
        // Actualizamos la variable global para tener siempre el último estado conocido
        ultimoSnapshotCarrera = race_table;



        const nuevosDatos = await db.collection('location').find({
            session_key: parseInt(session_key),
            date: { $gte: start, $lt: end }
        })
        .hint({ session_key: 1, date: 1 }) // Usamos el índice compuesto para acelerar la consulta 
        .project({ date: 1, driver_number: 1, x: 1, y: 1, _id: 0 }) // Project hace que MongoDB solo devuelva los campos necesarios
        .sort({ date: 1 }) 
        .toArray(); 

        if (nuevosDatos.length > 0) {

            // Esto permite que al consumir el buffer, la tabla esté sincronizada con la posición.
            const datosConTabla = nuevosDatos.map(dato => ({
                ...dato,
                race_table: race_table
            }));

            colaDatos = [...colaDatos, ...datosConTabla];

            console.log(`✅ [DB] Buffer: ${colaDatos.length} items (Bloque de ${BLOQUE_SEGUNDOS}s)`);
            cursorTiempoAPI = end;
            timerLlenado = setTimeout(llenarBuffer, 1000);
        } else {
            console.log(`⚠️ [DB] Hueco de datos o fin de sesión. Saltando...`);
            cursorTiempoAPI = end;
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
    let snapshotActual = null; // Variable temporal para capturar la tabla
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
            snapshotActual = colaDatos[i].race_table;
            indiceCorte = i;
        } else {
            break; 
        }
    }

    if (Object.keys(datosPorPiloto).length > 0 || snapshotActual) {
        ultimaRespuesta = { 
            ...ultimaRespuesta, // Mantenemos las posiciones anteriores para que no parpadeen los coches
            ...datosPorPiloto,  // Sobrescribimos con las nuevas posiciones detectadas
            race_table: snapshotActual || ultimoSnapshotCarrera // Actualizamos la tabla sincronizada
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
    if (!nuevaSession) return res.status(400).json({ error: "Faltan datos" });

    try {
        detenerSimulacion();
        const db = await connectToDB_OpenF1();
        
        console.log(`🔎 Buscando sesión ${nuevaSession} en MongoDB (54M registros)...`);
        const infoSesion = await db.collection('sessions').findOne({ session_key: parseInt(nuevaSession) });

        if (!infoSesion) {
            return res.status(404).json({ error: "Sesión no encontrada" });
        }

        const fechaInicio = new Date(infoSesion.date_start);
        session_key = nuevaSession;
        cursorTiempoAPI = fechaInicio;
        cursorTiempoSimulacion = fechaInicio;

        console.log(`🟢 START DB: Sesión ${session_key} - ${infoSesion.location}`);

        llenarBuffer();
        timerConsumo = setInterval(consumirBuffer, VELOCIDAD_REFRESCO);

        res.json({
            msg: "Simulación iniciada",
            startTime: infoSesion.date_start
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

router.get("/current", (req,res) => {

    // Elimina los 304 para que el cliente siempre reciba todo y no le devuelvan respuestas que no son actualizadas
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    if (!session_key || Object.keys(ultimaRespuesta).length === 0) {
        return res.json({});
    }
    res.json({
        ...ultimaRespuesta,
        sim_time: cursorTiempoSimulacion,
        session_key: session_key
    });
});

module.exports = router;