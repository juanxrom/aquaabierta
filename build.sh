#!/usr/bin/env bash
# Genera index.html (página completa para GitHub Pages) a partir de app/aquaabierta.html
set -e
cd "$(dirname "$0")"
{ echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="logo/aquaabierta-icono.svg">'
  sed -n '1,/<\/style>/p' app/aquaabierta.html
  echo '</head><body>'
  sed -n '/<\/style>/,$p' app/aquaabierta.html | tail -n +2
  echo '</body></html>'; } > index.html
