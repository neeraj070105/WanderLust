const express = require("express");
const router = express.Router({ mergeParams : true });
const Listing = require("../models/listing");
const Offer = require("../models/offer");


// Make offer form
router.get("/:id/offer", async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  res.render("offers/make", { listing });
});


// Create offer
router.post("/:id/offer", async (req, res) => {
  const { id } = req.params;
  try {
    console.log("REQ BODY:", req.body);

    const { offeredPrice, message } = req.body;

    if (!req.user) {
      req.flash("error", "Please login first");
      return res.redirect("/login");
    }

    if (!offeredPrice) {
      req.flash("error", "Offer price is required");
      return res.redirect(`/listings/${id}/offer`);
    }

    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/");
    }

    await Offer.create({
      listing: id,
      buyer: req.user._id,
      owner: listing.owner,
      offeredPrice,
      message
    });

    req.flash("success", "Offer sent to owner successfully");
    res.redirect(`/listings/${id}`);

  } catch (err) {
    console.log(err);
    req.flash("error", "Something went wrong");
    res.redirect(`/listings/${id}`);
  }
});


// ==========================================
// 3. BOOK NOW PAGE
// ONLY IF OFFER ACCEPTED
// GET /listings/:id/offers/:offerId/book
// ==========================================
// ==========================================
// BOOK NOW PAGE FOR ACCEPTED OFFER
// ==========================================
router.get("/:id/offers/:offerId/book", async (req, res) => {

    const { id, offerId } = req.params;

    try {

        const listing = await Listing.findById(id);

        const offer = await Offer.findById(offerId);

        if (!listing || !offer) {
            req.flash("error", "Offer not found");
            return res.redirect("/listings");
        }

        if (offer.status !== "accepted") {
            req.flash("error", "Offer not accepted");
            return res.redirect("/listings");
        }

        res.render("bookings/offerNew", {
            listing,
            listingId: id,
            offerPrice: offer.offeredPrice
        });

    } catch (err) {
        console.log(err);
        req.flash("error", "Something went wrong");
        res.redirect("/listings");
    }

});




module.exports = router;