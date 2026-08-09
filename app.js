if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

// console.log(process.env.SECRET);

const express = require("express");
const app = express();
const mongoose = require("mongoose");


// const Listing = require("./models/listing.js");         
const path = require("path");  // ejs k liye 
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate"); 
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
// const { listingSchema, reviewSchema } = require("./schema.js");   // joi api
// const Review = require("./models/review.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const bookingRouter = require("./routes/booking");
const offerRouter = require("./routes/offer");
const Booking = require("./models/booking");
const Listing = require("./models/listing");
const Offer = require("./models/offer.js");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended : true }));  // 4
app.use(methodOverride("_method"));
app.use(express.json());
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: process.env.MONGO_URL,
    crypto: {
        secret: process.env.SESSION_SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store: store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};


app.use(session(sessionOptions));
app.use(flash());
passport.use(new LocalStrategy(User.authenticate()));

app.use(passport.initialize());
app.use(passport.session());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const MONGO_URL = process.env.MONGO_URL;

main() 
    .then(() => {
        console.log("connected to DB ");
    })
    .catch(err => {
        console.log(err)
    });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});


// Express Router
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/listings", bookingRouter);
app.use("/listings", offerRouter);



app.get("/bookings/:id/cancel", async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }

    const { id } = req.params;

    // sirf apni booking cancel kar sake
    await Booking.findOneAndDelete({
        _id: id,
        user: req.user._id
    });

    req.flash("success", "❌ Booking cancelled successfully.");
    res.redirect("/bookings");
});


app.get("/bookings", async (req, res) => {
    // simple safety check (optional but necessary)
    if (!req.user) {
        return res.redirect("/login");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // pure date compare ke liye

    const bookings = await Booking.find({
        user: req.user._id,
        checkOut: { $gte: today }
    })
        .populate("listing")
        .populate("user")
        .sort({ checkIn: 1 }); // nearest booking first

    res.render("bookings/index.ejs", { bookings });
});




// Offer Inbox
app.get("/offers/inbox", async (req, res) => {
  try {
    if (!req.user) {
      req.flash("error", "Please login first");
      return res.redirect("/login");
    }

    const offers = await Offer.find({ owner: req.user._id })
      .populate("listing")
      .populate("buyer");

    res.render("offers/inbox", { offers });

  } catch (err) {
    console.log("INBOX ERROR 👉", err);
    req.flash("error", "Cannot load inbox");
    res.redirect("/");
  }
});


// owner Acceptance Offer
app.post("/offers/:id/accept", async (req, res) => {
  const { id } = req.params;

  try {
    await Offer.findByIdAndUpdate(id, {
      status: "accepted"
    });

    req.flash("success", "Offer accepted successfully");
    res.redirect("/offers/inbox");
  } catch (err) {
    console.log("ACCEPT ERROR 👉", err);
    req.flash("error", "Could not accept offer");
    res.redirect("/offers/inbox");
  }
});

// owner Rejected Offer
app.post("/offers/:id/reject", async (req, res) => {
  const { id } = req.params;

  try {
    await Offer.findByIdAndUpdate(id, {
      status: "rejected"
    });

    req.flash("error", "Offer rejected");
    res.redirect("/offers/inbox");
  } catch (err) {
    console.log("REJECT ERROR 👉", err);
    req.flash("error", "Could not reject offer");
    res.redirect("/offers/inbox");
  }
});

// User Offers
app.get("/offers/myOffers", async (req, res) => {
  if (!req.user) {
    req.flash("error", "Please login first");
    return res.redirect("/login");
  }

  const myOffers = await Offer.find({ buyer: req.user._id })
    .populate("listing");

  res.render("offers/myOffers.ejs", { myOffers });
});


app.use((err, req, res, next) => {
    let {statusCode = 500, message = "Something went wrong"} = err;
    res.status(statusCode).render("listings/error.ejs", { err });
    // res.status(statusCode).send(message);
});

app.listen(8080, () => {
    console.log("Serving is listening to port 8080");
});