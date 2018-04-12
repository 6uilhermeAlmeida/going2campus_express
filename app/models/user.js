var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({

        mail: {
            type: String,
            index: {unique: true},
            required : true,
            match: [/\S+@\S+\.\S+/, 'is invalid'],
            
        },

        name: {type : String, required : true},
        password: {type : String, required : true, select : false},
        rating: {type : Number, default : 0},
        numberOfRates: {type : Number, default : 0},
        preferences: [String],
        birthDate: {type : Date, required : true},
        photo_url: String,
        cancel_index: {type : Number, default : 0},
        trips: [String],
    },

    {
        timestamps: true
    }
);

module.exports = mongoose.model('User', UserSchema);