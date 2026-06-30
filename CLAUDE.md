# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ejecutar la aplicación

No hay build ni bundler. Es un sitio estático con ES6 modules — debe servirse sobre HTTP (no `file://`) para que los módulos funcionen:

```bash
# Cualquier servidor estático sirve:
python -m http.server 8080
# o
npx serve .
```

Abre `http://localhost:8080` (app principal) o `http://localhost:8080/admin.html` (panel de admin).

No hay tests automatizados ni linter configurado.

## Arquitectura

### Flujo de datos

```
main.js (FutsalApp)
  └── initSupabase()     → cliente REST inline (sin SDK, fetch directo a /rest/v1/)
  └── DataManager        → carga matches, player_availability, settings de Supabase
  └── Views (js/ui/)     → cada vista recibe dataManager y renderiza en #main-content
```

`DataManager` es el único acceso a Supabase. Las vistas solo llaman `dataManager.getCurrentData()` y las funciones de `js/utils/calculations.js`.

### Cliente Supabase

No usa el SDK oficial. El cliente REST se construye en `main.js:initSupabase()` como un objeto con `.from(table).select(...).eq(...).order(...).limit(...)` que traduce a `fetch` contra `/rest/v1/`. Si necesitas añadir operaciones (INSERT, UPDATE, DELETE), hay que extender ese objeto en `main.js`.

### Estructura de datos

Dos ligas: `martes` y `jueves`. Los datos viven en estas tablas de Supabase:

| Tabla | Contenido |
|-------|-----------|
| `matches` | Partidos. `blue_lineup`/`red_lineup` son JSONB arrays de `{name, goal, assist, keeper}` |
| `players` | Catálogo de jugadores |
| `player_availability` | Qué jugadores son "fijos" por día |
| `settings` | Config por día (`next_selector`) |

`transformMatchFromSupabase()` en `dataManager.js` convierte el formato plano de Supabase al formato de árbol `teams[].blue[].lineup[].member[]` que usan los cálculos.

### Sistema de puntuación

| Evento | Puntos |
|--------|--------|
| Victoria | +3 |
| Empate | +1 |
| Gol marcado | +0.25 |
| Asistencia | +0.25 |
| Gol encajado | -0.25 |
| MVP | +1 |

Toda la lógica vive en `js/utils/calculations.js`.

### Módulos principales

- `js/main.js` — bootstrap, cliente REST, navegación entre vistas
- `js/dataManager.js` — acceso a Supabase, transformación de datos
- `js/utils/calculations.js` — toda la lógica de clasificación y estadísticas
- `js/utils/rendering.js` — helpers reutilizables de HTML
- `js/ui/` — una clase por vista (`render()` + opcionalmente `cleanup()`)
- `js/admin/panel.js` — CRUD de partidos y jugadores, solo accesible desde `admin.html`
- `js/security/` — rate limiter, CSRF, honeypot (usados en admin)
- `js/services/aiAnalyzer.js` — análisis de jugadores por reglas (sin API externa)

### Añadir una nueva vista

1. Crear `js/ui/miVista.js` exportando una clase con `render()`
2. Importarla en `main.js` y añadirla al mapa `this.views`
3. Añadir un `<li>` con `id="menu-miVista"` en el `<ul class="menu">` de `index.html`

### CSP

El `Content-Security-Policy` está en el `<head>` de `index.html`. Si añades nuevos orígenes externos (fuentes, CDNs, APIs) hay que actualizar el CSP ahí.

## Configuración

`js/config.js` contiene la URL y `anonKey` de Supabase. La `anonKey` es pública por diseño (Supabase la expone en el frontend), pero la seguridad real la gestiona Row Level Security en Supabase.
