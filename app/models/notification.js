var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var notificationTypes = {
    NEW_PASSENGER: 'NEW_PASSENGER',
    AWAITING_APPROVAL: 'AWAITING_APPROVAL',
    PASSENGER_ACCEPTED: 'PASSENGER_ACCEPTED',
    PASSENGER_PENDING: 'PASSENGER_PENDING',
    PASSENGER_REJECTED: 'PASSENGER_REJECTED',
    TRIP_CANCELED: 'TRIP_CANCELED',
    PASSENGER_CANCELED: 'PASSENGER_CANCELED',
    CUSTOM_MESSAGE: 'CUSTOM_MESSAGE'
  };

var NotificationSchema = new Schema({

    //Who is notified
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "toUser is required (id)."] },

    //Who is evaluated
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "fromUser is required (id)."] },

    //Trip they share
    trip: { type: Schema.Types.ObjectId, ref: 'Trip' },

    //Notification message
    message: { type: String },
    
    //Notification type
    type: { type: String, enum: notificationTypes.values , required: [true, "type is required."] },

    //Is the notification read? (at the GET we'll set this to false)
    isRead: { type: Boolean, default : false }


},
    {
        timestamps: true
    });



    NotificationSchema.statics.createNotification = function(toUser, fromUser, tripId, type){

        var notification = new this({
            toUser : toUser,
            fromUser : fromUser,
            trip : tripId,
            type : type
        });

        return notification.save();

    };

    NotificationSchema.statics.createCustomNotification = function(toUser, fromUser, tripId, type, message){

        var notification = new this({
            toUser : toUser,
            fromUser : fromUser,
            trip : tripId,
            type : type,
            message : message
        });

        return notification.save();

    };

    NotificationSchema.statics.notificationTypes = notificationTypes;

    
module.exports = mongoose.model('Notification', NotificationSchema);