# Audio Setup Guide

## How to Add Custom Audio Files

When a new puzzle piece is unlocked, you can play custom audio files during the unlock animation.

### Option 1: Different Audio for Each Piece (Recommended)

1. Create an `audio/` folder in your project root
2. Add audio files named:
   - `piece-0.mp3` (or `.wav`, `.ogg`)
   - `piece-1.mp3`
   - `piece-2.mp3`
   - ... up to `piece-8.mp3`

3. The audio will automatically play when each corresponding piece is unlocked

**Example structure:**
```
Ksusha/
├── audio/
│   ├── piece-0.mp3
│   ├── piece-1.mp3
│   ├── piece-2.mp3
│   ├── ...
│   └── piece-8.mp3
├── app.js
└── ...
```

### Option 2: Single Audio File for All Pieces

1. Edit `app.js` and change the CONFIG:
   ```javascript
   const CONFIG = {
       // ... other config
       audioPerPiece: false,
       singleAudioPath: 'audio/unlock.mp3'
   };
   ```

2. Add your audio file: `audio/unlock.mp3`

### Supported Audio Formats

- MP3 (`.mp3`) - Recommended, best compatibility
- WAV (`.wav`) - High quality, larger file size
- OGG (`.ogg`) - Good compression

### Audio Settings

- **Volume**: Set to 70% (0.7) by default
- **Duration**: Audio plays during the full unlock period (~7.5 seconds)
- **Auto-stop**: Audio automatically stops when the piece starts floating

### Disable Audio

To disable audio, set in `app.js`:
```javascript
const CONFIG = {
    // ... other config
    audioPerPiece: false,
    // Don't set singleAudioPath
};
```

### Notes

- Audio files should be optimized for web (keep file sizes reasonable)
- On mobile devices, audio may require user interaction first (the code handles this automatically)
- If an audio file is missing, the app will continue normally without errors
