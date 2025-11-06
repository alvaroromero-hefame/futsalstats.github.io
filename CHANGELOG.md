# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.2.0] - 2024-11-06

### 🎯 Añadido
- **Sección Comparativa de Jugadores**
  - Selector de hasta 3 jugadores para comparación
  - Tabla comparativa con 10 métricas (partidos, victorias, goles, asistencias, MVPs)
  - Auto-resaltado en verde de los mejores valores
  - Gráfico radar con Chart.js para visualización comparativa
  - Soporte para estructura dual de datos (nested teams y legacy)
  
- **Footer con Versión**
  - Footer fijo en parte inferior con diseño gradient purple
  - Versión visible en badge semi-transparente
  - Implementado en `index.html` y `admin.html`
  - Responsive para móvil (ancho completo, texto compacto)

### 🔧 Corregido
- Dropdown de jugadores vacío en Comparativa (agregado método `getUniquePlayers()`)
- Columnas de tabla apiladas verticalmente (forzado `display: table-cell !important`)
- Extracción de jugadores desde estructura de partidos

### 📝 Modificado
- Actualizado Service Worker cache a `v3.2.0`
- CSS de comparativa optimizado para distribución correcta de columnas
- Método `calculatePlayerStats()` simplificado usando `extractLineups()`

### 📁 Archivos Nuevos
- `js/ui/comparativa.js` - Lógica de comparación de jugadores
- `css/comparativa.css` - Estilos de sección comparativa
- `VERSION-3.2.0.md` - Documentación de release

---

## [3.1.0] - 2024

### 🎯 Añadido
- **Módulo 3: Estadísticas Avanzadas**
  - **Racha Actual**: Visualización de rachas de victorias/derrotas con emojis
  - **Mejor Compañero**: Análisis de duplas con mayor % de victorias (mínimo 3 partidos)
  - **Rendimiento por Equipo**: Stats separadas para equipo azul vs rojo
  - **Evolución**: Timeline de últimos 10 partidos con indicadores visuales
  - **Probabilidad MVP**: Algoritmo ponderado (60% MVP + 40% victorias)
  
- Integración de estadísticas avanzadas en modal de jugador
- Soporte para estructura dual de datos en todos los métodos

### 🔧 Corregido
- Stats vacías por acceso incorrecto a `globalAdvancedStats`
- Errores de sintaxis en `advancedStats.js` (código duplicado eliminado)
- Acceso dinámico a stats en lugar de almacenamiento en constructor

### 📁 Archivos Nuevos
- `js/utils/advancedStats.js` - Motor de cálculo de estadísticas avanzadas

---

## [3.0.0] - 2024

### 🎯 Añadido
- **Progressive Web App (PWA)**
  - Service Worker con estrategia Cache-First
  - Manifest.json con iconos personalizados de Murcia
  - Funcionalidad offline completa
  - Instalación en dispositivos móviles y escritorio
  - Banner de instalación personalizado
  - Actualización automática del SW
  
- **Iconos Personalizados**
  - Set completo de iconos (96x96, 152x152, 192x192, 512x512)
  - Diseño con escudo de Murcia y balón de fútbol
  - Generador HTML para crear variantes
  
- Página offline.html con mensaje de error amigable
- Cacheo de recursos estáticos (HTML, CSS, JS, iconos)

### 📝 Modificado
- Meta tags PWA en `index.html` y `admin.html`
- Apple Touch Icons para dispositivos iOS

### 📁 Archivos Nuevos
- `sw.js` - Service Worker principal
- `manifest.json` - Configuración PWA
- `offline.html` - Página offline
- `icons/` - Directorio con todos los iconos
- `PWA-SETUP.md` - Documentación de implementación

---

## [2.3.0] - 2024

### 🎯 Añadido
- **Fase 3 de Seguridad: Dashboard de Monitorización**
  - Panel de seguridad en tiempo real
  - Visualización de intentos de ataque bloqueados
  - Gráficos con Chart.js (últimas 24h)
  - Métricas de XSS, CSRF, Rate Limiting, Honeypot
  - Top 10 IPs más activas
  - Logs de seguridad detallados
  - Exportación de logs a JSON
  - Limpieza de logs antiguos
  
- Nuevo menú "🛡️ Seguridad" en admin panel
- Sistema de logging estructurado

### 📁 Archivos Nuevos
- `js/security/index.js` - Orchestrator de seguridad
- `js/ui/securityDashboard.js` - UI del dashboard
- `css/security-dashboard.css` - Estilos del dashboard
- `test-audit-logs.html` - Página de prueba

### 📝 Documentado
- `SECURITY-PHASE3-SUMMARY.md` - Resumen de implementación

---

## [2.2.0] - 2024

### 🎯 Añadido
- **Fase 2 de Seguridad: Protecciones Avanzadas**
  - **Rate Limiting**: Límite de 100 requests/15 min por IP
  - **Honeypot**: Campos trampa invisibles para detectar bots
  - **IP Whitelist**: Lista blanca de IPs autorizadas para admin
  - **Session Timeout**: Cierre automático de sesión después de 30 min de inactividad
  
- Configuración centralizada en `js/config.js`
- Sistema de alertas visuales para límites alcanzados

### 🔧 Mejorado
- Detección avanzada de patrones de ataque
- Logs más detallados con contexto de seguridad

### 📁 Archivos Nuevos
- `js/security/rateLimiter.js`
- `js/security/honeypot.js`
- `js/security/ipWhitelist.js`
- `js/security/sessionTimeout.js`

### 📝 Documentado
- `SECURITY-PHASE2-SUMMARY.md` - Resumen de implementación

---

## [2.1.0] - 2024

### 🎯 Añadido
- **Fase 1 de Seguridad: Protecciones Básicas**
  - **XSS Protection**: Sanitización de inputs y outputs
  - **CSRF Protection**: Tokens únicos por sesión
  - **Content Security Policy (CSP)**: Meta tags restrictivos
  - **Supabase RLS**: Row Level Security en base de datos
  
- Sistema de auditoría con logs en Supabase
- Validación de inputs en todos los formularios
- Headers de seguridad HTTP

### 🔧 Corregido
- Vulnerabilidades XSS en campos de texto
- Acceso no autorizado a endpoints

### 📁 Archivos Nuevos
- `js/security/csrfProtection.js`
- `js/utils/security.js`
- `supabase-rls-security.sql`
- `supabase-audit-logs.sql`

### 📝 Documentado
- `SECURITY-PHASE1-SUMMARY.md` - Resumen de implementación
- `SECURITY-CHECKLIST.md` - Lista de verificación completa
- `SECURITY-SETUP.md` - Guía de configuración

---

## [2.0.0] - 2024

### 🎯 Añadido
- **Integración con Supabase**
  - Migración completa de localStorage a PostgreSQL
  - Autenticación con email/password
  - Panel de administración con login
  - CRUD completo de partidos vía API
  
- **Sistema de Roles**
  - Admin: acceso completo
  - User: solo lectura
  
- **Análisis con IA (OpenAI GPT-4)**
  - Análisis táctico de partidos
  - Recomendaciones personalizadas por jugador
  - Predicción de resultados
  - Análisis de rendimiento general
  
### 🔧 Mejorado
- Performance con paginación de partidos
- Validación de datos más robusta
- Manejo de errores mejorado

### 📁 Archivos Nuevos
- `js/services/aiAnalyzer.js`
- `js/auth/authManager.js`
- `js/auth/authGuard.js`
- `js/admin/panel.js`
- `admin.html`
- `supabase-init.sql`

### 📝 Documentado
- `SUPABASE-SETUP.md` - Guía de configuración
- `DATA-MIGRATION.md` - Proceso de migración
- `AI-ANALYSIS.md` - Documentación de IA

---

## [1.2.0] - 2024

### 🎯 Añadido
- **Simulador de Equipos**
  - Generación automática de equipos balanceados
  - Algoritmo de balanceo por estadísticas
  - Visualización de equipos azul vs rojo
  - Análisis de equilibrio con diferencia porcentual
  
- Modal de estadísticas detalladas por jugador
- Gráficos de rendimiento individual

### 📁 Archivos Nuevos
- `js/ui/simulador.js`
- `css/simulador.css`

---

## [1.1.0] - 2024

### 🎯 Añadido
- **Vista de Estadísticas**
  - Top goleadores
  - Top asistentes
  - Jugador con más partidos
  - Jugador con mejor % de victorias
  - Mejor dupla (pareja con más victorias juntos)
  
- Filtros por día de la semana
- Ordenación de columnas en tablas
- Búsqueda de jugadores

### 🔧 Mejorado
- Cálculo de estadísticas optimizado
- UI más responsive

### 📁 Archivos Nuevos
- `js/ui/estadisticas.js`
- `js/utils/calculations.js`

---

## [1.0.0] - 2024

### 🎯 Añadido
- **Funcionalidad Básica**
  - Tabla de clasificación general
  - Histórico de partidos
  - Selector de día (Lunes/Martes/Miércoles)
  - Gestión de partidos (CRUD)
  - Alineaciones azul vs rojo
  - Registro de goles, asistencias y MVPs
  
- **Arquitectura Modular ES6**
  - Sistema de vistas (View pattern)
  - DataManager para gestión de datos
  - Almacenamiento en localStorage
  
- **UI Responsive**
  - Sidebar colapsable
  - Diseño mobile-first
  - Tablas scrollables horizontalmente
  
### 📁 Estructura Inicial
- `js/main.js` - Entry point
- `js/dataManager.js` - Gestión de datos
- `js/config.js` - Configuración
- `js/ui/clasificacion.js`
- `js/ui/historico.js`
- `js/utils/rendering.js`
- `js/utils/validation.js`
- `css/` - Estilos modulares

### 📝 Documentado
- `README.md` - Documentación principal
- `ARCHITECTURE.md` - Arquitectura del proyecto

---

## Tipos de Cambios

- **🎯 Añadido** - Para nuevas funcionalidades
- **🔧 Corregido** - Para corrección de bugs
- **📝 Modificado** - Para cambios en funcionalidades existentes
- **🗑️ Eliminado** - Para funcionalidades eliminadas
- **⚡ Mejorado** - Para mejoras de performance
- **🔒 Seguridad** - Para parches de seguridad
- **📁 Archivos** - Para cambios en estructura de archivos
- **📝 Documentado** - Para cambios en documentación

---

**Mantenedor**: Álvaro Romero (@alvaroromero-hefame)  
**Repositorio**: [futsalstats.github.io](https://github.com/alvaroromero-hefame/futsalstats.github.io)
