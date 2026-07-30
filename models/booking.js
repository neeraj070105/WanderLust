

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({

    // Booked Listing
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },

    // User who booked the listing
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // Check-In Date
    checkIn: {
        type: Date,
        required: true
    },

    // Check-Out Date
    checkOut: {
        type: Date,
        required: true
    },

    // Total Booking Price
    totalPrice: {
        type: Number,
        required: true
    },

    // Booking Created At
    bookedAt: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model("Booking", bookingSchema);