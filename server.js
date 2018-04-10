
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

var port = process.env.PORT || 8080;        // set our port



// REGISTER OUR ROUTES -------------------------------
app.use('/api/trips', TripController);
app.use('/api/users', UserController);
app.use('/api/auth', AuthController);


app.listen(port);
console.log('Magic happens on port ' + port);
