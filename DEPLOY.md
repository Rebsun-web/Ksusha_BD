# Quick Deployment Guide

## Step 1: Prepare QR Codes with Your Website URL

**IMPORTANT:** Before deploying, regenerate QR codes with your actual GitHub Pages URL!

1. Deploy to GitHub Pages first (see Step 2)
2. Get your website URL (e.g., `https://yourusername.github.io/repo-name/`)
3. Regenerate QR codes:
   ```bash
   python3 generate_qr_codes.py 300 "https://yourusername.github.io/repo-name"
   ```
4. This will update all QR codes in the `qr-codes/` folder

## Step 2: Deploy to GitHub Pages

### Option A: Using GitHub Web Interface

1. **Create a new repository** on GitHub (e.g., `puzzle-app`)

2. **Initialize git** (if not already done):
   ```bash
   cd /Users/nikitavoronkin/Desktop/Pet/Ksusha
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Connect to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/puzzle-app.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under **Source**, select **main** branch
   - Select **/ (root)** folder
   - Click **Save**
   - Your site will be at: `https://YOUR_USERNAME.github.io/puzzle-app/`

### Option B: Using GitHub CLI (if installed)

```bash
cd /Users/nikitavoronkin/Desktop/Pet/Ksusha
gh repo create puzzle-app --public --source=. --remote=origin --push
gh repo view --web
# Then enable Pages in Settings
```

## Step 3: Test on Your Phone

1. **Get your website URL** (e.g., `https://yourusername.github.io/puzzle-app/`)

2. **Regenerate QR codes** with this URL (see Step 1)

3. **Print QR codes** from the `qr-codes/` folder

4. **Test scanning**:
   - Open your phone's camera app
   - Point at a QR code
   - It should open the website and unlock a piece!

## Troubleshooting

- **QR codes not working?** Make sure you regenerated them with the correct URL
- **Images not loading?** Check that all files are pushed to GitHub (pieces/, Polzunok.png, Wallpaper.jpg, puzzle-image.png)
- **HTTPS required:** GitHub Pages uses HTTPS, which is required for camera access

## Files to Deploy

Make sure these files are in your repository:
- ✅ index.html
- ✅ styles.css
- ✅ app.js
- ✅ pieces/ (all 9 .jpeg files)
- ✅ Polzunok.png
- ✅ puzzle-image.png
- ✅ Wallpaper.jpg
- ✅ qr-codes/ (all QR code PNGs)

## Quick Commands

```bash
# Check what will be committed
git status

# Add all files
git add .

# Commit
git commit -m "Deploy puzzle app"

# Push to GitHub
git push origin main
```
