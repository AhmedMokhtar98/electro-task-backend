// models/client/client.repo.js

"use strict";

const Client = require("./client.model");
const jwtHelper = require("../../helpers/jwt.helper");

const {
  sendEmailOTP,
  verifyEmailOTP,
  consumeEmailOTP,
  OTP_PURPOSES,
} = require("../../redis/emailOtp.redis");

const {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} = require("../../middlewares/errorHandler/exceptions");
const { sendPasswordResetEmailToClient } = require("../../helpers/emailService.helper");

// ============================
// Internal helpers
// ============================

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function sanitizeClient(client) {
  const result =
    typeof client?.toObject === "function"
      ? client.toObject()
      : { ...client };

  delete result.password;
  delete result.passwordChangedAt;

  return result;
}

function createTokenPayload(client) {
  return {
    _id: client._id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    role: "client",
  };
}

async function assertEmailUnique(email) {
  const existingClient = await Client.findOne({
    email,
  })
    .select({ _id: 1 })
    .lean();

  if (existingClient) {
    throw new ConflictException(
      "errors.email_exists"
    );
  }
}

function isResendCooldownError(error) {
  return (
    error?.message ===
      "errors.otp_resend_too_soon" ||
    error?.messageKey ===
      "errors.otp_resend_too_soon"
  );
}

// ============================
// Get authenticated client
// ============================

exports.getClient = async (clientId) => {
  const client = await Client.findById(clientId)
    .select("-password")
    .lean();

  if (!client) {
    throw new NotFoundException(
      "errors.client_not_found"
    );
  }

  return {
    success: true,
    code: 200,
    result: {
      client: sanitizeClient(client),
    },
    message: "success.operation_successful",
  };
};

// ============================
// Update authenticated client
// ============================

exports.updateClient = async (clientId, formObject = {}) => {
  const client = await Client.findById(clientId).select("+password");

  if (!client) {
    throw new NotFoundException("errors.client_not_found");
  }

  if (formObject.oldPassword && formObject.newPassword) {
    const passwordMatches = await client.comparePassword(
      formObject.oldPassword
    );

    if (!passwordMatches) {
      throw new BadRequestException("errors.password_incorrect");
    }

    client.password = formObject.newPassword;
    client.passwordChangedAt = new Date();
  }

  if (formObject.firstName !== undefined) {
    client.firstName = formObject.firstName;
  }

  if (formObject.lastName !== undefined) {
    client.lastName = formObject.lastName;
  }

  await client.save();

  const token = jwtHelper.generateToken(createTokenPayload(client));

  return {
    success: true,
    code: 200,
    result: {
      client: sanitizeClient(client),
      token,
    },
    message: "success.profile_updated",
  };
};

// ============================
// Register
// ============================

exports.register = async (formObject = {}) => {
  const email = normalizeEmail(
    formObject.email
  );

  await assertEmailUnique(email);

  let client;

  try {
    client = await Client.create({
      firstName: formObject.firstName,
      lastName: formObject.lastName,
      email,
      password: formObject.password,
      role: "client",
      isEmailVerified: false,
    });
  } catch (error) {
    if (
      error?.code === 11000 &&
      error?.keyPattern?.email
    ) {
      throw new ConflictException(
        "errors.email_exists"
      );
    }

    throw error;
  }

  await sendEmailOTP({
    email: client.email,
    purpose:
      OTP_PURPOSES.EMAIL_CONFIRMATION,
    lang: formObject.lang || "en",
  });

  return {
    success: true,
    code: 201,
    result: {
      client: sanitizeClient(client),
      emailVerificationRequired: true,
    },
    message: "success.client_registered",
  };
};

// ============================
// Login
// ============================

exports.login = async (formObject = {}) => {
  const email = normalizeEmail(
    formObject.email
  );

  const password = formObject.password;
  const lang = formObject.lang || "en";

  if (!email || !password) {
    throw new UnauthorizedException(
      "errors.invalid_credentials"
    );
  }
  const client = await Client.findOne({ email, }).select("+password");

  // Prevent exposing whether an email exists.
  if (!client) {
    throw new UnauthorizedException(
      "errors.invalid_credentials"
    );
  }

  const passwordMatches =
    await client.comparePassword(password);

  if (!passwordMatches) {
    throw new UnauthorizedException(
      "errors.invalid_credentials"
    );
  }

  if (!client.isEmailVerified) {
    let otpSent = false;
    let retryAfter = null;

    try {
      await sendEmailOTP({
        email: client.email,
        purpose:
          OTP_PURPOSES.EMAIL_CONFIRMATION,
        lang,
      });

      otpSent = true;
    } catch (error) {
      /*
       * Logging in again during the resend
       * cooldown should still return the
       * email-not-verified response.
       */
      if (isResendCooldownError(error)) {
        retryAfter =
          error?.retryAfter || null;
      } else {
        throw error;
      }
    }

    const verificationError =
      new ForbiddenException(
        otpSent
          ? "errors.email_not_verified_otp_sent"
          : "errors.email_not_verified"
      );

    verificationError.result = {
      email: client.email,
      emailVerified: false,
      otpSent,
      retryAfter,
    };

    throw verificationError;
  }

  const payload = createTokenPayload(client);

  const token = jwtHelper.generateToken(payload);
  return {
    success: true,
    code: 200,
    result: {
      client: sanitizeClient(client),
      token,
    },
    message: "success.login_successful",
  };
};

// ============================
// Forgot password
// ============================

exports.forgotPassword = async ( email ) => {
  const normalizedEmail = normalizeEmail(email);
  const client = await Client.findOne({ email: normalizedEmail, }) .select({ _id: 1, firstName: 1, email: 1, }) .lean();
  if (!client) { return { success: true, code: 200, message: "success.password_reset_link_sent", }; }
  const resetToken = jwtHelper.generatePasswordResetToken({ _id: client._id, email: client.email, });
  const frontendURL = String( process.env.FRONTEND_URL || "" ) .trim() .replace(/\/+$/, ""); if (!frontendURL) { throw new Error( "FRONTEND_URL_NOT_CONFIGURED" ); }
  const resetLink = `${frontendURL}/reset-password?token=` + encodeURIComponent(resetToken);
  const emailResult = await sendPasswordResetEmailToClient({ email: client.email, firstName: client.firstName, resetLink, expiresInMinutes: 15, });

  console.log("emailResult", emailResult)
  if (!emailResult?.success) {
    throw new Error(
      "PASSWORD_RESET_EMAIL_FAILED"
    );
  }

  return {
    success: true,
    code: 200,
    message:
      "success.password_reset_link_sent",
  };
};

// ============================
// Resend password-reset OTP
// ============================

exports.sendOTP = async (
  email,
  lang = "en"
) => {
  return exports.forgotPassword(
    email,
    lang
  );
};

// ============================
// Verify password-reset OTP
// ============================

exports.verifyOTP = async (
  email,
  otp
) => {
  const normalizedEmail =
    normalizeEmail(email);

  return verifyEmailOTP({
    email: normalizedEmail,
    otp,
    purpose:
      OTP_PURPOSES.PASSWORD_RESET,
    consume: false,
  });
};

// ============================
// Reset password
// ============================
 
exports.resetPassword = async ( resetToken, newPassword ) => {
  const token = String( resetToken || "" ).trim();

  if (!token) {
    throw new UnauthorizedException(
      "errors.missing_password_reset_token"
    );
  }

  const decoded = jwtHelper.verifyPasswordResetToken( token );

  const client = await Client.findOne({
    _id: decoded._id,
    email: normalizeEmail(decoded.email),
  }).select(
    "+password +passwordChangedAt"
  );

  if (!client) {
    throw new UnauthorizedException(
      "errors.invalid_or_expired_reset_token"
    );
  }

  /*
   * Reject a reset token issued before the
   * most recent password change.
   */
  if (client.passwordChangedAt) {
    const tokenIssuedAt =
      Number(decoded.iat) * 1000;

    const passwordChangedAt =
      new Date(
        client.passwordChangedAt
      ).getTime();

    if (
      tokenIssuedAt <=
      passwordChangedAt
    ) {
      throw new UnauthorizedException(
        "errors.invalid_or_expired_reset_token"
      );
    }
  }

  client.password = newPassword;
  client.passwordChangedAt =
    new Date();

  // Runs the pre-save bcrypt middleware.
  await client.save();

  return {
    success: true,
    code: 200,
    message: "success.password_reset",
  };
};

// ============================
// Resend email-confirmation OTP
// ============================

exports.resendEmailConfirmationOTP = async (email) => {
    const normalizedEmail =
      normalizeEmail(email);

    const client =
      await Client.findOne({
        email: normalizedEmail,
      })
        .select({
          _id: 1,
          email: 1,
          isEmailVerified: 1,
        })
        .lean();

    if (!client) {
      throw new NotFoundException(
        "errors.client_not_found"
      );
    }

    if (client.isEmailVerified) {
      throw new ConflictException(
        "errors.email_already_verified"
      );
    }

    const otpResult =
      await sendEmailOTP({
        email: client.email,
        purpose:
          OTP_PURPOSES.EMAIL_CONFIRMATION,
      });

    return {
      success: true,
      code: 200,
      result: {
        email: client.email,
        expiresIn:
          otpResult?.result?.expiresIn ||
          null,
        resendAfter:
          otpResult?.result?.resendAfter ||
          null,
      },
      message:
        "success.email_confirmation_otp_resent",
    };
  };

// Backward-compatible alias.
exports.sendEmailConfirmationOTP =
  exports.resendEmailConfirmationOTP;

// ============================
// Verify email-confirmation OTP
// ============================

exports.verifyEmailConfirmationOTP =
  async (email, otp) => {
    const normalizedEmail =
      normalizeEmail(email);

    const client =
      await Client.findOne({
        email: normalizedEmail,
      })
        .select({
          _id: 1,
          isEmailVerified: 1,
        })
        .lean();

    if (!client) {
      throw new NotFoundException(
        "errors.client_not_found"
      );
    }

    if (client.isEmailVerified) {
      throw new ConflictException(
        "errors.email_already_verified"
      );
    }

    return verifyEmailOTP({
      email: normalizedEmail,
      otp,
      purpose:
        OTP_PURPOSES.EMAIL_CONFIRMATION,
      consume: false,
    });
  };

// ============================
// Confirm email
// ============================

exports.confirmEmail = async (
  email,
  otp
) => {
  const normalizedEmail =
    normalizeEmail(email);

  /*
   * Check the client before consuming the
   * OTP so a valid code isn't unnecessarily
   * removed.
   */
  const existingClient = await Client.findOne({ email: normalizedEmail, }) .select({ _id: 1, isEmailVerified: 1, }) .lean();

  if (!existingClient) {
    throw new NotFoundException(
      "errors.client_not_found"
    );
  }

  if (existingClient.isEmailVerified) {
    throw new ConflictException(
      "errors.email_already_verified"
    );
  }

  await consumeEmailOTP({
    email: normalizedEmail,
    otp,
    purpose:
      OTP_PURPOSES.EMAIL_CONFIRMATION,
  });

  const client =
    await Client.findOneAndUpdate(
      {
        _id: existingClient._id,
        isEmailVerified: false,
      },
      {
        $set: {
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

  if (!client) {
    throw new ConflictException(
      "errors.email_already_verified"
    );
  }

  return {
    success: true,
    code: 200,
    result: {
      client: sanitizeClient(client),
    },
    message: "success.email_verified",
  };
};

// ============================
// Refresh token
// ============================

exports.refreshToken = async (
  refreshToken
) => {
  if (!refreshToken) {
    throw new UnauthorizedException(
      "errors.refresh_token_required"
    );
  }

  return jwtHelper.refreshAccessToken(
    refreshToken
  );
};
