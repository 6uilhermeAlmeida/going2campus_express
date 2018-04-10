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

router.post('/', function (req, res) {

    User.create(

        {
            name: req.body.name,
            mail: req.body.mail,
            password: bcrypt.hashSync(req.body.password),
            birthDate: req.body.birthDate

        },

        function (err, user) {

            if (err) {
                res.status(400).json({
                    success: false,
                    message: "Error saving user to the database."
                });
                return;
            }

            user.password = undefined;
            res.status(201).json(user);
        });
});

module.exports = router;