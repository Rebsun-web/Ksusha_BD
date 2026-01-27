#!/usr/bin/env python3
"""
QR Code Generator for Puzzle Pieces
Generates QR codes for pieces 0-8
"""

import sys
import os

# Add local packages to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'python-packages'))

import qrcode
from PIL import Image

def generate_qr_codes(output_dir='qr-codes', size=300, base_url=None):
    """
    Generate QR codes for puzzle pieces 0-8
    
    Args:
        output_dir: Directory to save QR codes
        size: Size of QR code image in pixels
        base_url: Base URL for the website (e.g., 'https://yourusername.github.io/repo-name/')
                  If None, will prompt for input or use placeholder
    """
    
    # Get base URL
    if base_url is None:
        print("\nEnter your website URL (or press Enter to use placeholder):")
        print("Example: https://yourusername.github.io/repo-name/")
        user_input = input("URL: ").strip()
        if user_input:
            base_url = user_input.rstrip('/')
        else:
            base_url = "https://yourusername.github.io/repo-name"
            print(f"Using placeholder URL: {base_url}")
            print("(You can regenerate QR codes later with the correct URL)")
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"\nGenerating QR codes for puzzle pieces...")
    print(f"Base URL: {base_url}\n")
    
    # Generate QR code for each piece (0-8)
    for piece_id in range(9):
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        
        # Add data (URL with piece parameter)
        url = f"{base_url}?piece={piece_id}"
        qr.add_data(url)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Resize if needed
        if size != 300:
            qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save QR code
        output_path = os.path.join(output_dir, f'qr-piece-{piece_id}.png')
        qr_img.save(output_path)
        print(f"✅ Generated QR code for piece {piece_id}: {output_path}")
        print(f"   URL: {url}")
    
    print(f"\n🎉 Successfully generated 9 QR codes in '{output_dir}' directory!")
    print(f"\nNext steps:")
    print(f"1. Print the QR codes from the '{output_dir}' folder")
    print(f"2. Assign each QR code to its corresponding puzzle piece")
    print(f"3. When users scan a QR code, it will open the website and unlock that piece")
    print(f"4. QR code 'qr-piece-0.png' unlocks piece 0.jpeg")
    print(f"5. QR code 'qr-piece-1.png' unlocks piece 1.jpeg")
    print(f"6. And so on...")

if __name__ == '__main__':
    import sys
    
    # Parse command line arguments
    size = 300
    base_url = None
    
    if len(sys.argv) > 1:
        # First arg can be size or URL
        if sys.argv[1].startswith('http'):
            base_url = sys.argv[1]
            if len(sys.argv) > 2:
                try:
                    size = int(sys.argv[2])
                except ValueError:
                    print("Invalid size argument. Using default size 300.")
        else:
            try:
                size = int(sys.argv[1])
                if len(sys.argv) > 2:
                    base_url = sys.argv[2]
            except ValueError:
                base_url = sys.argv[1]
    
    generate_qr_codes(size=size, base_url=base_url)
