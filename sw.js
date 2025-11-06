/**
 * Service Worker para PWA - Futsal Stats
 * Permite funcionamiento offline y cacheo de recursos
 */

const CACHE_NAME = 'futsal-stats-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Recursos a cachear en la instalación
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/admin.html',
    '/offline.html',
    
    // CSS
    '/css/main.css',
    '/css/admin.css',
    '/css/mobile.css',
    '/css/sidebar.css',
    '/css/tables.css',
    '/css/player-stats.css',
    '/css/simulador.css',
    '/css/analisisIA.css',
    '/css/security-dashboard.css',
    
    // JavaScript - Core
    '/js/config.js',
    '/js/main.js',
    '/js/dataManager.js',
    
    // JavaScript - Auth
    '/js/auth/authManager.js',
    '/js/auth/authGuard.js',
    
    // JavaScript - UI
    '/js/ui/sidebar.js',
    '/js/ui/clasificacion.js',
    '/js/ui/estadisticas.js',
    '/js/ui/historico.js',
    '/js/ui/playerStats.js',
    '/js/ui/simulador.js',
    '/js/ui/analisisIA.js',
    '/js/ui/securityDashboard.js',
    
    // JavaScript - Utils
    '/js/utils/calculations.js',
    '/js/utils/rendering.js',
    '/js/utils/validation.js',
    '/js/utils/security.js',
    '/js/utils/logger.js',
    
    // JavaScript - Security
    '/js/security/index.js',
    '/js/security/rateLimiter.js',
    '/js/security/csrfProtection.js',
    '/js/security/honeypot.js',
    '/js/security/ipWhitelist.js',
    '/js/security/sessionTimeout.js',
    
    // JavaScript - Admin
    '/js/admin/panel.js',
    
    // JavaScript - Services
    '/js/services/aiAnalyzer.js',
    
    // Manifest
    '/manifest.json',
    
    // Icons (se añadirán cuando existan)
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

// CDN Resources (no se cachean, pero se intentan primero)
const CDN_URLS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

/**
 * Evento: Instalación del Service Worker
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Cacheando recursos estáticos...');
                // Cachear recursos uno por uno para no fallar si alguno no existe
                return Promise.allSettled(
                    STATIC_CACHE_URLS.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`[SW] No se pudo cachear ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => {
                console.log('[SW] Recursos cacheados exitosamente');
                return self.skipWaiting(); // Activar inmediatamente
            })
            .catch((error) => {
                console.error('[SW] Error al cachear recursos:', error);
            })
    );
});

/**
 * Evento: Activación del Service Worker
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar caches antiguos
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => cacheName !== CACHE_NAME)
                        .map((cacheName) => {
                            console.log('[SW] Eliminando cache antiguo:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Service Worker activado');
                return self.clients.claim(); // Tomar control inmediato
            })
    );
});

/**
 * Evento: Interceptar requests (fetch)
 * Estrategia: Network First con fallback a Cache
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requests que no son GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar requests a Supabase (API, Auth, Storage)
    if (url.hostname.includes('supabase.co')) {
        return; // Dejar que pase sin interceptar
    }
    
    // Ignorar Chrome extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }
    
    event.respondWith(
        networkFirstStrategy(request)
            .catch(() => {
                // Si falla network y cache, mostrar página offline
                if (request.destination === 'document') {
                    return caches.match(OFFLINE_URL);
                }
                // Para otros recursos, retornar error
                return new Response('Offline', { status: 503 });
            })
    );
});

/**
 * Estrategia: Network First con fallback a Cache
 * Intenta obtener de la red primero, si falla usa cache
 */
async function networkFirstStrategy(request) {
    try {
        // Intentar obtener de la red
        const networkResponse = await fetch(request);
        
        // Si la respuesta es válida, actualizar cache
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Si falla la red, buscar en cache
        console.log('[SW] Network failed, buscando en cache:', request.url);
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Si no está en cache, lanzar error
        throw error;
    }
}

/**
 * Estrategia alternativa: Cache First (para assets estáticos)
 * Busca primero en cache, luego en red
 */
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Error fetching:', request.url, error);
        throw error;
    }
}

/**
 * Evento: Mensaje desde el cliente
 * Permite comunicación bidireccional
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(() => {
                console.log('[SW] Cache eliminado');
                return self.clients.matchAll();
            }).then((clients) => {
                clients.forEach(client => 
                    client.postMessage({ type: 'CACHE_CLEARED' })
                );
            })
        );
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({ 
            type: 'VERSION', 
            version: CACHE_NAME 
        });
    }
});

/**
 * Evento: Sincronización en background (opcional)
 * Permite sincronizar datos cuando vuelve la conexión
 */
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'sync-data') {
        event.waitUntil(syncOfflineData());
    }
});

/**
 * Sincronizar datos offline cuando vuelve la conexión
 */
async function syncOfflineData() {
    // Aquí puedes implementar lógica para sincronizar datos
    // que se guardaron mientras estabas offline
    console.log('[SW] Sincronizando datos offline...');
}

/**
 * Evento: Notificaciones Push (opcional)
 */
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        data: data
    };
    
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'Futsal Stats',
            options
        )
    );
});

/**
 * Evento: Click en notificación
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data?.url || '/')
    );
});

console.log('[SW] Service Worker cargado');
