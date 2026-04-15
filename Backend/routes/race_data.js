const { connectToDB_OpenF1 } = require('../db_mongo');

/*
 ************************************************************* 
 OBTENER UN SNAPSHOT DE INFO DE CARRERA PARA TODOS LOS PILOTOS 
 *************************************************************
*/
async function getRaceSnapshot(session_key, currentTime) {
    try {
        const db = await connectToDB_OpenF1();
        const [laps, intervals, positions, stints, drivers] = await Promise.all([
            // Última vuelta de cada piloto 
            db.collection('laps').aggregate([
                { $match: { session_key: session_key, date_start: { $lte: currentTime } } },
                { $sort: { date_start: -1 } },
                { $group: { _id: "$driver_number", data: { $first: "$$ROOT" } } }
            ]).toArray(),

            // Último intervalo 
            db.collection('intervals').aggregate([
                { $match: { session_key: session_key, date: { $lte: currentTime } } },
                { $sort: { date: -1 } },
                { $group: { _id: "$driver_number", data: { $first: "$$ROOT" } } }
            ]).toArray(),

            // Última posición conocida
            db.collection('position').aggregate([
                { $match: { session_key: session_key, date: { $lte: currentTime } } },
                { $sort: { date: -1 } },
                { $group: { _id: "$driver_number", data: { $first: "$$ROOT" } } }
            ]).toArray(),

            // Último neumático/stint 
            db.collection('stints').aggregate([
                { $match: { session_key: session_key } }, // Stints suelen ser por vuelta, no por fecha exacta
                { $sort: { stint_number: -1 } },
                { $group: { _id: "$driver_number", data: { $first: "$$ROOT" } } }
            ]).toArray(),

            // Datos estáticos de pilotos (Nombre, equipo, color)
            db.collection('drivers').find({ session_key: session_key }).toArray()
        ]);

        // 2. Unificamos todo en un objeto mapeado por driver_number
        const snapshot = {};

        // Primero los datos base del piloto
        drivers.forEach(d => {
            snapshot[d.driver_number] = {
                acronym: d.name_acronym,
                team_color: d.team_colour,
                // Valores por defecto
                position: "-", last_lap: "-", gap: "-", interval: "-",
                s1: "-", s2: "-", s3: "-", compound: "-", tyre_age: 0
            };
        });

        // Añadimos Posiciones
        positions.forEach(p => {
            if (snapshot[p._id]) snapshot[p._id].position = p.data.position;
        });

        // Añadimos Vueltas y Sectores
        laps.forEach(l => {
            if (snapshot[l._id]) {
                snapshot[l._id].lap_number = l.data.lap_number;
                snapshot[l._id].last_lap = l.data.lap_duration;
                snapshot[l._id].s1 = l.data.duration_sector_1;
                snapshot[l._id].s2 = l.data.duration_sector_2;
                snapshot[l._id].s3 = l.data.duration_sector_3;
                snapshot[l._id].date_start = l.data.date_start; // Importante para la lógica de "revelar" sectores
            }
        });

        // Añadimos Intervalos
        intervals.forEach(i => {
            if (snapshot[i._id]) {
                snapshot[i._id].gap = i.data.gap_to_leader;
                snapshot[i._id].interval = i.data.interval;
            }
        });

        // Añadimos Stints
        stints.forEach(s => {
            if (snapshot[s._id]) {
                snapshot[s._id].compound = s.data.compound;
                snapshot[s._id].tyre_age = s.data.tyre_age;
            }
        });

        return {
            race_table: snapshot,        
            sim_time: currentTime,       
            session_key: session_key
        };

    } catch (err) {
        console.error("❌ Error al obtener snapshot de carrera:", err.message);
        return {};
    }
}

module.exports = { getRaceSnapshot };