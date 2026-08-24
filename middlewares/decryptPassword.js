// middlewares/decryptPasswordMiddleware.js

const CryptoJS = require("crypto-js");


/* =========================================================
   CONFIG
========================================================= */

const SECRET_KEY_ENCRYPTION =
  process.env.SECRET_KEY_ENCRYPTION;

const ENV =
  process.env.ENV || "dev";


/**
 * Routes that should NOT decrypt password fields
 * inside Coach Backend.
 *
 * These requests are forwarded to Stakeholder Backend,
 * which is responsible for decrypting the password.
 */
const SKIP_DECRYPT_PATHS = [
  "/api/v1/admin/login",
  "/api/v1/admin/password/forgot",
  "/api/v1/admin/password/reset"
];


/* =========================================================
   SHOULD SKIP DECRYPTION
========================================================= */

function shouldSkipDecryption(req) {
  const currentPath =
    String(req.originalUrl || req.url || "")
      .split("?")[0];

  return SKIP_DECRYPT_PATHS.includes(
    currentPath
  );
}


/* =========================================================
   AES PASSPHRASE DECRYPTION
========================================================= */

function decryptAesPassphrase(
  cipherText
) {
  if (
    typeof cipherText !== "string" ||
    !cipherText.trim()
  ) {
    throw new Error(
      "CIPHERTEXT_EMPTY_OR_NOT_STRING"
    );
  }

  if (!SECRET_KEY_ENCRYPTION) {
    throw new Error(
      "SECRET_KEY_ENCRYPTION_NOT_CONFIGURED"
    );
  }

  /*
   * When x-www-form-urlencoded is used,
   * "+" may become " ".
   */

  const normalized =
    cipherText
      .trim()
      .replace(/ /g, "+");


  const bytes =
    CryptoJS.AES.decrypt(
      normalized,
      SECRET_KEY_ENCRYPTION
    );


  const plain =
    bytes.toString(
      CryptoJS.enc.Utf8
    );


  if (!plain) {
    throw new Error(
      "BAD_CIPHERTEXT_OR_KEY"
    );
  }


  return plain;
}


/* =========================================================
   DECRYPT PASSWORD FIELDS RECURSIVELY
========================================================= */

function decryptPasswordsDeep(
  value
) {
  if (value === null || value === undefined) {
    return value;
  }


  /* =======================================================
     ARRAYS
  ======================================================= */

  if (Array.isArray(value)) {
    return value.map(
      decryptPasswordsDeep
    );
  }


  /* =======================================================
     OBJECTS
  ======================================================= */

  if (
    typeof value === "object"
  ) {
    for (
      const key of Object.keys(
        value
      )
    ) {
      const currentValue =
        value[key];


      /*
       * Password field
       */

      if (
        key
          .toLowerCase()
          .includes("password")
      ) {
        if (
          typeof currentValue ===
          "string"
        ) {
          value[key] =
            decryptAesPassphrase(
              currentValue
            );
        }

        continue;
      }


      /*
       * Continue recursively.
       */

      value[key] =
        decryptPasswordsDeep(
          currentValue
        );
    }


    return value;
  }


  /* =======================================================
     PRIMITIVES
  ======================================================= */

  return value;
}


/* =========================================================
   MIDDLEWARE
========================================================= */

function decryptPasswordMiddleware(
  req,
  res,
  next
) {
  try {

    /* =====================================================
       SKIP PROXY AUTH ROUTES
    ===================================================== */

    if (
      shouldSkipDecryption(req)
    ) {
      return next();
    }


    /* =====================================================
       NO BODY
    ===================================================== */

    if (
      !req.body ||
      typeof req.body !== "object"
    ) {
      return next();
    }


    /* =====================================================
       DECRYPT
    ===================================================== */

    decryptPasswordsDeep(
      req.body
    );


    return next();

  } catch (err) {

    /*
     * Do not expose keys/passwords.
     */

    return res.status(400).json({
      success: false,

      message:
        "Invalid encrypted password",

      error:
        err.message,
    });
  }
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = decryptPasswordMiddleware;