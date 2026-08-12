#!/usr/bin/env bash
# tailscale-funnel.sh — expose service lokal ke internet via Tailscale Funnel.
#
# Version-agnostic: Tailscale v1.72+ menghapus sintaks `funnel 443 on`
# (jadi `funnel <target>`), script ini coba dua-duanya + verifikasi hasil.
# Idempotent: jalanin berapa kali pun aman — nggak akan error "already exists".
#
# Usage:
#   tailscale-funnel.sh start [PORT]   # set serve + funnel (default port: 20129)
#   tailscale-funnel.sh stop           # matiin funnel + serve
#   tailscale-funnel.sh status         # liat kondisi sekarang
#
# Env override: TS_FUNNEL_PORT, TS_BIN (path binary tailscale).

set -uo pipefail

PORT="${1:-${TS_FUNNEL_PORT:-20129}}"
CMD="${1:-start}"
case "$CMD" in
  start|stop|status) ;;
  *) PORT="$CMD"; CMD="start" ;;
esac

# Cari binary tailscale kalau belum di-set eksplisit.
TS_BIN="${TS_BIN:-}"
if [[ -z "$TS_BIN" ]]; then
  if command -v tailscale >/dev/null 2>&1; then
    TS_BIN=$(command -v tailscale)
  elif [[ -x /usr/bin/tailscale ]]; then
    TS_BIN=/usr/bin/tailscale
  elif [[ -x /usr/local/bin/tailscale ]]; then
    TS_BIN=/usr/local/bin/tailscale
  else
    echo "ERROR: binary tailscale nggak ketemu. Set TS_BIN=<path>." >&2
    exit 1
  fi
fi

log() { echo "[tailscale-funnel] $*"; }

# CLI baru butuh --yes buat non-interaktif; CLI lama error kalau dapat flag itu.
# Coba dengan --yes dulu, fallback tanpa.
run_ts() {
  "$TS_BIN" "$@" --yes 2>/dev/null && return 0
  "$TS_BIN" "$@"
}

# Tunggu tailscaled up (max 30 detik) — penting pas boot.
wait_up() {
  for _ in $(seq 1 30); do
    "$TS_BIN" status >/dev/null 2>&1 && return 0
    sleep 1
  done
  echo "ERROR: tailscaled nggak up dalam 30s." >&2
  exit 1
}

funnel_aktif() {
  "$TS_BIN" funnel status 2>/dev/null | grep -qi "ts.net"
}

start() {
  log "binary: $TS_BIN | target: https://127.0.0.1:$PORT"
  wait_up

  # 1) Serve — dasar funnel (idempotent: skip kalau udah ke :PORT).
  if "$TS_BIN" serve status 2>/dev/null | grep -q "127.0.0.1:$PORT"; then
    log "serve udah aktif ke :$PORT — skip"
  else
    log "set serve https://127.0.0.1:$PORT ..."
    if ! run_ts serve --bg "https://127.0.0.1:$PORT"; then
      log "WARN: serve gagal, lanjut coba funnel (cek error di atas)"
    fi
  fi

  # 2) Funnel publik — sintaks lama (`funnel 443 on`) dulu, baru sintaks baru
  #    (`funnel --bg https://...`). Retry 3x kalau lagi race saat boot.
  if funnel_aktif; then
    log "funnel udah on — skip"
  else
    for i in 1 2 3; do
      log "aktifkan funnel (percobaan $i/3) ..."
      if run_ts funnel 443 on || run_ts funnel --bg "https://127.0.0.1:$PORT"; then
        break
      fi
      sleep 3
    done
  fi

  # 3) Verifikasi — kalau nggak aktif, unit-nya failed (biar kelihatan).
  if funnel_aktif; then
    log "SUKSES — funnel publik aktif:"
    "$TS_BIN" serve status
  else
    echo "ERROR: funnel nggak aktif setelah dicoba. Jalankan manual:" >&2
    echo "  $TS_BIN serve --bg https://127.0.0.1:$PORT" >&2
    echo "  $TS_BIN funnel 443 on   (versi baru: $TS_BIN funnel --bg https://127.0.0.1:$PORT)" >&2
    exit 1
  fi
}

stop() {
  log "matiin funnel + serve ..."
  "$TS_BIN" funnel 443 off 2>/dev/null || "$TS_BIN" funnel reset 2>/dev/null || true
  "$TS_BIN" serve --bg off 2>/dev/null || "$TS_BIN" serve reset 2>/dev/null || true
  log "selesai."
}

status() {
  echo "==> Serve:"
  "$TS_BIN" serve status 2>&1 || true
  echo "==> Funnel:"
  "$TS_BIN" funnel status 2>&1 || true
}

case "$CMD" in
  start)  start ;;
  stop)   stop ;;
  status) status ;;
esac
