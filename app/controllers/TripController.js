
var express = require('express');        // call express
var Trip = require('../models/trip');
var router = express.Router();              // get an instance of the express Router
var verifyToken = require('../auth/VerifyToken.js');
var User = require('../models/user');
var Rate = require('../models/rate');
var Notification = require('../models/notification');

const notificationTypes = Notification.notificationTypes;


router.route('/')

    .post([verifyToken, Trip.postMiddleware], function (req, res) {

        var trip = new Trip(req.body);
        trip.driver = req.token_user_id;

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
                    return res.status(400).json({
                        errors: errors
                    });
                } else {

                    return res.status(503).json({ message: "Database error." });

                }

            }

            return res.status(200).json(trip);

        });

    })

    .get(function (req, res) {

        var oneMeterToCoordinates = 0.000009 * 0.001
        var radius = 200 * oneMeterToCoordinates
        var minuteTolerance = 0;
        var sortBy = 'tripDate';

        if (req.query.radius) {
            radius = Number(req.query.radius) * oneMeterToCoordinates;
        }

        if (req.query.minuteTolerance) {
            minuteTolerance = req.query.minuteTolerance;
        }

        if (req.query.sortBy) {
            sortBy = req.query.sortBy;
        }

        var query = Trip.find();

        if (req.query.departureAddress) {

            query
                .where('departureAddress')
                .regex(new RegExp(req.query.departureAddress, 'i'))

        }

        if (req.query.destinationAddress) {

            query
                .where('destinationAddress')
                .regex(new RegExp(req.query.destinationAddress, 'i'))

        }

        if (req.query.tripDate) {

            var tripDate = new Date(req.query.tripDate)

            query
                .where('tripDate')
                .gte(new Date(tripDate - (minuteTolerance * 60 * 1000)))
                .lte(new Date(tripDate.getTime() + (minuteTolerance * 60 * 1000)))

        } else {

            query
                .where('tripDate')
                .gte(new Date())
                .where('status')
                .ne('CANCELED')
        }

        if (req.query.numberOfSeatsAvailable) {

            query
                .where('numberOfSeatsAvailable')
                .gte(req.query.numberOfSeatsAvailable)

        }

        if (req.query.isFromCampus) {

            query
                .where('isFromCampus')
                .equals(req.query.isFromCampus)

        }

        if (req.query.departureLatitude) {

            query
                .where('departureLatitude')
                .gte(Number(req.query.departureLatitude) - radius)
                .lte(Number(req.query.departureLatitude) + radius)

        }

        if (req.query.departureLongitude) {

            query
                .where('departureLongitude')
                .gte(Number(req.query.departureLongitude) - radius)
                .lte(Number(req.query.departureLongitude) + radius)

        }

        if (req.query.destinationLatitude) {

            query
                .where('destinationLatitude')
                .gte(Number(req.query.destinationLatitude) - radius)
                .lte(Number(req.query.destinationLatitude) + radius)

        }

        if (req.query.destinationLongitude) {

            query
                .where('destinationLongitude')
                .gte(Number(req.query.destinationLongitude) - radius)
                .lte(Number(req.query.destinationLongitude) + radius)

        }

        query
            .populate('driver')
            .populate('pendingPassengers')
            .populate('passengers')
            .sort({ sortBy: 'asc' })
            .exec(function (err, trips) {
                if (err) {
                    console.log(err)
                    return res.status(503).json(err);

                } else {
                    return res.json(trips);
                }
            })

    });

router.patch('/:id_trip/add_passenger', verifyToken, (req, res) => {

    var passengerMessage;
    var driverMessage;

    if (!req.body.passengerId) {
        return res.status(400).json({ message: "Bad request, wrong attribute name." });
    }

    if (req.body.passengerId != req.token_user_id && !req.token_admin) {
        return res.status(403).json({ message: "Unauthorized Request." });
    }

    User.findById(req.body.passengerId, function (err, user) {

        if (err) {
            return res.status(503).json({ message: "We can't know if you are a user or not." });
        }

        if (!user) {
            return res.status(404).json({ message: "This user does not exist." });
        }

    });

    Trip.findById(req.params.id_trip)
        .populate('passengers driver pendingPassengers')
        .exec(function (err, trip) {

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


            if (trip.pendingPassengers.map(function (user) { return user.id; }).indexOf(req.body.passengerId) > -1 || 
            trip.passengers.map(function (user) { return user.id; }).indexOf(req.body.passengerId) > -1) {
                return res.status(409).json({ message: "This user is already listed for this trip." });
            }


            if (trip.numberOfSeatsAvailable > 0) {

                if (trip.autoAccept) {

                    trip.passengers.push(req.body.passengerId);
                    trip.numberOfSeatsAvailable--;
                    passengerMessage = notificationTypes.PASSENGER_ACCEPTED;
                    driverMessage = notificationTypes.NEW_PASSENGER;

                } else {

                    trip.pendingPassengers.push(req.body.passengerId);
                    passengerMessage = notificationTypes.AWAITING_APPROVAL;
                    driverMessage = notificationTypes.PASSENGER_PENDING;


                }

                trip.save()
                    .then(function (tripSaved) {

                        Notification.createNotification(req.body.passengerId, trip.driver, trip.id, passengerMessage)
                            .then(function (notification) {

                                if (!notification) {

                                    return res.status(503).json({ message: 'Database error.' });
                                }

                            })
                            .then(function () {

                                Notification.createNotification(trip.driver, req.body.passengerId, trip.id, driverMessage)
                                    .then(function (notification) {

                                        if (!notification) {

                                            return res.status(503).json({ message: 'Database error.' });
                                        }

                                    })
                                    .then(function () {

                                        tripSaved.populate('passengers pendingPassengers', function (err) {

                                            if (err) {
                                                return res.status(503).json({ message: 'Database error.' });
                                            }

                                            return res.status(200).json(tripSaved);

                                        });


                                    });
                            })
                            .catch(function (err) {

                                if (err) {
                                    console.log(err);
                                    return res.status(503).json({ message: 'Database error.' });

                                }

                            });

                    })
                    .catch(function (err) {


                        if (err) {
                            console.log(err);
                            return res.status(503).send("Error saving data to database.");

                        }

                    });

            } else {

                return res.status(202).json({ message: "This car has no seats available." });

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
            return res.status(503).json({ message: "Error retrieving data from database." });
        }

        if (!trip) {
            return res.status(404).send({ message: "Trip not found." });
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

                trip.save()
            
                    .then(function (tripSaved) {
                        Notification.createNotification(req.body.passengerId, trip.driver.id, trip.id, notificationTypes.PASSENGER_ACCEPTED)
                        .then(function (notification) {

                            if (!notification) {

                                return res.status(503).json({ message: 'Database error.' });
                            }

                        })
                        .then(function () {

                            tripSaved.populate('passengers pendingPassengers', function (err) {
    
                                if (err) {
                                    return res.status(503).json({ message: 'Database error.' });
                                }
    
                                return res.status(200).json(tripSaved);
                            });
                        });
                    })

                    
                    .catch(function (err) {

                        if (err) {
                            console.log(err);
                            return res.status(503).json({ message: 'Database error.' });

                        }

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

    Trip.findById(req.params.id_trip).populate("driver passengers").exec(function (err, trip) {

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

            trip.passengers.forEach(passenger => {
                Notification.createNotification(passenger.id, trip.driver.id, trip.id, notificationTypes.TRIP_CANCELED);
            });

            
            if (req.token_user_id === trip.driver.id) {
                
                User.findByIdAndUpdate(trip.driver.id, {$inc : {cancelCounter : 1}}, function (err, user) {
                    
                    if (err) {
                        console.log(err);
                        res.status(err.errorStatus).json(err);
                    }

                });

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
            
            trip.save()
            
            .then(function (tripSaved) {
                Notification.createNotification(req.body.passengerId, trip.driver.id, trip.id, notificationTypes.PASSENGER_REJECTED)
                .then(function (notification) {

                    if (!notification) {

                        return res.status(503).json({ message: 'Database error.' });
                    }

                })
                .then(function () {

                    tripSaved.populate('passengers pendingPassengers', function (err) {
    
                        if (err) {
                            return res.status(503).json({ message: 'Database error.' });
                        }
    
                        return res.status(200).json(tripSaved);
                    });
                });
            })
            .catch(function (err) {

                if (err) {
                    console.log(err);
                    return res.status(503).json({ message: 'Database error.' });

                }

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
        

        if (indexPassengers > -1) {
            trip.passengers.splice(indexPassengers, 1);

            trip.save()      
            .then(function (tripSaved) {
                
                Notification.createNotification(trip.driver.id, req.body.passengerId, trip.id, notificationTypes.NEW_PASSENGER)
                .then(function (notification) {

                    if (!notification) {

                        return res.status(503).json({ message: 'Database error.' });
                    }

                })
                .then(function () {

                    tripSaved.populate('passengers pendingPassengers', function (err) {
    
                        if (err) {
                            return res.status(503).json({ message: 'Database error.' });
                        }
    
                        res.status(200).json({ message: "Reservation cancelled.", trip: tripSaved });
                    });
                });
            })

            .catch(function (err) {

                if (err) {
                    console.log(err);
                    return res.status(503).json({ message: 'Database error.' });

                }

            });

        }
        else {
            if (indexPending > -1) {
                trip.pendingPassengers.splice(indexPending, 1);
                trip.save(function (err) {
                    if (err) {
                        console.log(err);
                        res.status(503).json({ message: "Error saving to database" });
                    }
                    res.status(200).json({ message: "Reservation cancelled.", trip: trip });
                });
            }
            else {
                res.status(409).json({ message: "User did not reserve this trip." });
            }
        }

    });

});

router.patch('/:id_trip/rate', verifyToken, function (req, res) {

    Trip.findById(req.params.id_trip, function (err, trip) {

        if (err) {

            //Log db errors.
            console.log(err);
            return res.status(503).json({ message: "Something went wrong with our database." });

        }

        if (!trip) {

            //Trip not found. 404
            return res.status(404).json({ message: "This trip does not exist." });

        }

        if (trip.passengers.indexOf(req.body.user) < 0 && trip.driver != req.body.user) {

            //Bad request! The user sent does not belong to this trip.
            return res.status(404).json({ message: "Make sure the user belongs to this trip!" });

        }

        if (req.body.user == req.token_user_id) {

            //How to spot a troll.
            return res.status(403).json({ message: "You can't rate yourself!" });

        }

        if (req.body.rate < 0 && req.body.rate > 5) {

            return res.status(400).json({ message: "Rate must be between 0 and 5." });
        }


        //At this point, our user is valid but let's see if he exists at all!
        User.findById(req.body.user, function (err, user) {

            if (err) {

                //Log db errors.
                console.log(err);
                return res.status(503).json({ message: "Something went wrong with our database." });

            }


            if (!user) {

                //404
                return res.status(404).json({ message: "User with the id " + req.body.user + "does not exist." });

            }

            if (!user.active) {

                //This user is not active, so no rates for you!
                return res.status(403).json({ message: "This user is inactive!" });

            }

            //Save this rate!
            var evaluated = user.id;
            var evaluator = req.token_user_id;
            var givenRate = Number(req.body.rate);

            Rate.findOne(
                {
                    evaluated: evaluated,
                    evaluator: evaluator,
                    trip: trip.id

                }, function (err, rate) {

                    if (err) {

                        //Log db errors.
                        console.log(err);
                        return res.status(503).json({ message: "Something went wrong with our database." });

                    }

                    if (!rate) {

                        //Create one
                        rate = new Rate();
                        rate.evaluated = evaluated;
                        rate.evaluator = evaluator;
                        rate.trip = trip.id;

                        //Facebook algorithm here. 
                        user.rating = ((user.numberOfRates * user.rating) + givenRate) / (user.numberOfRates + 1);
                        user.numberOfRates++;

                    } else {

                        user.rating = (((user.numberOfRates * user.rating) + givenRate - rate.rate))/ (user.numberOfRates);

                    }

                    rate.rate = givenRate;

                    user.save(function (err) {

                        if (err) {

                            //*NIKE SLOGAN*
                            console.log(err);
                            return res.status(503).json({ message: "Something went wrong with our database." });

                        }

                        //Save the rate
                        rate.save(function (err) {

                        if (err) {

                            //do the thing.
                            console.log(err);
                            return res.status(503).json({ message: "Something went wrong with our database." });

                        }

                        
                        //HOORAY!
                        return res.status(200).json({ message: "Your rates were saved!" });

                    });

                    });

                });



        });

    });

});

router.get('/destination/:lat/:lon/:radius', verifyToken, (req, res) => {

    let estimatedRadiusInDegrees = (req.params.radius / 1000) / 111;

    let minLat = Number(req.params.lat) - estimatedRadiusInDegrees;
    let maxLat = Number(req.params.lat) + estimatedRadiusInDegrees;

    let minLon = Number(req.params.lon) - estimatedRadiusInDegrees;
    let maxLon = Number(req.params.lon) + estimatedRadiusInDegrees;

    Trip.find()
        .where('destinationLatitude').gte(minLat).lte(maxLat)
        .where('destinationLongitude').gte(minLon).lte(maxLon)
        .sort({ 'tripDate': 'asc' })
        .populate('driver')
        .populate('pendingPassengers')
        .populate('passengers')
        .exec(function (err, trips) {
            if (err) {
                console.log(err);
                res.status(503).json({ message: "Error accessing database" });
            }

            res.status(200).json(trips);

        });
});

router.get('/departure/:lat/:lon/:radius', verifyToken, (req, res) => {

    let estimatedRadiusInDegrees = (req.params.radius / 1000) / 111;

    let minLat = Number(req.params.lat) - estimatedRadiusInDegrees;
    let maxLat = Number(req.params.lat) + estimatedRadiusInDegrees;

    let minLon = Number(req.params.lon) - estimatedRadiusInDegrees;
    let maxLon = Number(req.params.lon) + estimatedRadiusInDegrees;

    Trip.find()
        .where('departureLatitude').gte(minLat).lte(maxLat)
        .where('departureLongitude').gte(minLon).lte(maxLon)
        .sort({ 'tripDate': 'asc' })
        .populate('driver')
        .populate('pendingPassengers')
        .populate('passengers')
        .exec(function (err, trips) {
            if (err) {
                console.log(err);
                res.status(503).json({ message: "Error accessing database" });
            }

            res.status(200).json(trips);

        });
});

router.get('/from/:lat_departure/:lon_departure/to/:lat_destination/:lon_destination/:radius/:day/:month', verifyToken, (req, res) => {

    let estimatedRadiusInDegrees = (req.params.radius / 1000) / 111;

    let minLatDeparture = Number(req.params.lat_departure) - estimatedRadiusInDegrees;
    let maxLatDeparture = Number(req.params.lat_departure) + estimatedRadiusInDegrees;
    let minLonDeparture = Number(req.params.lon_departure) - estimatedRadiusInDegrees;
    let maxLonDeparture = Number(req.params.lon_departure) + estimatedRadiusInDegrees;

    let minLatDestination = Number(req.params.lat_destination) - estimatedRadiusInDegrees;
    let maxLatDestination = Number(req.params.lat_destination) + estimatedRadiusInDegrees;
    let minLonDestination = Number(req.params.lon_destination) - estimatedRadiusInDegrees;
    let maxLonDestination = Number(req.params.lon_destination) + estimatedRadiusInDegrees;

    Trip.find()
        .where('departureLatitude').gte(minLatDeparture).lte(maxLatDeparture)
        .where('departureLongitude').gte(minLonDeparture).lte(maxLonDeparture)
        .where('destinationLatitude').gte(minLatDestination).lte(maxLatDestination)
        .where('destinationLongitude').gte(minLonDestination).lte(maxLonDestination)
        .sort({ 'tripDate': 'asc' })
        .populate('driver')
        .populate('pendingPassengers')
        .populate('passengers')
        .exec(function (err, trips) {
            if (err) {
                console.log(err);
                res.status(503).json({ message: "Error accessing database" });
            }

            res.status(200).json(trips);

        });
});

router.route('/:id_trip/users/:id_userTo/notify')
    .post(function (req, res, next) {

        if (!req.body.message) {
            return res.status(400).json({message : "Bad request, must have a 'message' field."});
        }

        Trip.findById(req.params.id_trip, function (err, trip) {
            
            if (err) {
                console.log(err);
                return res.status(503).json(err);
            }

            if (!trip) {
                return res.status(404).json({message: "Trip not found"});
            }

            if (trip.passengers.indexOf(req.params.id_userTo) < 0 &&
                trip.pendingPassengers.indexOf(req.params.id_userTo) < 0 && 
                trip.driver != req.params.id_userTo) {
                return res.status(400).json({message : "This user is not in this trip."});
            }

            next();

        });
    })
    .post(verifyToken, function (req, res) {

        User.findById(req.params.id_userTo, function (err, user) {

            if (err) {
                console.log(err);
                return res.status(503).json(err);
            }
            if (!user) {
                return res.status(404).json({ message: "User not found." });
            }

            Notification
                .createCustomNotification(req.params.id_userTo, req.token_user_id, req.params.id_trip, notificationTypes.CUSTOM_MESSAGE, req.body.message)
                .then(function (notification) {
                    notification
                    .populate('trip', function (err) {
                        if (err) {
                            console.log(err);
                            return res.status(503).json(err);
                        }
                        
                        return res.status(200).json(notification);
                    });
                })
                .catch(function (err) {
                    console.log(err);
                    return res.status(503).json(err);
                });
        });
    });



module.exports = router;