const mongoose = require("mongoose");
const axios = require("axios");
const Listing = require("./models/listing");

mongoose.connect("mongodb://127.0.0.1:27017/wanderlust")
  .then(() => console.log("DB connected"))
  .catch(err => console.log(err));

async function fixListings() {
  const listings = await Listing.find({});

  for (let listing of listings) {

    // 👉 skip agar already geometry hai
    if (listing.geometry && listing.geometry.coordinates.length > 0) {
      continue;
    }

    try {
      const geoData = await axios.get("https://api.opencagedata.com/geocode/v1/json", {
        params: {
          q: listing.location,
          key: "a67ab4e705534d478ad34593e62abf48"
        }
      });

      if (!geoData.data.results.length) {
        console.log("❌ Invalid:", listing.title);
        continue;
      }

      const coords = geoData.data.results[0].geometry;

      listing.geometry = {
        type: "Point",
        coordinates: [coords.lng, coords.lat]
      };

      await listing.save();

      console.log("✅ Fixed:", listing.title);

    } catch (err) {
      console.log("Error:", listing.title);
    }
  }

  console.log("🔥 ALL DONE!");
}

fixListings();