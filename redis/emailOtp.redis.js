// ./emailOtp.redis.js
"use strict";

const crypto = require("crypto");
const bcrypt = require("bcrypt");

const { connectRedis } = require("./redis.config");
const {
  sendOTPPasswordResetEmailToClient,
  sendOTPEmailConfirmationToClient,
} = require("../helpers/emailService.helper");

const {
  BadRequestException,
} = require("../middlewares/errorHandler/exceptions");

const OTP_PURPOSES = Object.freeze({
  PASSWORD_RESET: "password_reset",
  EMAIL_CONFIRMATION: "email_confirmation",
});

const OTP_TTL_SECONDS = Number(process.env.OTP_TTL_SECONDS || 600);
const OTP_RESEND_SECONDS = Number(process.env.OTP_RESEND_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const OTP_SALT_ROUNDS = Number(process.env.OTP_SALT_ROUNDS || 10);

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeOTP(otp) {
  return String(otp || "").trim().replace(/\s+/g, "");
}

function validatePurpose(purpose) {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    throw new BadRequestException("errors.invalid_otp_purpose");
  }
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

function otpKey(email, purpose) {
  return `otp:${purpose}:${normalizeEmail(email)}`;
}

function resendKey(email, purpose) {
  return `otp:resend:${purpose}:${normalizeEmail(email)}`;
}

async function sendEmailByPurpose({
  email,
  otp,
  purpose,
  lang,
}) {
  if (purpose === OTP_PURPOSES.PASSWORD_RESET) {
    return sendOTPPasswordResetEmailToClient({
      email,
      otp,
      lang,
      expiresInMinutes: Math.ceil(OTP_TTL_SECONDS / 60),
    });
  }

  if (purpose === OTP_PURPOSES.EMAIL_CONFIRMATION) {
    return sendOTPEmailConfirmationToClient({
      email,
      otp,
      lang,
      expiresInMinutes: Math.ceil(OTP_TTL_SECONDS / 60),
    });
  }

  throw new BadRequestException("errors.invalid_otp_purpose");
}

// ============================
// Send email OTP
// ============================

exports.sendEmailOTP = async ({
  email,
  purpose,
  lang = "en",
}) => {
  const normalizedEmail = normalizeEmail(email);

  validatePurpose(purpose);

  if (!normalizedEmail) {
    throw new BadRequestException("errors.requiredEmail");
  }

  const redis = await connectRedis();

  const currentResendKey = resendKey(normalizedEmail, purpose);
  const resendBlocked = await redis.exists(currentResendKey);

  if (resendBlocked) {
    const retryAfter = await redis.ttl(currentResendKey);

    const error = new BadRequestException(
      "errors.otp_resend_too_soon"
    );

    error.retryAfter = Math.max(retryAfter, 0);

    throw error;
  }

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, OTP_SALT_ROUNDS);
  const currentOTPKey = otpKey(normalizedEmail, purpose);

  await redis
    .multi()
    .hSet(currentOTPKey, {
      otpHash,
      attempts: "0",
    })
    .expire(currentOTPKey, OTP_TTL_SECONDS)
    .set(currentResendKey, "1", {
      EX: OTP_RESEND_SECONDS,
    })
    .exec();

  try {
    const emailResult = await sendEmailByPurpose({
      email: normalizedEmail,
      otp,
      purpose,
      lang,
    });

    if (emailResult?.success === false) {
      throw new Error("Email provider failed to send OTP");
    }
  } catch (error) {
    await redis.del(currentOTPKey, currentResendKey);
    throw error;
  }

  // Never return the OTP in an API response.
  if (
    String(process.env.NODE_ENV || "").toLowerCase() !==
    "production"
  ) {
    console.log("📩 Email OTP (development only):", {
      email: normalizedEmail,
      purpose,
      otp,
    });
  }

  return {
    success: true,
    code: 200,
    message: "success.otp_sent",
    result: {
      email: normalizedEmail,
      purpose,
      expiresIn: OTP_TTL_SECONDS,
      resendAfter: OTP_RESEND_SECONDS,
    },
  };
};

// ============================
// Verify email OTP
// ============================

exports.verifyEmailOTP = async ({
  email,
  purpose,
  otp,
  consume = false,
}) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOTP = normalizeOTP(otp);

  validatePurpose(purpose);

  if (!normalizedEmail) {
    throw new BadRequestException("errors.requiredEmail");
  }

  if (!normalizedOTP) {
    throw new BadRequestException("errors.requiredOtp");
  }

  const redis = await connectRedis();
  const currentOTPKey = otpKey(normalizedEmail, purpose);

  const otpData = await redis.hGetAll(currentOTPKey);

  if (!otpData?.otpHash) {
    throw new BadRequestException(
      "errors.invalid_or_expired_otp"
    );
  }

  const attempts = Number(otpData.attempts || 0);

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(currentOTPKey);

    throw new BadRequestException(
      "errors.otp_attempts_exceeded"
    );
  }

  const matches = await bcrypt.compare(
    normalizedOTP,
    otpData.otpHash
  );

  if (!matches) {
    const currentAttempts = await redis.hIncrBy(
      currentOTPKey,
      "attempts",
      1
    );

    if (currentAttempts >= OTP_MAX_ATTEMPTS) {
      await redis.del(currentOTPKey);

      throw new BadRequestException(
        "errors.otp_attempts_exceeded"
      );
    }

    throw new BadRequestException(
      "errors.invalid_or_expired_otp"
    );
  }

  if (consume) {
    await redis.del(currentOTPKey);
  }

  return {
    success: true,
    code: 200,
    result: {
      verified: true,
      purpose,
    },
    message: "success.otp_verified",
  };
};

// ============================
// Consume OTP
// ============================

exports.consumeEmailOTP = async ({
  email,
  purpose,
  otp,
}) => {
  return exports.verifyEmailOTP({
    email,
    purpose,
    otp,
    consume: true,
  });
};

exports.OTP_PURPOSES = OTP_PURPOSES;