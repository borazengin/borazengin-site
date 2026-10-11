/* =========================================================================
   borazengin.com — hesaplama motoru
   Yıllık parametreler bu dosyanın başında. Yeni yıl / dönem geldiğinde
   yalnızca PARAMS bloğunu güncellemek yeterli.
   ========================================================================= */
(function (root) {
  'use strict';

  var PARAMS = {
    yil: 2026,
    guncelleme: 'Ekim 2026',

    // Asgari ücret (2026, aylık)
    asgariBrut: 33030.00,

    // SGK
    sgkTavan: 297270.00,          // prime esas kazanç üst sınırı (aylık)
    sgkIsci: 0.14,                // MYÖ %9 + GSS %5
    issizlikIsci: 0.01,
    isverenOranlari: {            // işsizlik %2 dahil toplam işveren payı
      tesviksiz:  { oran: 0.2375, ad: 'Teşviksiz (%23,75)' },
      imalatDisi: { oran: 0.2175, ad: 'Teşvikli, imalat dışı (%21,75)' },
      imalat:     { oran: 0.1875, ad: 'Teşvikli, imalat (%18,75)' }
    },

    // Damga vergisi (ücret ve tazminatlar)
    damga: 0.00759,

    // 2026 gelir vergisi tarifesi — ücret gelirleri [üst sınır, oran]
    dilimler: [
      [190000, 0.15],
      [400000, 0.20],
      [1500000, 0.27],
      [5300000, 0.35],
      [Infinity, 0.40]
    ],

    // Kıdem tazminatı tavanı — geçerlilik başlangıcına göre
    kidemTavanlari: [
      { bas: '2025-01-01', tutar: 46655.43 },
      { bas: '2025-07-01', tutar: 53919.68 },
      { bas: '2026-01-01', tutar: 64948.77 },
      { bas: '2026-07-01', tutar: 73729.87 }
    ]
  };

  function r2(x) { return Math.round(x * 100 + (x >= 0 ? 1e-6 : -1e-6)) / 100; }

  /* Kümülatif matrah üzerinden toplam gelir vergisi */
  function gvToplam(matrah) {
    if (matrah <= 0) return 0;
    var vergi = 0, alt = 0;
    for (var i = 0; i < PARAMS.dilimler.length; i++) {
      var ust = PARAMS.dilimler[i][0], oran = PARAMS.dilimler[i][1];
      if (matrah <= ust) { vergi += (matrah - alt) * oran; return vergi; }
      vergi += (ust - alt) * oran; alt = ust;
    }
    return vergi;
  }

  /* Belirli bir ek matrahın, önceki kümülatif matrah üzerine binen vergisi */
  function gvArtis(oncekiKumulatif, ekMatrah) {
    return gvToplam(oncekiKumulatif + ekMatrah) - gvToplam(oncekiKumulatif);
  }

  /* Asgari ücretin GV matrahı (SGK + işsizlik düşülmüş) */
  function asgariGvMatrahi() {
    var b = PARAMS.asgariBrut;
    return b - r2(b * PARAMS.sgkIsci) - r2(b * PARAMS.issizlikIsci);
  }

  /* Ay (1-12) için asgari ücret GV istisnası — kümülatif hesap */
  function asgariGvIstisnasi(ay) {
    var m = asgariGvMatrahi();
    return r2(gvToplam(m * ay) - gvToplam(m * (ay - 1)));
  }

  function asgariDvIstisnasi() { return r2(PARAMS.asgariBrut * PARAMS.damga); }

  /* Tek ay bordrosu: brüt, ay (1-12), önceki aylardan devreden kümülatif GV matrahı */
  function bordro(brut, ay, kumulatifOnceki, isverenOrani) {
    var sgkMatrah = Math.min(brut, PARAMS.sgkTavan);
    var sgk = r2(sgkMatrah * PARAMS.sgkIsci);
    var issiz = r2(sgkMatrah * PARAMS.issizlikIsci);
    var gvMatrah = r2(brut - sgk - issiz);
    var gvHesaplanan = r2(gvArtis(kumulatifOnceki, gvMatrah));
    var gvIstisna = Math.min(gvHesaplanan, asgariGvIstisnasi(ay));
    var gv = r2(gvHesaplanan - gvIstisna);
    var dvHesaplanan = r2(brut * PARAMS.damga);
    var dvIstisna = Math.min(dvHesaplanan, asgariDvIstisnasi());
    var dv = r2(dvHesaplanan - dvIstisna);
    var net = r2(brut - sgk - issiz - gv - dv);
    var isverenPrim = r2(sgkMatrah * (isverenOrani == null ? PARAMS.isverenOranlari.tesviksiz.oran : isverenOrani));
    return {
      ay: ay, brut: r2(brut), sgkMatrah: r2(sgkMatrah), sgk: sgk, issizlik: issiz,
      gvMatrah: gvMatrah, kumulatif: r2(kumulatifOnceki + gvMatrah),
      gvHesaplanan: gvHesaplanan, gvIstisna: r2(gvIstisna), gv: gv,
      dvHesaplanan: dvHesaplanan, dvIstisna: r2(dvIstisna), dv: dv,
      net: net, isverenPrim: isverenPrim, maliyet: r2(brut + isverenPrim)
    };
  }

  /* Hedef nete ulaşan brütü bul (ikili arama, kuruş hassasiyeti) */
  function bruttenAra(hedefNet, ay, kumulatifOnceki, isverenOrani) {
    var lo = hedefNet, hi = hedefNet * 3 + 1000;
    for (var i = 0; i < 80; i++) {
      var mid = (lo + hi) / 2;
      if (bordro(mid, ay, kumulatifOnceki, isverenOrani).net < hedefNet) lo = mid; else hi = mid;
    }
    var b = r2(hi);
    // kuruş yuvarlaması: hedefin altına düşmeyen en küçük brüt
    while (bordro(r2(b - 0.01), ay, kumulatifOnceki, isverenOrani).net >= hedefNet) b = r2(b - 0.01);
    return b;
  }

  /* 12 aylık tablo. mod: 'brut' (sabit brüt) veya 'net' (sabit net) */
  function yillikTablo(tutar, mod, isverenOrani) {
    var satirlar = [], kum = 0;
    for (var ay = 1; ay <= 12; ay++) {
      var brut = mod === 'net' ? bruttenAra(tutar, ay, kum, isverenOrani) : tutar;
      var s = bordro(brut, ay, kum, isverenOrani);
      satirlar.push(s); kum = s.kumulatif;
    }
    return satirlar;
  }

  /* ----------------------------- Tazminat ----------------------------- */
  function tarih(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function kidemTavani(cikis) {
    var t = null;
    PARAMS.kidemTavanlari.forEach(function (k) { if (tarih(k.bas) <= cikis) t = k; });
    return t;
  }

  /* Takvim farkı: yıl, ay, gün */
  function sureFarki(bas, son) {
    var y = son.getFullYear() - bas.getFullYear();
    var m = son.getMonth() - bas.getMonth();
    var d = son.getDate() - bas.getDate();
    if (d < 0) {
      m -= 1;
      d += new Date(son.getFullYear(), son.getMonth(), 0).getDate();
    }
    if (m < 0) { y -= 1; m += 12; }
    return { yil: y, ay: m, gun: d, toplamGun: Math.round((son - bas) / 86400000) };
  }

  function ihbarHaftasi(sure) {
    var aylar = sure.yil * 12 + sure.ay + sure.gun / 30;
    if (aylar < 6) return 2;
    if (aylar < 18) return 4;
    if (aylar < 36) return 6;
    return 8;
  }

  /* opts: {giris, cikis (YYYY-MM-DD), brut, ekOdemeler, kidemHakki, ihbarHakki, kumulatif (ops.)} */
  function tazminat(opts) {
    var giris = tarih(opts.giris), cikis = tarih(opts.cikis);
    if (!(cikis > giris)) return { hata: 'Çıkış tarihi giriş tarihinden sonra olmalı.' };
    var sure = sureFarki(giris, cikis);
    var giydirilmis = r2((opts.brut || 0) + (opts.ekOdemeler || 0));
    var gunluk = giydirilmis / 30;
    var tavanKaydi = kidemTavani(cikis);
    var sonuc = { sure: sure, giydirilmis: giydirilmis, tavan: tavanKaydi, uyarilar: [] };

    if (cikis.getFullYear() !== PARAMS.yil)
      sonuc.uyarilar.push('Gelir vergisi ' + PARAMS.yil + ' tarifesiyle hesaplandı; çıkış yılı farklı olduğu için sonuç yaklaşıktır.');
    if (!tavanKaydi)
      sonuc.uyarilar.push('Bu çıkış tarihi için tavan tanımlı değil; tavan uygulanmadı.');

    // Kıdem
    var kidem = { hak: false, brut: 0, dv: 0, net: 0 };
    if (opts.kidemHakki) {
      if (sure.yil < 1) {
        sonuc.uyarilar.push('Kıdem tazminatı için en az 1 yıl çalışma gerekir.');
      } else {
        var esas = tavanKaydi ? Math.min(giydirilmis, tavanKaydi.tutar) : giydirilmis;
        var b = esas * sure.yil + esas * sure.ay / 12 + esas * sure.gun / 365;
        kidem = { hak: true, esas: r2(esas), tavanUygulandi: !!(tavanKaydi && giydirilmis > tavanKaydi.tutar),
                  brut: r2(b), dv: r2(b * PARAMS.damga) };
        kidem.net = r2(kidem.brut - kidem.dv);
      }
    }
    sonuc.kidem = kidem;

    // İhbar
    var hafta = ihbarHaftasi(sure);
    var ihbar = { hak: false, hafta: hafta, gun: hafta * 7, brut: 0, gv: 0, dv: 0, net: 0 };
    if (opts.ihbarHakki) {
      var ib = r2(gunluk * hafta * 7);
      var kum;
      if (opts.kumulatif != null && opts.kumulatif !== '' && !isNaN(opts.kumulatif)) {
        kum = +opts.kumulatif; ihbar.kumulatifKaynak = 'girilen';
      } else {
        // Tahmin: çıkış yılında, çıkış ayı dahil her ay aynı brütle bordro yapılmış
        var ayAdedi = cikis.getFullYear() === giris.getFullYear() ? cikis.getMonth() - giris.getMonth() + 1 : cikis.getMonth() + 1;
        kum = 0;
        for (var a = 1; a <= ayAdedi; a++) kum = bordro(opts.brut, a, kum).kumulatif;
        ihbar.kumulatifKaynak = 'tahmin';
      }
      ihbar.kumulatif = r2(kum);
      ihbar.hak = true;
      ihbar.brut = ib;
      ihbar.gv = r2(gvArtis(kum, ib));
      ihbar.dv = r2(ib * PARAMS.damga);
      ihbar.net = r2(ib - ihbar.gv - ihbar.dv);
    }
    sonuc.ihbar = ihbar;
    sonuc.toplamNet = r2(kidem.net + ihbar.net);
    sonuc.toplamBrut = r2(kidem.brut + ihbar.brut);
    return sonuc;
  }

  /* ----------------------------- Yardımcılar ----------------------------- */
  function tl(x) {
    return (x || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  }
  /* "45.000,50" veya "45000.5" girişlerini sayıya çevir */
  function sayi(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').replace(/\s|TL/gi, '');
    if (!s) return NaN;
    if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
    else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace('.', '');
    return parseFloat(s);
  }

  var api = {
    PARAMS: PARAMS, r2: r2, gvToplam: gvToplam, gvArtis: gvArtis,
    asgariGvIstisnasi: asgariGvIstisnasi, asgariDvIstisnasi: asgariDvIstisnasi,
    bordro: bordro, bruttenAra: bruttenAra, yillikTablo: yillikTablo,
    sureFarki: sureFarki, ihbarHaftasi: ihbarHaftasi, kidemTavani: kidemTavani,
    tazminat: tazminat, tl: tl, sayi: sayi
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Hesap = api;
})(this);
