#!/usr/bin/env bash
set -euo pipefail

tmp_matches="$(mktemp)"
trap 'rm -f "$tmp_matches"' EXIT

{
  git grep -nI -E 'BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY' -- . ':(exclude)scripts/scan-secrets.sh' || true
  git grep -nI -E '(JWT_SECRET|JWT_REFRESH_SECRET|DB_PASSWORD|POSTGRES_PASSWORD|REDIS_PASSWORD|MINIO_ROOT_PASSWORD|API_KEY|SECRET_KEY|ACCESS_KEY|TOKEN|PASSWORD)[[:space:]]*[:=][[:space:]]*["'\'']?[A-Za-z0-9_./:+-]{8,}' -- . ':(exclude)scripts/scan-secrets.sh' || true
  git grep -nI -E 'postgresql://[^:$[:space:]]+:[^$@[:space:]][^@[:space:]]*@' -- . ':(exclude)scripts/scan-secrets.sh' || true
  git grep -nI -E 'redis://:[^$@[:space:]][^@[:space:]]*@' -- . ':(exclude)scripts/scan-secrets.sh' || true
} >"$tmp_matches"

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
