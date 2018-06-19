var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var postExcept = ['numberOfRates', 'admin', 'active', 'cancelCounter', 'cancelCounter', 'rating', 'photoUrl', 'blocked'];

var UserSchema = new Schema({

    mail: {
        type: String,
        index: { unique: true },
        required: [true, 'Mail is required.'],
        match: [/\S+@\S+\.\S+/, 'Mail provided is invalid.'],

    },

    name: { type: String, required: [true, 'Name is required.'] },
    password: { type: String, required: [true, 'Password is required.'], select: false },
    rating: { type: Number, default: 0 , min: 0, max: 5},
    numberOfRates: { type: Number, default: 0 },
    preferences: [String],
    birthDate: { type: Date, required: [true, 'Birth date is required.'] },
    photoUrl: String,
    //cancelIndex: { type: Number, default: 0 },
    //trips: { type: [String], select: false },
    admin: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    cancelCounter: { type: Number, default: 0 }
},

    {
        timestamps: true
    }
);

UserSchema.statics.postMiddleware = function (req, res, next) {
    
    postExcept.forEach(function (path) {
        delete req.body[path];
    });
    next();

};

module.exports = mongoose.model('User', UserSchema);