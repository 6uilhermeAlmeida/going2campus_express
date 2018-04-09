var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var UserSchema = new Schema({

    mail: {type: String, index: {unique:true}},

    name: String,
    password: String,
    rating: Number,
    numberOfRates: Number,
    preferences:[String],
    birthDate: Date,
    photo_url: String,
    cancel_index: Number,

    trips:[String],



});