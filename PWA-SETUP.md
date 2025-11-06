# 📱 PWA (Progressive Web App) - Futsal Stats

## ✅ Implementación Completada

La aplicación Futsal Stats ahora es una **Progressive Web App** completa que puede:
- 📥 **Instalarse** en dispositivos móviles y escritorio
- 📴 **Funcionar offline** con recursos cacheados
- 🚀 **Cargarse rápidamente** gracias al Service Worker
- 📲 **Comportarse como app nativa** con pantalla completa

---

## 📋 Archivos Creados

### 1. `manifest.json` (Raíz del proyecto)
Configuración de la PWA con:
- Nombre, descripción, iconos
- Modo de visualización (standalone)
- Colores de tema
- Shortcuts (atajos rápidos)

### 2. `sw.js` (Service Worker - Raíz del proyecto)
Gestión de cache y funcionamiento offline:
- Cache de recursos estáticos (HTML, CSS, JS)
- Estrategia Network First con fallback a cache
- Actualización automática de recursos
- Página offline personalizada

### 3. `offline.html` (Raíz del proyecto)
Página que se muestra cuando no hay conexión:
- Diseño atractivo con instrucciones
- Botón de reintento
- Auto-detección de conexión restaurada

### 4. `icons/generate-icons.html`
Generador de iconos para la PWA:
- Crea iconos de 72x72 hasta 512x512 px
- Diseño con balón de fútbol
- Descarga automática en PNG

---

## 🎨 Generar Iconos

### Paso 1: Abrir el generador
1. Abre en el navegador: `icons/generate-icons.html`
2. Verás todos los iconos generados automáticamente

### Paso 2: Descargar iconos
**Opción A - Todos a la vez:**
- Clic en "Generar Todos los Iconos"
- Se descargarán automáticamente con los nombres correctos

**Opción B - Uno por uno:**
- Clic derecho en cada canvas → "Guardar imagen como..."
- Nombrar: `icon-72x72.png`, `icon-96x96.png`, etc.

### Paso 3: Mover iconos
Coloca todos los PNG descargados en la carpeta `icons/`:
```
icons/
├── icon-72x72.png
├── icon-96x96.png
├── icon-128x128.png
├── icon-144x144.png
├── icon-152x152.png
├── icon-192x192.png
├── icon-384x384.png
└── icon-512x512.png
```

### Alternativa: Usar tus propios iconos
Si prefieres diseñar iconos personalizados:
1. Crea imágenes PNG con las dimensiones requeridas
2. Colócalas en `icons/` con los nombres correctos
3. Recomendado: fondo sólido o degradado (no transparente para maskable)

---

## 🚀 Cómo Funciona

### Instalación en Móvil (Android/iOS)

**Android (Chrome):**
1. Abre la web en Chrome
2. Aparecerá banner: "📱 Instala Futsal Stats en tu dispositivo"
3. Clic en "Instalar"
4. O menú (⋮) → "Instalar aplicación"
5. ✅ Icono aparece en home screen

**iOS (Safari):**
1. Abre la web en Safari
2. Toca botón "Compartir" (cuadrado con flecha)
3. Desplázate y selecciona "Añadir a pantalla de inicio"
4. Personaliza nombre y confirma
5. ✅ Icono aparece en home screen

**Escritorio (Chrome/Edge):**
1. Abre la web
2. Icono de instalación en barra de direcciones (+)
3. Clic en "Instalar"
4. ✅ App se abre en ventana independiente

### Funcionamiento Offline

El Service Worker cachea automáticamente:
- ✅ Páginas HTML (index.html, admin.html)
- ✅ Todos los CSS
- ✅ Todo el JavaScript
- ✅ Manifest y meta tags

**Qué funciona offline:**
- Ver clasificación (última cargada)
- Ver estadísticas (últimas cargadas)
- Navegación entre secciones
- Interfaz completa

**Qué NO funciona offline:**
- Login/Logout (requiere Supabase)
- Guardar nuevos partidos
- Actualizar datos en tiempo real

**Cuando vuelve la conexión:**
- Los datos se sincronizan automáticamente
- El cache se actualiza con nuevas versiones

---

## 🔧 Configuración Avanzada

### Cambiar Estrategia de Cache

En `sw.js`, puedes modificar la estrategia:

```javascript
// Opción 1: Network First (actual)
// Prioriza red, fallback a cache
event.respondWith(networkFirstStrategy(request));

// Opción 2: Cache First
// Prioriza cache, fallback a red (más rápido pero menos actualizado)
event.respondWith(cacheFirstStrategy(request));
```

### Actualizar Versión del Cache

Cuando hagas cambios importantes:

```javascript
// En sw.js, cambiar versión
const CACHE_NAME = 'futsal-stats-v1.0.1'; // Incrementar versión
```

Esto forzará recarga de cache en próxima visita.

### Limpiar Cache Manualmente

Desde consola del navegador:

```javascript
// Limpiar todo el cache
caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
});

// Desregistrar Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
});
```

---

## 🧪 Testing

### Test 1: Verificar Manifest
1. Abre DevTools → Application → Manifest
2. Verifica que todos los campos estén correctos
3. Iconos deben mostrarse sin errores

### Test 2: Verificar Service Worker
1. DevTools → Application → Service Workers
2. Debe aparecer `/sw.js` como "activated and running"
3. Puedes hacer clic en "Update" para forzar actualización

### Test 3: Verificar Cache
1. DevTools → Application → Cache Storage
2. Debe aparecer `futsal-stats-v1.0.0`
3. Expandir y ver todos los recursos cacheados

### Test 4: Probar Offline
1. DevTools → Network → marcar "Offline"
2. Recargar página (F5)
3. Debe funcionar completamente
4. Si fallas requests a Supabase, es normal (sin internet)

### Test 5: Instalación
1. Abre en móvil
2. Verifica que aparezca banner de instalación
3. Instala y verifica icono en home screen
4. Abre desde home screen → debe verse como app (sin barra de navegador)

---

## 📊 Métricas PWA

Para verificar la calidad de tu PWA:

1. **Lighthouse Audit:**
   - DevTools → Lighthouse
   - Selecciona "Progressive Web App"
   - Clic en "Generate report"
   - Objetivo: Score > 90

2. **PWA Checklist:**
   - ✅ HTTPS (requerido en producción)
   - ✅ Service Worker registrado
   - ✅ Manifest válido con iconos
   - ✅ Responde con 200 cuando offline
   - ✅ Configura viewport
   - ✅ Página carga rápido (< 3s)

---

## 🚀 Despliegue en Producción

### GitHub Pages (Actual)
Ya funciona automáticamente porque todos los archivos están en el repo.

### Verificaciones Pre-Deploy:
1. ✅ Todos los iconos PNG generados y en `/icons/`
2. ✅ Manifest apunta a URLs correctas
3. ✅ Service Worker cachea rutas correctas
4. ✅ CSP permite Service Worker

### Post-Deploy:
1. Visita la URL en móvil
2. Verifica que ofrezca instalación
3. Instala y prueba funcionamiento
4. Verifica modo offline

---

## 🎯 Próximas Mejoras (Opcional)

### 1. Notificaciones Push
Añadir sistema de notificaciones:
```javascript
// Solicitar permiso
Notification.requestPermission();

// Enviar notificación
self.registration.showNotification('Partido mañana!', {
    body: 'No olvides confirmar asistencia',
    icon: '/icons/icon-192x192.png'
});
```

### 2. Background Sync
Sincronizar datos cuando vuelve conexión:
```javascript
navigator.serviceWorker.ready.then(registration => {
    registration.sync.register('sync-data');
});
```

### 3. Share API
Compartir estadísticas:
```javascript
if (navigator.share) {
    navigator.share({
        title: 'Mis estadísticas',
        text: 'Mira mis stats en Futsal!',
        url: window.location.href
    });
}
```

### 4. Add to Home Screen Prompt
Banner personalizado más elaborado con:
- Animaciones
- Tutoriales
- Screenshots

---

## 📚 Recursos

- [PWA Builder](https://www.pwabuilder.com/) - Validador y generador
- [Workbox](https://developers.google.com/web/tools/workbox) - Librería para SW avanzados
- [Web.dev PWA](https://web.dev/progressive-web-apps/) - Guías oficiales de Google
- [Can I Use - Service Worker](https://caniuse.com/serviceworkers) - Compatibilidad

---

## 🐛 Troubleshooting

### Problema: "Service Worker no se registra"
**Solución:**
- Verifica que estés en HTTPS (o localhost)
- Revisa consola para errores
- Verifica ruta: debe ser `/sw.js` en raíz

### Problema: "Offline no funciona"
**Solución:**
- Verifica que recursos estén en cache (DevTools → Application → Cache)
- Comprueba estrategia de fetch en `sw.js`
- Asegúrate que URLs en cache coincidan con las reales

### Problema: "No aparece banner de instalación"
**Solución:**
- Manifest debe ser válido (DevTools → Application → Manifest)
- Todos los iconos deben existir
- Solo aparece si cumple criterios PWA de Google
- Puede que ya esté instalada (no vuelve a aparecer)

### Problema: "Cache no se actualiza"
**Solución:**
- Incrementa versión en `sw.js`: `CACHE_NAME`
- O fuerza update: DevTools → Application → Service Workers → Update
- O limpia cache manualmente (ver sección anterior)

---

## ✅ Checklist de Implementación

- [x] Crear `manifest.json` con configuración completa
- [x] Crear `sw.js` con estrategias de cache
- [x] Crear `offline.html` para sin conexión
- [x] Agregar meta tags PWA en `index.html`
- [x] Agregar meta tags PWA en `admin.html`
- [x] Registrar Service Worker en ambas páginas
- [x] Crear generador de iconos
- [ ] **Generar iconos PNG** (abre `icons/generate-icons.html`)
- [ ] Probar instalación en móvil
- [ ] Probar funcionamiento offline
- [ ] Ejecutar Lighthouse audit

---

**Fecha de implementación:** 6 de Noviembre de 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado (pendiente generación de iconos)
