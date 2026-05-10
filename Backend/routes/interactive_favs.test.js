const request = require('supertest');
const app = require('../app');
const { client } = require('../db_mongo');

describe('Pruebas en Rutas de Favoritos (Interactive Favs)', () => {
    let token;
    let testFavId;
    // Definimos el nombre de usuario de prueba una sola vez
    const testUsername = 'testuser_favs';

    afterAll(async () => {
        // Borramos el usuario de prueba
        if (client) {
            try {
                const db = client.db(process.env.DB_NAME_OPENF1);
                await db.collection('users').deleteOne({ username: testUsername });
            } catch (e) {
            }
        }
    });

    beforeAll(async () => {
        // Registro del usuario de prueba
        await request(app)
            .post('/user/register')
            .send({ username: testUsername, password: '123' });

        // Login para obtener el token necesario para las rutas protegidas
        const res = await request(app)
            .post('/user/login')
            .send({ username: testUsername, password: '123' });

        token = res.body.token;
    });

    test('POST /add - Debería denegar el acceso sin un token JWT', async () => {
        const res = await request(app)
            .post('/interactive_favs/add')
            .send({ year: 2024, round: 1, driverId: 1, circuitName: 'Shangai' });
        
        expect(res.status).toBe(401);

        const msg = res.body.message || res.body.error || res.text;
        expect(msg).toBe("Token no proporcionado");
    });

    test('POST /add - Debería añadir un favorito correctamente con token', async () => {
        const res = await request(app)
            .post('/interactive_favs/add')
            .set('Authorization', token)
            .send({
                year: 2024,
                round: 5,
                driverId: 1,
                circuitName: 'Shanghai'
            });

        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Guardado en colección separada");
    });

    test('POST /add - No debería permitir duplicados para el mismo usuario', async () => {
        const res = await request(app)
            .post('/interactive_favs/add')
            .set('Authorization', token)
            .send({ year: 2024, round: 5, driverId: 1, circuitName: 'Shanghai' });

        expect(res.status).toBe(409);
    });

    test('GET /list - Debería obtener solo los favoritos del usuario autenticado', async () => {
        const res = await request(app)
            .get('/interactive_favs/list')
            .set('Authorization', token);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.favorites)).toBe(true);

        // Guardamos un ID real para el test de eliminación posterior
        if (res.body.favorites.length > 0) {
            testFavId = res.body.favorites[0]._id;
        }
    });

    test('POST /add - Debería dar error 400 si faltan campos obligatorios', async () => {
        const res = await request(app)
            .post('/interactive_favs/add')
            .set('Authorization', token)
            .send({ year: 2024 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Faltan datos para guardar");
    });

    test('DELETE /remove/:id - Debería eliminar un favorito correctamente', async () => {
        if (testFavId) {
            const res = await request(app)
                .delete(`/interactive_favs/remove/${testFavId}`)
                .set('Authorization', token);

            expect(res.status).toBe(200);
            expect(res.body.message).toBe("Eliminado correctamente");
        }
    });

    test('DELETE /remove/:id - Debería dar 404 si el favorito no existe', async () => {

        const idInexistente = "6630ca7078893f40f0000000";

        const res = await request(app)
            .delete(`/interactive_favs/remove/${idInexistente}`)
            .set('Authorization', token);

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("No se encontró el favorito");
    });
});