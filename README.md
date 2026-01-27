# QR Puzzle Reveal Web App

A mobile-first interactive web application where users scan QR codes with their phone camera to reveal pieces of a surprise puzzle image. Each scanned QR code opens the website, shows an unlock message, displays the piece with confetti animation, and after 5 seconds the piece floats freely in the background. When all pieces are collected, they combine into the complete picture.

## Features

- 📱 **Mobile-First Design** - Optimized for iPhone and mobile devices
- 🔗 **URL-Based QR Codes** - QR codes link directly to the website
- 🎉 **Unlock Animation** - "You unlocked a new picture!" message with confetti
- 🎈 **Floating Pieces** - Pieces float freely in the background after 5 seconds
- 🧩 **Automatic Completion** - Puzzle completes when all 9 pieces are found
- 💾 **Local Storage** - Remembers scanned pieces across sessions
- 🚀 **GitHub Pages Ready** - Easy deployment

## Setup Instructions

### 1. Prepare Your Puzzle Pieces

Your puzzle pieces should be in the `pieces/` folder:
- `0.jpeg`, `1.jpeg`, `2.jpeg`, ... `8.jpeg`

### 2. Generate QR Codes with Your Website URL

**Important:** Before generating QR codes, you need to know your GitHub Pages URL.

Run the Python script with your website URL:
```bash
python3 generate_qr_codes.py 300 "https://yourusername.github.io/repo-name"
```

Or run without URL and enter it when prompted:
```bash
python3 generate_qr_codes.py
```

**Example:**
```bash
python3 generate_qr_codes.py 300 "https://johndoe.github.io/puzzle-app"
```

This will create QR codes in the `qr-codes/` folder:
- `qr-piece-0.png` → links to `your-url?piece=0` → unlocks piece `0.jpeg`
- `qr-piece-1.png` → links to `your-url?piece=1` → unlocks piece `1.jpeg`
- ... and so on

**Note:** After deploying to GitHub Pages, regenerate QR codes with your actual URL if you used a placeholder.

**Note:** The script requires `qrcode` and `Pillow` libraries. They are installed locally in the `python-packages` folder, so no system-wide installation is needed.

### 3. Configure the App

Edit `app.js` and update the configuration if needed:

```javascript
const CONFIG = {
    gridSize: 3, // 3x3 grid = 9 pieces
    pieceDisplayTime: 5000, // 5 seconds before floating
    mainImagePath: 'puzzle-image.png' // Path to your complete image
};
```

### 4. Add Your Complete Image

Place your original complete puzzle image (`puzzle-image.png`) in the project root.

### 5. Project Structure

Your project should look like this:

```
Ksusha/
├── index.html
├── styles.css
├── app.js
├── generate_qr_codes.py (QR code generator script)
├── puzzle-image.png (your complete image)
├── pieces/
│   ├── 0.jpeg
│   ├── 1.jpeg
│   ├── 2.jpeg
│   ├── 3.jpeg
│   ├── 4.jpeg
│   ├── 5.jpeg
│   ├── 6.jpeg
│   ├── 7.jpeg
│   └── 8.jpeg
├── qr-codes/
│   ├── qr-piece-0.png
│   ├── qr-piece-1.png
│   ├── ... (all QR codes)
└── README.md
```

## Deployment to GitHub Pages

1. Create a new repository on GitHub
2. Push all your files to the repository
3. Go to repository Settings → Pages
4. Select the branch (usually `main` or `master`)
5. Select the folder (usually `/root`)
6. Click Save
7. Your app will be available at: `https://yourusername.github.io/repository-name/`

## How It Works

1. **QR Code Scanning**: Users open their iPhone camera (or any QR scanner) and scan a QR code
2. **Website Opens**: The QR code links to your website with a `?piece=X` parameter
3. **Unlock Message**: Shows "🎉 You unlocked a new picture! 🎉" with confetti animation
4. **Piece Display**: The unlocked piece appears at full size for 5 seconds
5. **Floating**: After 5 seconds, the piece shrinks and starts floating freely in the background
6. **Completion**: When all 9 QR codes are scanned, all floating pieces combine into the complete image

## Browser Compatibility

- Requires camera access (HTTPS or localhost)
- Modern browsers with WebRTC support
- Mobile browsers (iOS Safari, Chrome, etc.)

## Customization

- **Grid Size**: Change `CONFIG.gridSize` in `app.js` (currently 3x3 = 9 pieces)
- **Display Time**: Adjust `CONFIG.pieceDisplayTime` (currently 5000ms = 5 seconds)
- **Colors**: Modify the gradient colors in `styles.css`
- **Animations**: Customize CSS animations in `styles.css`
- **QR Code Size**: Adjust size when generating: `python3 generate_qr_codes.py 400 "your-url"`

## Notes

- The app uses localStorage to remember scanned pieces
- Clear browser data to reset progress
- QR codes must contain only the piece number (0, 1, 2, etc.)
- Make sure your images are optimized for web (reasonable file sizes)

## License

Free to use and modify for your project!
