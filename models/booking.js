const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    // dates
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: true
    },

    // price related (later calculate karenge)
    totalPrice: {
        type: Number,
        default: 0
    },

    // 🔥 Payment Method
    paymentMethod: {
        type: String,
        enum: ["Razorpay", "Pay Later"],
        default: "Pay Later"
    },

    // 🔥 Payment Status
    paymentStatus: {
        type: String,
        enum: ["Pending", "Paid", "Failed"],
        default: "Pending"
    },

    // 🔥 Razorpay Payment ID
    paymentId: {
        type: String,
        default: null
    },

    bookedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Booking", bookingSchema);
