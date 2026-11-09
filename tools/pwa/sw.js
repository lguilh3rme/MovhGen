// Service worker mínimo: só habilita a instalação do app. Não guarda nada em cache,
// então o aviso de versão nova (version.json) continua valendo e o app nunca fica velho.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function(){});
// Toque na notificação (fim do descanso): volta pro app que já está aberto, ou abre ele.
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});
