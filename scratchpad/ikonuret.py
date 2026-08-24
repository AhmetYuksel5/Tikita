#!/usr/bin/env python3
"""Tikita ikon üreteci — TEK KAYNAK public/tikita-logo.png.

PWA ikonları (public/icons), apple-touch/favicon ve Android APK'nın launcher
ikonları + açılış görseli hep buradan türer. Logo değişirse yalnız bu betiği
yeniden koştur:  python3 scratchpad/ikonuret.py

Neden tam kelime logosu (sadece "T" değil): "T"yi kırpmak navy konturu ortadan
kesiyor ve yanında "i"nin bir dilimi kalıyor — 192 px'te kesik/bozuk duruyor.
Tam logo o boyutta hâlâ okunuyor (ölçüldü), o yüzden her yerde o kullanılır.
"""
import os
from PIL import Image
import numpy as np

KOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
LOGO = os.path.join(KOK, "public", "tikita-logo.png")
BEYAZ = (255, 255, 255, 255)

# Maskable/adaptive ikon dairesel kırpılır → içerik güvenli alanda kalmalı.
# 0.06 = normal ikon payı, 0.19 = maskable/adaptive payı (içerik ~%62 genişlik).
PAY_DUZ, PAY_MASKE = 0.06, 0.19


def yaz(im, *yol):
    p = os.path.join(KOK, *yol)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, optimize=True)
    print("  ", os.path.relpath(p, KOK), im.size)


def kirp(im):
    """Logonun beyaz kenar boşluğunu atıp içeriği sıkı kırpar."""
    a = np.asarray(im).astype(int)
    ys, xs = np.where(a[..., :3].sum(axis=2) < 720)
    return im.crop((xs.min() - 4, ys.min() - 4, xs.max() + 5, ys.max() + 5))


def kare(src, boy, pay=PAY_DUZ, zemin=BEYAZ):
    """Logoyu kare tuvale ORANINI BOZMADAN, ortalayarak yerleştirir."""
    tuval = Image.new("RGBA", (boy, boy), zemin)
    ic = max(1, int(boy * (1 - 2 * pay)))
    s = src.copy()
    s.thumbnail((ic, ic), Image.LANCZOS)
    tuval.paste(s, ((boy - s.width) // 2, (boy - s.height) // 2), s)
    return tuval


def main():
    logo = kirp(Image.open(LOGO).convert("RGBA"))
    print("kırpılmış logo:", logo.size)

    print("PWA ikonları:")
    yaz(kare(logo, 192), "public", "icons", "icon-192.png")
    yaz(kare(logo, 512), "public", "icons", "icon-512.png")
    yaz(kare(logo, 512, PAY_MASKE), "public", "icons", "icon-maskable-512.png")
    yaz(kare(logo, 180), "public", "apple-touch-icon.png")
    yaz(kare(logo, 64), "public", "favicon.png")

    print("Android launcher ikonları:")
    res = ("android", "app", "src", "main", "res")
    # (klasör, legacy ic_launcher boyu, adaptive foreground 108dp karşılığı)
    for ad, duz, fg in [("mdpi", 48, 108), ("hdpi", 72, 162), ("xhdpi", 96, 216),
                        ("xxhdpi", 144, 324), ("xxxhdpi", 192, 432)]:
        yaz(kare(logo, duz), *res, "mipmap-" + ad, "ic_launcher.png")
        # adaptive foreground: zemin ŞEFFAF (zemin rengi ic_launcher_background'dan gelir)
        yaz(kare(logo, fg, PAY_MASKE, (255, 255, 255, 0)), *res, "mipmap-" + ad,
            "ic_launcher_foreground.png")

    # Açılış görseli xxxhdpi kovasında durur (÷4 → ~160dp genişlik). Düz `drawable/`
    # mdpi sayılır, 640 px orada 640dp olur ve ekranı taşardı.
    print("Açılış (splash) görseli:")
    sp = logo.copy()
    sp.thumbnail((640, 640), Image.LANCZOS)
    yaz(sp, *res, "drawable-xxxhdpi", "splash.png")


if __name__ == "__main__":
    main()
