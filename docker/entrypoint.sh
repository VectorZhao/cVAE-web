#!/bin/sh
set -e

DISPLAY_API_URL=${API_BASE_URL:-https://api.deepexo.eu.org/api}
REQUEST_BASE=${API_REQUEST_BASE:-/api}
UPSTREAM_URL=${API_UPSTREAM_URL:-$DISPLAY_API_URL}

REQUEST_BASE="${REQUEST_BASE%/}"
case "$REQUEST_BASE" in
  http*) REQUEST_BASE=${REQUEST_BASE} ;;
  /*) ;;
  *) REQUEST_BASE="/$REQUEST_BASE" ;;
esac
[ -z "$REQUEST_BASE" ] && REQUEST_BASE="/api"

REQUEST_PATH="${REQUEST_BASE%/}"
[ -z "$REQUEST_PATH" ] && REQUEST_PATH="/api"
PROXY_LOCATION="${REQUEST_PATH}/"

UPSTREAM_TRIMMED="${UPSTREAM_URL%/}/"
UPSTREAM_HOST=$(printf '%s\n' "$UPSTREAM_URL" | sed -E 's#https?://([^/]+).*#\1#')
UPSTREAM_SCHEME=$(printf '%s\n' "$UPSTREAM_URL" | sed -E 's#(https?)://.*#\1#')

cat <<CONFIG >/usr/share/nginx/html/env-config.js
window.__CVEA_CONFIG__ = window.__CVEA_CONFIG__ || {};
window.__CVEA_CONFIG__.API_BASE_URL = '${DISPLAY_API_URL%/}';
window.__CVEA_CONFIG__.DISPLAY_API_URL = '${DISPLAY_API_URL%/}';
window.__CVEA_CONFIG__.API_REQUEST_BASE = '${REQUEST_BASE%/}';
CONFIG

cat <<NGINX >/etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files \$uri \$uri/ /index.html;
  }

  location = /env-config.js {
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
  }

  location ${PROXY_LOCATION} {
    proxy_pass ${UPSTREAM_TRIMMED};
    proxy_set_header Host ${UPSTREAM_HOST};
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
$(if [ "$UPSTREAM_SCHEME" = "https" ]; then printf '    proxy_ssl_server_name on;\n    proxy_ssl_name %s;\n' "$UPSTREAM_HOST"; fi)
    proxy_set_header Accept-Encoding "";
  }
}
NGINX

exec "$@"
