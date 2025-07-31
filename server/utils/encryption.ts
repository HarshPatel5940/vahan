import crypto from "crypto";
import bcrypt from "bcrypt";

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
}

export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  tag: string;
}

export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltRounds = 12;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }
    if (!process.env.ENCRYPTION_SALT) {
      throw new Error("ENCRYPTION_SALT environment variable is required");
    }
  }

  /**
   * Get encryption key from environment variable
   */
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY!;
    const salt = process.env.ENCRYPTION_SALT!;
    return crypto.scryptSync(key, salt, this.keyLength);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  encrypt(data: string): EncryptionResult {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encryptedData = cipher.update(data, "utf8", "hex");
    encryptedData += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return {
      encryptedData,
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
    };
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  decrypt(input: DecryptionInput): string {
    const key = this.getEncryptionKey();
    const iv = Buffer.from(input.iv, "hex");
    const tag = Buffer.from(input.tag, "hex");

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decryptedData = decipher.update(input.encryptedData, "hex", "utf8");
    decryptedData += decipher.final("utf8");

    return decryptedData;
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate cryptographically secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate random bytes
   */
  generateRandomBytes(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  /**
   * Create HMAC hash
   */
  createHmac(data: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
  }

  /**
   * Verify HMAC hash
   */
  verifyHmac(data: string, secret: string, expectedHash: string): boolean {
    const actualHash = this.createHmac(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(actualHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();
