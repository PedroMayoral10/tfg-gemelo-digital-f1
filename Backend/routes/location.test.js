const request = require('supertest');
const app = require('../app');
const { client } = require('../db_mongo');

describe('Pruebas de simulación del circuito interactivo. Localización', () => {

    afterAll(async () => {
        if (client) await client.close();
    });

    test('Inicio, consulta actual y parada.', async () => {
        
        const sessionKey = 9102; // Barcelona 2023

        // Inicio
        const startRes = await request(app).post('/location/start').send({ session_key: sessionKey });
        expect(startRes.status).toBe(200);
        expect(startRes.body.msg).toBe("Simulación iniciada");
        expect(startRes.body).toHaveProperty('totalDuration');
        expect(startRes.body).toHaveProperty('startTime');

        // Consulta. Espera de 500ms para que se llene el buffer y se consuma
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentRes = await request(app).get('/location/current');
        expect(currentRes.status).toBe(200);    
        expect(currentRes.body).toHaveProperty('sim_time');
        expect(currentRes.body).toHaveProperty('session_key', sessionKey);
        expect(currentRes.body).toHaveProperty('startTime');

        // Parada
        const stopRes = await request(app).post('/location/stop');
        expect(stopRes.status).toBe(200);
        expect(stopRes.body).toHaveProperty('message', "Simulación detenida");

    });

    test('POST /modify - Saltar en el tiempo', async () => {

        await request(app).post('/location/start').send({ session_key: 9102 });

        // Saltar 100 segundos
        const res = await request(app)
            .post('/location/modify')
            .send({ offsetSeconds: 100 });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Tiempo actualizado");
        expect(res.body).toHaveProperty('currentSimTime');

    });
});