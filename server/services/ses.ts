import {
  SESClient,
  VerifyDomainIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  GetIdentityDkimAttributesCommand,
  DeleteIdentityCommand,
  ListIdentitiesCommand,
} from "@aws-sdk/client-ses";
import { awsCredentialsService, type AWSCredentials } from "./aws-credentials";
import { database } from "../utils/database";

export interface DomainIdentityResult {
  success: boolean;
  verificationToken?: string;
  dkimTokens?: string[];
  error?: string;
}

export interface VerificationStatus {
  verified: boolean;
  pending: boolean;
  dkimEnabled: boolean;
  dkimTokens?: string[];
  verificationToken?: string;
}

export interface DNSRecord {
  type: "TXT" | "CNAME" | "MX";
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  purpose: "verification" | "dkim" | "spf" | "dmarc" | "mx";
}

export interface Domain {
  id: number;
  userId: number;
  domainName: string;
  verificationStatus: string;
  sesIdentityArn?: string;
  verificationToken?: string;
  dkimTokens?: string[];
  dnsRecordsGenerated: boolean;
  verificationAttempts: number;
  lastVerificationAttempt?: Date;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class SESService {
  /**
   * Create SES client with user credentials
   */
  private async createSESClient(userId: number): Promise<SESClient> {
    const credentials = await awsCredentialsService.getCredentials(userId);
    if (!credentials) {
      throw new Error("No AWS credentials found for user");
    }

    return new SESClient({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }

  /**
   * Create SES domain identity and enable DKIM
   */
  async createDomainIdentity(
    userId: number,
    domain: string
  ): Promise<DomainIdentityResult> {
    try {
      const sesClient = await this.createSESClient(userId);

      // Verify domain identity
      const verifyCommand = new VerifyDomainIdentityCommand({ Domain: domain });
      const verifyResult = await sesClient.send(verifyCommand);

      if (!verifyResult.VerificationToken) {
        return {
          success: false,
          error: "Failed to get verification token from SES",
        };
      }

      // Get DKIM tokens (DKIM is automatically enabled for new domains)
      const dkimCommand = new GetIdentityDkimAttributesCommand({
        Identities: [domain],
      });
      const dkimResult = await sesClient.send(dkimCommand);

      const dkimAttributes = dkimResult.DkimAttributes?.[domain];
      const dkimTokens = dkimAttributes?.DkimTokens || [];

      return {
        success: true,
        verificationToken: verifyResult.VerificationToken,
        dkimTokens,
      };
    } catch (error) {
      console.error("SES domain identity creation error:", error);
      return {
        success: false,
        error: `Failed to create SES domain identity: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Get domain verification status from SES
   */
  async getDomainVerificationStatus(
    userId: number,
    domain: string
  ): Promise<VerificationStatus> {
    try {
      const sesClient = await this.createSESClient(userId);

      // Get verification attributes
      const verificationCommand = new GetIdentityVerificationAttributesCommand({
        Identities: [domain],
      });
      const verificationResult = await sesClient.send(verificationCommand);

      // Get DKIM attributes
      const dkimCommand = new GetIdentityDkimAttributesCommand({
        Identities: [domain],
      });
      const dkimResult = await sesClient.send(dkimCommand);

      const verificationAttributes =
        verificationResult.VerificationAttributes?.[domain];
      const dkimAttributes = dkimResult.DkimAttributes?.[domain];

      return {
        verified: verificationAttributes?.VerificationStatus === "Success",
        pending: verificationAttributes?.VerificationStatus === "Pending",
        dkimEnabled: dkimAttributes?.DkimEnabled || false,
        dkimTokens: dkimAttributes?.DkimTokens || [],
        verificationToken: verificationAttributes?.VerificationToken,
      };
    } catch (error) {
      console.error("SES verification status check error:", error);
      return {
        verified: false,
        pending: false,
        dkimEnabled: false,
      };
    }
  }

  /**
   * Delete SES domain identity
   */
  async deleteDomainIdentity(userId: number, domain: string): Promise<boolean> {
    try {
      const sesClient = await this.createSESClient(userId);

      const deleteCommand = new DeleteIdentityCommand({ Identity: domain });
      await sesClient.send(deleteCommand);

      return true;
    } catch (error) {
      console.error("SES domain identity deletion error:", error);
      return false;
    }
  }

  /**
   * List all SES identities for user
   */
  async listIdentities(userId: number): Promise<string[]> {
    try {
      const sesClient = await this.createSESClient(userId);

      const listCommand = new ListIdentitiesCommand({});
      const result = await sesClient.send(listCommand);

      return result.Identities || [];
    } catch (error) {
      console.error("SES list identities error:", error);
      return [];
    }
  }
}

export class DNSRecordGenerator {
  /**
   * Generate all required DNS records for a domain
   */
  generateAllDNSRecords(
    domain: string,
    verificationToken: string,
    dkimTokens: string[],
    region: string
  ): DNSRecord[] {
    const records: DNSRecord[] = [];

    // Verification record
    records.push(...this.generateVerificationRecord(domain, verificationToken));

    // DKIM records
    records.push(...this.generateDKIMRecords(domain, dkimTokens));

    // SPF record
    records.push(this.generateSPFRecord(domain));

    // DMARC record
    records.push(this.generateDMARCRecord(domain));

    // MX records
    records.push(...this.generateMXRecords(domain, region));

    return records;
  }

  /**
   * Generate domain verification TXT record
   */
  generateVerificationRecord(domain: string, token: string): DNSRecord[] {
    return [
      {
        type: "TXT",
        name: `_amazonses.${domain}`,
        value: token,
        ttl: 300,
        purpose: "verification",
      },
    ];
  }

  /**
   * Generate DKIM CNAME records
   */
  generateDKIMRecords(domain: string, tokens: string[]): DNSRecord[] {
    return tokens.map((token) => ({
      type: "CNAME" as const,
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      ttl: 300,
      purpose: "dkim" as const,
    }));
  }

  /**
   * Generate SPF TXT record
   */
  generateSPFRecord(domain: string): DNSRecord {
    return {
      type: "TXT",
      name: domain,
      value: "v=spf1 include:amazonses.com ~all",
      ttl: 300,
      purpose: "spf",
    };
  }

  /**
   * Generate DMARC TXT record
   */
  generateDMARCRecord(domain: string): DNSRecord {
    return {
      type: "TXT",
      name: `_dmarc.${domain}`,
      value: "v=DMARC1; p=quarantine; rua=mailto:postmaster@" + domain,
      ttl: 300,
      purpose: "dmarc",
    };
  }

  /**
   * Generate MX records for email reception
   */
  generateMXRecords(domain: string, region: string): DNSRecord[] {
    const mxEndpoint = `inbound-smtp.${region}.amazonaws.com`;

    return [
      {
        type: "MX",
        name: domain,
        value: mxEndpoint,
        ttl: 300,
        priority: 10,
        purpose: "mx",
      },
    ];
  }
}

export class DomainService {
  private sesService = new SESService();
  private dnsGenerator = new DNSRecordGenerator();

  /**
   * Add a new domain for a user
   */
  async addDomain(
    userId: number,
    domainName: string
  ): Promise<{ success: boolean; domain?: Domain; error?: string }> {
    try {
      // Validate domain name
      if (!this.isValidDomain(domainName)) {
        return { success: false, error: "Invalid domain name format" };
      }

      // Check if domain already exists for this user
      const existingDomain = await this.findDomainByName(userId, domainName);
      if (existingDomain) {
        return { success: false, error: "Domain already exists for this user" };
      }

      // Create SES domain identity
      const sesResult = await this.sesService.createDomainIdentity(
        userId,
        domainName
      );
      if (!sesResult.success) {
        return { success: false, error: sesResult.error };
      }

      // Store domain in database
      const domain = await database.transaction(async (client) => {
        const domainResult = await client.query<Domain>(
          `INSERT INTO domains (user_id, domain_name, verification_token, dkim_tokens, verification_status) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [
            userId,
            domainName,
            sesResult.verificationToken,
            sesResult.dkimTokens,
            "pending",
          ]
        );

        const newDomain = domainResult.rows[0];

        // Generate and store DNS records
        const dnsRecords = this.dnsGenerator.generateAllDNSRecords(
          domainName,
          sesResult.verificationToken || "",
          sesResult.dkimTokens || [],
          "us-east-1" // TODO: Get from user's AWS credentials
        );

        for (const record of dnsRecords) {
          await client.query(
            `INSERT INTO dns_records (domain_id, record_type, name, value, ttl, priority, record_purpose) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              newDomain.id,
              record.type,
              record.name,
              record.value,
              record.ttl,
              record.priority,
              record.purpose,
            ]
          );
        }

        // Mark DNS records as generated
        await client.query(
          "UPDATE domains SET dns_records_generated = TRUE WHERE id = $1",
          [newDomain.id]
        );

        return newDomain;
      });

      return { success: true, domain };
    } catch (error) {
      console.error("Add domain error:", error);
      return {
        success: false,
        error: `Failed to add domain: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Get all domains for a user
   */
  async getUserDomains(userId: number): Promise<Domain[]> {
    try {
      const result = await database.query<Domain>(
        "SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error("Get user domains error:", error);
      return [];
    }
  }

  /**
   * Get DNS records for a domain
   */
  async getDomainDNSRecords(domainId: number): Promise<DNSRecord[]> {
    try {
      const result = await database.query(
        "SELECT * FROM dns_records WHERE domain_id = $1 ORDER BY record_purpose, record_type",
        [domainId]
      );

      return result.rows.map((row) => ({
        type: row.record_type,
        name: row.name,
        value: row.value,
        ttl: row.ttl,
        priority: row.priority,
        purpose: row.record_purpose,
      }));
    } catch (error) {
      console.error("Get domain DNS records error:", error);
      return [];
    }
  }

  /**
   * Check domain verification status
   */
  async checkDomainVerification(
    userId: number,
    domainId: number
  ): Promise<{ success: boolean; verified?: boolean; error?: string }> {
    try {
      const domain = await this.findDomainById(domainId);
      if (!domain || domain.userId !== userId) {
        return { success: false, error: "Domain not found" };
      }

      const status = await this.sesService.getDomainVerificationStatus(
        userId,
        domain.domainName
      );

      // Update domain status in database
      const newStatus = status.verified
        ? "verified"
        : status.pending
        ? "pending"
        : "failed";
      await database.query(
        `UPDATE domains 
         SET verification_status = $2, last_verification_attempt = NOW(), verification_attempts = verification_attempts + 1,
             verified_at = CASE WHEN $3 THEN NOW() ELSE verified_at END
         WHERE id = $1`,
        [domainId, newStatus, status.verified]
      );

      return { success: true, verified: status.verified };
    } catch (error) {
      console.error("Check domain verification error:", error);
      return {
        success: false,
        error: `Failed to check verification: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Delete a domain
   */
  async deleteDomain(
    userId: number,
    domainId: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const domain = await this.findDomainById(domainId);
      if (!domain || domain.userId !== userId) {
        return { success: false, error: "Domain not found" };
      }

      // Delete from SES first
      await this.sesService.deleteDomainIdentity(userId, domain.domainName);

      // Delete from database (cascades to DNS records due to foreign key)
      await database.query("DELETE FROM domains WHERE id = $1", [domainId]);

      return { success: true };
    } catch (error) {
      console.error("Delete domain error:", error);
      return {
        success: false,
        error: `Failed to delete domain: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  /**
   * Find domain by name for a user
   */
  private async findDomainByName(
    userId: number,
    domainName: string
  ): Promise<Domain | null> {
    try {
      const result = await database.query<Domain>(
        "SELECT * FROM domains WHERE user_id = $1 AND domain_name = $2",
        [userId, domainName]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Find domain by name error:", error);
      return null;
    }
  }

  /**
   * Find domain by ID
   */
  private async findDomainById(domainId: number): Promise<Domain | null> {
    try {
      const result = await database.query<Domain>(
        "SELECT * FROM domains WHERE id = $1",
        [domainId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error("Find domain by ID error:", error);
      return null;
    }
  }

  /**
   * Validate domain name format
   */
  private isValidDomain(domain: string): boolean {
    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
    return domainRegex.test(domain) && domain.length <= 253;
  }
}

// Export singleton instances
export const sesService = new SESService();
export const dnsRecordGenerator = new DNSRecordGenerator();
export const domainService = new DomainService();
