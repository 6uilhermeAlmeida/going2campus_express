
// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var mongoose = require('mongoose');


var TripController = require('./app/controllers/TripController');
var UserController = require('./app/controllers/UserController');
var AuthController = require('./app/controllers/AuthController');
var config = require('./app/config/config.js');

mongoose.connect(config.database);
mongoose.connection
    .once('open', () => console.log('Good to go!'))
    .on('error', (error) => {
        console.warn('Warning', error);
    });


// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type, x-access-token");
    res.header("Access-Control-Allow-Methods", "*");
    next();
});

app.use(function (err, req, res, next) {

    if (err) {
        console.log(err)
        return res.status(err.statusCode).json({ message: err.type });
    }

    next();


})

var port = process.env.PORT || 8080;        // set our port

app.get('/api/doc', function (req, res) {
    res.sendfile('./doc/output.html');
});


// REGISTER OUR ROUTES -------------------------------
app.use('/api/trips', TripController);
app.use('/api/users', UserController);
app.use('/api/auth', AuthController);




app.listen(port);
console.log('Magic happens on port ' + port);
