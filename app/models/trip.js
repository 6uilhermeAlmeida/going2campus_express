var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var postExcept = ['stoppingAdresses', 'pendingPassengers', 'passengers', 'status'];

var TripSchema = new Schema({

    departureAdress: { type: String, required: [true, "departureAdress is required."] },
    destinationAdress: { type: String, required: [true, "destinationAdress is required."] },
    departureLatitude: { type: Number, required: [true, "departureLatitude is required."] },
    departureLongitude: { type: Number, required: [true, "departureLongitude is required."] },
    destinationLatitude: { type: Number, required: [true, "destinationLatitude is required."] },
    destinationLongitude: { type: Number, required: [true, "destinationLongitude is required."] },
    numberOfSeatsAvailable: { type: Number, required: [true, "numberOfSeatsAvailable is required."] },

    tripDate:
        {
            type: Date, required: [true, "tripDate is required, eg. 2012/12/31 14:30"],
            validate: {
                validator: function(v) {
                  return v > Date.now();
                },
                message: 'The date must be in the future.'
              }
        },

    duration: { type: Number, required: [true, "duration is required."] },
    driver: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "driver is required (id)."] },
    departure: { type: Boolean, required: [true, "departure is required, true or false."] },
    passengers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['LISTED', 'ONGOING', 'FINISHED', 'CANCELED'], default: 'LISTED' },
    stoppingAdresses: [String],
    autoAccept: { type: Boolean, required: [true, "autoAccept is required."] },
    pendingPassengers: [{ type: Schema.Types.ObjectId, ref: 'User' }]

},

    {
        timestamps: true
    }
);

TripSchema.statics.postMiddleware = function (req, res, next) {
    
    postExcept.forEach(function (path) {
        delete req.body[path];
    });

    next();

}



module.exports = mongoose.model('Trip', TripSchema);