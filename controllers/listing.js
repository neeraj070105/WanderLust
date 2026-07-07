const Listing = require("../models/listing");
const axios = require("axios");

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
};

module.exports.renderNewForm = (req, res) => {   // new route ko id route se upr rakhenge         
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let {id} = req.params;
    // iska mtlb h jbb bhi hmari listing DB se aygi to listing k saath saath uske sare reviews, owner ki information bhi sath sath aaygi
    const listing = await Listing.findById(id)
        .populate({
            path : "reviews", 
            populate : {
                path : "author",
            },
        })
        .populate("owner");
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", {listing});
};

module.exports.createListing = async(req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;

    let listing = req.body.Listing;

    // 🔥 API CALL (OpenCage)
    const geoData = await axios.get("https://api.opencagedata.com/geocode/v1/json", {
        params: {
            q: listing.location,
            key: "a67ab4e705534d478ad34593e62abf48"
        }
    });

    // ❌ agar location galat ho
    if (!geoData.data.results.length) {
        req.flash("error", "Invalid location");
        return res.redirect("/listings/new");
    }

    const coords = geoData.data.results[0].geometry;

    const newListing = new Listing(listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    // console.log("LOCATION:", listing.location);
    // console.log("COORDINATES:", coords);


    newListing.geometry = {
        type: "Point",
        coordinates: [coords.lng, coords.lat] // Delhi (temporary)
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    } 

    let originalImageUrl = listing.image.url;
    originalImageUrl  = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", {listing, originalImageUrl});
}; 

module.exports.updateListing = async (req, res) => {
    let {id} = req.params; 
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.Listing});

    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename };
        await listing.save();
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted");
    res.redirect("/listings");
};