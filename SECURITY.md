# Security

This project uses comprehensive security measures to ensure dependency integrity and prevent supply chain attacks.

## Dependency Pinning

All dependencies in `package.json` are **pinned to exact versions** (no version ranges like `^` or `~`). This ensures:

- **Reproducible builds**: The same versions are installed every time
- **Predictable behavior**: No unexpected updates that could introduce breaking changes or vulnerabilities
- **Security**: Prevents automatic installation of potentially compromised packages
- **Supply chain protection**: Eliminates risk from malicious package updates

### Current Pinned Versions

#### Production Dependencies

- **regl**: `2.1.1` - WebGL rendering library
- **piexifjs**: `1.0.6` - EXIF metadata handling

#### Development Dependencies

- **@playwright/test**: `1.57.0` - End-to-end testing framework
- **eslint**: `9.39.1` - JavaScript linter
- **jsdom**: `27.2.0` - DOM implementation for testing
- **prettier**: `3.7.2` - Code formatter
- **stylelint**: `16.26.1` - CSS linter
- **stylelint-config-standard**: `39.0.1` - Stylelint standard configuration
- **vite**: `7.2.4` - Build tool and dev server
- **vitest**: `4.0.14` - Unit testing framework

## Package Integrity Verification

The `package-lock.json` file contains **SHA-512 integrity checksums** for all dependencies and their transitive dependencies. This provides:

- **Tamper detection**: Any modification to a package will be detected during installation
- **Supply chain security**: Ensures packages match what was originally published to npm
- **Automatic verification**: npm automatically verifies checksums during `npm ci` and `npm install`
- **Immutable verification**: The lock file serves as a cryptographic record of all dependencies

### How SHA-512 Verification Works

Each package entry in `package-lock.json` includes an `integrity` field with a SHA-512 checksum:

```json
{
  "integrity": "sha512-<64-character-hash>"
}
```

npm verifies this checksum when:

- Installing packages (`npm install`, `npm ci`)
- Updating packages
- During dependency resolution

If a package's checksum doesn't match, npm will refuse to install it, preventing:

- Tampered packages
- Man-in-the-middle attacks
- Compromised registry content

### Verification Commands

```bash
# Verify dependencies match package-lock.json (uses integrity checksums)
# This is the recommended command for CI/CD and production
npm ci

# Dry-run verification (check without installing)
npm ci --dry-run

# Run security audit to check for known vulnerabilities
npm audit

# Full verification (clean install + audit)
npm run verify

# Check for outdated packages (without updating)
npm outdated
```

## Security Best Practices

1. **Always use `npm ci`** instead of `npm install` in production/CI to ensure exact versions and verify integrity
2. **Regular audits**: Run `npm audit` regularly to check for known vulnerabilities
3. **Update carefully**: When updating dependencies:
   - Review changelogs and security advisories
   - Test thoroughly after updates
   - Update `package-lock.json` and verify integrity
4. **Lock file**: Never commit without `package-lock.json` - it contains the integrity checksums
5. **Version pinning**: Never use version ranges (`^`, `~`, `*`) in `package.json` - always pin exact versions
6. **Verify before commit**: Run `npm ci --dry-run` before committing dependency changes

## Updating Dependencies

When updating dependencies, follow this process:

1. **Check for updates**: `npm outdated` to see available updates
2. **Review changes**: Check the package's changelog and security advisories
3. **Update version**: Update the version in `package.json` to the exact new version (no `^` or `~`)
4. **Update lock file**: Run `npm install` to update `package-lock.json` with new integrity checksums
5. **Verify integrity**: Run `npm ci --dry-run` to verify checksums are correct
6. **Run tests**: Execute `npm run check` and `npm test` to ensure nothing broke
7. **Security audit**: Run `npm audit` to check for vulnerabilities
8. **Commit both files**: Always commit both `package.json` and `package-lock.json` together

### Example Update Process

```bash
# 1. Check what's outdated
npm outdated

# 2. Update a specific package (e.g., prettier)
npm install prettier@3.7.2 --save-dev

# 3. Verify the update
npm ci --dry-run

# 4. Run tests
npm test

# 5. Check for vulnerabilities
npm audit

# 6. Commit changes
git add package.json package-lock.json
git commit -m "chore: update prettier to 3.7.2"
```

## Security Status

**Last Security Audit**: All packages verified with no known vulnerabilities  
**Integrity Verification**: SHA-512 checksums verified for all dependencies  
**Version Pinning**: 100% of dependencies pinned to exact versions

## Additional Security Measures

- **Node.js version requirement**: Requires Node.js >= 24.0.0 for latest security patches
- **npm version requirement**: Requires npm >= 10.0.0 for enhanced security features
- **Regular dependency updates**: Dependencies are reviewed and updated regularly
- **Automated security checks**: CI/CD pipeline includes security audits

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. Do not open a public issue
2. Contact the maintainers directly
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure
