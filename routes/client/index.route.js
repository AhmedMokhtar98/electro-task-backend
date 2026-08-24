// routes/client/index.route.js

const express = require("express");
const app = express();
const authRoutes = require("./auth.route");
const clientRoutes = require("./client.route");
const checkToken = require("../../helpers/jwt.helper").verifyToken;
const allowedUsers = ["client"];


/* =========================================================
   PUBLIC AUTH
========================================================= */
app.use( "/auth", authRoutes );


/* =========================================================
   PROTECTED PROFILE
========================================================= */
app.use( "/profile", checkToken(allowedUsers), clientRoutes );

/* =========================================================
   PROTECTED client PROFILE
========================================================= */

app.use( checkToken(allowedUsers), clientRoutes );


module.exports = app;