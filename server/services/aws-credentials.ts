import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import {
  SESClient,
  GetAccountSendingEnabledCommand,
  ListIdentitiesCommand,
} from "@aws-sdk/client-ses";
import { encryptionService } from "../utils/encryption";
import { database } from "../utils/database";

export interface AWSCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
}

export interface CredentialValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    accountId?: string;
    userId?: string;
    arn?: string;
    sesEnabled?: boolean;
    identities?: string[];
  };
}

export interface StoredCredentials {
  id: number;
  user_id: number;
  encrypted_access_key: string;
  encrypted_secret_key: string;
  encrypted_session_token?: string;
  region: string;
  access_key_iv: string;
  secret_key_iv: string;
  session_token_iv?: string;
  access_key_tag: string;
  secret_key_tag: string;
  session_token_tag?: string;
  credentials_valid: boolean;
  last_validated?: Date;
  created_at: Date;
  updated_at: Date;
}

export class AWSCredentialsService {
  /**
   * Validate AWS credentials by testing basic access and SES permissions
   */
  async validateCredentials(
    credentials: AWSCredentials
  ): Promise<CredentialValidationResult> {
    try {
      // Test basic AWS access with STS
      const stsClient = new STSClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      const stsResult = await stsClient.send(new GetCallerIdentityCommand({}));

      if (!stsResult.Account || !stsResult.UserId || !stsResult.Arn) {
        return {
          valid: false,
          error: "Invalid AWS credentials - unable to retrieve caller identity",
        };
      }

      // Test SES access
      const sesClient = new SESClient({
        region: credentials.region,
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken,
        },
      });

      try {
        const sesEnabledResult = await sesClient.send(
          new GetAccountSendingEnabledCommand({})
        );
        const identitiesResult = await sesClient.send(
          new ListIdentitiesCommand({})
        );

        return {
          valid: true,
          details: {
            accountId: stsResult.Account,
            userId: stsResult.UserId,
            arn: stsResult.Arn,
            sesEnabled: sesEnabledResult.Enabled,
            identities: identitiesResult.Identities || [],
          },
        };
      } catch (sesError) {
        return {
          valid: false,
          error: `SES access denied - please ensure your AWS credentials have SES permissions: ${
            sesError instanceof Error ? sesError.message : "Unknown SES error"
          }`,
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: `AWS credential validation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Store encrypted AWS credentials for a user
   */
  async storeCredentials(
    userId: number,
    credentials: AWSCredentials,
    ipAddress?: string,
    userAgent?: string
  ): Promise<StoredCredentials> {
    // First validate the credentials
    const validationResult = await this.validateCredentials(credentials);
    if (!validationResult.valid) {
      throw new Error(`Invalid credentials: ${validationResult.error}`);
    }

    try {
      // Encrypt the credentials
      const encryptedAccessKey = encryptionService.encrypt(
        credentials.accessKeyId
      );
      const encryptedSecretKey = encryptionService.encrypt(
        credentials.secretAccessKey
      );
      const encryptedSessionToken = credentials.sessionToken
        ? encryptionService.encrypt(credentials.sessionToken)
        : null;

      // Store in database within a transaction
      const result = await database.transaction(async (client) => {
        // Delete existing credentials for this user
        await client.query(
          "DELETE FROM user_aws_credentials WHERE user_id = $1",
          [userId]
        );

        // Insert new credentials
        const insertResult = await client.query<StoredCredentials>(
          `INSERT INTO user_aws_credentials 
           (user_id, encrypted_access_key, encrypted_secret_key, encrypted_session_token, region, 
            access_key_iv, secret_key_iv, session_token_iv, access_key_tag, secret_key_tag, session_token_tag, 
            credentials_valid, last_validated) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) 
           RETURNING *`,
          [
            userId,
            encryptedAccessKey.encryptedData,
            encryptedSecretKey.encryptedData,
            encryptedSessionToken?.encryptedData,
            credentials.region,
            encryptedAccessKey.iv,
            encryptedSecretKey.iv,
            encryptedSessionToken?.iv,
            encryptedAccessKey.tag,
            encryptedSecretKey.tag,
            encryptedSessionToken?.tag,
            validationResult.valid,
          ]
        );

        // Log the credential storage in audit log
        await client.query(
          `INSERT INTO credential_audit_logs (user_id, action, ip_address, user_agent, details, success) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            "create",
            ipAddress,
            userAgent,
            JSON.stringify({
              region: credentials.region,
              validation: validationResult.details,
            }),
            true,
          ]
        );

        return insertResult.rows[0];
      });

      return result;
    } catch (error) {
      // Log failed attempt
      await this.logCredentialAction(
        userId,
        "create",
        ipAddress,
        userAgent,
        { error: error instanceof Error ? error.message : "Unknown error" },
        false
      );
      throw new Error(
        `Failed to store credentials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Retrieve and decrypt AWS credentials for a user
   */
  async getCredentials(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AWSCredentials | null> {
    try {
      const result = await database.query<StoredCredentials>(
        "SELECT * FROM user_aws_credentials WHERE user_id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const stored = result.rows[0];

      // Decrypt the credentials using separate IVs and tags for each field
      const accessKeyId = encryptionService.decrypt({
        encryptedData: stored.encrypted_access_key,
        iv: stored.access_key_iv,
        tag: stored.access_key_tag,
      });

      const secretAccessKey = encryptionService.decrypt({
        encryptedData: stored.encrypted_secret_key,
        iv: stored.secret_key_iv,
        tag: stored.secret_key_tag,
      });

      const sessionToken =
        stored.encrypted_session_token &&
        stored.session_token_iv &&
        stored.session_token_tag
          ? encryptionService.decrypt({
              encryptedData: stored.encrypted_session_token,
              iv: stored.session_token_iv,
              tag: stored.session_token_tag,
            })
          : undefined;

      // Log credential access
      await this.logCredentialAction(
        userId,
        "access",
        ipAddress,
        userAgent,
        { region: stored.region },
        true
      );

      return {
        accessKeyId,
        secretAccessKey,
        sessionToken,
        region: stored.region,
      };
    } catch (error) {
      // Log failed access attempt
      await this.logCredentialAction(
        userId,
        "access",
        ipAddress,
        userAgent,
        { error: error instanceof Error ? error.message : "Unknown error" },
        false
      );
      throw new Error(
        `Failed to retrieve credentials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Update stored credentials for a user
   */
  async updateCredentials(
    userId: number,
    credentials: AWSCredentials,
    ipAddress?: string,
    userAgent?: string
  ): Promise<StoredCredentials> {
    // Validate new credentials first
    const validationResult = await this.validateCredentials(credentials);
    if (!validationResult.valid) {
      throw new Error(`Invalid credentials: ${validationResult.error}`);
    }

    try {
      // Encrypt the new credentials
      const encryptedAccessKey = encryptionService.encrypt(
        credentials.accessKeyId
      );
      const encryptedSecretKey = encryptionService.encrypt(
        credentials.secretAccessKey
      );
      const encryptedSessionToken = credentials.sessionToken
        ? encryptionService.encrypt(credentials.sessionToken)
        : null;

      const result = await database.query<StoredCredentials>(
        `UPDATE user_aws_credentials 
         SET encrypted_access_key = $2, encrypted_secret_key = $3, encrypted_session_token = $4, 
             region = $5, access_key_iv = $6, secret_key_iv = $7, session_token_iv = $8,
             access_key_tag = $9, secret_key_tag = $10, session_token_tag = $11,
             credentials_valid = $12, last_validated = NOW(), updated_at = NOW()
         WHERE user_id = $1 
         RETURNING *`,
        [
          userId,
          encryptedAccessKey.encryptedData,
          encryptedSecretKey.encryptedData,
          encryptedSessionToken?.encryptedData,
          credentials.region,
          encryptedAccessKey.iv,
          encryptedSecretKey.iv,
          encryptedSessionToken?.iv,
          encryptedAccessKey.tag,
          encryptedSecretKey.tag,
          encryptedSessionToken?.tag,
          validationResult.valid,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error("No credentials found to update");
      }

      // Log the credential update
      await this.logCredentialAction(
        userId,
        "update",
        ipAddress,
        userAgent,
        { region: credentials.region, validation: validationResult.details },
        true
      );

      return result.rows[0];
    } catch (error) {
      await this.logCredentialAction(
        userId,
        "update",
        ipAddress,
        userAgent,
        { error: error instanceof Error ? error.message : "Unknown error" },
        false
      );
      throw new Error(
        `Failed to update credentials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete stored credentials for a user
   */
  async deleteCredentials(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      const result = await database.query(
        "DELETE FROM user_aws_credentials WHERE user_id = $1",
        [userId]
      );

      const deleted = (result.rowCount || 0) > 0;

      // Log the credential deletion
      await this.logCredentialAction(
        userId,
        "delete",
        ipAddress,
        userAgent,
        {},
        deleted
      );

      return deleted;
    } catch (error) {
      await this.logCredentialAction(
        userId,
        "delete",
        ipAddress,
        userAgent,
        { error: error instanceof Error ? error.message : "Unknown error" },
        false
      );
      throw new Error(
        `Failed to delete credentials: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Check if user has valid credentials stored
   */
  async hasValidCredentials(userId: number): Promise<boolean> {
    try {
      const result = await database.query(
        "SELECT credentials_valid FROM user_aws_credentials WHERE user_id = $1",
        [userId]
      );

      return result.rows.length > 0 && result.rows[0].credentials_valid;
    } catch (error) {
      console.error("Error checking credential validity:", error);
      return false;
    }
  }

  /**
   * Re-validate stored credentials
   */
  async revalidateCredentials(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CredentialValidationResult> {
    try {
      const credentials = await this.getCredentials(userId);
      if (!credentials) {
        return { valid: false, error: "No credentials found" };
      }

      const validationResult = await this.validateCredentials(credentials);

      // Update the validation status in database
      await database.query(
        "UPDATE user_aws_credentials SET credentials_valid = $2, last_validated = NOW() WHERE user_id = $1",
        [userId, validationResult.valid]
      );

      // Log the validation attempt
      await this.logCredentialAction(
        userId,
        "validate",
        ipAddress,
        userAgent,
        { validation: validationResult },
        validationResult.valid
      );

      return validationResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.logCredentialAction(
        userId,
        "validate",
        ipAddress,
        userAgent,
        { error: errorMessage },
        false
      );
      return { valid: false, error: errorMessage };
    }
  }

  /**
   * Log credential-related actions for audit purposes
   */
  private async logCredentialAction(
    userId: number,
    action: string,
    ipAddress?: string,
    userAgent?: string,
    details: Record<string, any> = {},
    success: boolean = true
  ): Promise<void> {
    try {
      await database.query(
        `INSERT INTO credential_audit_logs (user_id, action, ip_address, user_agent, details, success) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, ipAddress, userAgent, JSON.stringify(details), success]
      );
    } catch (error) {
      console.error("Failed to log credential action:", error);
    }
  }
}

// Export singleton instance
export const awsCredentialsService = new AWSCredentialsService();
