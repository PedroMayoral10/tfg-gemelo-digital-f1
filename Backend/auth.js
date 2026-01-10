// Backend/middleware/auth.js
const jwt = require('jsonwebtoken');

// Cargamos las variables de entorno para poder leer el secreto
require('dotenv').config();

// Función para verificar el token JWT en las rutas protegidas

function verifyToken (req, res, next) {
    
    try {
        const authHeader = req.get('Authorization') || req.get('authorization');
        if (!authHeader) {
            return res.status(401).json({ error: "Token no proporcionado" });
        }
        const parts = authHeader.split(' ');
        const token = parts.length === 2 && /^Bearer$/i.test(parts[0]) ? parts[1] : parts[0];

        jwt.verify(token, process.env.TOKEN_JWT_SECRET, function(err, decoded) {
            if (err) {
                return res.status(401).json({ error: "Token inválido o expirado" });
            }
            req.user = decoded;
            next();
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ ok:false, message: "Error al verificar el token" });
    }
        
};

module.exports = { verifyToken };