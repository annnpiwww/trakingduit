# TrakingDuit - Mobile Development Workflow

## 🚀 Quick Start di HP (Termux)

### 1. Setup Awal (Sekali Doang)

```bash
# Install dependencies
pkg update && pkg install git nodejs-lts openssh -y
npm install -g pnpm

# Configure git
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
git config --global credential.helper store

# Clone repo
cd ~/storage/shared
git clone https://github.com/annnpiwww/trakingduit.git
cd trakingduit

# Install dependencies
pnpm install

# Make scripts executable
chmod +x scripts/*.sh
```

### 2. Buat GitHub Personal Access Token

**Di browser HP:**
1. Buka https://github.com/settings/tokens
2. Generate new token (classic)
3. Pilih scope: ✅ `repo` (full control)
4. Copy token → simpan di notes (penting!)
5. Pakai token ini sebagai password saat `git push`

---

## 💻 Workflow Development

### Option A: Manual Sync (Recommended)

**Setiap kali edit code:**

```bash
cd ~/storage/shared/trakingduit

# 1. Pull perubahan terbaru (dari laptop/HP lain)
git pull origin main

# 2. Edit code (pakai nano, vim, atau code editor app)
nano src/app/page.tsx

# 3. Test local (optional)
pnpm dev

# 4. Commit & push
git add .
git commit -m "feat: deskripsi perubahan"
git push origin main

# ✅ Vercel auto-deploy dalam ~2 menit
```

### Option B: Auto-Sync Script (Advanced)

**Jalankan script auto-sync di background:**

```bash
cd ~/storage/shared/trakingduit

# Start auto-sync (sync setiap 5 menit)
nohup ./scripts/auto-sync.sh > sync.log 2>&1 &

# Check logs
tail -f sync.log

# Stop auto-sync
pkill -f auto-sync.sh
```

**Edit code tanpa mikirin git:**
- Semua perubahan auto-commit & auto-push setiap 5 menit
- Auto-pull perubahan dari remote
- Vercel auto-deploy otomatis

### Option C: Quick Sync Command

```bash
# Sync sekali aja dengan custom message
./scripts/sync-now.sh "fix: perbaiki bug X"

# Atau pakai default message
./scripts/sync-now.sh
```

---

## 🔄 Sync antara HP & Laptop

### Dari HP ke Laptop:

**HP (Termux):**
```bash
git add .
git commit -m "feat: update from mobile"
git push origin main
```

**Laptop:**
```bash
git pull origin main  # Dapat perubahan dari HP
```

### Dari Laptop ke HP:

**Laptop:**
```bash
git add .
git commit -m "fix: update from laptop"
git push origin main
```

**HP (Termux):**
```bash
git pull origin main  # Dapat perubahan dari laptop
```

**✅ Vercel auto-deploy** setiap ada push ke `main` branch!

---

## 📱 Edit Code di HP

### Method 1: Text Editor di Termux

```bash
# Nano (simple)
nano src/app/page.tsx

# Vim (advanced)
vim src/app/page.tsx

# Emacs
emacs src/app/page.tsx
```

### Method 2: Code Editor App (Recommended)

**Install Code Editor:**
- **Acode** (gratis, bagus) - https://play.google.com/store/apps/details?id=com.foxdebug.acode
- **Spck Editor** (fokus web dev) - https://play.google.com/store/apps/details?id=io.spck
- **QuickEdit** (simple & cepat)

**Setup:**
1. Install editor app
2. Open folder: `/storage/emulated/0/trakingduit`
3. Edit files dengan syntax highlighting
4. Save
5. Balik ke Termux → commit & push

### Method 3: GitHub Web Editor

```bash
# Push perubahan ke branch baru
git checkout -b mobile-edit
git push origin mobile-edit

# Edit di browser: https://github.dev/annnpiwww/trakingduit
# Atau: github.com → tekan tombol "." (titik)

# Merge via PR setelah selesai
```

---

## 🛠️ Troubleshooting

### Error: Permission denied (publickey)

```bash
# Pakai HTTPS instead of SSH
git remote set-url origin https://github.com/annnpiwww/trakingduit.git
```

### Error: Authentication failed

```bash
# Re-enter credentials (pakai Personal Access Token sebagai password)
git config --global credential.helper store
git pull origin main  # Will prompt for credentials
```

### Conflict saat pull/push

```bash
# Stash perubahan local dulu
git stash
git pull origin main
git stash pop

# Resolve conflicts manually
nano conflicted-file.tsx
git add .
git commit -m "fix: resolve conflicts"
git push origin main
```

### Auto-sync script ga jalan

```bash
# Check if running
ps aux | grep auto-sync

# Check logs
tail -f sync.log

# Restart
pkill -f auto-sync.sh
nohup ./scripts/auto-sync.sh > sync.log 2>&1 &
```

---

## 📊 Monitoring

### Check Vercel Deployment Status

```bash
# Via CLI (install dulu)
npm install -g vercel
vercel login

# Check deployments
vercel ls

# Check logs
vercel logs
```

### Check Git Status

```bash
# Status local vs remote
git status

# Show commit history
git log --oneline -10

# Show differences
git diff

# Show remote branches
git branch -r
```

---

## ⚡ Quick Commands Cheat Sheet

```bash
# Sync dari remote
git pull origin main

# Commit semua perubahan
git add . && git commit -m "update" && git push origin main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout .

# Create new branch
git checkout -b feature-name

# Switch branch
git checkout main

# Delete branch
git branch -d feature-name

# View commit history
git log --oneline --graph --all

# Check what changed
git diff HEAD

# Show file at specific commit
git show commit-hash:path/to/file
```

---

## 🔐 Security Tips

1. ✅ **Jangan commit `.env.local`** (sudah di `.gitignore`)
2. ✅ **Personal Access Token** simpan aman (jangan share)
3. ✅ **Review changes** sebelum push:
   ```bash
   git diff
   git status
   ```
4. ✅ **Use branch** untuk fitur besar:
   ```bash
   git checkout -b feature-name
   # Edit...
   git push origin feature-name
   # Buat PR di GitHub
   ```

---

## 📚 Resources

- **Git Basics:** https://git-scm.com/book/en/v2
- **GitHub Mobile:** https://github.com/mobile (untuk review PR)
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Project Repo:** https://github.com/annnpiwww/trakingduit

---

## 🆘 Need Help?

```bash
# Git help
git --help
git commit --help

# Check script usage
./scripts/auto-sync.sh --help
./scripts/sync-now.sh --help
```

**Issues:** https://github.com/annnpiwww/trakingduit/issues

---

Happy coding from mobile! 📱✨
