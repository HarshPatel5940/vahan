# Development Setup Guide

This guide will help you set up the Vahan Email Platform for development.

## Quick Start

### 1. Prerequisites

Ensure you have the following installed:
- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for production features)
- AWS Account with SES access

### 2. Clone and Install

```bash
git clone https://github.com/HarshPatel5940/vahan.git
cd vahan
bun install
```

### 3. Environment Configuration

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vahan_db
DB_USER=vahan_user
DB_PASSWORD=your_secure_password

# Encryption Configuration (generate secure keys)
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-secret-key-here

# Application Configuration
APP_URL=http://localhost:3000
APP_ENV=development
```env

### 4. Database Setup

Create the PostgreSQL database:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE vahan_db;
```sql
CREATE USER vahan_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE vahan_db TO vahan_user;
ALTER USER vahan_user CREATEDB; -- Allow user to create test databases
```
```

Run the database migration:

```bash
bun run db:migrate
```

### 5. Start Development Server

```bash
bun run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Development Workflow

### Project Structure Overview

```text
vahan/
├── app/                    # Frontend (Nuxt.js app)
│   ├── components/         # Reusable Vue components
│   ├── pages/             # Route-based pages
│   ├── layouts/           # Page layouts
│   └── app.vue            # Root component
├── server/                # Backend server code
│   ├── api/               # API route handlers
│   ├── middleware/        # Server middleware
│   ├── services/          # Business logic services
│   ├── utils/             # Shared utilities
│   └── plugins/           # Server plugins
├── database/              # Database schemas and migrations
│   └── schema.sql         # Main database schema
└── scripts/               # Development and deployment scripts
```text

### Key Services Implemented

#### 1. EncryptionService (`server/utils/encryption.ts`)
- AES-256 encryption for sensitive data
- Password hashing with bcrypt
- Secure token generation

#### 2. Database Service (`server/utils/database.ts`)
- PostgreSQL connection management
- Query helpers and transactions
- Connection pooling

#### 3. AuthenticationService (`server/services/authentication.ts`)
- User registration and login
- Session management
- Password reset functionality
- Role-based access control

#### 4. AWSCredentialsService (`server/services/aws-credentials.ts`)
- Secure AWS credentials storage
- Credential validation with AWS STS/SES
- Audit logging

#### 5. SES Service (`server/services/ses.ts`)
- AWS SES domain identity management
- DNS record generation
- Domain verification checking

### Available NPM Scripts

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run preview          # Preview production build

# Database
bun run db:migrate       # Run database migrations
bun run db:seed          # Seed database with test data
bun run db:reset         # Reset database (drop all tables)

# Code Quality
bun run lint             # Run ESLint
bun run lint:fix         # Fix ESLint issues automatically
```bash

### Testing the Implementation

#### 1. Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### 2. Test AWS Credentials Storage

First, login to get a session, then:

```bash
curl -X POST http://localhost:3000/api/aws/credentials \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "accessKeyId": "AKIA...",
    "secretAccessKey": "...",
    "region": "us-east-1"
  }'
```

#### 3. Test Domain Addition

```bash
curl -X POST http://localhost:3000/api/domains \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_SESSION_TOKEN" \
  -d '{
    "domainName": "example.com"
  }'
```

## Phase 1 & 2 Implementation Status

### ✅ Completed Features

**Phase 1: Core Infrastructure & Security**
- [x] Secure AWS credentials storage with AES-256 encryption
- [x] User authentication and authorization system
- [x] Database schema with proper relationships and indexes
- [x] Session management with database storage
- [x] Role-based access control (RBAC)
- [x] Comprehensive audit logging
- [x] Input validation and error handling

**Phase 2: Domain Management & Verification**
- [x] Domain registration and management
- [x] AWS SES domain identity creation
- [x] DNS record generation (DKIM, SPF, DMARC, MX)
- [x] Domain verification status checking
- [x] DNS record management and display

### 🔄 Next Steps (Phase 3)

**Email Infrastructure**
- [ ] Email reception system setup
- [ ] Mailbox creation and management
- [ ] Email parsing and storage
- [ ] Attachment handling with S3

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Verify database credentials in `.env`
   - Check if database exists

2. **AWS Credential Validation Fails**
   - Verify AWS credentials have SES permissions
   - Check AWS region configuration
   - Ensure SES is available in the selected region

3. **Build/Lint Errors**
   - Run `bun install` to ensure all dependencies are installed
   - Check Node.js version (requires 18+)

### Development Tips

1. **Database Reset**: Use `bun run db:reset` to completely reset the database during development

2. **Environment Variables**: Always restart the dev server after changing `.env` variables

3. **API Testing**: Use tools like Postman or curl to test API endpoints during development

4. **Logs**: Check the console output for detailed error messages and debugging information

## Next Development Phase

The next phase will focus on implementing the email infrastructure:

1. **Email Reception**: Set up SES receipt rules for incoming emails
2. **Mailbox Management**: Create and manage email addresses
3. **Email Storage**: Parse and store incoming emails securely
4. **Email Composition**: Build email sending capabilities

The foundation is now solid and ready for these advanced features!
