// validations/client.validation.js

"use strict";

const Joi = require("joi");

const joiOptions = {
  abortEarly: false,
  allowUnknown: false,
  stripUnknown: false,
  convert: true,
};

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;
const OTP_LENGTH = 6;

// ============================
// Reusable schemas
// ============================

const emailSchema = Joi.string()
  .trim()
  .lowercase()
  .email({
    minDomainSegments: 2,
    tlds: { allow: false },
  })
  .max(254)
  .required()
  .messages({
    "string.base": "errors.validEmail",
    "string.empty": "errors.emptyEmail",
    "string.email": "errors.validEmail",
    "string.max": "errors.emailTooLong",
    "any.required": "errors.requiredEmail",
  });

const nameSchema = ({
  requiredKey,
  emptyKey,
  invalidKey,
  minKey,
  maxKey,
}) =>
  Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[\p{L}\p{M}' -]+$/u)
    .required()
    .messages({
      "string.base": invalidKey,
      "string.empty": emptyKey,
      "string.min": minKey,
      "string.max": maxKey,
      "string.pattern.base": invalidKey,
      "any.required": requiredKey,
    });

const passwordSchema = Joi.string()
  /*
   * Do not use .trim() on passwords because spaces could be
   * intentional characters.
   */
  .min(PASSWORD_MIN_LENGTH)
  .custom((value, helpers) => {
    if (Buffer.byteLength(value, "utf8") > PASSWORD_MAX_BYTES) {
      return helpers.error("password.maxBytes");
    }

    if (!/[a-z]/.test(value)) {
      return helpers.error("password.lowercase");
    }

    if (!/[A-Z]/.test(value)) {
      return helpers.error("password.uppercase");
    }

    if (!/\d/.test(value)) {
      return helpers.error("password.number");
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
      return helpers.error("password.specialCharacter");
    }

    return value;
  }, "Password security validation")
  .required()
  .messages({
    "string.base": "errors.validPassword",
    "string.empty": "errors.emptyPassword",
    "string.min": "errors.passwordTooShort",
    "any.required": "errors.requiredPassword",

    "password.maxBytes": "errors.passwordTooLong",
    "password.lowercase": "errors.passwordLowercaseRequired",
    "password.uppercase": "errors.passwordUppercaseRequired",
    "password.number": "errors.passwordNumberRequired",
    "password.specialCharacter":
      "errors.passwordSpecialCharacterRequired",
  });

const loginPasswordSchema = Joi.string()
  .min(1)
  .required()
  .messages({
    "string.base": "errors.validPassword",
    "string.empty": "errors.emptyPassword",
    "string.min": "errors.emptyPassword",
    "any.required": "errors.requiredPassword",
  });

const otpSchema = Joi.string()
  .trim()
  .length(OTP_LENGTH)
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    "string.base": "errors.validOtp",
    "string.empty": "errors.emptyOtp",
    "string.length": "errors.validOtp",
    "string.pattern.base": "errors.validOtp",
    "any.required": "errors.requiredOtp",
  });

const refreshTokenSchema = Joi.string()
  .trim()
  .min(1)
  .required()
  .messages({
    "string.base": "errors.validRefreshToken",
    "string.empty": "errors.emptyRefreshToken",
    "string.min": "errors.emptyRefreshToken",
    "any.required": "errors.requiredRefreshToken",
  });

// ============================
// Export validations
// ============================

module.exports = {
  // ============================
  // Authenticated profile update
  // ============================

  updateProfileValidation: {
    body: Joi.object({
      firstName: nameSchema({
        requiredKey: "errors.requiredFirstName",
        emptyKey: "errors.emptyFirstName",
        invalidKey: "errors.validFirstName",
        minKey: "errors.firstNameTooShort",
        maxKey: "errors.firstNameTooLong",
      }).optional(),

      lastName: nameSchema({
        requiredKey: "errors.requiredLastName",
        emptyKey: "errors.emptyLastName",
        invalidKey: "errors.validLastName",
        minKey: "errors.lastNameTooShort",
        maxKey: "errors.lastNameTooLong",
      }).optional(),

      oldPassword: Joi.string()
        .min(1)
        .max(PASSWORD_MAX_BYTES)
        .optional()
        .messages({
          "string.base": "errors.validPassword",
          "string.empty": "errors.emptyPassword",
          "string.min": "errors.emptyPassword",
          "string.max": "errors.passwordTooLong",
        }),

      newPassword: passwordSchema.optional(),
    })
      .min(1)
      .and("oldPassword", "newPassword")
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.min": "errors.empty_profile_update",
        "object.and": "errors.password_fields_together",
        "object.unknown": "errors.field_not_allowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Register
  // ============================

  registerValidation: {
    body: Joi.object({
      firstName: nameSchema({
        requiredKey: "errors.requiredFirstName",
        emptyKey: "errors.emptyFirstName",
        invalidKey: "errors.validFirstName",
        minKey: "errors.firstNameTooShort",
        maxKey: "errors.firstNameTooLong",
      }),

      lastName: nameSchema({
        requiredKey: "errors.requiredLastName",
        emptyKey: "errors.emptyLastName",
        invalidKey: "errors.validLastName",
        minKey: "errors.lastNameTooShort",
        maxKey: "errors.lastNameTooLong",
      }),

      email: emailSchema,

      password: passwordSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Login
  // ============================

  loginValidation: {
    body: Joi.object({
      email: emailSchema,
      password: loginPasswordSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Forgot password
  // Sends a password-reset OTP
  // ============================

  forgotPasswordValidation: {
    body: Joi.object({
      email: emailSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Send password-reset OTP
  // ============================

  sendOtpValidation: {
    body: Joi.object({
      email: emailSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Verify password-reset OTP
  // ============================

  verifyOtpValidation: {
    body: Joi.object({
      email: emailSchema,
      otp: otpSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Reset password
  // ============================

  resetPasswordValidation: {
    body: Joi.object({
    token: Joi.string()
      .trim()
      .min(20)
      .max(4096)
      .pattern(
        /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
      )
      .required()
      .messages({
        "string.base":
          "errors.invalid_reset_token",

        "string.empty":
          "errors.required_reset_token",

        "string.min":
          "errors.invalid_reset_token",

        "string.max":
          "errors.invalid_reset_token",

        "string.pattern.base":
          "errors.invalid_reset_token",

        "any.required":
          "errors.required_reset_token",
      }),

    newPassword: Joi.string()
      /*
       * Do not use .trim() because it would
       * modify the password supplied by the user.
       */
      .min(8)
      .custom((value, helpers) => {
        if (
          Buffer.byteLength(value, "utf8") >
          72
        ) {
          return helpers.error(
            "password.maxBytes"
          );
        }

        if (!/[a-z]/.test(value)) {
          return helpers.error(
            "password.lowercase"
          );
        }

        if (!/[A-Z]/.test(value)) {
          return helpers.error(
            "password.uppercase"
          );
        }

        if (!/\d/.test(value)) {
          return helpers.error(
            "password.number"
          );
        }

        if (!/[^A-Za-z0-9]/.test(value)) {
          return helpers.error(
            "password.special"
          );
        }

        return value;
      }, "Password security validation")
      .required()
      .messages({
        "string.base":
          "errors.validPassword",

        "string.empty":
          "errors.emptyPassword",

        "string.min":
          "errors.passwordTooShort",

        "any.required":
          "errors.requiredPassword",

        "password.maxBytes":
          "errors.passwordTooLong",

        "password.lowercase":
          "errors.passwordLowercaseRequired",

        "password.uppercase":
          "errors.passwordUppercaseRequired",

        "password.number":
          "errors.passwordNumberRequired",

        "password.special":
          "errors.passwordSpecialCharacterRequired",
      }),
  })
    .required()
    .unknown(false)
    .messages({
      "object.base":
        "errors.validRequestBody",

      "object.unknown":
        "errors.fieldNotAllowed",

      "any.required":
        "errors.requiredRequestBody",
    }),
  },

  // ============================
  // Refresh access token
  // ============================

  refreshTokenValidation: {
    body: Joi.object({
      refreshToken: refreshTokenSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Resend email-confirmation OTP
  // ============================

  sendEmailConfirmationOtpValidation: {
    body: Joi.object({
      email: emailSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Confirm email
  // ============================

  confirmEmailValidation: {
    body: Joi.object({
      email: emailSchema,
      otp: otpSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },

  // ============================
  // Check email
  // ============================

  emailCheckValidation: {
    body: Joi.object({
      email: emailSchema,
    })
      .required()
      .options(joiOptions)
      .messages({
        "object.base": "errors.validRequestBody",
        "object.unknown": "errors.fieldNotAllowed",
        "any.required": "errors.requiredRequestBody",
      }),
  },
};
