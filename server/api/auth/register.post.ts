import { z } from "zod";
import {
  defineEventHandler,
  getMethod,
  setHeader,
  createError,
  readBody,
  getHeader,
  setCookie,
} from "h3";
import { authenticationService } from "../../services/authentication";

// Helper function to get client IP
function getClientIP(event: any): string | undefined {
  return (
    (event.node.req.headers["x-forwarded-for"] as string) ||
    (event.node.req.headers["x-real-ip"] as string) ||
    event.node.req.connection?.remoteAddress ||
    event.node.req.socket?.remoteAddress
  );
}

const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["admin", "user", "limited-user"]).optional(),
});

export default defineEventHandler(async (event) => {
  // Handle CORS
  if (getMethod(event) === "OPTIONS") {
    setHeader(
      event,
      "Access-Control-Allow-Origin",
      process.env.APP_URL || "http://localhost:3000"
    );
    setHeader(event, "Access-Control-Allow-Methods", "POST, OPTIONS");
    setHeader(event, "Access-Control-Allow-Headers", "Content-Type");
    setHeader(event, "Access-Control-Allow-Credentials", "true");
    return "OK";
  }

  if (getMethod(event) !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed",
    });
  }

  try {
    const body = await readBody(event);
    const validatedData = registerSchema.parse(body);

    const clientIp = getClientIP(event) || "127.0.0.1";
    const userAgent = getHeader(event, "user-agent") || "not-provided";

    const result = await authenticationService.register(
      validatedData,
      clientIp,
      userAgent
    );

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: result.error,
      });
    }

    // Set session cookie
    setCookie(event, "session_token", result.sessionToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return {
      success: true,
      user: result.user,
      message:
        "Registration successful. Please check your email to verify your account.",
    };
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }

    console.error("Registration error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Registration failed",
    });
  }
});
