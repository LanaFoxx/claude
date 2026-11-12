import numpy as np
from PIL import Image, ImageFilter
rng = np.random.default_rng(7)
W, H, PLANKS = 1800, 1200, 5
def noise(w, h, gx, gy, seed):
    r = np.random.default_rng(seed).random((gy, gx)).astype(np.float32)
    return np.asarray(Image.fromarray((r * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
ph = H / PLANKS
img = np.zeros((H, W, 3), np.float32)
for i in range(PLANKS):
    y0, y1 = int(i * ph), int((i + 1) * ph)
    sl = slice(y0, y1); h = y1 - y0
    warp = (noise(W, h, 4, 2, 10 + i) - 0.5) * 120 + (noise(W, h, 14, 4, 20 + i) - 0.5) * 22
    # knots: local swirl
    for _ in range(rng.integers(1, 3)):
        kx, ky, kr = rng.uniform(0.1, 0.9) * W, rng.uniform(0.3, 0.7) * h, rng.uniform(60, 120)
        d = np.sqrt(((xx[sl] - kx) / 2.6) ** 2 + (yy[sl] - y0 - ky) ** 2)
        warp += 26 * np.exp(-(d / kr) ** 2) * np.sign(yy[sl] - y0 - ky + 0.01)
    t = (yy[sl] - y0 + warp) * (0.16 + 0.08 * noise(W, h, 3, 2, 60 + i))
    grain = 0.5 + 0.5 * np.sin(t + 2.5 * noise(W, h, 10, 30, 30 + i))
    grain = grain ** 4
    fine = 0.6 * noise(W, h, 12, 160, 40 + i) + 0.4 * noise(W, h, 30, 90, 45 + i)
    v = 0.58 + 0.22 * grain + 0.30 * fine
    tone = rng.uniform(0.85, 1.1)
    base = np.array([58, 34, 24], np.float32) * tone  # dark walnut brown
    plank = base[None, None, :] * v[..., None]
    plank *= (0.9 + 0.2 * noise(W, h, 3, 1, 50 + i))[..., None]
    img[sl] = plank
    img[y0:y0 + 3] *= 0.35  # seam between planks
img = np.clip(img, 0, 255).astype(np.uint8)
out = Image.fromarray(img).filter(ImageFilter.GaussianBlur(0.6))
out.save(__import__('os').path.join(__import__('os').path.dirname(__import__('os').path.abspath(__file__)), '..', 'output', 'textures', 'tn-wood-texture.jpg'), quality=78, optimize=True, progressive=True)
print(out.size)
