// routes/client/client.route.js
const app = require("express").Router();
const clientController = require("../../controllers/client/auth.controller.js")
const { checkIdentity } = require("../../helpers/authorizer.helper.js");
const errorHandler = require("../../middlewares/errorHandler/index.js");

app.get("/", checkIdentity("_id"), errorHandler(clientController.getClient));

module.exports = app
