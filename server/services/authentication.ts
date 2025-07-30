import jwt from "jsonwebtoken";
import validator from "validator";
import { encryptionService } from "../utils/encryption";
import {
  database,
  findUserByEmail,
  findUserById,
  createUser,
  updateUserLastLogin,
  createSession,
  findSessionByToken,
  deleteSession,
} from "../utils/database";

export interface UserRegistrationData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "admin" | "user" | "limited-user";
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: number;
  uuid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  emailVerified: boolean;
  lastLogin?: Date;
}

export interface SessionData {
  sessionToken: string;
  expiresAt: Date;
  user: AuthenticatedUser;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  sessionToken?: string;
  error?: string;
}

export class AuthenticationService {
  private readonly jwtSecret: string;
  private readonly sessionTimeout: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "fallback-secret-key";
    if (!process.env.JWT_SECRET) {
      console.warn(
        "⚠️  JWT_SECRET not set in environment variables, using fallback"
      );
    }
  }

  /**
   * Register a new user
   */
  async register(
    userData: UserRegistrationData,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    try {
      // Validate input data
      const validation = this.validateRegistrationData(userData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if user already exists
      const existingUser = await findUserByEmail(userData.email);
      if (existingUser) {
        return { success: false, error: "User with this email already exists" };
      }

      // Hash password
      const passwordHash = await encryptionService.hashPassword(
        userData.password
      );

      // Create user
      const newUser = await createUser({
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role || "user",
      });

      // Create email verification token
      await this.createVerificationToken(newUser.id, "email_verification");

      // Convert to authenticated user format
      const authenticatedUser: AuthenticatedUser = {
        id: newUser.id,
        uuid: newUser.uuid,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        role: newUser.role,
        emailVerified: newUser.email_verified,
        lastLogin: newUser.last_login,
      };

      // Create session
      const sessionResult = await this.createUserSession(
        authenticatedUser,
        ipAddress,
        userAgent
      );

      return {
        success: true,
        user: authenticatedUser,
        sessionToken: sessionResult.sessionToken,
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: `Registration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Authenticate user login
   */
  async login(
    loginData: UserLoginData,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    try {
      // Validate input
      if (!validator.isEmail(loginData.email)) {
        return { success: false, error: "Invalid email format" };
      }

      if (!loginData.password || loginData.password.length < 1) {
        return { success: false, error: "Password is required" };
      }

      // Find user
      const user = await findUserByEmail(loginData.email.toLowerCase());
      if (!user) {
        return { success: false, error: "Invalid email or password" };
      }

      // Verify password
      const passwordValid = await encryptionService.verifyPassword(
        loginData.password,
        user.password_hash
      );
      if (!passwordValid) {
        return { success: false, error: "Invalid email or password" };
      }

      // Update last login
      await updateUserLastLogin(user.id);

      // Convert to authenticated user format
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        emailVerified: user.email_verified,
        lastLogin: new Date(),
      };

      // Create session
      const sessionResult = await this.createUserSession(
        authenticatedUser,
        ipAddress,
        userAgent
      );

      return {
        success: true,
        user: authenticatedUser,
        sessionToken: sessionResult.sessionToken,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: `Login failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Validate session token and return user
   */
  async validateSession(
    sessionToken: string
  ): Promise<AuthenticatedUser | null> {
    try {
      const session = await findSessionByToken(sessionToken);
      if (!session) {
        return null;
      }

      // Update last activity
      await database.query(
        "UPDATE user_sessions SET last_activity = NOW() WHERE session_token = $1",
        [sessionToken]
      );

      return {
        id: session.id,
        uuid: session.uuid,
        email: session.email,
        firstName: session.first_name,
        lastName: session.last_name,
        role: session.role,
        emailVerified: session.email_verified,
        lastLogin: session.last_login,
      };
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }

  /**
   * Logout user by invalidating session
   */
  async logout(sessionToken: string): Promise<boolean> {
    try {
      await deleteSession(sessionToken);
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }

  /**
   * Create a new user session
   */
  private async createUserSession(
    user: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string
  ): Promise<SessionData> {
    const sessionToken = encryptionService.generateToken(64);
    const expiresAt = new Date(Date.now() + this.sessionTimeout);

    await createSession({
      user_id: user.id,
      session_token: sessionToken,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
    });

    return {
      sessionToken,
      expiresAt,
      user,
    };
  }

  /**
   * Create email verification token
   */
  async createVerificationToken(
    userId: number,
    tokenType: "email_verification" | "domain_verification" | "password_reset",
    domainId?: number
  ): Promise<string> {
    const token = encryptionService.generateToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await database.query(
      `INSERT INTO verification_tokens (token, token_type, user_id, domain_id, expires_at) 
       VALUES ($1, $2, $3, $4, $5)`,
      [token, tokenType, userId, domainId, expiresAt]
    );

    return token;
  }

  /**
   * Verify token and mark as used
   */
  async verifyToken(
    token: string,
    tokenType: string
  ): Promise<{ valid: boolean; userId?: number; domainId?: number }> {
    try {
      const result = await database.query(
        `SELECT * FROM verification_tokens 
         WHERE token = $1 AND token_type = $2 AND expires_at > NOW() AND used = FALSE`,
        [token, tokenType]
      );

      if (result.rows.length === 0) {
        return { valid: false };
      }

      const tokenData = result.rows[0];

      // Mark token as used
      await database.query(
        "UPDATE verification_tokens SET used = TRUE WHERE id = $1",
        [tokenData.id]
      );

      return {
        valid: true,
        userId: tokenData.user_id,
        domainId: tokenData.domain_id,
      };
    } catch (error) {
      console.error("Token verification error:", error);
      return { valid: false };
    }
  }

  /**
   * Verify user email
   */
  async verifyEmail(token: string): Promise<boolean> {
    try {
      const verification = await this.verifyToken(token, "email_verification");
      if (!verification.valid || !verification.userId) {
        return false;
      }

      // Mark user email as verified
      await database.query(
        "UPDATE users SET email_verified = TRUE WHERE id = $1",
        [verification.userId]
      );

      return true;
    } catch (error) {
      console.error("Email verification error:", error);
      return false;
    }
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(
    email: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const user = await findUserByEmail(email.toLowerCase());
      if (!user) {
        // Don't reveal whether email exists or not
        return { success: true };
      }

      // Invalidate existing password reset tokens
      await database.query(
        `UPDATE verification_tokens 
         SET used = TRUE 
         WHERE user_id = $1 AND token_type = 'password_reset' AND used = FALSE`,
        [user.id]
      );

      // Create new token
      await this.createVerificationToken(user.id, "password_reset");

      return { success: true };
    } catch (error) {
      console.error("Password reset token generation error:", error);
      return { success: false, error: "Failed to generate reset token" };
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        return {
          success: false,
          error:
            "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
        };
      }

      const verification = await this.verifyToken(token, "password_reset");
      if (!verification.valid || !verification.userId) {
        return { success: false, error: "Invalid or expired reset token" };
      }

      // Hash new password
      const passwordHash = await encryptionService.hashPassword(newPassword);

      // Update user password
      await database.query(
        "UPDATE users SET password_hash = $2 WHERE id = $1",
        [verification.userId, passwordHash]
      );

      // Invalidate all existing sessions for this user
      await database.query("DELETE FROM user_sessions WHERE user_id = $1", [
        verification.userId,
      ]);

      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: "Failed to reset password" };
    }
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: UserRegistrationData): {
    valid: boolean;
    error?: string;
  } {
    if (!data.email || !validator.isEmail(data.email)) {
      return { valid: false, error: "Valid email is required" };
    }

    if (!data.password || !this.isValidPassword(data.password)) {
      return {
        valid: false,
        error:
          "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
      };
    }

    if (
      data.firstName &&
      !validator.isLength(data.firstName, { min: 1, max: 100 })
    ) {
      return {
        valid: false,
        error: "First name must be between 1 and 100 characters",
      };
    }

    if (
      data.lastName &&
      !validator.isLength(data.lastName, { min: 1, max: 100 })
    ) {
      return {
        valid: false,
        error: "Last name must be between 1 and 100 characters",
      };
    }

    if (data.role && !["admin", "user", "limited-user"].includes(data.role)) {
      return { valid: false, error: "Invalid role specified" };
    }

    return { valid: true };
  }

  /**
   * Check if password meets security requirements
   */
  private isValidPassword(password: string): boolean {
    if (password.length < 8) return false;

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
      password
    );

    return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  }
}

// Export singleton instance
export const authenticationService = new AuthenticationService();
