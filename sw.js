// Service worker mínimo: só torna o Gerador instalável; sempre busca da rede (sem cache) para não servir versão velha.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(e){ if (e.request.method === 'GET') e.respondWith(fetch(e.request).catch(function(){ return new Response('Sem conexão', { status: 503 }); })); });
