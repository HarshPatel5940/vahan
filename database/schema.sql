-- Vahan Email Platform Database Schema
-- Phase 1: Core Infrastructure & Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table with core authentication data
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'limited-user')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted'))
);

-- User sessions for database-backed session management
CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity TIMESTAMP DEFAULT NOW()
);

-- AWS credentials storage with encryption
CREATE TABLE user_aws_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  encrypted_access_key TEXT NOT NULL,
  encrypted_secret_key TEXT NOT NULL,
  encrypted_session_token TEXT,
  region VARCHAR(50) DEFAULT 'us-east-1',
  access_key_iv BYTEA NOT NULL, -- IV for access key encryption
  secret_key_iv BYTEA NOT NULL, -- IV for secret key encryption
  session_token_iv BYTEA, -- IV for session token encryption
  access_key_tag BYTEA NOT NULL, -- Auth tag for access key
  secret_key_tag BYTEA NOT NULL, -- Auth tag for secret key
  session_token_tag BYTEA, -- Auth tag for session token
  credentials_valid BOOLEAN DEFAULT FALSE,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id) -- One credential set per user for now
);

-- Verification tokens for email, domain, and password reset
CREATE TABLE verification_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('email_verification', 'domain_verification', 'password_reset')),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  domain_id INTEGER, -- Will reference domains table
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Domains table for tracking custom domain verification
CREATE TABLE domains (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  domain_name VARCHAR(255) NOT NULL,
  verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  ses_identity_arn VARCHAR(500),
  verification_token VARCHAR(255),
  dkim_tokens JSON, -- DKIM tokens from SES stored as JSON
  dns_records_generated BOOLEAN DEFAULT FALSE,
  verification_attempts INTEGER DEFAULT 0,
  last_verification_attempt TIMESTAMP,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, domain_name)
);

-- Add foreign key reference for verification tokens
ALTER TABLE verification_tokens ADD CONSTRAINT fk_verification_tokens_domain 
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE;

-- Mailboxes table linking users to their email addresses
CREATE TABLE mailboxes (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  local_part VARCHAR(64) NOT NULL, -- part before @
  full_address VARCHAR(320) NOT NULL, -- complete email address
  display_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  quota_mb INTEGER DEFAULT 1000,
  used_storage_mb INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(domain_id, local_part)
);

-- Email storage with encryption
CREATE TABLE emails (
  id SERIAL PRIMARY KEY,
  mailbox_id INTEGER REFERENCES mailboxes(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  thread_id VARCHAR(255),
  subject_encrypted TEXT,
  body_encrypted TEXT,
  headers_encrypted TEXT,
  attachments_metadata JSONB,
  size_bytes INTEGER,
  read_status BOOLEAN DEFAULT FALSE,
  starred BOOLEAN DEFAULT FALSE,
  archived BOOLEAN DEFAULT FALSE,
  folder VARCHAR(100) DEFAULT 'inbox',
  labels TEXT[],
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  iv BYTEA NOT NULL -- For email content encryption
);

-- Permissions system for RBAC
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL
);

-- Role permissions mapping
CREATE TABLE role_permissions (
  role VARCHAR(50) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_id)
);

-- Audit logs for security tracking
CREATE TABLE credential_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'update', 'delete', 'access', 'validate')),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  details JSONB,
  success BOOLEAN DEFAULT TRUE
);

-- DNS records tracking for domains
CREATE TABLE dns_records (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
  record_type VARCHAR(10) NOT NULL CHECK (record_type IN ('TXT', 'CNAME', 'MX', 'A', 'AAAA')),
  name VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  ttl INTEGER DEFAULT 300,
  priority INTEGER,
  record_purpose VARCHAR(50) CHECK (record_purpose IN ('verification', 'dkim', 'spf', 'dmarc', 'mx')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_uuid ON users(uuid);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_domains_user_id ON domains(user_id);
CREATE INDEX idx_domains_name ON domains(domain_name);
CREATE INDEX idx_domains_status ON domains(verification_status);
CREATE INDEX idx_mailboxes_domain_id ON mailboxes(domain_id);
CREATE INDEX idx_mailboxes_user_id ON mailboxes(user_id);
CREATE INDEX idx_mailboxes_address ON mailboxes(full_address);
CREATE INDEX idx_emails_mailbox_id ON emails(mailbox_id);
CREATE INDEX idx_emails_message_id ON emails(message_id);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_audit_logs_user_id ON credential_audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON credential_audit_logs(timestamp);
CREATE INDEX idx_dns_records_domain_id ON dns_records(domain_id);

-- Seed basic permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('manage_users', 'Manage user accounts', 'users', 'manage'),
  ('view_users', 'View user accounts', 'users', 'view'),
  ('manage_domains', 'Manage domain settings', 'domains', 'manage'),
  ('view_domains', 'View domain settings', 'domains', 'view'),
  ('manage_mailboxes', 'Manage mailboxes', 'mailboxes', 'manage'),
  ('view_mailboxes', 'View mailboxes', 'mailboxes', 'view'),
  ('send_emails', 'Send emails', 'emails', 'send'),
  ('read_emails', 'Read emails', 'emails', 'read'),
  ('manage_credentials', 'Manage AWS credentials', 'credentials', 'manage'),
  ('view_audit_logs', 'View audit logs', 'audit', 'view');

-- Seed role permissions
INSERT INTO role_permissions (role, permission_id) VALUES
  -- Admin permissions
  ('admin', 1), ('admin', 2), ('admin', 3), ('admin', 4), ('admin', 5), 
  ('admin', 6), ('admin', 7), ('admin', 8), ('admin', 9), ('admin', 10),
  -- User permissions
  ('user', 2), ('user', 4), ('user', 6), ('user', 7), ('user', 8), ('user', 9),
  -- Limited user permissions
  ('limited-user', 6), ('limited-user', 8);
