
const express = require("express");
const router = express.Router({ mergeParams: true });
const mongoose = require("mongoose");

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

    const reqIn = new Date(checkIn);
    const reqOut = new Date(checkOut);

    if (isNaN(reqIn.getTime()) || isNaN(reqOut.getTime())) {
        req.flash("error", "Invalid booking dates.");
        return res.redirect(`/listings/${id}/book`);
    }

    const days =
        (reqOut - reqIn) /
        (1000 * 60 * 60 * 24);

    if (days <= 0) {
        req.flash("error", "Invalid booking dates.");
        return res.redirect(`/listings/${id}/book`);
    }

    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    const finalPrice =
        Number(pricePerNight) || listing.price;

    const totalPrice = days * finalPrice;

    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            // Step 1: Concurrency protection - acquire write lock on the listing document
            // This serializes concurrent booking attempts for this listing and prevents phantom writes/write skew.
            const lockedListing = await Listing.findOneAndUpdate(
                { _id: id },
                { $inc: { __v: 1 } },
                { session, new: true }
            );

            if (!lockedListing) {
                const err = new Error("Listing not found.");
                err.isNotFound = true;
                throw err;
            }

            // Step 2: Date overlap check within the transaction snapshot
            // Overlap condition: existing.checkIn < new.checkOut AND existing.checkOut > new.checkIn
            const overlappingBooking = await Booking.findOne({
                listing: id,
                checkIn: { $lt: reqOut },
                checkOut: { $gt: reqIn }
            }).session(session);

            if (overlappingBooking) {
                const err = new Error("Dates already booked.");
                err.isConflict = true;
                throw err;
            }

            // Step 3: Create booking inside the transaction
            await Booking.create([
                {
                    listing: id,
                    user: req.user._id,
                    checkIn: reqIn,
                    checkOut: reqOut,
                    totalPrice
                }
            ], { session });

            // Step 4: Transaction commits automatically on successful completion of callback
        });

        req.flash("success", "🎉 Booking confirmed!");
        return res.redirect(`/listings/${id}`);

    } catch (err) {
        if (err.isConflict) {
            req.flash("error", "Dates already booked.");
            return res.redirect(`/listings/${id}/book`);
        }
        if (err.isNotFound) {
            req.flash("error", "Listing not found.");
            return res.redirect("/listings");
        }
        console.error("Booking error:", err);
        req.flash("error", err.message || "Failed to complete booking.");
        return res.redirect(`/listings/${id}/book`);
    } finally {
        await session.endSession();
    }

});

module.exports = router;