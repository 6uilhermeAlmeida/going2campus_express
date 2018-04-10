var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TripSchema = new Schema({

        startingAdress: String,
        endingAdress: String,
        numberOfSeatsAvailable: Number,
        tripDate: Date,
        driver: String,
        departure: Boolean,
        passengers: [String],
        status: Number,
        stoppingAdresses: [String],
        auto_accept: Boolean,
        pendingPassengers: [String]

    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model('Trip', TripSchema);