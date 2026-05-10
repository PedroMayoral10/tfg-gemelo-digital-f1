const request = require('supertest');
const app = require('../app');
const { client } = require('../db_mongo');

describe('Pruebas de Autenticación Completas (User)', () => {
    // Generar usuario único en base a la fecha actual para que no haya errores por ejecuciones previas.
    const testUsername = 'usuario_test_tfg';
    const testUser = { username: testUsername, password: 'password123' };

    beforeAll(async () => {
        if (client) {
            const db = client.db(process.env.DB_NAME_OPENF1);
            await db.collection('users').deleteOne({ username: testUsername });
        }
    });


    // Limpiar después de los tests
    afterAll(async () => {
        if (client) {
            try {
                const db = client.db(process.env.DB_NAME_OPENF1);
                // Aseguramos que el borrado se complete antes de cerrar la conexión
                await db.collection('users').deleteOne({ username: testUsername });
            } catch (error) {
                console.error("Error en la limpieza de usuarios:", error);
            }
        }
    });

    describe('Registro (/user/register)', () => {
        
        test('Registrar usuario correctamente (201)', async () => {
            const res = await request(app).post('/user/register').send(testUser);
            expect(res.statusCode).toBe(201);
            expect(res.body.message).toBe("Usuario registrado exitosamente");
        });

        test('Usuario ya existente', async () => {
            const res = await request(app).post('/user/register').send(testUser);
            expect(res.statusCode).toBe(409);
        });
        
        test('Falta por introducir username (400)', async () => {
            const res = await request(app)
                .post('/user/register')
                .send({ password: 'qwerqwer' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Faltan datos");
        });

        test('Falta por introducir contraseña (400)', async () => {
            const res = await request(app)
                .post('/user/register')
                .send({ username: 'qwerqwer' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Faltan datos");
        });

        test('Faltan campos (400)', async () => {
            const res = await request(app)
                .post('/user/register')
                .send({});
            expect(res.statusCode).toBe(400);
        });
    });

    describe('Login (/user/login)', () => {

        test('Login correcto y devolver Token (200)', async () => {
            const res = await request(app).post('/user/login').send(testUser);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        test('Login falla con contraseña incorrecta (401)', async () => {
            const res = await request(app)
                .post('/user/login')
                .send({ username: testUser.username, password: 'qwerqwerqwer' });
            expect(res.statusCode).toBe(401);
        });

        test('Login falla faltando usuario (400)', async () => {
            const res = await request(app)
                .post('/user/login')
                .send({ password: 'password123' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Faltan datos");
        });

        test('Login falla faltando contraseña (400)', async () => {
            const res = await request(app)
                .post('/user/login')
                .send({ username: testUser.username });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe("Faltan datos");
        });

        test('Login falla faltando campos (400)', async () => {
            const res = await request(app)
                .post('/user/login')
                .send({});
            expect(res.statusCode).toBe(400);
        });
    });
});