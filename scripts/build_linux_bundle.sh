#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
BUNDLE_ROOT="$DIST_DIR/bundle"
INSTALL_ROOT="$BUNDLE_ROOT/opt/costa-doc"
BACKEND_SRC="$ROOT_DIR/backend"
FRONTEND_SRC="$ROOT_DIR/frontend"

mkdir -p "$DIST_DIR"
rm -rf "$BUNDLE_ROOT"
mkdir -p "$INSTALL_ROOT"

command -v python3 >/dev/null 2>&1 || {
  echo "python3 is required to build the bundle." >&2
  exit 1
}
command -v yarn >/dev/null 2>&1 || {
  echo "yarn is required to build the frontend bundle." >&2
  exit 1
}

echo "==> Building frontend"
(
  cd "$FRONTEND_SRC"
  if [ -f yarn.lock ]; then
    yarn install --frozen-lockfile
  else
    yarn install
  fi
  yarn build
)

echo "==> Preparing backend virtualenv"
mkdir -p "$INSTALL_ROOT/backend"
python3 -m venv "$INSTALL_ROOT/backend/venv"
"$INSTALL_ROOT/backend/venv/bin/pip" install --upgrade pip
"$INSTALL_ROOT/backend/venv/bin/pip" install -r "$BACKEND_SRC/requirements.txt"

if command -v rsync >/dev/null 2>&1; then
  rsync -a \
    --exclude venv \
    --exclude __pycache__ \
    --exclude .env \
    "$BACKEND_SRC/" "$INSTALL_ROOT/backend/"
else
  echo "rsync not found, using tar copy for backend files."
  tar -C "$BACKEND_SRC" -cf - \
    --exclude venv \
    --exclude __pycache__ \
    --exclude .env \
    . | tar -C "$INSTALL_ROOT/backend" -xf -
fi

mkdir -p "$INSTALL_ROOT/frontend"
if command -v rsync >/dev/null 2>&1; then
  rsync -a "$FRONTEND_SRC/build/" "$INSTALL_ROOT/frontend/build/"
else
  tar -C "$FRONTEND_SRC/build" -cf - . | tar -C "$INSTALL_ROOT/frontend/build" -xf -
fi

cat > "$INSTALL_ROOT/README_BUNDLE.md" <<'BUNDLE_README'
# Costa_Doc - Bundle Linux

Este paquete contiene el backend con su virtualenv y el frontend ya compilado.

## Instalación rápida

1. Copia el tarball al servidor Linux.
2. Extrae en la raíz (requiere sudo):
   ```bash
   sudo tar -xzf costa-doc-linux-bundle.tar.gz -C /
   ```
3. Configura los archivos `.env`:
   - `/opt/costa-doc/backend/.env`
   - `/opt/costa-doc/frontend/.env`
4. Asegura permisos de escritura en `/opt/costa-doc/backend/uploads`.
5. Levanta el backend:
   ```bash
   /opt/costa-doc/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
   ```
6. Sirve el frontend desde `/opt/costa-doc/frontend/build` (Nginx recomendado).
BUNDLE_README

TARBALL="$DIST_DIR/costa-doc-linux-bundle.tar.gz"
rm -f "$TARBALL"

tar -C "$BUNDLE_ROOT" -czf "$TARBALL" opt

cat <<EOF
Bundle creado: $TARBALL
EOF
