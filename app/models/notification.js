var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var NotificationSchema = new Schema({

    //Who is notified
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "toUser is required (id)."] },

    //Who is evaluated
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "fromUser is required (id)."] },

    //Trip they share
    trip: { type: Schema.Types.ObjectId, ref: 'Trip' },

    //Notification message
    message: { type: String, required: [true, "message is required."] },

    //Is the notification active? (It will be false when the trip is finished)
    isActive: { type: Boolean, default : true },

    //Is the notification read? (at the GET we'll set this to false)
    isRead: { type: Boolean, default : false }


},
    {
        timestamps: true
    });



    NotificationSchema.statics.createNotification = function(toUser, fromUser, tripId, message){

        var notification = new this({
            toUser : toUser,
            fromUser : fromUser,
            trip : tripId,
            message : message
        });

        return notification.save()

    }

module.exports = mongoose.model('Notification', NotificationSchema);