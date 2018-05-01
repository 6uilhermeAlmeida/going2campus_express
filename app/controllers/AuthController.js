var express = require('express');
var config = require('../config/config.js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt-nodejs');
var User = require('../models/user.js');
var sha256 = require('js-sha256');
var mailer = require('nodemailer');
var Mustache = require('mustache');
var fs = require('fs');



var router = express.Router();



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
                            errors.push({
                                error_message: err.errors[eachPath].message
                            });
                        }
                    });
                }

                if (err.code == 11000) {
                    errors.push({
                        error_message: "There's a user with this e-mail already."
                    });
                }

                res.status(400).json({
                    errors: errors
                });

                return;
            }

            var transporter = mailer.createTransport({
                service: 'gmail',
                auth: {
                    user: config.mail_user,
                    pass: config.mail_password
                }
            });


            fs.readFile('app/config/mail.html', 'utf8', function (err, html) {

                if (err) {
                    console.log(err);
                }

                var template = html;
                var rendered = Mustache.render(template, {user: user , action_url : config.host + 'api/auth/verify/' + user.id + '/' + sha256(String(user.id + user.createdAt.getTime() + config.secret))});

                const mailOptions = {
                    from: config.mail_user, // sender address
                    to: user.mail, // list of receivers
                    subject: 'Account confirmation', // Subject line
                    html: rendered

                    //html: '<p>Confirm your account <a href =' + config.host + 'api/auth/verify/' + user.id + '/' + sha256(String(user.id + user.createdAt.getTime() + config.secret)) + '>here</a></p>'// plain text body
                };

                transporter.sendMail(mailOptions, function (err, info) {
                    if (err)
                        console.log(err);
                });
            });



            user.password = undefined;
            res.status(201).json({
                message: "We´ve sent a verification e-mail to " + user.mail + ".",
                user: user
            });
        });
});


router.post('/login', (req, res) => {
    User.findOne({
        mail: req.body.mail
    }).select('+password').exec(function (err, user) {

        if (err) return res.status(500).send('Error on the server.');
        if (!user) return res.status(404).send('No user found.');
        if (!user.active) return res.status(402).json({
            message: "You must verify your e-mail."
        });

        var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) return res.status(401).send({
            auth: false,
            token: null,
            message: "Invalid password"
        });

        var token = jwt.sign({
            token_user_id: user._id,
            token_admin: user.admin
        }, config.secret, {
            expiresIn: 2628000 // one month in seconds
        });

        res.status(200).send({
            auth: true,
            token: token
        });
    });
});

router.get('/verify/:id_user/:verification_code', function (req, res) {

    User.findById(req.params.id_user, function (err, user) {

        if (err) return res.status(500).json({
            message: "Error on the serve database."
        });
        if (!user) return res.status(404).json({
            message: 'User not found.'
        });

        var expectedToken = sha256(String(user.id + user.createdAt.getTime() + config.secret));

        console.log({
            db_status: expectedToken
        });
        console.log({
            req: req.params.verification_code
        });


        if (expectedToken === req.params.verification_code) {

            user.active = true;

            user.save(function (err, user) {

                if (err) {
                    return res.status(503).json({
                        message: "Database error, could not save user."
                    });
                }

                return res.status(200).json({ message: "You are now active, enjoy!" });

            });

        } else {

            return res.status(401).json({
                message: "You need a valid token to activate your account!"
            });

        }

    });

});

module.exports = router;