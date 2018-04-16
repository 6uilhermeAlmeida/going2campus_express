
var express = require('express');        // call express
var Trip = require('../models/trip');
var router = express.Router();              // get an instance of the express Router
var verifyToken = require('../auth/VerifyToken.js');

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

        Trip.find()
            .populate('driver')
            .populate('pendingPassengers')
            .populate('passengers')
            .exec(function (err, trips) {

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
            if (trip.auto_accept) {
                trip.passengers.push(req.body.passengerId);
                trip.numberOfSeatsAvailable--;
            } else {
                trip.pendingPassengers.push(req.body.passengerId);
            }

            trip.save(function (err) {
                if (err) {
                    console.log(err);
                    res.status(503).send("Error saving data to database.");
                    return;
                }
                res.status(200).json(trip);
            });
        } else {
            res.status(202).json({ message: "Car has no seats available." });
        }
    });

});

router.put('/:id_trip/accept_passenger',verifyToken, (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).send("Bad request, wrong attribute name.");
        return;
    }

    Trip.findById(req.params.id_trip).populate("driver").exec( function (err, trip) {

        if (err) {
            console.log(err);
            return res.status(503).send("Error retrieving data from database.");
        }

        if (!trip) {
            return res.status(404).send("404 Trip not found.");
        }

        if (trip.driver.id != req.token_user_id) {
            return res.status(403).json({message:"Unauthorized Request"});
        }

        if (trip.numberOfSeatsAvailable > 0) {
                let index  = trip.pendingPassengers.indexOf(req.body.passengerId);
                if (index > -1) {
                    trip.pendingPassengers.splice(index, 1);
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
                }
                else{
                    res.status(409).json({ message: "User did not reserve this trip." });
                }
            } else {
                res.status(202).json({ message: "Car has no seats available." });
            }
    });

});

module.exports = router;