
var express = require('express');        // call express
var Trip = require('../models/trip');
var router = express.Router();              // get an instance of the express Router


router.route('/')

    .post(function (req, res) {

        var trip = new Trip(req.body);

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

router.put('/:id_trip/add_passenger', (req, res) => {

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
            res.status(202).json({error:"Car has no seats available."});
        }
    });

});

module.exports = router;