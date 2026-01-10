var express = require('express');
var router = express.Router();

const { connectToDB } = require('../db_mongo'); 
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Registro de un nuevo usuario

router.post('/register', async function(req, res) {
    try {

        const db = await connectToDB();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const existingUser = await db.collection('users').findOne({ username });
        if (existingUser) {
            return res.status(409).json({ error: "Ese nombre de usuario ya existe." });
        }

        const salt = await bcrypt.genSalt(10); // Generamos cadena aleatoria
        const hashedPassword = await bcrypt.hash(password, salt); // Hasheamos la contraseña con la cadena
        
        const newUser = { 
            username, 
            password: hashedPassword, // Guardamos en la base de datos la contraseña hasheada
        };

        await db.collection('users').insertOne(newUser);
        res.status(201).json({ message: "Usuario registrado exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// Inicio de sesión de un usuario existente y devolución de un token JWT

router.post('/login', async function(req, res) {
    try {
        
        const db = await connectToDB();
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const user = await db.collection('users').findOne({ username });        
        
        if (!user) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Usamos bcrypt.compare para ver si la contraseña escrita coincide con el Hash de la BD
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: "Credenciales inválidas" });
        }

        // Generamos el token JWT
        const token = jwt.sign(
            { 
                _id: user._id, // Guardamos el ID del usuario dentro del token por si se necesita luego para cualquier operación
                username: user.username 
            }, 
            process.env.TOKEN_JWT_SECRET,
            { expiresIn: '12h' }
        );

        // Devolvemos el token al frontend. 
       res.status(200).json({ 
            message: "Login exitoso",
            token: token, 
            user: { 
                _id: user._id, // 
                username: user.username 
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al iniciar sesión" });
    }
});

module.exports = router;
