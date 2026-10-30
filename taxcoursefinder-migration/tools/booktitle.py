"""Redraw the book title on the hero photo in the cover's perspective (from the untitled original)."""
import numpy as np, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
S = '/tmp/claude-0/-home-user-claude/01e6a9c1-e9a5-5bce-a8b9-5f9047196d9c/scratchpad'
quad = [tuple(map(float, p.split(','))) for p in sys.argv[1:5]]  # cover TL TR BR BL in photo pixels
base = Image.open(S + '/wpmedia/493-05-tax-study-workspace.webp').convert('RGB')
W, H = 600, 900  # flat cover canvas
cover = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(cover)
cream = (232, 222, 196, 235)
big = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 84)
small = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 36)
def center(y, text, font, fill, spacing=0):
    w = d.textlength(text, font=font) + spacing * (len(text) - 1)
    x = (W - w) / 2
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + spacing
center(250, 'FEDERAL', big, cream, 4)
center(350, 'TAX LAW', big, cream, 4)
d.line([(150, 478), (450, 478)], fill=(232, 222, 196, 190), width=4)
center(505, '2026 EDITION', small, (232, 222, 196, 215), 3)
cover = cover.filter(ImageFilter.GaussianBlur(0.8))
# perspective: output (photo) -> input (flat cover) coefficients
src = [(0, 0), (W, 0), (W, H), (0, H)]
A, B = [], []
for (x, y), (u, v) in zip(quad, src):
    A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
    A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
coef = np.linalg.solve(np.array(A), np.array(B))
layer = cover.transform(base.size, Image.PERSPECTIVE, tuple(coef), Image.BICUBIC)
out = base.convert('RGBA'); out.alpha_composite(layer)
out = out.convert('RGB')
out.save(S + '/heroimg/hero-new.webp', quality=86, method=6)
out.crop((952, 204, 1536, 870)).save(S + '/heroimg/book-new.png')
print('ok')
