// routes/client/index.route.js

const express = require("express");
const app = express();
const authRoutes = require("./auth.route");
const clientRoutes = require("./client.route");
const tasksRoutes = require("./task.route");
const checkToken = require("../../helpers/jwt.helper").verifyToken;
const allowedUsers = ["client"];


/* =========================================================
   PUBLIC AUTH
========================================================= */
app.use( "/auth", authRoutes );

/* =========================================================
   PROTECTED ROUTES
========================================================= */
app.use( "/", checkToken(allowedUsers), clientRoutes );
app.use( "/tasks", checkToken(allowedUsers), tasksRoutes );




module.exports = app;