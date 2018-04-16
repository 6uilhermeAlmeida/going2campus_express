var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TripSchema = new Schema({

    startingAdress: String,
    endingAdress: String,
    numberOfSeatsAvailable: Number,
    tripDate: Date,
    duration: Number,
    driver: { type: Schema.Types.ObjectId, ref: 'User' },
    departure: Boolean,
    passengers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: Number,
    stoppingAdresses: [String],
    auto_accept: Boolean,
    pendingPassengers: [{ type: Schema.Types.ObjectId, ref: 'User' }]

},

    {
        timestamps: true
    }
);

module.exports = mongoose.model('Trip', TripSchema);