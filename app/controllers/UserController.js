var express = require('express');
var User = require('../models/user');
var config = require('../config/config.js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt-nodejs');


var router = express.Router();


router.get('/', function (req, res) {
    User.find({}, function (err, users) {

        if (err) {
            res.status(503).json({
                message: "Database error, couldn´t retrieve users."
            });
        }
        res.json(users);

    })
});



module.exports = router;