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
                var rendered = Mustache.render(template, { user: user, action_url: config.host + 'api/auth/verify/' + user.id + '/' + sha256(String(user.id + user.createdAt.getTime() + config.secret)) });

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
        if (user.blocked) {
            return res.status(403).send('This user is blocked from our services, please contact going2campus@gmail.com to know why.');
        }
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
        }, config.secret, {
                expiresIn: 2628000 // one month in seconds
            });

        user.password = undefined;

        res.status(200).send({
            auth: true,
            token: token,
            user: user
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

router.get('/askForReset', function (req, res) {

    if (!req.query.email) {
        return res.status(400).json({ message: "Missing query 'email'." });
    }

    var transporter = mailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.mail_user,
            pass: config.mail_password
        }
    });


    fs.readFile('app/config/mail_ask_for_reset.html', 'utf8', function (err, html) {

        if (err) {
            console.log(err);
        }

        User.findOne().where('mail').equals(req.query.email).exec(function (err, user) {

            if (err) {
                console.log(err);
            }

            var template = html;
            var rendered = Mustache.render(template,
                {
                    user: user,
                    action_url: config.host + 'api/auth/reset?email=' + req.query.email + '&signed=' + user.createdAt.getTime()

                });

            const mailOptions = {
                from: config.mail_user, // sender address
                to: user.mail, // list of receivers
                subject: 'Password recovery, did you ask for it?', // Subject line
                html: rendered

            };

            transporter.sendMail(mailOptions, function (err, info) {
                if (err) {
                    console.log(err);
                } else {
                    res.status(200).json({ message: "Mail sent with a request confirmation." });
                }
            });
            
        });


    });

})

router.get('/reset', function (req, res) {

    if (!req.query.email) {
        return res.status(400).json({ message: "Missing query 'email'." });
    }

    if (!req.query.signed) {
        return res.status(400).json({ message: "Missing query 'signed'." });
    }

    var password = sha256(req.query.email + (new Date).getTime() + config.secret);
    var passwordHashed = bcrypt.hashSync(password);

    User.findOne({ mail: req.query.email }, function (err, user) {


        if (err) {
            //Log those database errors!
            console.log(err);
            return res.status(503).json(err);

        }

        if (!user) {
            return res.status(404).json({ message: "This user was not found." })
        }

        user.password = passwordHashed;

        user.save(function (err) {

            if (err) {
                //Log those database errors!
                console.log(err);
                return res.status(503).json(err);
            }

            if (Number(req.query.signed) != user.createdAt.getTime()) {
                return res.status(403).json({message : 'Bad signed request.'});
            }

            var transporter = mailer.createTransport({
                service: 'gmail',
                auth: {
                    user: config.mail_user,
                    pass: config.mail_password
                }
            });
    
    
            fs.readFile('app/config/mail_password.html', 'utf8', function (err, html) {
    
                if (err) {
                    console.log(err);
                }
    
                var template = html;
                var rendered = Mustache.render(template,
                    {
                        user: user,
                        newPassword: password
    
                    });
    
                const mailOptions = {
                    from: config.mail_user, // sender address
                    to: user.mail, // list of receivers
                    subject: 'Password recovery', // Subject line
                    html: rendered
    
                };
    
                transporter.sendMail(mailOptions, function (err, info) {
                    if (err) {
    
                        console.log(err);
    
                    } else {
    
                        res.status(200).json({ message: "Mail sent with a new password." });
    
                    }
                });
    
            });
    
        });

        
    })

});

module.exports = router;