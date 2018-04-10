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

                var errors = [];
                
                if (err.errors) {
                    User.schema.eachPath(function (eachPath) {
                        if (err.errors[eachPath]) {
                            errors.push({error_message:err.errors[eachPath].message});
                        }
                    });
                }

                if (err.code == 11000) {
                    errors.push({error_message:"There's a user with this e-mail already."});
                }

                res.status(400).json({
                    errors: errors
                });

                return;
            }

            user.password = undefined;
            res.status(201).json(user);
        });
});

module.exports = router;