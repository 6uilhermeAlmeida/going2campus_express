var express = require('express');
var User = require('../models/user');
var config = require('../config/config.js');
var jwt = require('jsonwebtoken');
var router = express.Router();

router.get('/', function (req, res) {
    User.find({}, function (err, users) {

        if (err) {
            res.status(503).json({
                message: "Database error"
            });
        }
        res.json(users);

    })
});

router.post('/', function (req, res) {

    User.create(req.body, function (err, user) {

        if(err){
            res.status(400).json({success:false, message:err.errors});
        }

         res.status(202).json(user);
    });
})

module.exports = router;