// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var Trip = require('./app/models/trip');

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
var router = express.Router();              // get an instance of the express Router


router.get('/', function (req, res) {
    res.json({ message: 'hooray! welcome to our api!' });
});

// more routes for our API will happen here

router.route('/trips')

    .post(function (req, res) {

        var trip = new Trip();

        trip.startingAdress = req.body.startingAdress;
        trip.endingAdress = req.body.endingAdress;
        trip.numberOfSeatsAvailable = req.body.numberOfSeatsAvailable;
        trip.tripDate = req.body.tripDate;
        trip.driver = req.body.driver;
        trip.departure = req.body.departure;
        trip.passengers = req.body.passengers;
        trip.status = req.body.status;
        trip.tripDate = req.body.tripDate;
        trip.stoppingAdresses = req.body.stoppingAdresses;
        trip.auto_accept = req.body.auto_accept;
        trip.pendingPassengers = req.body.pendingPassengers;

        trip.save(function (err) {
            if (err) {
                console.log(err.message);
            }

            res.status(200).json(trip);

        });

    })

    .get(function (req, res) {

        Trip.find(function (err, trips) {

            if (err) {
                console.log(err);
            }

            res.json(trips);

        });

    });

router.put('/trips/:id_trip/add_passenger', (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).send("Bad request, wrong attribute name.");
        return;
    }

    Trip.findById(req.params.id_trip, function (err, trip) {

        if (err) {
            console.log(err);
            res.status(503).send("Error retrieving data from database.");
            return;
        }

        if (!trip) {
            res.status(404).send("404 Trip not found.");
            return;
        }

        if (trip.numberOfSeatsAvailable > 0) {
            trip.passengers.push(req.body.passengerId);
            trip.numberOfSeatsAvailable--;
            trip.save(function (err) {
                if (err) {
                    console.log(err);
                    res.status(503).send("Error saving data to database.");
                    return;
                }
                res.status(200).json(trip);
            });

        } else {
            res.status(202).send("Car has no seats available.");
        }
    });




});



// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
