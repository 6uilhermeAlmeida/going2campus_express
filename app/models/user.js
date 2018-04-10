var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({

        mail: {
            type: String,
            index: {unique: true},
            required : true
        },

        name: {type : String, required : true},
        password: {type : String, required : true},
        rating: {type : Number, default : 0},
        numberOfRates: {type : Number, default : 0},
        preferences: [String],
        birthDate: {type : Date, required : true},
        photo_url: String,
        cancel_index: Number,
        trips: [String],
        token: String,
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', UserSchema);