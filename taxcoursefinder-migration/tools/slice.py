import sys, glob
from PIL import Image
for f in sys.argv[1:]:
    im = Image.open(f); w, h = im.size
    im = im.resize((w // 2, h // 2)); n = 0
    for i, y in enumerate(range(0, h // 2, 1300)):
        im.crop((0, y, w // 2, min(h // 2, y + 1300))).save(f.replace('.png', '-part%d.png' % i)); n += 1
    print(f.rsplit('/', 1)[-1], h, n)
