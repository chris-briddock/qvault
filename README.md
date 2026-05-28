# QVault

A zero-knowledge password manager built with Next.js 16 and SurrealDB. Uses passkey-only authentication (WebAuthn/FIDO2) and client-side AES-256-GCM encryption with post-quantum hybrid key encapsulation (ML-KEM-768).

## Architecture

- **Framework**: Next.js 16 (App Router)
- **Database**: SurrealDB (self-hosted)
- **Auth**: WebAuthn / FIDO2 passkeys
- **Encryption**: AES-256-GCM (Web Crypto API)
- **Post-Quantum KEM**: ML-KEM-768 (NIST FIPS 203)
- **Key Derivation**: HKDF-SHA-256

## Quick Start

### Prerequisites

- Node.js 24+
- Docker & Docker Compose (for SurrealDB)

### Development

```bash
# Install dependencies
npm install

# Start SurrealDB
npm run db:up

# Run database migrations
npm run db:migrate

# Start the dev server
npm run dev
```

### Environment Variables

Copy `.env.local` and configure:

```bash
SURREALDB_URL=ws://localhost:8000/rpc
SURREALDB_NS=qvault
SURREALDB_DB=qvault
SURREALDB_USER=root
SURREALDB_PASS=root

WEBAUTHN_RP_NAME=QVault
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=http://localhost:3000

SESSION_SECRET=your-32-byte-secret-here
```

### Production Deployment

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

## Security Model

1. **Zero-Knowledge**: The server never sees plaintext passwords or decryption keys.
2. **Passkey-Only**: No traditional passwords; authentication uses WebAuthn/FIDO2.
3. **Post-Quantum Hybrid**: ML-KEM-768 + classical secret for master key protection.
4. **Client-Side Encryption**: All vault data is encrypted/decrypted in the browser.

## License

MIT
