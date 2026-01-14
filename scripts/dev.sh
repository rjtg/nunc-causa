#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ ! -d "${ROOT_DIR}/ui/node_modules" ]; then
  echo "Installing UI dependencies..."
  (cd "${ROOT_DIR}/ui" && npm install)
fi

echo "Starting backend (dev profile)..."
(cd "${ROOT_DIR}" && ./gradlew bootRun -Dspring-boot.run.profiles=dev) &
BACKEND_PID=$!

echo "Starting UI dev server..."
(cd "${ROOT_DIR}/ui" && npm run dev) &
UI_PID=$!

echo "Waiting for services to become ready..."

wait_for() {
  local name="$1"
  local url="$2"
  local retries=60
  until curl -fsS "$url" >/dev/null 2>&1; do
    retries=$((retries - 1))
    if [ "$retries" -le 0 ]; then
      echo "Timed out waiting for $name ($url)"
      return 1
    fi
    sleep 1
  done
}

wait_for "API" "http://localhost:8080/actuator/health" || true
wait_for "UI" "http://localhost:3000" || true

echo "Dev servers running:"
echo "- UI: http://localhost:3000"
echo "- API: http://localhost:8080"
echo "- H2 Console: http://localhost:8080/h2-console"

cleanup() {
  echo "Stopping dev servers..."
  kill "${BACKEND_PID}" "${UI_PID}" 2>/dev/null || true
}

trap cleanup EXIT

wait "${BACKEND_PID}" "${UI_PID}"
