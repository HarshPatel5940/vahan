import type { EventHandlerRequest, H3Event } from "h3";
import { getCookie, getHeader, createError } from "h3";
import {
  authenticationService,
  type AuthenticatedUser,
} from "../services/authentication";

/**
 * Authentication middleware to protect routes
 */
export async function requireAuth(
  event: H3Event<EventHandlerRequest>
): Promise<AuthenticatedUser> {
  const sessionToken =
    getCookie(event, "session_token") ||
    getHeader(event, "authorization")?.replace("Bearer ", "");

  if (!sessionToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Authentication required",
    });
  }

  const user = await authenticationService.validateSession(sessionToken);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid or expired session",
    });
  }

  // Store user and session token in event context
  event.context.user = user;
  event.context.sessionToken = sessionToken;

  return user;
}

/**
 * Role-based authorization middleware
 */
export async function requireRole(
  event: H3Event<EventHandlerRequest>,
  requiredRoles: string[]
): Promise<AuthenticatedUser> {
  const user = await requireAuth(event);

  if (!requiredRoles.includes(user.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: "Insufficient permissions",
    });
  }

  return user;
}

/**
 * Optional authentication middleware (doesn't throw if not authenticated)
 */
export async function optionalAuth(
  event: H3Event<EventHandlerRequest>
): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth(event);
  } catch {
    return null;
  }
}

/**
 * Error handling utility
 */
export function handleServiceError(error: any) {
  console.error("Service error:", error);

  if (error.statusCode) {
    throw error;
  }

  throw createError({
    statusCode: 500,
    statusMessage: "Internal server error",
  });
}
