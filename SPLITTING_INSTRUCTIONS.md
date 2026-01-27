# Image Splitting Instructions

## Option 1: Using the Custom HTML Splitter (Recommended - No Installation Required)

1. Open `custom-splitter.html` in your web browser
2. Click "Choose File" and select your `puzzle-image.png`
3. Click "Split Image into 9 Custom Pieces"
4. The pieces will download automatically
5. Create a `pieces` folder in your project directory
6. Move all downloaded `piece-0.jpg` through `piece-8.jpg` files into the `pieces` folder

## Option 2: Using Python Script (If you have Pillow installed)

If you have Python and Pillow installed:

```bash
python3 split_image.py puzzle-image.png pieces
```

This will create the `pieces` folder and generate all 9 pieces automatically.

## Piece Layout

The image is split into 9 custom regions matching your layout:

**Top Row (Photo Section):**
- Piece 0: Top-left photo (buildings on hillside)
- Piece 1: Top-middle narrow strip (sky/bridge view)
- Piece 2: Top-right photo (bridge and water)

**Middle Row (Photo Section):**
- Piece 3: Mid-left photo (HYUNDAI banner area)
- Piece 4: Mid-center photo (runners on bridge)
- Piece 5: Mid-right photo (more runners and railing)

**Bottom Row (Text Section):**
- Piece 6: Bottom-left (Nov 8 date)
- Piece 7: Bottom-middle (10 km distance)
- Piece 8: Bottom-right (MARATHON DE PORTO text)

## QR Code Mapping

Generate QR codes with these numbers:
- QR code "0" → Piece 0
- QR code "1" → Piece 1
- QR code "2" → Piece 2
- QR code "3" → Piece 3
- QR code "4" → Piece 4
- QR code "5" → Piece 5
- QR code "6" → Piece 6
- QR code "7" → Piece 7
- QR code "8" → Piece 8

## Adjusting the Layout

If the pieces don't match your image perfectly, you can adjust the coordinates in `custom-splitter.html`. Look for the `CUSTOM_LAYOUT` array and modify the `x`, `y`, `width`, and `height` values (they're percentages from 0 to 1).
