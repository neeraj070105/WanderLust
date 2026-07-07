const express = require("express");
const router = express.Router();

// yha hum double dot use krna pdega kyounki hum parent directory k pss ja rhe h 
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const {isLoggedIn} = require("../middleware.js");
const {isOwner, validateListing } = require("../middleware.js"); 

const listingController = require("../controllers/listing.js");
const multer  = require('multer');
const {storage} = require("../cloudConfig.js");
// const upload = multer({ dest: 'uploads/' });  // yha hum multer ka storage option use kr rhe h kyounki hume file ko cloudinary pe upload krna h , agar hum dest use krte to file local folder me save hoti
const upload = multer({ storage });   // multer ka use file upload krne k liye hota h  , yha hum cloudinary k storage ko use kr rhe h
// Router.route
router 
    .route("/")
    .get(wrapAsync (listingController.index))
    .post( 
        isLoggedIn, 
        upload.single("Listing[image]"), 
        validateListing,
        wrapAsync (listingController.createListing),
    );
    

// New Route   -> "/new" vle ko id vle route se upr rakhna pdega 
router.get("/new", isLoggedIn, listingController.renderNewForm );


router.get("/search", async (req, res) => {
  const search = req.query.q;

  if (!search || search.trim() === "") {
    return res.redirect("/listings");
  }

  const listings = await Listing.find({
    $or: [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } }
    ]
  });

  if (listings.length === 0) {
    req.flash("error", "No listings found!");
    return res.redirect("/listings");
  }

  res.render("listings/index", { allListings: listings });
});


router.
    route("/:id") 
    .get(wrapAsync (listingController.showListing))
    .put(    // -> Update
        isLoggedIn, 
        isOwner,
        upload.single("Listing[image]"),
        validateListing,
        wrapAsync (listingController.updateListing)
    )
    .delete(
        isLoggedIn, 
        isOwner,
        wrapAsync (listingController.destroyListing)
    );


// Edit Route
router.get(
    "/:id/edit", 
    isLoggedIn, 
    isOwner, 
    wrapAsync (listingController.renderEditForm)
);



module.exports = router;