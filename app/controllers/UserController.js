
var express = require('express');
var User = require('../models/user');
var Trip = require('../models/trip');
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

    User.findById(req.token_user_id, function (err, user) {

        if (err) return res.status(500).send("There was a problem finding the user.");

        if (!user) return res.status(404).send("No user found.");

        res.status(200).send(user);
    });

});

router.delete('/:id_user', function (req, res, next) {


    if (!req.token_admin && (req.params.id_user != req.token_user_id)) {
        return res.status(403).json({ message: "Unauthorized request" });
    }

    User.findById(req.params.id_user, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "Could not retrieve the user." });
        }

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.remove(function (err, user) {

            if (err) {
                return res.status(503).json({ message: "Could not delete the user." });
            }

            return res.status(200).json({ message: "User deleted successfully." });
        });


    });



});

router.get('/:id_user/trips/driver', function (req, res) {

    User.findById(req.params.id_user, function (err, user) {
        if (err) { 
            console.log(err); 
            return res.status(503).json({ message: "Database error, can´t find user." });
        }

        if (!user) return res.status(404).json({ message: "User not found." });
    });


    Trip.find({ 'driver': req.params.id_user }).populate("driver").exec(function (err, trips) {

        if (err) return res.status(503).json({ message: "Database error, could not find trips." });
        if (trips.length <= 0) return res.status(404).json({ message: "Trips not found." });

        res.status(200).json(trips);

    });

});

router.patch('/:id_user/edit', verifyToken, function (req, res) {
    
    if (!req.token_admin && (req.params.id_user != req.token_user_id)) {
        return res.status(403).json({ message: "Unauthorized request" });
    }

    if(req.body.hasOwnProperty("rating") || req.body.hasOwnProperty("rating") || req.body.hasOwnProperty("cancelIndex") || req.body.hasOwnProperty("admin") || 
    req.body.hasOwnProperty("cancelIndex") || req.body.hasOwnProperty("cancelCounter") || req.body.hasOwnProperty("createdAt")){
        return res.status(403).json({ message: "Can't update one of these fields. Edit cancelled" });
    }
    

    User.findOneAndUpdate({_id: req.params.id_user}, req.body, {new: true}, function(err, user) {
        if (err) { 
            console.log(err); 
            return res.status(503).json({ message: "Database error, can´t find user." });
        }
        res.status(200).json(user);
      });      
});


module.exports = router;