// middlewares/errorHandler/index.js

const {
  InternalServerErrorException,
  HttpException,
  BadRequestException,
} = require("./exceptions");


/* =========================================================
   HELPERS
========================================================= */

/**
 * Detect Axios errors without importing Axios.
 */
function isAxiosError(error) {
  return Boolean(
    error?.isAxiosError ||
    error?.name === "AxiosError"
  );
}


/**
 * Safely extract upstream response.
 *
 * Never return:
 * - Axios config
 * - request headers
 * - X-App-Token
 * - Authorization
 * - passwords
 */
function getAxiosResponse(error) {
  const status =
    Number(
      error?.response?.status
    ) || 500;

  const upstreamData =
    error?.response?.data;

  /**
   * If Stakeholder already returned our standard format,
   * preserve it.
   */
  if (
    upstreamData &&
    typeof upstreamData === "object" &&
    !Array.isArray(upstreamData)
  ) {
    return {
      status,

      body: {
        success:
          upstreamData.success === undefined
            ? false
            : upstreamData.success,

        message:
          upstreamData.message ||
          "errors.request_failed",

        code:
          Number(
            upstreamData.code
          ) || status,

        errors:
          upstreamData.errors ??
          null,

        /**
         * Preserve optional safe response data
         * if your APIs use it.
         */
        ...(upstreamData.result !== undefined
          ? {
              result:
                upstreamData.result,
            }
          : {}),
      },
    };
  }


  return {
    status,

    body: {
      success: false,
      message:
        "errors.request_failed",
      code: status,
      errors: null,
    },
  };
}


/**
 * Safe logging.
 *
 * DO NOT console.error(error)
 * for Axios errors because it can expose:
 *
 * - X-App-Token
 * - Authorization
 * - request body
 * - encrypted passwords
 */
function logUnexpectedError(error) {
  console.error(
    "Unexpected Error:",
    {
      name:
        error?.name,

      message:
        error?.message,

      code:
        error?.code,

      status:
        error?.status ||
        error?.statusCode,

      stack:
        process.env.ENV === "dev"
          ? error?.stack
          : undefined,
    }
  );
}


/* =========================================================
   ERROR HANDLER WRAPPER
========================================================= */

const errorHandler = (
  method
) => {
  return async (
    req,
    res,
    next
  ) => {
    try {

      await method(
        req,
        res,
        next
      );

    } catch (error) {

      /* =====================================================
         1. OUR CUSTOM HTTP EXCEPTIONS
      ===================================================== */

      if (
        error instanceof
        HttpException
      ) {
        return next(
          error
        );
      }


      /* =====================================================
         2. MONGOOSE INVALID OBJECT ID
      ===================================================== */

      if (
        error?.name ===
          "CastError" &&
        error?.kind ===
          "ObjectId"
      ) {
        return next(
          new BadRequestException(
            "errors.invalidObjectId"
          )
        );
      }


      /* =====================================================
         3. MONGOOSE VALIDATION ERROR
      ===================================================== */

      if (
        error?.name ===
        "ValidationError"
      ) {
        const extraData =
          {};


        for (
          const [
            field,
            validationError,
          ] of Object.entries(
            error?.errors || {}
          )
        ) {
          extraData[field] =
            validationError
              ?.message ||
            "errors.validation_failed";
        }


        return next(
          new BadRequestException(
            "errors.validation_failed",
            extraData
          )
        );
      }


      /* =====================================================
         4. MONGODB DUPLICATE KEY
         error.code === 11000
      ===================================================== */

      if (
        error?.code === 11000
      ) {
        const duplicatedFields =
          Object.keys(
            error?.keyValue ||
            {}
          );


        const extraData =
          {};


        for (
          const field of
          duplicatedFields
        ) {
          extraData[field] =
            "errors.already_exists";
        }


        return next(
          new BadRequestException(
            "errors.duplicate_value",
            extraData
          )
        );
      }


      /* =====================================================
         5. INVALID JSON BODY
      ===================================================== */

      if (
        error instanceof
          SyntaxError &&
        error?.status === 400 &&
        "body" in error
      ) {
        return next(
          new BadRequestException(
            "errors.invalid_json"
          )
        );
      }


      /* =====================================================
         6. AXIOS / STAKEHOLDER HTTP RESPONSE ERROR
      ===================================================== */

      if (
        isAxiosError(
          error
        ) &&
        error?.response
      ) {
        const {
          status,
          body,
        } =
          getAxiosResponse(
            error
          );


        /**
         * Important:
         *
         * Stakeholder 400 -> Coach 400
         * Stakeholder 401 -> Coach 401
         * Stakeholder 403 -> Coach 403
         * Stakeholder 404 -> Coach 404
         * Stakeholder 422 -> Coach 422
         *
         * Do NOT convert these to 500.
         */

        return res
          .status(status)
          .json(body);
      }


      /* =====================================================
         7. AXIOS TIMEOUT
      ===================================================== */

      if (
        isAxiosError(
          error
        ) &&
        (
          error?.code ===
            "ECONNABORTED" ||
          error?.code ===
            "ETIMEDOUT"
        )
      ) {
        return res
          .status(504)
          .json({
            success: false,

            message:
              "errors.service_timeout",

            code: 504,

            errors: null,
          });
      }


      /* =====================================================
         8. AXIOS / UPSTREAM SERVICE UNAVAILABLE
      ===================================================== */

      if (
        isAxiosError(
          error
        ) &&
        error?.request &&
        !error?.response
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "errors.service_unavailable",

            code: 503,

            errors: null,
          });
      }


      /* =====================================================
         9. COMMON NETWORK ERRORS
      ===================================================== */

      if (
        [
          "ECONNREFUSED",
          "ECONNRESET",
          "EHOSTUNREACH",
          "ENETUNREACH",
          "ENOTFOUND",
        ].includes(
          error?.code
        )
      ) {
        return res
          .status(503)
          .json({
            success: false,

            message:
              "errors.service_unavailable",

            code: 503,

            errors: null,
          });
      }


      /* =====================================================
         10. UNEXPECTED ERROR
      ===================================================== */

      logUnexpectedError(
        error
      );


      return next(
        new InternalServerErrorException(
          "errors.internal_server_error"
        )
      );
    }
  };
};


module.exports =
  errorHandler;