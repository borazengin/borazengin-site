# borazengin.com

Statik site. `public/` klasöründeki dosyalar Cloudflare Workers üzerinden yayınlanır.
`main` dalına yapılan her gönderim otomatik olarak yayına alınır.

- Yıllık vergi/SGK parametreleri: `public/hesap.js` dosyasının başındaki `PARAMS` bloğu
- Dini bayram tarihleri (vergi takvimi kaydırması): `public/vergi-takvimi.html` içindeki `DINI` listesi
