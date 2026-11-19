#!/usr/bin/env python3
"""Builds app-electron/assets/icon.ico (16-256 px) from assets/icon.png.

Windows wants a multi-size .ico for the window, the tray and (through rcedit) the .exe. This machine has no
ImageMagick / npm tooling, so the sizes come from macOS `sips` and the container is written here: uncompressed
32-bit BGRA entries (what Explorer and rcedit read best), bottom-up, with the AND mask left at 0 because the
alpha channel carries the transparency.

    python3 tools/build-ico.py            # writes assets/icon.ico
"""
import os
import struct
import subprocess
import sys
import tempfile
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SRC = os.path.join(APP, "assets", "icon.png")
OUT = os.path.join(APP, "assets", "icon.ico")
SIZES = [16, 24, 32, 48, 64, 128, 256]


def read_png(path):
    """A tiny PNG reader: 8-bit RGB / RGBA, non-interlaced (what sips writes). Returns (w, h, RGBA bytes)."""
    data = open(path, "rb").read()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit("not a PNG: " + path)
    pos, idat, pal, trns = 8, b"", None, None
    w = h = depth = ctype = None
    while pos < len(data):
        length, kind = struct.unpack(">I4s", data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            w, h, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", chunk)
            if depth != 8 or interlace:
                raise SystemExit("unsupported PNG (depth %d, interlace %d)" % (depth, interlace))
        elif kind == b"PLTE":
            pal = [chunk[i:i + 3] for i in range(0, len(chunk), 3)]
        elif kind == b"tRNS":
            trns = chunk
        elif kind == b"IDAT":
            idat += chunk
        elif kind == b"IEND":
            break
    raw = zlib.decompress(idat)
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ctype]
    stride = w * channels
    out, prev, i = bytearray(), bytearray(stride), 0
    for _ in range(h):
        f = raw[i]
        i += 1
        line = bytearray(raw[i:i + stride])
        i += stride
        if f == 1:
            for x in range(channels, stride):
                line[x] = (line[x] + line[x - channels]) & 0xFF
        elif f == 2:
            for x in range(stride):
                line[x] = (line[x] + prev[x]) & 0xFF
        elif f == 3:
            for x in range(stride):
                left = line[x - channels] if x >= channels else 0
                line[x] = (line[x] + ((left + prev[x]) >> 1)) & 0xFF
        elif f == 4:
            for x in range(stride):
                a = line[x - channels] if x >= channels else 0
                b = prev[x]
                c = prev[x - channels] if x >= channels else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 0xFF
        out += line
        prev = line
    rgba = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            o = (y * w + x) * channels
            d = (y * w + x) * 4
            if ctype == 6:
                rgba[d:d + 4] = out[o:o + 4]
            elif ctype == 2:
                rgba[d:d + 3] = out[o:o + 3]
                rgba[d + 3] = 255
            elif ctype == 0:
                rgba[d] = rgba[d + 1] = rgba[d + 2] = out[o]
                rgba[d + 3] = 255
            elif ctype == 4:
                rgba[d] = rgba[d + 1] = rgba[d + 2] = out[o]
                rgba[d + 3] = out[o + 1]
            else:  # palette
                px = out[o]
                rgba[d:d + 3] = pal[px]
                rgba[d + 3] = trns[px] if trns and px < len(trns) else 255
    return w, h, rgba


def dib_entry(w, h, rgba):
    """One ICO image: BITMAPINFOHEADER (height doubled) + bottom-up BGRA + an all-zero AND mask."""
    rows = (h * w * 4, ((w + 31) // 32) * 4 * h)
    header = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, rows[0] + rows[1], 0, 0, 0, 0)
    pixels = bytearray()
    for y in range(h - 1, -1, -1):                       # DIB rows go bottom-up
        line = rgba[y * w * 4:(y + 1) * w * 4]
        for x in range(0, len(line), 4):                 # RGBA -> BGRA
            pixels += bytes((line[x + 2], line[x + 1], line[x], line[x + 3]))
    mask = bytes(rows[1])                                # alpha does the work; AND mask = "opaque"
    return header + bytes(pixels) + mask


def main():
    if not os.path.isfile(SRC):
        raise SystemExit("missing " + SRC)
    entries = []
    with tempfile.TemporaryDirectory() as tmp:
        for size in SIZES:
            png = os.path.join(tmp, "icon-%d.png" % size)
            subprocess.run(["sips", "-z", str(size), str(size), SRC, "--out", png],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            w, h, rgba = read_png(png)
            if (w, h) != (size, size):
                raise SystemExit("sips returned %dx%d for %d" % (w, h, size))
            entries.append((size, dib_entry(w, h, rgba)))
    header = struct.pack("<HHH", 0, 1, len(entries))
    offset = 6 + 16 * len(entries)
    directory, blobs = b"", b""
    for size, data in entries:
        directory += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    open(OUT, "wb").write(header + directory + blobs)
    print("wrote %s (%d sizes: %s, %d bytes)" % (OUT, len(entries), ", ".join(str(s) for s, _ in entries), os.path.getsize(OUT)))


if __name__ == "__main__":
    sys.exit(main())
