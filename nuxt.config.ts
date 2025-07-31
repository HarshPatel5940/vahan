// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  srcDir: "app",
  serverDir: "server",

  // Runtime configuration
  runtimeConfig: {
    // Server-side environment variables
    dbHost: process.env.DB_HOST,
    dbPort: process.env.DB_PORT,
    dbName: process.env.DB_NAME,
    dbUser: process.env.DB_USER,
    dbPassword: process.env.DB_PASSWORD,
    encryptionKey: process.env.ENCRYPTION_KEY,
    jwtSecret: process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL,

    // Public environment variables (exposed to client)
    public: {
      appUrl: process.env.APP_URL || "http://localhost:3000",
      appName: "Vahan Email Platform",
    },
  },

  // Build configuration
  build: {
    transpile: ["@aws-sdk"],
  },

  // TypeScript configuration
  typescript: {
    strict: false,
    typeCheck: false,
  },

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
});
