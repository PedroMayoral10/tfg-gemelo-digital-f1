var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({mensaje: 'Hola desde el servidor'});
});

module.exports = router;
