#!/usr/bin/env bash
set -euo pipefail

tmp_matches="$(mktemp)"
trap 'rm -f "$tmp_matches"' EXIT

git ls-files -z | xargs -0 rg -n -I \
  --glob '!scripts/scan-secrets.sh' \
  -e 'BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY' \
  -e '(JWT_SECRET|JWT_REFRESH_SECRET|DB_PASSWORD|POSTGRES_PASSWORD|REDIS_PASSWORD|MINIO_ROOT_PASSWORD|API_KEY|SECRET_KEY|ACCESS_KEY|TOKEN|PASSWORD)[[:space:]]*[:=][[:space:]]*["'\'']?[A-Za-z0-9_./:+-]{8,}' \
  -e 'postgresql://[^:$[:space:]]+:[^$@[:space:]][^@[:space:]]*@' \
  -e 'redis://:[^$@[:space:]][^@[:space:]]*@' \
  -- . >"$tmp_matches" || true

if [ ! -s "$tmp_matches" ]; then
  exit 0
fi

filtered_matches="$(mktemp)"
trap 'rm -f "$tmp_matches" "$filtered_matches"' EXIT

rg -v \
  -e 'replace-with-' \
  -e 'your-secret-key' \
  -e 'ci-jwt-secret' \
  -e '\$\{\{ secrets\.' \
  -e 'process\.env\.' \
  -e 'env\("' \
  -e 'env\(' \
  -e '\$\{' \
  -e 'SMTP_PASSWORD=$' \
  -e 'SENDGRID_API_KEY=your_' \
  -e 'GMAIL_PASSWORD=your_' \
  "$tmp_matches" >"$filtered_matches" || true

if [ -s "$filtered_matches" ]; then
  echo "Potential secrets detected in tracked files:"
  cat "$filtered_matches"
  exit 1
fi
