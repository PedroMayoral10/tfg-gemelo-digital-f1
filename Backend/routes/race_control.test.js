const request = require('supertest');
const app = require('../app');
const { client } = require('../db_mongo');

describe('Pruebas de Race Control (Mensajes y Banderas)', () => {

    afterAll(async () => {
        if (client) await client.close();
    });

    test('GET /race_control/:session_key - Debe devolver mensajes hasta el sim_time', async () => {
        const sessionKey = 9102;
        const simTime = "2023-06-04T13:10:00.000Z";

        const res = await request(app).get(`/race_control/openf1/race_control/${sessionKey}`).query({ sim_time: simTime });

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);

        if (res.body.length > 0) {
            // Verificamos estructura
            expect(res.body[0]).toHaveProperty('message');
            expect(res.body[0]).toHaveProperty('category');
            expect(res.body[0]).toHaveProperty('flag');
            expect(res.body[0]).toHaveProperty('lap_number');
            expect(res.body[0]).toHaveProperty('date');
            
            // Verificamos que respeta el sim_time
            const fechaMsg = new Date(res.body[0].date).getTime();
            const fechaLimite = new Date(simTime).getTime();
            expect(fechaMsg).toBeLessThanOrEqual(fechaLimite);
        }
    });

    test('GET /race_control/:session_key - Debe filtrar mensajes nuevos usando last_date', async () => {
        const sessionKey = 9102;
        const simTime = "2023-06-04T14:00:00.000Z";
        const lastDate = "2023-06-04T13:30:00.000Z";

        const res = await request(app)
            .get(`/race_control/openf1/race_control/${sessionKey}`)
            .query({ 
                sim_time: simTime,
                last_date: lastDate 
            });

        expect(res.status).toBe(200);

        if (res.body.length > 0) {
            // Todos los mensajes devueltos deben ser POSTERIORES a lastDate
            const fechaPrimerMsg = new Date(res.body[0].date).getTime();
            const fechaReferencia = new Date(lastDate).getTime();
            expect(fechaPrimerMsg).toBeGreaterThan(fechaReferencia);
        }
    });
});