
var express = require('express');        // call express
var Trip = require('../models/trip');
var router = express.Router();              // get an instance of the express Router
var verifyToken = require('../auth/VerifyToken.js');
var User = require('../models/user');


router.route('/')

    .post([verifyToken,Trip.postMiddleware], function (req, res) {

        var trip = new Trip(req.body);

        trip.save(function (err) {

            var errors = [];

            if (err) {

                if (err.errors) {
                    Trip.schema.eachPath(function (eachPath) {
                        if (err.errors[eachPath]) {
                            errors.push({ errorMessage: err.errors[eachPath].message });
                        }
                    });
                }

                if (errors) {
                    res.status(400).json({
                        errors: errors
                    });
                } else {

                    res.status(503).json({ message: "Database error." });

                }

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

router.patch('/:id_trip/add_passenger', verifyToken, (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).send("Bad request, wrong attribute name.");
        return;
    }

    if (req.body.passengerId != req.token_user_id && !req.token_admin) {
        return res.status(403).json({ message: "Unauthorized Request" });
    }

    User.findById(req.body.passengerId, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "We can't know if you are a user or not." });
        }

        if (!user) {
            return res.status(404).json({ message: "This user does not exist." });
        }

    });

    Trip.findById(req.params.id_trip).populate("driver").exec(function (err, trip) {

        if (err) {
            console.log(err);
            res.status(503).send("Error retrieving data from database.");
            return;
        }

        if (!trip) {
            res.status(404).send("404 Trip not found.");
            return;
        }


        if (trip.driver.id == req.body.passengerId) {
            return res.status(409).json({ message: "The user you tried to add is the driver of the trip." });
        }


        if (trip.pendingPassengers.indexOf(req.body.passengerId) > -1 || trip.passengers.indexOf(req.body.passengerId) > -1) {
            return res.status(409).json({ message: "This user is already listed for this trip." });
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

router.patch('/:id_trip/accept_passenger', verifyToken, (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).send("Bad request, wrong attribute name.");
        return;
    }

    User.findById(req.body.passengerId, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "We can't know if you are a user or not." });
        }

        if (!user) {
            return res.status(404).json({ message: "This user does not exist." });
        }

    });

    Trip.findById(req.params.id_trip).populate("driver").exec(function (err, trip) {

        if (err) {
            console.log(err);
            return res.status(503).send("Error retrieving data from database.");
        }

        if (!trip) {
            return res.status(404).send("404 Trip not found.");
        }

        if (trip.driver.id != req.token_user_id && !req.token_admin) {
            return res.status(403).json({ message: "Unauthorized Request" });
        }

        if (trip.numberOfSeatsAvailable > 0) {
            var index = trip.pendingPassengers.indexOf(req.body.passengerId);
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
            else {
                res.status(409).json({ message: "User did not reserve this trip." });
            }
        } else {
            res.status(202).json({ message: "Car has no seats available." });
        }
    });

});

router.patch('/:id_trip/cancel', verifyToken, function (req, res) {

    Trip.findById(req.params.id_trip).populate("driver").exec(function (err, trip) {

        if (err) {
            return res.status(503).json({ message: "Something went wrong with the database." });
        }

        if (!trip) {
            return res.status(404).json({ message: "Trip not found." });
        }

        if (!req.token_admin && (trip.driver.id != req.token_user_id)) {
            return res.status(403).json({ message: "Unauthorized request, only admins or the trip driver can cancel the trip." });
        }

        trip.status = 'CANCELED';
        trip.save(function (err) {

            if (err) {
                return res.status(503).json({ message: "Database error, we could not save the trip" });
            }

            res.status(200).json({ message: "Trip canceled successfully" });

        });

    });

});

router.patch('/:id_trip/reject_passenger', verifyToken, (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).send("Bad request, wrong attribute name.");
        return;
    }

    User.findById(req.body.passengerId, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "We can't know if you are an user or not." });
        }

        if (!user) {
            return res.status(404).json({ message: "This user does not exist." });
        }

    });

    Trip.findById(req.params.id_trip).populate("driver").exec(function (err, trip) {

        if (err) {
            console.log(err);
            return res.status(503).send("Error retrieving data from database.");
        }

        if (!trip) {
            return res.status(404).send("404 Trip not found.");
        }

        if (trip.driver.id != req.token_user_id && !req.token_admin) {
            return res.status(403).json({ message: "Unauthorized Request" });
        }

        var index = trip.pendingPassengers.indexOf(req.body.passengerId);
        
        if (index > -1) {
            trip.pendingPassengers.splice(index, 1);
            trip.save(function (err) {
                if (err) {
                    console.log(err);
                    res.status(503).send("Error saving data to database.");
                    return;
                }
                res.status(200).json(trip);
            });
        }
        else {
            res.status(409).json({ message: "User did not reserve this trip." });
        }
    });

});

router.patch('/:id_trip/cancel_reservation', verifyToken, (req, res) => {

    if (!req.body.passengerId) {
        res.status(400).json({ message: "Bad request, wrong attribute name." });
        return;
    }

    User.findById(req.body.passengerId, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "We can't know if you are an user or not." });
        }

        if (!user) {
            return res.status(404).json({ message: "This user does not exist." });
        }

    });

    Trip.findById(req.params.id_trip).exec(function (err, trip) {

        if (err) {
            console.log(err);
            return res.status(503).json({ message: "Error retrieving from database" });
        }

        if (!trip) {
            return res.status(404).json({ message: "Trip not found." });
        }


        var indexPending = trip.pendingPassengers.indexOf(req.body.passengerId);
        var indexPassengers = trip.passengers.indexOf(req.body.passengerId);

        if(indexPassengers > -1){
            trip.passengers.splice(indexPassengers, 1);
            trip.save(function (err) {
                if (err) {
                    console.log(err);
                    res.status(503).json({ message: "Error saving to database" });
                }
                res.status(200).json({message: "Reservation cancelled.", trip: trip});
            });
        }
        else{
            if (indexPending > -1) {
                trip.pendingPassengers.splice(indexPending, 1);
                trip.save(function (err) {
                    if (err) {
                        console.log(err);
                        res.status(503).json({ message: "Error saving to database" });
                    }
                    res.status(200).json({message: "Reservation cancelled.", trip: trip});
                });
            }
            else{
                res.status(409).json({ message: "User did not reserve this trip." });
            }
        }
        
    });

});

module.exports = router;