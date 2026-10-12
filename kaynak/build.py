"""Alt sayfaları ortak şablonla üretir: python3 build.py <src_dir> <site_dir>"""
import sys, pathlib, html

src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
icons = (src / "icon.txt").read_text(encoding="utf-8").strip()
BASE = "https://www.borazengin.com/"

PAGES = [
    # dosya, gövde, başlık, açıklama, menüde aktif anahtar
    ("kidem-ihbar-tazminati.html", "kidem.body.html",
     "Kıdem ve İhbar Tazminatı Hesaplama 2026 | Bora Zengin SMMM",
     "2026 kıdem tazminatı tavanı, ihbar süreleri ve vergi kesintileriyle kıdem ve ihbar tazminatı hesaplama aracı.", "araclar"),
    ("net-brut-maas.html", "maas.body.html",
     "Net Brüt Maaş Hesaplama 2026 | Bora Zengin SMMM",
     "2026 brütten nete ve netten brüte maaş hesaplama: SGK, kümülatif gelir vergisi, asgari ücret istisnası ve işveren maliyeti.", "araclar"),
    ("vergi-takvimi.html", "takvim.body.html",
     "Vergi Takvimi – Yaklaşan Beyanname ve Ödeme Son Günleri | Bora Zengin SMMM",
     "Muhtasar, KDV, SGK, geçici vergi ve yıllık beyanname son günleri; resmi tatil kaydırmalı güncel vergi takvimi.", "araclar"),
    ("gizlilik.html", "gizlilik.body.html",
     "Gizlilik ve KVKK Aydınlatma Metni | Bora Zengin SMMM",
     "borazengin.com gizlilik politikası ve 6698 sayılı KVKK kapsamında aydınlatma metni.", None),
]


def page(fname, body, title, desc, active):
    url = BASE + fname.replace(".html", "")
    cur = ' aria-current="page"'
    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="tr_TR">
<meta property="og:image" content="{BASE}og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1b2258">
{icons}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css">
</head>
<body>
<nav>
  <div class="wrap nav-inner">
    <a class="nav-brand" href="index.html">bora<span>zengin</span>.com</a>
    <ul class="nav-links">
      <li><a href="index.html#hizmetler">Hizmetler</a></li>
      <li class="keep"><a href="index.html#araclar"{cur if active == 'araclar' else ''}>Araçlar</a></li>
      <li class="keep"><a href="index.html#iletisim">İletişim</a></li>
    </ul>
  </div>
</nav>
{body.strip()}
<footer>
  <div class="wrap foot">
    <div>© <span class="yil"></span> Bora Zengin — SMMM, Kırklareli</div>
    <div><a href="kidem-ihbar-tazminati.html">Tazminat</a> · <a href="net-brut-maas.html">Maaş</a> · <a href="vergi-takvimi.html">Vergi takvimi</a> · <a href="gizlilik.html">Gizlilik</a></div>
  </div>
</footer>
<script>document.querySelectorAll('.yil').forEach(function(e){{e.textContent=new Date().getFullYear();}});</script>
</body>
</html>
"""

for fname, bodyf, title, desc, active in PAGES:
    (out / fname).write_text(page(fname, (src / bodyf).read_text(encoding="utf-8"), title, desc, active), encoding="utf-8")
    print("yazıldı:", fname)
