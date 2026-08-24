// routes/client/client.route.js
const app = require("express").Router();
const clientController = require("../../controllers/client/auth.controller.js")
const errorHandler = require("../../middlewares/errorHandler/index.js");
const validator = require("../../helpers/validation.helper.js");
const { updateProfileValidation } = require("../../validations/client.validation.js");

app.get("/profile",  errorHandler(clientController.getClient));
app.put("/profile", validator(updateProfileValidation), errorHandler(clientController.updateClient));

module.exports = app
