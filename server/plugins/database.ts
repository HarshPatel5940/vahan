import { defineNitroPlugin } from "nitropack/runtime";
import { database } from "../utils/database";

export default defineNitroPlugin(async (nitroApp) => {
  try {
    // Initialize database connection
    await database.connect();
    console.log("✅ Database connection initialized");

    // Set up graceful shutdown
    nitroApp.hooks.hook("close", async () => {
      console.log("🔄 Closing database connection...");
      await database.close();
      console.log("✅ Database connection closed");
    });
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
  }
});
