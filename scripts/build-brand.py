"""Build the web logo files from the official FORG logo pack.

Sources live in brand-assets/logo/, exactly as delivered:
  forg-logo-on-light.png   full logo, black wordmark, for white surfaces
  forg-logo-on-dark.png    full logo, white wordmark, for dark surfaces
  forg-mark.png            the mark alone, lime gradient
  forg-mark-mono.png       the mark alone, one flat colour (used as a mask)
  forg-mark-banner.jpg     the mark on black with the lime corner glow

Writes, into public/:
  brand/forg-logo.png      header and footer logo
  brand/forg-icon-512.png  wallet metadata and any square app icon
  favicon.png              browser tab
  apple-touch-icon.png     home screen
  og.png                   social banner, 1200 x 630

Run from the project root:  python scripts/build-brand.py
Needs Pillow and numpy.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = "brand-assets/logo"
OUT = "public"
os.makedirs(os.path.join(OUT, "brand"), exist_ok=True)

LIME = (204, 255, 1)


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGBA")


def trimmed(name):
    im = load(name)
    return im.crop(im.getchannel("A").getbbox())


def fit_width(im, width):
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def square(im, size, pad=0.0):
    """Centre `im` in a transparent square, leaving `pad` of the side free."""
    inner = round(size * (1 - 2 * pad))
    scale = inner / max(im.size)
    mark = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas


def save(im, path):
    full = os.path.join(OUT, path)
    im.save(full, "PNG", optimize=True)
    print(f"  wrote {path} ({os.path.getsize(full) // 1024} kB)")


def glow(size, centre, radius, colour, strength):
    """A soft lime corner light, the same move the banner artwork makes."""
    w, h = size
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt((xs - centre[0]) ** 2 + (ys - centre[1]) ** 2) / radius
    a = np.clip(1 - d, 0, 1) ** 2.2 * strength
    layer = np.zeros((h, w, 4), np.float32)
    layer[..., :3] = colour
    layer[..., 3] = a * 255
    return Image.fromarray(layer.astype(np.uint8), "RGBA")


def font(bold, size):
    for name in (("segoeuib.ttf", "arialbd.ttf") if bold else ("segoeui.ttf", "arial.ttf")):
        for folder in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/msttcorefonts", "/Library/Fonts"):
            path = os.path.join(folder, name)
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


# header and footer: shown at 30 to 40 px tall, so 480 wide covers 3x screens
save(fit_width(trimmed("forg-logo-on-light.png"), 480), "brand/forg-logo.png")

# square icons: the gradient mark reads on light and dark tabs alike
mark = trimmed("forg-mark.png")
save(square(mark, 64, pad=0.02), "favicon.png")

# home screen and wallet icons are shown on a tile, so the banner tile is used
banner = Image.open(os.path.join(SRC, "forg-mark-banner.jpg")).convert("RGBA")
save(banner.resize((180, 180), Image.LANCZOS), "apple-touch-icon.png")
save(banner.resize((512, 512), Image.LANCZOS), "brand/forg-icon-512.png")

# social banner: the dark logo on black, lit from two corners like the banner tile
W, H = 1200, 630
og = Image.new("RGBA", (W, H), (5, 5, 5, 255))
og.alpha_composite(glow((W, H), (-80, -120), 620, LIME, 0.85))
og.alpha_composite(glow((W, H), (W + 60, H + 140), 700, LIME, 0.95))

logo = fit_width(trimmed("forg-logo-on-dark.png"), 300)
og.alpha_composite(logo, (96, 118))

draw = ImageDraw.Draw(og)
draw.text((92, 262), "Stocks change.", font=font(True, 84), fill=(255, 255, 255, 255))
draw.text((96, 372), "Your Stock Token should know.", font=font(False, 40), fill=(255, 255, 255, 214))
draw.text((96, 470), "Corporate action infrastructure for Stock Tokens", font=font(True, 24), fill=(255, 255, 255, 150))
draw.text((96, 510), "Detect  /  Verify  /  Apply  /  Confirm", font=font(True, 24), fill=(*LIME, 255))
save(og.convert("RGB").convert("RGBA"), "og.png")
