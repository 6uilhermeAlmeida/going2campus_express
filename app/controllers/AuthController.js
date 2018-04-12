var express = require('express');
var config = require('../config/config.js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var User = require('../models/user.js');



router.post('/register', function (req, res) {

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


router.post('/login', (req, res) => {
    User.findOne({ mail: req.body.mail }).select('+password').exec(function (err, user) {
        if (err) return res.status(500).send('Error on the server.');
        if (!user) return res.status(404).send('No user found.');
    
        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) return res.status(401).send({ auth: false, token: null, message: "Invalid password" });
    
        var token = jwt.sign({ id: user._id }, config.secret, {
          expiresIn: 2628000 // one month in seconds
        });
    
        res.status(200).send({ auth: true, token: token});
      });
});

module.exports = router;