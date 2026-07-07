const express = require("express");
const router = express.Router({ mergeParams : true });
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const razorpay = require("../utils/razorpay");


// Book form
router.get("/:id/book", async (req, res) => {
    if (!req.user) {
        req.flash("error", "You must be logged in to book a listing.");
        return res.redirect("/login");
    }

    const { id } = req.params;
    const listing = await Listing.findById(id);
    const bookings = await Booking.find({ listing: listing._id });

    res.render("bookings/new.ejs", {
        listing,
        listingId: listing._id,
        bookedDates: bookings,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
});





// Create booking
router.post("/:id/book", async (req, res) => {

    if (!req.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/login");
    }

    const { id } = req.params;

    // payment k liye extra fields add kiye hain
    const {
        checkIn,
        checkOut,
        pricePerNight,
        paymentMethod,
        paymentStatus,
        paymentId
    } = req.body;


    const listing = await Listing.findById(id);

    const overlappingBooking = await Booking.findOne({
        listing: id,
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) }
    });

    if (overlappingBooking) {
        req.flash("error", "Dates already booked.");
        return res.redirect(`/listings/${id}/book`);
    }

    const days =
    (new Date(checkOut) - new Date(checkIn))
    / (1000 * 60 * 60 * 24);

    if (days <= 0) {
        req.flash("error", "Invalid booking dates.");
        return res.redirect(`/listings/${id}/book`);
    }

    // IMPORTANT FIX
    const finalPrice =
        Number(pricePerNight) || listing.price;

    const totalPrice = days * finalPrice;


    // Payment details bhi save karne hain
    await Booking.create({
        listing: id,
        user: req.user._id,
        checkIn,
        checkOut,
        totalPrice,

        paymentMethod,
        paymentStatus,
        paymentId
    });


    req.flash("success", "🎉 Booking confirmed!");
    res.redirect(`/listings/${id}`);

});


// Razorpay order creation
router.post("/create-order", async (req, res) => {
    try {

        const amount = req.body.amount;

        const options = {
            amount: amount * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);

        res.json(order);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Order failed" });
    }
});

module.exports = router;