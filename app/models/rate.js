var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RateSchema = new Schema({

    //Who is evaluating
    evaluator: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "evaluator is required (id)."] },

    //Who is evaluated
    evaluated: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "evaluated is required (id)."] },

    //Trip they shared
    trip: { type: Schema.Types.ObjectId, ref: 'Trip', required: [true, "trip is required (id)."] },

    //1-5 rate
    rate: { type: Number, required: [true, "rate is required."], min: 0, max: 5 },


},
    {
        timestamps: true
    });

module.exports = mongoose.model('Rate', RateSchema);