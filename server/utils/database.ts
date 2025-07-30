import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class Database {
  private pool: Pool | null = null;
  private config: DatabaseConfig;

  constructor() {
    this.config = {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME || "vahan_db",
      user: process.env.DB_USER || "vahan_user",
      password: process.env.DB_PASSWORD || "",
      ssl: process.env.NODE_ENV === "production",
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    };
  }

  /**
   * Initialize the database connection pool
   */
  async connect(): Promise<void> {
    if (this.pool) {
      return; // Already connected
    }

    try {
      this.pool = new Pool(this.config);

      // Test the connection
      const client = await this.pool.connect();
      await client.query("SELECT NOW()");
      client.release();

      console.log("✅ Database connected successfully");
    } catch (error) {
      console.error("❌ Database connection failed:", error);
      throw new Error(
        `Database connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get the database pool
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.pool;
  }

  /**
   * Execute a query with parameters
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;

      if (process.env.NODE_ENV === "development") {
        console.log("Executed query", {
          text,
          duration,
          rows: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      console.error("Database query error:", { text, params, error });
      throw error;
    }
  }

  /**
   * Execute a query within a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (!this.pool) {
      throw new Error("Database not connected. Call connect() first.");
    }

    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log("Database connection closed");
    }
  }

  /**
   * Check if database is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.query("SELECT 1");
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }

  /**
   * Get connection pool stats
   */
  getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

// Export singleton instance
export const database = new Database();

// Helper functions for common database operations
export async function findUserByEmail(email: string) {
  const result = await database.query(
    "SELECT * FROM users WHERE email = $1 AND account_status = $2",
    [email, "active"]
  );
  return result.rows[0] || null;
}

export async function findUserById(id: number) {
  const result = await database.query(
    "SELECT * FROM users WHERE id = $1 AND account_status = $2",
    [id, "active"]
  );
  return result.rows[0] || null;
}

export async function findUserByUUID(uuid: string) {
  const result = await database.query(
    "SELECT * FROM users WHERE uuid = $1 AND account_status = $2",
    [uuid, "active"]
  );
  return result.rows[0] || null;
}

export async function createUser(userData: {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}) {
  const result = await database.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      userData.email,
      userData.password_hash,
      userData.first_name,
      userData.last_name,
      userData.role || "user",
    ]
  );
  return result.rows[0];
}

export async function updateUserLastLogin(userId: number) {
  await database.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
    userId,
  ]);
}

export async function createSession(sessionData: {
  user_id: number;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
}) {
  const result = await database.query(
    `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at) 
     VALUES ($1, $2, $3, $4, $5) 
     RETURNING *`,
    [
      sessionData.user_id,
      sessionData.session_token,
      sessionData.ip_address,
      sessionData.user_agent,
      sessionData.expires_at,
    ]
  );
  return result.rows[0];
}

export async function findSessionByToken(token: string) {
  const result = await database.query(
    `SELECT s.*, u.* FROM user_sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.session_token = $1 AND s.expires_at > NOW() AND u.account_status = $2`,
    [token, "active"]
  );
  return result.rows[0] || null;
}

export async function deleteSession(token: string) {
  await database.query("DELETE FROM user_sessions WHERE session_token = $1", [
    token,
  ]);
}

export async function cleanupExpiredSessions() {
  const result = await database.query(
    "DELETE FROM user_sessions WHERE expires_at < NOW()"
  );
  return result.rowCount || 0;
}
