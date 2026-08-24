// ./redis/redis.config.js

const { createClient } = require("redis");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// ======================================================
// Environment
// ======================================================

const SERVER_ENV_PATH = "/var/www/hala-pay-api/.env";
const LOCAL_ENV_PATH = path.resolve(__dirname, "../.env");

function loadEnv() {
  const isServer = fs.existsSync(SERVER_ENV_PATH);
  const envPath = isServer ? SERVER_ENV_PATH : LOCAL_ENV_PATH;

  // Avoid loading the env file multiple times if this module
  // happens to be imported more than once.
  if (!process.env.REDIS_ENV_LOADED) {
    const result = dotenv.config({
      path: envPath,
    });

    if (result.error) {
      console.warn(
        `⚠️ Unable to load Redis environment file: ${envPath}`
      );
    } else {
      console.log(
        isServer
          ? "🌍 Loaded SERVER .env for Redis"
          : "💻 Loaded LOCAL .env for Redis"
      );
    }

    process.env.REDIS_ENV_LOADED = "true";
  }
}

loadEnv();

// ======================================================
// Redis configuration
// ======================================================

const REDIS_URL = (process.env.REDIS_URL || "").trim();

const REDIS_HOST = (process.env.REDIS_HOST || "127.0.0.1").trim();

const REDIS_PORT = Number.parseInt(
  process.env.REDIS_PORT || "6379",
  10
);

const REDIS_PASSWORD = (process.env.REDIS_PASSWORD || "").trim();

const REDIS_USERNAME = (
  process.env.REDIS_USERNAME || "default"
).trim();

if (
  !Number.isInteger(REDIS_PORT) ||
  REDIS_PORT <= 0 ||
  REDIS_PORT > 65535
) {
  throw new Error(
    `Invalid REDIS_PORT: ${process.env.REDIS_PORT}`
  );
}

// ======================================================
// Helpers
// ======================================================

function maskRedisUrl(redisUrl) {
  if (!redisUrl) {
    return "NOT SET";
  }

  try {
    const parsed = new URL(redisUrl);

    if (parsed.username) {
      parsed.username = "****";
    }

    if (parsed.password) {
      parsed.password = "****";
    }

    return parsed.toString();
  } catch {
    return "INVALID REDIS URL";
  }
}

function getRedisTarget() {
  if (REDIS_URL) {
    return maskRedisUrl(REDIS_URL);
  }

  return `redis://${REDIS_HOST}:${REDIS_PORT}`;
}

// ======================================================
// Client options
// ======================================================

const socketOptions = {
  connectTimeout: 8000,

  keepAlive: 5000,

  reconnectStrategy: (retries) => {
    // Stop retrying after 15 failed reconnect attempts
    if (retries > 15) {
      console.error(
        "❌ Redis reconnect retries exhausted"
      );

      return new Error(
        "Redis reconnect retries exhausted"
      );
    }

    // 200ms -> 400ms -> 600ms ... capped at 3 seconds
    const delay = Math.min(200 * retries, 3000);

    console.warn(
      `🔄 Redis reconnect attempt ${retries}, retrying in ${delay}ms`
    );

    return delay;
  },
};

let clientOptions;

if (REDIS_URL) {
  // Preferred when REDIS_URL is provided
  clientOptions = {
    url: REDIS_URL,
    socket: socketOptions,
  };
} else {
  // Fallback to individual environment variables
  clientOptions = {
    username: REDIS_USERNAME || undefined,
    password: REDIS_PASSWORD || undefined,

    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      ...socketOptions,
    },
  };
}

// ======================================================
// Redis client
// ======================================================

const redisClient = createClient(clientOptions);

// Prevent Node from treating Redis errors as unhandled events
redisClient.on("error", (err) => {
  console.error(
    "❌ Redis Client Error:",
    err?.message || err
  );
});

redisClient.on("connect", () => {
  console.log("🧩 Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("✅ Redis is ready");
});

redisClient.on("reconnecting", () => {
  console.log("🔄 Redis reconnecting...");
});

redisClient.on("end", () => {
  console.log("🛑 Redis connection closed");
});

console.log("🔑 Redis Target:", getRedisTarget());

// ======================================================
// Connection management
// ======================================================

let connectPromise = null;

async function connectRedis() {
  if (redisClient.isReady) {
    return redisClient;
  }

  if (redisClient.isOpen) {
    return redisClient;
  }

  // Prevent multiple parts of the application from calling
  // redisClient.connect() simultaneously.
  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = (async () => {
    try {
      console.log(
        `🚀 Connecting to Redis: ${getRedisTarget()}`
      );

      await redisClient.connect();

      const pong = await redisClient.ping();

      if (pong !== "PONG") {
        throw new Error(
          `Unexpected Redis PING response: ${pong}`
        );
      }

      console.log("🏓 Redis PING: PONG");

      return redisClient;
    } catch (err) {
      console.error(
        "❌ Failed to connect to Redis:",
        err?.message || err
      );

      // If connect() partially opened the client,
      // clean it up before allowing another attempt.
      if (redisClient.isOpen && !redisClient.isReady) {
        try {
          redisClient.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }

      throw err;
    } finally {
      connectPromise = null;
    }
  })();

  return connectPromise;
}

// ======================================================
// Disconnect
// ======================================================

async function disconnectRedis() {
  try {
    if (!redisClient.isOpen) {
      return;
    }

    console.log("🛑 Disconnecting Redis...");

    await redisClient.quit();

    console.log("✅ Redis disconnected gracefully");
  } catch (err) {
    console.error(
      "❌ Redis quit error:",
      err?.message || err
    );

    try {
      redisClient.destroy();
    } catch {
      // Ignore forced cleanup errors
    }
  }
}

// ======================================================
// Exports
// ======================================================

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
};