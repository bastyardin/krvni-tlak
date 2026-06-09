// ============================================================
// Service worker za Dnevnik krvnega tlaka
// Omogoča delovanje aplikacije brez internetne povezave (PWA).
//
// POMEMBNO: ob večji spremembi aplikacije povečajte številko
// različice spodaj (v1 -> v2 -> v3 ...), da uporabniki ob
// naslednjem obisku dobijo svežo kopijo datotek.
// ============================================================
const CACHE = 'krvni-tlak-v1';

// Datoteke, ki se shranijo v predpomnilnik ob namestitvi
const DATOTEKE = [
  './',
  './index.html',
  './chart.umd.min.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Namestitev: shrani vse datoteke aplikacije
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(DATOTEKE))
      .then(() => self.skipWaiting())
  );
});

// Aktivacija: pobriši stare različice predpomnilnika
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((kljuci) => Promise.all(
      kljuci
        .filter((k) => k.startsWith('krvni-tlak-') && k !== CACHE)
        .map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Streženje zahtev
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Zunanje zahteve (npr. analitika) pusti mimo - ne predpomnimo
  if (url.origin !== location.origin) return;

  // HTML: najprej splet (da uporabnik dobi posodobitve),
  // ob neuspehu (brez povezave) pa shranjena kopija.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then((odg) => {
          const kopija = odg.clone();
          caches.open(CACHE).then((c) => c.put(req, kopija));
          return odg;
        })
        .catch(() =>
          caches.match(req).then((z) => z || caches.match('./index.html'))
        )
    );
    return;
  }

  // Ostale datoteke: najprej predpomnilnik, ob neuspehu splet
  e.respondWith(
    caches.match(req).then((zadetek) =>
      zadetek ||
      fetch(req).then((odg) => {
        const kopija = odg.clone();
        caches.open(CACHE).then((c) => c.put(req, kopija));
        return odg;
      })
    )
  );
});
