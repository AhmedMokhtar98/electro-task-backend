// server.js  ✅ FULL CLEAN VERSION

const express = require("express");
const connectDB = require("./config/db.js");
const dotenv = require("dotenv");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const i18n = require("./config/i18n");
const errorMiddleware = require("./middlewares/errorHandler/errorMiddleware.js");
const { ForbiddenException } = require("./middlewares/errorHandler/exceptions");
const routes = require("./routes/index.route.js");
const session = require("express-session");
const decryptPasswordMiddleware = require("./middlewares/decryptPassword.js");
const translateResponseMiddleware = require("./middlewares/errorHandler/translate-response.middleware.js");
// Redis
const {
  connectRedis,
  disconnectRedis,
  redisClient,
} = require("./redis/redis.config.js");
dotenv.config();
const app = express();
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "200kb";
const urlencodedBodyLimit = process.env.URLENCODED_BODY_LIMIT || "200kb";
const requiredAppToken = process.env.X_APP_TOKEN_SECRET || "";

function readPositiveInteger(name, fallback) {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsedValue;
}

const rateLimitConfig = {
  api: {
    windowMs: readPositiveInteger("API_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    limit: readPositiveInteger("API_RATE_LIMIT_MAX", 300),
  },
  auth: {
    windowMs: readPositiveInteger("AUTH_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    limit: readPositiveInteger("AUTH_RATE_LIMIT_MAX", 20),
  },
};

const authLimitedPaths = ["/client/auth"];

function configureTrustProxy() {
  const trustProxy = process.env.TRUST_PROXY?.trim();

  if (!trustProxy || trustProxy === "false") {
    return;
  }

  if (trustProxy === "true") {
    app.set("trust proxy", 1);
    return;
  }

  const hopCount = Number(trustProxy);
  app.set(
    "trust proxy",
    Number.isSafeInteger(hopCount) && hopCount >= 0 ? hopCount : trustProxy
  );
}

configureTrustProxy();
app.disable("x-powered-by");

function isAuthLimitedPath(req) {
  const requestPath = req.path;

  return authLimitedPaths.some((routePath) =>
    requestPath === routePath || requestPath.startsWith(`${routePath}/`)
  );
}

function requireAppToken(req, res, next) {
  const appToken = req.headers["x-app-token"];
  if (appToken === requiredAppToken) {
    return next();
  }

  return next(new ForbiddenException("Invalid x-app-token header"));
}

function sendRateLimitResponse(message) {
  return (req, res) =>
    res.status(429).json({
      success: false,
      message,
      code: 429,
      errors: null,
    });
}

function createRateLimiters() {
  const sendCommand = (...args) => redisClient.sendCommand(args);
  const sharedOptions = {
    standardHeaders: "draft-8",
    legacyHeaders: false,
  };

  return {
    apiLimiter: rateLimit({
      ...sharedOptions,
      ...rateLimitConfig.api,
      store: new RedisStore({
        sendCommand,
        prefix: "rate-limit:api:",
      }),
      skip: isAuthLimitedPath,
      handler: sendRateLimitResponse(
        "Too many requests, please try again later."
      ),
    }),
    authLimiter: rateLimit({
      ...sharedOptions,
      ...rateLimitConfig.auth,
      store: new RedisStore({
        sendCommand,
        prefix: "rate-limit:auth:",
      }),
      skipSuccessfulRequests: true,
      handler: sendRateLimitResponse(
        "Too many authentication attempts, please try again later."
      ),
    }),
  };
}

async function verifyRedisRateLimitPermissions() {
  const checkKey = `rate-limit:acl-check:${process.pid}:${Date.now()}`;
  const checkScript = `
    local ttl = redis.call("PTTL", KEYS[1])
    redis.call("SET", KEYS[1], 1, "PX", ARGV[1])
    local hits = redis.call("INCR", KEYS[1])
    local value = redis.call("GET", KEYS[1])
    return { hits, value, ttl }
  `;

  try {
    const scriptSha = await redisClient.sendCommand([
      "SCRIPT",
      "LOAD",
      checkScript,
    ]);

    await redisClient.sendCommand([
      "EVALSHA",
      scriptSha,
      "1",
      checkKey,
      "1000",
    ]);
    await redisClient.decr(checkKey);
    await redisClient.del(checkKey);
  } catch (error) {
    throw new Error(
      "Redis ACL is missing permissions required by rate-limit-redis: " +
        "SCRIPT LOAD, EVALSHA, PTTL, SET, INCR, GET, DECR, DEL",
      { cause: error }
    );
  } finally {
    try {
      await redisClient.del(checkKey);
    } catch {
      // The ACL error above contains the useful failure reason.
    }
  }
}

/* =========================
   Logging & Core
========================= */

app.use(morgan("combined"));
app.use(cors());
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(i18n.init);
app.use(express.static(path.join(process.cwd(), "public")));

/* =========================
   Session
========================= */

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  })
);

/* =========================
   Locale middleware
========================= */

app.use((req, res, next) => {
  const langHeader = req.headers["accept-language"];
  const lang = langHeader ? langHeader.substring(0, 2).toLowerCase() : null;
  req.setLocale(
    lang && ["en", "ar"].includes(lang)
      ? lang
      : i18n.getLocale()
  );
  next();
});

/* =========================
   Views
========================= */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/public", express.static(path.join(process.cwd(), "public")));

/* =========================
   Routes
========================= */

app.get("/", (req, res) => res.render("view"));

const apiRouter = express.Router();
app.use("/api/v1", apiRouter);

function configureApiRoutes() {
  const { apiLimiter, authLimiter } = createRateLimiters();

  apiRouter.use(translateResponseMiddleware);
  apiRouter.use(authLimitedPaths, authLimiter);
  apiRouter.use(apiLimiter);
  apiRouter.use(express.json({ limit: jsonBodyLimit }));
  apiRouter.use(
    express.urlencoded({
      extended: true,
      limit: urlencodedBodyLimit,
    })
  );
  apiRouter.use(decryptPasswordMiddleware);
  apiRouter.use(requireAppToken);
  apiRouter.use(routes);
}

/* =========================
   Health Check
========================= */

app.get("/health", async (req, res) => {
  try {
    const redisStatus = redisClient?.isOpen
      ? await redisClient.ping()
      : "DISCONNECTED";

    return res.json({
      ok: true,
      redis: redisStatus,
      mongo: "ok",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      redis: e?.message || "error",
      mongo: "ok",
    });
  }
});

/* =========================
   Global Error Handler
========================= */

app.use(errorMiddleware);

/* =========================
   Startup
========================= */

const PORT = process.env.PORT || 7000;

async function startServer() {
  try {
    // 1️⃣ Mongo
    await Promise.resolve(connectDB());
    console.log("✅ MongoDB connected");

    // 2️⃣ Redis
    await connectRedis();
    await verifyRedisRateLimitPermissions();
    configureApiRoutes();
    console.log("✅ Redis connected");

    // 4️⃣ Start Express
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    /* =========================
       Graceful Shutdown
    ========================= */

    const shutdown = async (signal) => {
      try {
        console.log(`\n🛑 Received ${signal}. Shutting down...`);
        // Stop cron jobs first
        server.close(async () => {
          await disconnectRedis();
          console.log("✅ Shutdown complete.");
          process.exit(0);
        });

        setTimeout(() => process.exit(1), 15000).unref();
      } catch (err) {
        console.error("❌ Shutdown error:", err);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("❌ Failed to start server:", err?.message || err);
    process.exit(1);
  }
}

startServer();
