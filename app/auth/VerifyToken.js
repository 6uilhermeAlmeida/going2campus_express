var jwt = require('jsonwebtoken');
var config = require('../config/config.js');
var User = require('../models/user');

function verifyToken(req, res, next) {
  if (req.method === "OPTIONS") {
    next();
  }

  var token = req.body.token || req.query.token || req.headers['x-access-token'];

  if (!token) {
    return res.status(403).send({
      auth: false,
      message: 'No token provided.'
    });
  }

  jwt.verify(token, config.secret, function (err, decoded) {
    if (err) {
      return res.status(500).send({
        auth: false,
        message: 'Failed to authenticate token.'
      });
    }

    req.token_user_id = decoded.token_user_id;
    req.token_admin = decoded.token_admin;

    User.findById(req.token_user_id, function (err, user) {

      if (err) return res.status(503).json({
        message: "We can´t know if you are a user or not."
      });
      if (!user) return res.status(403).json({
        message: "You are no longer a user, register to join us again!"
      });

      next();
    });

  });
}

module.exports = verifyToken;