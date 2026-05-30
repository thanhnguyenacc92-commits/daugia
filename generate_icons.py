#!/usr/bin/env python3
"""Generate simple PWA icons using PIL"""
import os
import struct
import zlib

def create_png(size, bg_color, text, text_color=(255,255,255,255)):
    """Create a minimal PNG icon"""
    import base64
    
    # Create pixel data
    pixels = []
    cx, cy = size // 2, size // 2
    
    for y in range(size):
        row = []
        for x in range(size):
            # Rounded square background
            margin = size * 0.08
            corner = size * 0.2
            
            in_rect = (margin <= x < size - margin) and (margin <= y < size - margin)
            
            if in_rect:
                # Lightning bolt icon (⚡)
                # Simple geometric shape
                rel_x = (x - margin) / (size - 2*margin)
                rel_y = (y - margin) / (size - 2*margin)
                
                row.append(bg_color)
            else:
                row.append((0, 0, 0, 0))  # Transparent
        pixels.append(row)
    
    # Draw a simple "A" shape for the icon
    def draw_rect(px, x1, y1, x2, y2, color):
        for iy in range(max(0,y1), min(size,y2)):
            for ix in range(max(0,x1), min(size,x2)):
                px[iy][ix] = color
    
    s = size
    m = int(s * 0.15)  # margin
    
    # Background gradient-ish (dark blue)
    for y in range(s):
        for x in range(s):
            # Rounded corners check
            r = int(s * 0.2)
            in_corner_tl = x < m + r and y < m + r and (x-m-r)**2 + (y-m-r)**2 > r**2
            in_corner_tr = x >= s-m-r and y < m + r and (x-(s-m-r))**2 + (y-m-r)**2 > r**2
            in_corner_bl = x < m + r and y >= s-m-r and (x-m-r)**2 + (y-(s-m-r))**2 > r**2
            in_corner_br = x >= s-m-r and y >= s-m-r and (x-(s-m-r))**2 + (y-(s-m-r))**2 > r**2
            
            if x < m or x >= s-m or y < m or y >= s-m or in_corner_tl or in_corner_tr or in_corner_bl or in_corner_br:
                pixels[y][x] = (0, 0, 0, 0)
            else:
                # Gradient background
                t = y / s
                r_val = int(bg_color[0] * (1-t*0.3))
                g_val = int(bg_color[1] * (1-t*0.1))
                b_val = min(255, int(bg_color[2] * (1+t*0.2)))
                pixels[y][x] = (r_val, g_val, b_val, 255)
    
    # Draw lightning bolt ⚡
    bolt_color = (0, 229, 255, 255)  # Cyan
    half = s // 2
    
    # Top part of bolt (right-leaning line going down-right)
    for i in range(int(s * 0.35)):
        bx = int(half + i * 0.3)
        by = int(m + s*0.1 + i)
        for dx in range(-int(s*0.06), int(s*0.06)):
            if 0 <= bx+dx < s and 0 <= by < s:
                pixels[by][bx+dx] = bolt_color
    
    # Bottom part (left-leaning)
    for i in range(int(s * 0.35)):
        bx = int(half + s*0.05 - i * 0.3)
        by = int(half - s*0.02 + i)
        for dx in range(-int(s*0.06), int(s*0.06)):
            if 0 <= bx+dx < s and 0 <= by < s:
                pixels[by][bx+dx] = bolt_color
    
    return encode_png(pixels, size)


def encode_png(pixels, size):
    def make_chunk(chunk_type, data):
        chunk_len = len(data)
        chunk_data = chunk_type + data
        crc = zlib.crc32(chunk_data) & 0xffffffff
        return struct.pack('>I', chunk_len) + chunk_data + struct.pack('>I', crc)
    
    # PNG signature
    sig = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    ihdr = make_chunk(b'IHDR', ihdr_data)
    
    # IDAT
    raw = bytearray()
    for row in pixels:
        raw.append(0)  # filter type
        for px in row:
            raw.extend(px)
    
    compressed = zlib.compress(bytes(raw), 9)
    idat = make_chunk(b'IDAT', compressed)
    
    # IEND
    iend = make_chunk(b'IEND', b'')
    
    return sig + ihdr + idat + iend


if __name__ == '__main__':
    os.makedirs('icons', exist_ok=True)
    
    bg = (10, 10, 26, 255)  # Dark navy
    
    for size in [192, 512]:
        png_data = create_png(size, bg, '⚡')
        with open(f'icons/icon-{size}.png', 'wb') as f:
            f.write(png_data)
        print(f'Created icons/icon-{size}.png ({len(png_data)} bytes)')
    
    print('Icons generated!')
