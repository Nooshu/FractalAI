# Security

This project uses several security measures to ensure dependency integrity and prevent supply chain attacks.

## Dependency Pinning

All dependencies in `package.json` are pinned to exact versions (no version ranges like `^` or `~`). This ensures:

- **Reproducible builds**: The same versions are installed every time
- **Predictable behavior**: No unexpected updates that could introduce breaking changes or vulnerabilities
- **Security**: Prevents automatic installation of potentially compromised packages

### Current Pinned Versions

- **three**: `0.169.0`
- **vite**: `5.4.21`
- **eslint**: `8.57.1`
- **prettier**: `3.6.2`
- **stylelint**: `16.25.0`
- **stylelint-config-standard**: `36.0.1`

## Package Integrity Verification

The `package-lock.json` file contains SHA-512 integrity checksums for all dependencies. This provides:

- **Tamper detection**: Any modification to a package will be detected
- **Supply chain security**: Ensures packages match what was originally published
- **Automatic verification**: npm automatically verifies checksums during installation

### Verification Commands

```bash
# Verify dependencies match package-lock.json (uses integrity checksums)
npm ci

# Run security audit
npm audit

# Full verification (clean install + audit)
npm run verify
```

## Security Best Practices

1. **Always use `npm ci`** instead of `npm install` in production to ensure exact versions
2. **Regular audits**: Run `npm audit` regularly to check for known vulnerabilities
3. **Update carefully**: When updating dependencies, review changelogs and security advisories
4. **Lock file**: Never commit without `package-lock.json` - it contains the integrity checksums

## Updating Dependencies

When updating dependencies:

1. Update the version in `package.json` to the exact new version
2. Run `npm install` to update `package-lock.json`
3. Verify integrity: `npm ci --dry-run`
4. Run tests: `npm run check`
5. Review security: `npm audit`
