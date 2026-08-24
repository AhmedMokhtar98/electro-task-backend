//Stackholder routes/client/auth.route.js
const app = require("express").Router();
const authController = require("../../controllers/client/auth.controller.js");
const validator = require("../../helpers/validation.helper.js")
const errorHandler = require("../../middlewares/errorHandler/index.js");
const { registerValidation, loginValidation, emailCheckValidation, verifyOtpValidation, forgotPasswordValidation, resetPasswordValidation, refreshTokenValidation, sendOtpValidation } = require("../../validations/client.validation.js");

app.post('/login', validator(loginValidation), errorHandler(authController.login));
app.post('/register', validator(registerValidation), errorHandler(authController.register));
// app.post('/logout', checkToken(allowedUsers), checkIdentity("_id"), validator(logoutValidation), errorHandler(authController.logout));

app.post('/email-verify', validator(verifyOtpValidation), errorHandler(authController.confirmEmail));
app.post('/email-verify/otp-resend', validator(sendOtpValidation), errorHandler(authController.resendEmailConfirmationOTP));

app.post('/password/forgot', validator(forgotPasswordValidation), errorHandler(authController.forgotPassword));// Forgot password route 
app.post('/password/reset', validator(resetPasswordValidation), errorHandler(authController.resetPassword));// Forgot password route 

app.post('/refresh-token', validator(refreshTokenValidation), errorHandler(authController.refreshToken));// Forgot password route 

module.exports = app