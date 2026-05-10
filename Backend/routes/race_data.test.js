const request = require('supertest');
const app = require('../app');
const { client } = require('../db_mongo');

describe('Pruebas de Tabla de Carrera (Race Data Snapshot)', () => {

    afterAll(async () => {
        if (client) await client.close();
    });

    test('GET /race_data/ - Debe devolver el snapshot unificado de todos los pilotos', async () => {
        const sessionKey = 9102; // Barcelona 2023

        // Empieza la carrera y luego se adelanta porque si no, no hay datos de las vueltas ya que
        // al principio de una carrera obviamente no hay datos de vuelta.

        await request(app).post('/location/start').send({ session_key: sessionKey });

        await request(app).post('/location/modify').send({ offsetSeconds: 900 }); // Saltamos 15 minutos

        const res = await request(app).get('/race_data/');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('race_table');
        expect(res.body).toHaveProperty('session_key', sessionKey);

        // Verificar que haya datos de al menos un piloto
        const drivers = Object.keys(res.body.race_table);
        expect(drivers.length).toBeGreaterThan(0);


        const primerPiloto = res.body.race_table[drivers[0]];
        expect(primerPiloto).toHaveProperty('acronym');
        expect(primerPiloto).toHaveProperty('position');
        expect(primerPiloto).toHaveProperty('compound'); 
        expect(primerPiloto).toHaveProperty('last_lap'); 
        expect(primerPiloto).toHaveProperty('gap');
    });

    test('GET /race_data/ - Debe fallar si no hay simulación activa', async () => {

        await request(app).post('/location/stop');
        const res = await request(app).get('/race_data/');
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("No hay simulación activa");
    });
});