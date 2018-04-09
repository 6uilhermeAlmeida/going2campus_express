
// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var Trip = require('./app/models/trip');
var TripController = require('./app/controllers/TripController');

mongoose.connect('mongodb://dev:dev@ds223578.mlab.com:23578/going2campus');
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

// ROUTES FOR OUR API
// =============================================================================


// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api/trips', TripController);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);