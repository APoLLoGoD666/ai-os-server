'use strict';
// lib/pwa/icon-generator.js — generate solid-color PNG icons using Node.js built-ins only

const zlib = require('zlib');

// Precompute CRC32 table (standard IEEE polynomial)
const _CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    return t;
})();

function _crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = _CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function _chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const lenBuf    = Buffer.allocUnsafe(4);
    const crcBuf    = Buffer.allocUnsafe(4);
    lenBuf.writeUInt32BE(data.length, 0);
    crcBuf.writeUInt32BE(_crc32(Buffer.concat([typeBytes, data])), 0);
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

/**
 * Generate a solid-color square PNG with an "A" rendered in white.
 * @param {number} size - pixel dimension (192 or 512)
 * @returns {Buffer} PNG file bytes
 */
function generateApexIcon(size) {
    // IHDR
    const ihdr = Buffer.allocUnsafe(13);
    ihdr.writeUInt32BE(size, 0);
    ihdr.writeUInt32BE(size, 4);
    ihdr[8]  = 8;  // bit depth
    ihdr[9]  = 2;  // RGB
    ihdr[10] = 0;  // deflate
    ihdr[11] = 0;  // adaptive filtering
    ihdr[12] = 0;  // non-interlaced

    // Background: #000000 (black), "A" glyph: #00d4ff (cyan)
    // Render a simple pixel "A" in the center using a bitmap glyph
    const BG_R = 0, BG_G = 0, BG_B = 0;
    const FG_R = 0, FG_G = 212, FG_B = 255;

    // 7x7 pixel "A" glyph (scaled to fit)
    const GLYPH = [
        0b0001000,
        0b0011100,
        0b0110110,
        0b1100011,
        0b1111111,
        0b1100011,
        0b1100011,
    ];
    const GLYPH_H = GLYPH.length;
    const GLYPH_W = 7;
    const scale   = Math.floor(size / 12);
    const gW      = GLYPH_W * scale;
    const gH      = GLYPH_H * scale;
    const offX    = Math.floor((size - gW) / 2);
    const offY    = Math.floor((size - gH) / 2);

    // Build scanlines: filter byte (0x00) + RGB per pixel
    const rowBytes = 1 + size * 3;
    const raw      = Buffer.alloc(rowBytes * size, 0);

    for (let y = 0; y < size; y++) {
        const rowOff = y * rowBytes;
        raw[rowOff] = 0; // filter: None
        for (let x = 0; x < size; x++) {
            // Determine if this pixel is part of the glyph
            const gx = x - offX;
            const gy = y - offY;
            let fg = false;
            if (gx >= 0 && gx < gW && gy >= 0 && gy < gH) {
                const glyphRow = Math.floor(gy / scale);
                const glyphCol = Math.floor(gx / scale);
                if (glyphRow < GLYPH_H && (GLYPH[glyphRow] >> (GLYPH_W - 1 - glyphCol)) & 1) fg = true;
            }
            const px = rowOff + 1 + x * 3;
            raw[px]     = fg ? FG_R : BG_R;
            raw[px + 1] = fg ? FG_G : BG_G;
            raw[px + 2] = fg ? FG_B : BG_B;
        }
    }

    const idat = zlib.deflateSync(raw, { level: 6 });

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
        _chunk('IHDR', ihdr),
        _chunk('IDAT', idat),
        _chunk('IEND', Buffer.alloc(0)),
    ]);
}

// Cache to avoid regenerating on every request
const _cache = {};
function getIcon(size) {
    if (!_cache[size]) _cache[size] = generateApexIcon(size);
    return _cache[size];
}

module.exports = { getIcon };
