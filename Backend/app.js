var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var driversRouter = require('./routes/drivers'); // Importar el enrutador de drivers del archivo drivers.js del directorio routes
var locationRouter = require('./routes/location'); // importar el enrutador de location del archivo location.js del directorio routes
var sessionsRouter = require('./routes/sessions'); // importar el enrutador de sessions del archivo sessions.js del directorio routes

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/drivers', driversRouter); // Usar el enrutador de drivers para las rutas que comienzan con /drivers
app.use('/location', locationRouter); // Usar el enrutador de location para las rutas que comienzan con /location
app.use('/sessions', sessionsRouter); // Usar el enrutador de sessions para las rutas que comienzan con /sessions

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Error interno del servidor',
      status: err.status || 500
    }
  });
});

module.exports = app;
