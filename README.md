# Vahan Email Platform

A professional email infrastructure platform powered by AWS SES. Set up custom domain email addresses, manage mailboxes, and send emails with enterprise-grade reliability.

## Features

- 🔐 **Secure AWS Credentials Management** - Encrypted storage of AWS credentials
- 📧 **Custom Domain Email** - Professional email addresses using your domain
- ⚙️ **Automated DNS Setup** - Automated generation of DNS records (DKIM, SPF, DMARC, MX)
- 📊 **Domain Verification** - Real-time verification status monitoring
- 💼 **User Management** - Role-based access control and user authentication
- 🔍 **Audit Logging** - Comprehensive security and activity logging
- 🌐 **DNS Provider Integration** - Support for major DNS providers
- 📱 **Modern UI** - Built with Nuxt.js and Tailwind CSS

## Technology Stack

- **Frontend**: Nuxt.js 4, Vue 3, Tailwind CSS, Nuxt UI
- **Backend**: Nuxt.js Server API routes, TypeScript
- **Database**: PostgreSQL with encryption
- **Queue**: Redis for background jobs
- **Cloud**: AWS SES, AWS SDK v3
- **Security**: AES-256 encryption, bcrypt password hashing

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 12 or higher
- Redis (for session management and job queues)
- AWS Account with SES access

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HarshPatel5940/vahan.git
   cd vahan
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=vahan_db
   DB_USER=vahan_user
   DB_PASSWORD=your_secure_password

   # Redis Configuration
   REDIS_URL=redis://localhost:6379

   # Encryption Configuration
   ENCRYPTION_KEY=your-32-character-encryption-key-here
   JWT_SECRET=your-jwt-secret-key-here

   # Application Configuration
   APP_URL=http://localhost:3000
   ```

4. **Database Setup**
   
   Create the database and user:
   ```sql
   CREATE DATABASE vahan_db;
   CREATE USER vahan_user WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE vahan_db TO vahan_user;
   ```

   Run migrations:
   ```bash
   bun run db:migrate
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

## Project Structure

```text
vahan/
├── app/                    # Frontend application
│   ├── components/         # Vue components
│   ├── pages/             # Page components
│   └── app.vue            # Root component
├── server/                # Backend server
│   ├── api/               # API routes
│   ├── middleware/        # Server middleware
│   ├── services/          # Business logic services
│   ├── utils/             # Utility functions
│   └── plugins/           # Server plugins
├── database/              # Database schemas and migrations
├── scripts/               # Database and utility scripts
└── docs/                  # Documentation
```text

## Phase 1: Core Infrastructure & Security ✅

### Completed Features
- [x] **AWS Credentials Management**
  - Secure AES-256 encryption for credentials storage
  - Credential validation with AWS STS and SES
  - Audit logging for all credential operations
  
- [x] **Database Schema & Security**
  - Comprehensive PostgreSQL schema with encryption
  - User management with role-based access control
  - Session management with database storage
  - Encrypted email storage schema
  
- [x] **Authentication & Authorization**
  - User registration and login system
  - Cookie-based session management
  - Password reset functionality
  - Role-based permissions system

## Phase 2: Domain Management & Verification ✅

### Completed Features
- [x] **Domain Setup & Verification**
  - Domain registration interface
  - AWS SES domain identity creation
  - Automated DNS record generation (DKIM, SPF, DMARC, MX)
  - Real-time verification status checking
  
- [x] **DNS Management Integration**
  - DNS record generator service
  - Support for manual DNS instructions
  - Domain health monitoring framework

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### POST `/api/auth/login`
Authenticate user login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

### AWS Credentials Management

#### POST `/api/aws/credentials`
Store encrypted AWS credentials for a user.

**Request Body:**
```json
{
  "accessKeyId": "AKIA...",
  "secretAccessKey": "...",
  "region": "us-east-1"
}
```

### Domain Management

#### POST `/api/domains`
Add a new domain for email setup.

**Request Body:**
```json
{
  "domainName": "example.com"
}
```

#### GET `/api/domains`
Get all domains for the authenticated user.

#### GET `/api/domains/:id/dns-records`
Get DNS records for a specific domain.

## Development

### Running Tests
```bash
bun run test
```

### Database Commands
```bash
# Run migrations
bun run db:migrate

# Seed database
bun run db:seed

# Reset database
bun run db:reset
```

### Code Style
This project uses ESLint and Prettier for code formatting. Run:
```bash
bun run lint
bun run lint:fix
```

## Security Features

- **Encryption at Rest**: All sensitive data encrypted with AES-256
- **Secure Sessions**: Database-backed session management with HttpOnly cookies
- **Input Validation**: Comprehensive input validation using Zod schemas
- **Rate Limiting**: Protection against brute force attacks
- **Audit Logging**: Complete audit trail for security monitoring
- **CORS Protection**: Configured CORS policies for API security

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

### Phase 3: Email Infrastructure
- [ ] Email reception system with SES
- [ ] Mailbox creation and management
- [ ] Email parsing and storage
- [ ] Attachment handling

### Phase 4: Email Composition & Sending
- [ ] Rich text email editor
- [ ] Email templates system
- [ ] Email scheduling
- [ ] Bulk email sending

### Phase 5: Advanced Features
- [ ] Analytics dashboard
- [ ] API development
- [ ] SMTP/IMAP gateway
- [ ] Third-party integrations

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email [support@vahan.email](mailto:support@vahan.email) or open an issue on GitHub.
