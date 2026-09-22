"""Turn the reference artwork into FORG artwork.

Two passes per image:
  1. swap the reference brand glyph for the FORG mark, in place and at the
     same size, so the composition is untouched
  2. move the orange brand hue onto Base blue, leaving every other hue alone
     so chart lines and prismatic highlights survive

Run from the project root:  python scripts/rebrand-images.py
Needs Pillow and numpy.
"""
import os
import numpy as np
from PIL import Image, ImageDraw

SRC = "reference-assets"
OUT = "brand-assets"
os.makedirs(OUT, exist_ok=True)

# the official mark, one flat colour, recoloured per use (brand-assets/logo)
MARK = Image.open("brand-assets/logo/forg-mark-mono.png").convert("RGBA")
MARK = MARK.crop(MARK.getchannel("A").getbbox()).getchannel("A")

# the reference glyph is square and the FORG mark is wide, so the mark is
# allowed a little past the glyph box to carry the same visual weight
MARK_SPREAD = 1.35

BRAND_ORANGE = (255, 79, 1)


def mark_image(size, colour, spread=MARK_SPREAD):
    """The FORG mark centred in a `size` square, filled with `colour`."""
    width = round(size * spread)
    height = round(width * MARK.height / MARK.width)
    alpha = MARK.resize((width, height), Image.LANCZOS)
    fill = Image.new("RGBA", (width, height), colour[:3] + (0,))
    fill.putalpha(Image.eval(alpha, lambda a: a * colour[3] // 255))
    img = Image.new("RGBA", (max(size, width), max(size, height)), (0, 0, 0, 0))
    img.alpha_composite(fill, ((img.width - width) // 2, (img.height - height) // 2))
    return img


def orange_mask(arr, tol=(190, 140, 110)):
    rgb = arr[:, :, :3].astype(int)
    alpha = arr[:, :, 3]
    return (rgb[:, :, 0] >= tol[0]) & (rgb[:, :, 1] <= tol[1]) & (rgb[:, :, 2] <= tol[2]) & (alpha > 120)


def replace_mark(im, anchor, window=110, pad=3):
    """Erase the reference glyph near `anchor`, draw the FORG mark in its place."""
    arr = np.array(im)
    ax, ay = anchor
    y0, y1 = max(0, ay - window), min(arr.shape[0], ay + window)
    x0, x1 = max(0, ax - window), min(arr.shape[1], ax + window)

    local = arr[y0:y1, x0:x1]
    mask = orange_mask(local)
    if not mask.any():
        raise SystemExit(f"no glyph found near {anchor}")

    ys, xs = np.nonzero(mask)
    bx0, bx1 = x0 + xs.min(), x0 + xs.max()
    by0, by1 = y0 + ys.min(), y0 + ys.max()

    colour = tuple(int(v) for v in np.median(local[:, :, :4][mask], axis=0))

    ring = np.array(im.crop((bx0 - 12, by0 - 12, bx1 + 13, by1 + 13)))
    background = tuple(int(v) for v in np.median(ring[~orange_mask(ring)], axis=0))

    draw = ImageDraw.Draw(im)
    draw.rectangle([bx0 - pad, by0 - pad, bx1 + pad, by1 + pad], fill=background)

    size = min(bx1 - bx0 + 1, by1 - by0 + 1)
    mark = mark_image(size, colour)
    im.alpha_composite(mark, (int((bx0 + bx1) / 2 - mark.width / 2), int((by0 + by1) / 2 - mark.height / 2)))
    return im


def to_base_blue(im, hue_range=(8, 45), out_range=(250, 215), min_sat=0.10):
    """Rotate the brand hue band onto Base blue, keep everything else as it is.

    `hue_range` is the band of source hues to move, in degrees. Narrow it to
    protect neighbouring colours: a red chart line sits just below 8, a green
    one well above 45.
    """
    arr = np.array(im).astype(np.float32)
    rgb = arr[:, :, :3] / 255.0
    alpha = arr[:, :, 3]

    mx = rgb.max(2)
    mn = rgb.min(2)
    diff = mx - mn
    v = mx
    s = np.where(mx > 0, diff / np.maximum(mx, 1e-6), 0)

    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    safe = np.maximum(diff, 1e-6)
    h = np.select(
        [mx == r, mx == g, mx == b],
        [((g - b) / safe) % 6, ((b - r) / safe) + 2, ((r - g) / safe) + 4],
        default=0.0,
    ) * 60.0

    lo, hi = hue_range
    target = (h >= lo) & (h < hi) & (s > min_sat) & (alpha > 0)
    if not target.any():
        return im

    # keep the relative position inside the band so gradients stay gradients
    t = (h[target] - lo) / max(hi - lo, 1e-6)
    h[target] = out_range[0] + t * (out_range[1] - out_range[0])

    hp = h / 60.0
    c = v * s
    x = c * (1 - np.abs(hp % 2 - 1))
    m = v - c
    zero = np.zeros_like(c)
    idx = np.floor(hp).astype(int) % 6
    r2 = np.select([idx == 0, idx == 1, idx == 2, idx == 3, idx == 4, idx == 5], [c, x, zero, zero, x, c])
    g2 = np.select([idx == 0, idx == 1, idx == 2, idx == 3, idx == 4, idx == 5], [x, c, c, x, zero, zero])
    b2 = np.select([idx == 0, idx == 1, idx == 2, idx == 3, idx == 4, idx == 5], [zero, zero, x, c, c, x])

    out = arr.copy()
    for channel, values in enumerate((r2, g2, b2)):
        out[:, :, channel] = np.where(target, (values + m) * 255.0, arr[:, :, channel])

    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def save(im, name, fmt, quality=92):
    path = os.path.join(OUT, name)
    if fmt == "webp":
        im.save(path, "WEBP", lossless=False, quality=quality, method=6)
    else:
        im.save(path, "PNG", optimize=True)
    print(f"  wrote {name} ({os.path.getsize(path) // 1024} kB)")


def process(name, anchors=(), hue_range=(8, 45), out_range=(250, 215), custom=None,
            min_sat=0.10, as_webp=False, quality=92):
    """`as_webp` re-encodes a smooth gradient that PNG stores badly once its
    hues have been remapped. The embedder rewrites the data URI media type."""
    fmt = "webp" if (as_webp or name.endswith(".webp")) else "png"
    print(name)
    im = Image.open(os.path.join(SRC, name)).convert("RGBA")
    for anchor, window in anchors:
        replace_mark(im, anchor, window=window)
    if custom:
        im = custom(im)
    im = to_base_blue(im, hue_range, out_range, min_sat)
    save(im, name, fmt, quality)


def rebuild_avatar_stack(im):
    """Three overlapping avatars, redrawn so the stack survives the swap."""
    arr = np.array(im)
    background = tuple(int(v) for v in np.median(arr[200:230, 700:850].reshape(-1, 4), axis=0))
    draw = ImageDraw.Draw(im)
    draw.rectangle([872, 217, 1077, 322], fill=background)
    # each avatar is covered from the right by the next one, so the mark sits
    # in the visible crescent, except on the last avatar which shows whole
    for cx, shift in ((925, 14), (981, 14), (1037, 0)):
        draw.ellipse([cx - 43, 227, cx + 43, 313], fill=BRAND_ORANGE + (255,))
        mark = mark_image(46, (255, 255, 255, 255), spread=1.0)
        im.alpha_composite(mark, (cx - shift - mark.width // 2, 270 - mark.height // 2))
    return im


# artwork carrying the reference glyph
process("1360x1028_23e2f4aba8.png", anchors=[((677, 155), 110), ((536, 401), 110), ((819, 401), 110), ((678, 647), 110)])
process("1360x1028_7b615ff5fb.png", custom=rebuild_avatar_stack)
process("2048x2048_005082b76c.webp", anchors=[((223, 613), 110), ((1810, 615), 110), ((920, 1913), 110)], hue_range=(8, 75))
process("2048x2048_0e92f83bfa.webp", anchors=[((463, 342), 45)], hue_range=(8, 75))
process("2048x2048_2d2dddee7d.webp", anchors=[((357, 565), 75), ((995, 1843), 75)], hue_range=(8, 75))

# artwork that only needs the brand hue moved
process("1360x1028_2a066c88c9.png")
process("1318x1498_a7e6d71a6d.png", hue_range=(8, 75), min_sat=0.01)
process("140x1344_4fe9c270dc.png")
process("140x1344_b8e7c9100b.png")
process("1984x1120_b3cdced1be.png", hue_range=(8, 75), min_sat=0.02, as_webp=True, quality=90)
process("5568x2460_6dbb6d7413.png", hue_range=(8, 75), min_sat=0.01, as_webp=True, quality=90)
process("5760x3508_f31b4ad5b4.png", hue_range=(8, 75), min_sat=0.02, as_webp=True, quality=90)
process("5760x3912_3561111338.webp", hue_range=(8, 75), min_sat=0.02, quality=90)
process("2240x2700_e79db0a87f.png", hue_range=(8, 60), as_webp=True, quality=92)

# event ticker avatar: the whole image is the glyph, so it is rebuilt
avatar = Image.new("RGBA", (176, 176), (0, 0, 0, 0))
ImageDraw.Draw(avatar).ellipse([0, 0, 175, 175], fill=BRAND_ORANGE + (255,))
mark = mark_image(96, (255, 255, 255, 255))
avatar.alpha_composite(mark, (88 - mark.width // 2, 88 - mark.height // 2))
avatar = to_base_blue(avatar)
avatar.save(os.path.join(OUT, "event-avatar.png"), "PNG", optimize=True)
print("event-avatar.png")
