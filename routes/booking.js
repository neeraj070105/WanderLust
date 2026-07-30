
const express = require("express");
const router = express.Router({ mergeParams: true });

const Booking = require("../models/booking");
const Listing = require("../models/listing");

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
        bookedDates: bookings
    });

});


// Create booking
router.post("/:id/book", async (req, res) => {

    if (!req.user) {
        req.flash("error", "You must be logged in.");
        return res.redirect("/login");
    }

    const { id } = req.params;

    const {
        checkIn,
        checkOut,
        pricePerNight
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
        (new Date(checkOut) - new Date(checkIn)) /
        (1000 * 60 * 60 * 24);

    if (days <= 0) {
        req.flash("error", "Invalid booking dates.");
        return res.redirect(`/listings/${id}/book`);
    }

    const finalPrice =
        Number(pricePerNight) || listing.price;

    const totalPrice = days * finalPrice;

    await Booking.create({
        listing: id,
        user: req.user._id,
        checkIn,
        checkOut,
        totalPrice
    });

    req.flash("success", "🎉 Booking confirmed!");
    res.redirect(`/listings/${id}`);

});

module.exports = router;