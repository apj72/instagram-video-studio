"""Create the September Mix artwork used by the CLI video job."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


WIDTH, HEIGHT = 1080, 1920
DESTINATION = Path(__file__).with_name("background.png")

y, x = np.mgrid[0:HEIGHT, 0:WIDTH]
blend = y / (HEIGHT - 1)
top = np.array([12, 10, 31], dtype=np.float32)
bottom = np.array([3, 14, 28], dtype=np.float32)
base = top[None, None, :] * (1 - blend[..., None]) + bottom[None, None, :] * blend[..., None]

for cx, cy, radius, tint, intensity in [
    (130, 340, 630, (125, 31, 113), 0.32),
    (900, 1390, 740, (18, 115, 145), 0.27),
    (630, 830, 460, (103, 35, 82), 0.15),
]:
    glow = np.exp(-(((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius))) * intensity
    base += glow[..., None] * np.array(tint, dtype=np.float32)

rng = np.random.default_rng(20260923)
base += rng.normal(0, 1.35, (HEIGHT, WIDTH, 1))
image = Image.fromarray(np.uint8(np.clip(base, 0, 255)), "RGB").convert("RGBA")

glows = Image.new("RGBA", (WIDTH, HEIGHT))
draw = ImageDraw.Draw(glows)
draw.ellipse((80, 460, 1000, 1380), outline=(217, 64, 133, 60), width=20)
draw.ellipse((150, 530, 930, 1310), outline=(61, 190, 210, 50), width=14)
image = Image.alpha_composite(image, glows.filter(ImageFilter.GaussianBlur(60)))

art = Image.new("RGBA", (WIDTH, HEIGHT))
draw = ImageDraw.Draw(art)
for radius, alpha in [(435, 65), (405, 55), (370, 42), (315, 35), (260, 28)]:
    draw.ellipse((540 - radius, 950 - radius, 540 + radius, 950 + radius),
                 outline=(181, 136, 210, alpha), width=2)

draw.arc((110, 520, 970, 1380), 200, 338, fill=(247, 81, 125, 115), width=7)
draw.arc((140, 550, 940, 1350), 23, 133, fill=(79, 215, 221, 105), width=5)

for index in range(68):
    px = 75 + index * 14
    amplitude = 14 + 80 * abs(np.sin(index * 0.29) * np.cos(index * 0.071))
    draw.line((px, 1690 - amplitude, px, 1690 + amplitude),
              fill=(86, 200, 215, 68), width=5)

draw.line((100, 215, 980, 215), fill=(247, 81, 125, 92), width=3)
draw.line((100, 1515, 980, 1515), fill=(247, 81, 125, 92), width=3)

image = Image.alpha_composite(image, art).convert("RGB")
image.save(DESTINATION, optimize=True)
print(DESTINATION)
