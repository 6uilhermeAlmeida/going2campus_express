
var express = require('express');
var User = require('../models/user');
var config = require('../config/config.js');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt-nodejs');
var verifyToken = require('../auth/VerifyToken.js');


var router = express.Router();

router.use(verifyToken);

router.get('/', function (req, res) {
    User.find({}, function (err, users) {

        if (err) {
            res.status(503).json({
                message: "Database error, couldn´t retrieve users."
            });
        }
        res.json(users);

    });
});

router.get('/me', function (req, res, next) {

    User.findById(req.userId, { password: 0 }, function (err, user) {

        if (err) return res.status(500).send("There was a problem finding the user.");

        if (!user) return res.status(404).send("No user found.");

        res.status(200).send(user);
    });

});

router.delete('/:id_user/nuke', function (req, res, next) {
    

    if (!req.admin_token) {
         return res.status(403).json({message : "Unauthorized request"});
    }

    User.findById(req.params.id_user, function (err, user) {
        
        if (err) {
            return res.status(503).json({message : "Could not retrieve the user."});
        }

        if (!user) {
            return res.status(404).json({message : "User not found."});
        }

        user.remove(function (err, user) {

            if (err) {
                 return res.status(503).json({message : "Could not delete the user."});
            } else {
                return res.status(200).json({message : "User deleted successfully."});
            }

        });


    });



})


module.exports = router;