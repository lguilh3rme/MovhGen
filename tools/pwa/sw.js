// Service worker mínimo: só habilita a instalação do app. Não guarda nada em cache,
// então o aviso de versão nova (version.json) continua valendo e o app nunca fica velho.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(){});
