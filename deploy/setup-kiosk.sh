#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Raspberry Pi OS Lite (Bullseye) → Chromium Kiosk (Pi Zero 2 W friendly)
# - Minimal X stack (xserver-xorg + xinit + openbox)
# - Console autologin on tty1 for user "pi"
# - startx auto-launch, Openbox autostart -> Chromium in --kiosk
# - Screen never blanks, mouse hidden
#
# Run:   sudo bash setup-kiosk.sh
# URL:   set with env KIOSK_URL, else defaults to http://localhost:8080
# ─────────────────────────────────────────────────────────────────────────────

#: Config
PI_USER="${PI_USER:-pi}"
KIOSK_URL="${KIOSK_URL:-http://localhost:8080}"
KIOSK_ENV="/etc/kiosk.env"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root: sudo bash $0" >&2
  exit 1
fi

if ! id "$PI_USER" &>/dev/null; then
  echo "User '$PI_USER' not found. Create it or set PI_USER=<user> when running." >&2
  exit 1
fi

echo "==> Updating apt and installing minimal X stack + tools..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends \
  xserver-xorg x11-xserver-utils xinit openbox \
  unclutter fonts-dejavu ca-certificates curl

# Try chromium packages: raspbian often uses 'chromium-browser'; Debian uses 'chromium'
if ! dpkg -s chromium-browser >/dev/null 2>&1 && ! dpkg -s chromium >/dev/null 2>&1; then
  echo "==> Installing Chromium (trying chromium-browser, then chromium)..."
  if apt-get install -y chromium-browser; then
    BROWSER_CMD="chromium-browser"
  else
    apt-get install -y chromium || { echo "Failed to install chromium*"; exit 1; }
    BROWSER_CMD="chromium"
  fi
else
  if dpkg -s chromium-browser >/dev/null 2>&1; then BROWSER_CMD="chromium-browser"; else BROWSER_CMD="chromium"; fi
fi

echo "==> Writing $KIOSK_ENV (kiosk configuration)..."
cat >/etc/kiosk.env <<EOF
# Kiosk configuration (edit and reboot to apply)
KIOSK_URL="${KIOSK_URL}"
# Extra Chromium flags if needed (space-separated)
KIOSK_FLAGS="--noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0 --check-for-update-interval=31536000"
EOF
chmod 0644 /etc/kiosk.env

# Helper launcher script (runs inside X session)
LAUNCHER="/usr/local/bin/kiosk-launch.sh"
echo "==> Creating ${LAUNCHER}..."
cat >"$LAUNCHER" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Load config
if [[ -f /etc/kiosk.env ]]; then
  # shellcheck disable=SC1091
  source /etc/kiosk.env
fi

: "${KIOSK_URL:=http://localhost:8080}"
: "${KIOSK_FLAGS:=--noerrdialogs --disable-translate --disable-pinch --overscroll-history-navigation=0 --check-for-update-interval=31536000}"

# Give X a breath to settle, and network a moment to come up
sleep 2

# Disable screen blanking / DPMS
xset s off || true
xset -dpms || true
xset s noblank || true

# Hide mouse cursor when idle immediately
unclutter -idle 0 -root &

# Relaunch Chromium if it exits (simple watchdog)
while true; do
  "$BROWSER_CMD_PLACEHOLDER" --kiosk "$KIOSK_URL" $KIOSK_FLAGS || true
  echo "[kiosk] Chromium exited, restarting in 3s..."
  sleep 3
done
EOF
# Fill in the actual browser command determined above
sed -i "s|\$BROWSER_CMD_PLACEHOLDER|$BROWSER_CMD|g" "$LAUNCHER"
chmod 0755 "$LAUNCHER"

# .xinitrc for the kiosk user – starts Openbox and our launcher
echo "==> Creating /home/${PI_USER}/.xinitrc..."
install -o "$PI_USER" -g "$PI_USER" -m 0644 /dev/null "/home/${PI_USER}/.xinitrc"
cat >"/home/${PI_USER}/.xinitrc" <<EOF
#!/usr/bin/env bash
# Minimal X session for kiosk
# Start Openbox, then run the kiosk launcher within it
export GTK_THEME=Adwaita:dark
export XDG_RUNTIME_DIR="/run/user/\$(id -u)"

# Clean up any stale X locks to avoid boot loops after power loss
rm -f /tmp/.X0-lock || true

# Start Openbox
openbox-session &
# Launch kiosk
"$LAUNCHER"
EOF
chown "$PI_USER:$PI_USER" "/home/${PI_USER}/.xinitrc"
chmod 0755 "/home/${PI_USER}/.xinitrc"

# Openbox autostart (not strictly required since we call launcher in .xinitrc,
# but handy if you prefer using Openbox's autostart later)
mkdir -p "/home/${PI_USER}/.config/openbox"
install -o "$PI_USER" -g "$PI_USER" -m 0644 /dev/null "/home/${PI_USER}/.config/openbox/autostart"
cat >"/home/${PI_USER}/.config/openbox/autostart" <<'EOF'
# (Optional) Additional autostart items go here
# xset s off -dpms s noblank
# unclutter -idle 0 -root &
EOF
chown -R "$PI_USER:$PI_USER" "/home/${PI_USER}/.config"

# Auto-start X when the kiosk user logs in on tty1 (console)
BASH_PROFILE="/home/${PI_USER}/.bash_profile"
echo "==> Enabling auto startx on login for ${PI_USER} (tty1 only)..."
if [[ -f "/home/${PI_USER}/.profile" && ! -f "$BASH_PROFILE" ]]; then
  # If .bash_profile missing, create a minimal one that sources .profile
  install -o "$PI_USER" -g "$PI_USER" -m 0644 /dev/null "$BASH_PROFILE"
  echo '[[ -f ~/.profile ]] && . ~/.profile' >>"$BASH_PROFILE"
fi
# Add startx guard (idempotent)
grep -q 'exec startx' "$BASH_PROFILE" 2>/dev/null || cat >>"$BASH_PROFILE" <<'EOF'

# Auto-start X on the first virtual terminal
if [[ -z "$DISPLAY" && "${XDG_VTNR:-0}" -eq 1 ]]; then
  exec startx
fi
EOF
chown "$PI_USER:$PI_USER" "$BASH_PROFILE"

# Console autologin for the kiosk user on tty1
echo "==> Configuring systemd getty autologin on tty1 for ${PI_USER}..."
mkdir -p /etc/systemd/system/getty@tty1.service.d
cat >/etc/systemd/system/getty@tty1.service.d/override.conf <<EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ${PI_USER} --noclear %I \$TERM
Type=idle
EOF

# Make sure login shell is bash (helps with .bash_profile)
chsh -s /bin/bash "$PI_USER" || true

# Optional: prevent the Linux console from blanking (outside X)
# (Adds consoleblank=0 to /boot/cmdline.txt if not present)
CMDLINE="/boot/cmdline.txt"
if ! grep -qw 'consoleblank=0' "$CMDLINE"; then
  echo "==> Disabling console blanking (adding consoleblank=0 to cmdline.txt)..."
  sed -i '1 s/$/ consoleblank=0/' "$CMDLINE"
fi

echo "==> Reloading systemd and enabling services..."
systemctl daemon-reload
systemctl enable getty@tty1.service

echo "==> Done!"
echo
echo "Kiosk URL is set to: ${KIOSK_URL}"
echo "To change it, edit ${KIOSK_ENV} and reboot:"
echo "  sudo nano ${KIOSK_ENV}"
echo
echo "Reboot now? (y/N)"
read -r ans
if [[ "${ans,,}" == "y" || "${ans,,}" == "yes" ]]; then
  reboot
else
  echo "Reboot later with: sudo reboot"
fi

