"""Build the web logo files from the official FORG logo pack.

Sources live in brand-assets/logo/, exactly as delivered:
  forg-logo-on-light.png   full logo, black wordmark, for white surfaces
  forg-logo-on-dark.png    full logo, white wordmark, for dark surfaces
  forg-mark.png            the mark alone, lime gradient
  forg-mark-mono.png       the mark alone, flat black: the darker option
  forg-mark-banner.jpg     the mark on black with the lime corner glow

The site uses the darker option: the lime gradient clashes with Base blue,
so the logo and icons are drawn in the black of forg-mark-mono.png.
  forg-x-banner.png        the X header banner, 5000 x 1667

Writes, into public/:
  brand/forg-logo.png      header and footer logo
  brand/forg-icon-512.png  wallet metadata and any square app icon
  favicon.png              browser tab
  apple-touch-icon.png     home screen
  og.png                   social banner, 1200 x 630, cut from the X banner

Run from the project root:  python scripts/build-brand.py
Needs Pillow.
"""
import os
from PIL import Image, ImageDraw

SRC = "brand-assets/logo"
OUT = "public"
os.makedirs(os.path.join(OUT, "brand"), exist_ok=True)


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


def in_black(im):
    """The same shape, every pixel in the pack's flat black."""
    black = Image.new("RGBA", im.size, (0, 0, 0, 255))
    black.putalpha(im.getchannel("A"))
    return black


def on_tile(im, size, pad, radius):
    """`im` centred on a white rounded tile, so the black mark reads on dark tabs too."""
    tile = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(tile).rounded_rectangle((0, 0, size - 1, size - 1), round(size * radius), fill=(255, 255, 255, 255))
    tile.alpha_composite(square(im, size, pad))
    return tile


def save(im, path):
    full = os.path.join(OUT, path)
    im.save(full, "PNG", optimize=True)
    print(f"  wrote {path} ({os.path.getsize(full) // 1024} kB)")


# header and footer: shown at 30 to 40 px tall, so 480 wide covers 3x screens.
# The light logo already has the black wordmark; its mark is turned black too.
save(fit_width(in_black(trimmed("forg-logo-on-light.png")), 480), "brand/forg-logo.png")

# square icons: the black mark on a white tile
mark = trimmed("forg-mark-mono.png")
save(on_tile(mark, 64, pad=0.12, radius=0.22), "favicon.png")

# home screen: iOS rounds the corners itself, so the tile is a plain square
save(on_tile(mark, 180, pad=0.18, radius=0), "apple-touch-icon.png")
save(on_tile(mark, 512, pad=0.18, radius=0.22), "brand/forg-icon-512.png")

# social banner: the X banner cut to 1200 x 630. The logo and tagline sit on
# the right, so the cut keeps the full height and drops the left of the waves.
W, H = 1200, 630
xb = Image.open(os.path.join(SRC, "forg-x-banner.png")).convert("RGB")
cut = round(xb.height * W / H)
og = xb.crop((xb.width - cut, 0, xb.width, xb.height)).resize((W, H), Image.LANCZOS)
save(og, "og.png")
