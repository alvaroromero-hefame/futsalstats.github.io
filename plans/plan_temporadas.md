# Plan: Añadir Temporadas (Septiembre–Septiembre)

## Contexto

El proyecto no tiene concepto de temporada. Todos los partidos se cargan sin filtro temporal, por lo que clasificaciones y estadísticas mezclan datos de años distintos. El usuario quiere filtrar por temporada (ciclo Septiembre–Septiembre) en todas las vistas, incluir el filtro en `index.html` (Resumen de Temporada), y que los fijos/eventuales del admin también sean por temporada. La migración de BD debe ser no destructiva (columnas nullable, sin tocar datos existentes).

---

## Fase 1 — BD: `sql/supabase-seasons.sql` (NUEVO)

```sql
-- 1. Tabla seasons (una por día, ya que martes y jueves son ligas independientes)
CREATE TABLE seasons (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(50) NOT NULL,                          -- "2024-25"
  day        VARCHAR(10) NOT NULL CHECK (day IN ('martes', 'jueves')),
  start_date DATE NOT NULL,
  end_date   DATE,                                          -- NULL = activa
  is_active  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, name)
);

-- 2. matches: season_id nullable → no rompe nada
ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);

-- 3. player_availability: season_id nullable, reemplazar UNIQUE constraint
ALTER TABLE player_availability ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
-- Quitar el único constraint actual y sustituir por partial indexes
ALTER TABLE player_availability DROP CONSTRAINT IF EXISTS player_availability_player_id_day_key;
-- Registros sin temporada (modo legacy): sigue funcionando el upsert existente
CREATE UNIQUE INDEX IF NOT EXISTS pa_global_unique
  ON player_availability(player_id, day) WHERE season_id IS NULL;
-- Registros con temporada
CREATE UNIQUE INDEX IF NOT EXISTS pa_season_unique
  ON player_availability(player_id, day, season_id) WHERE season_id IS NOT NULL;

-- 4. Seed: crear temporada activa actual para ambos días
INSERT INTO seasons (name, day, start_date, is_active) VALUES
  ('2025-26', 'martes', '2025-09-01', true),
  ('2025-26', 'jueves', '2025-09-01', true)
ON CONFLICT DO NOTHING;

-- 5. Asignar todos los partidos existentes a la temporada 2025-26
UPDATE matches
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = matches.day)
WHERE season_id IS NULL;

-- 6. Asignar player_availability existentes a la temporada 2025-26
UPDATE player_availability
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = player_availability.day)
WHERE season_id IS NULL;
```

Los datos existentes quedan asignados a **2025-26** (temporada actual). Las temporadas futuras empezarán desde cero.

---

## Fase 2 — DataManager: `js/dataManager.js`

Cambios mínimos:

1. Añadir estado: `this.seasons = {martes:[], jueves:[]}` y `this.currentSeason = {martes:null, jueves:null}` (null = todas).
2. Añadir `async loadSeasons(day)` — query a `seasons WHERE day = ?` ORDER BY `start_date DESC`.
3. Llamar `loadSeasons` dentro de `loadData()` después de cargar los días.
4. Modificar `loadDayFromSupabase(day)`:
   - Si `this.currentSeason[day]` no es null → añadir `.eq('season_id', id)` a la query de `matches`
   - Igual para la query de `player_availability`
5. Añadir métodos públicos: `setCurrentSeason(day, id)`, `getCurrentSeason(day)`, `getSeasons(day)`.

**`setCurrentSeason`** llama a `loadDayFromSupabase(day)` y actualiza `this.data[day]`, pero no hace reload completo (eficiente).

---

## Fase 3 — Selector global: `js/main.js` + `app.html`

**El selector de temporada es global**, visible en el menú lateral junto al selector de día (martes/jueves). Selecciona por defecto la temporada activa (`is_active = true`).

En `app.html`, dentro del `<nav>` / sidebar, añadir:
```html
<div class="season-selector-wrap">
  <label>Temporada</label>
  <select id="season-selector">
    <!-- opciones dinámicas: "2025-26 ★", "2024-25", ... -->
  </select>
</div>
```

En `main.js`, después de cargar datos:
- Poblar `#season-selector` con `dataManager.getSeasons(currentDay)`, marcando la activa con ★
- Pre-seleccionar la temporada activa
- `onchange` → `dataManager.setCurrentSeason(currentDay, value)` → re-render vista activa
- Al cambiar de día (martes/jueves) → repoblar el selector con temporadas del nuevo día

Persistir selección en `localStorage` clave `season_${day}`.

---

## Fase 4 — Badge de temporada en vistas: `js/ui/clasificacion.js`, `estadisticas.js`, `comparativa.js`, `simulador.js`

Patrón único: en el `render()` de cada vista, añadir una línea al título:

```js
const season = this.dataManager.getCurrentSeason(day);
const badge = season ? `<span class="season-badge">${season.name}</span>` : '';
```

El filtro ya viene aplicado desde DataManager, las vistas no cambian su lógica.

`simulador.js` usa `getAllData()` → el selector de temporada es global, así que filtra ambos días con la misma temporada seleccionada. `setCurrentSeason(day, id)` aplica a ambos días cuando se cambia desde el selector global.

---

## Fase 5 — Resumen de Temporada: `index.html`

`index.html` tiene su propio cliente Supabase inline con `loadMatches(day)` y `loadFijos(day)`. Cambios:

1. Añadir `async function loadSeasons()` — query a `seasons` para obtener lista.
2. Añadir `<select id="season-select">` en el hero, encima de las cards.
3. `loadMatches(day)` recibe `seasonId` opcional → si presente, añadir `.eq('season_id', seasonId)`.
4. `loadFijos(day)` recibe `seasonId` opcional → filtrar `player_availability` por `season_id`.
5. Al cambiar el select → re-ejecutar `main()` con el `seasonId` elegido.

---

## Fase 6 — Admin: Gestión de temporadas + rediseño fijos/eventuales: `js/admin/panel.js`

### 6a. Nueva sección "Temporadas"
- Tabla de temporadas por día con nombre, fecha inicio, estado activo
- Botón "Nueva temporada" → modal con nombre (auto-sugerido: año actual-siguiente) + fecha inicio
- Botón "Activar" por temporada (desactiva las demás del mismo día)
- Operaciones: INSERT en `seasons`, UPDATE `is_active`

### 6b. Rediseño sección fijos/eventuales
**Estado actual:** formulario lineal mezclado con CRUD de jugadores.

**Nuevo diseño:**
```
┌─── Gestión de Jugadores ─────────────────────────────┐
│  Temporada: [2024-25 ▼]   Día: [Jueves ▼]           │
│                                                       │
│  FIJOS                    EVENTUALES/SUPLENTES        │
│  ┌─────────┐ ┌─────────┐  ┌─────────┐ ┌─────────┐   │
│  │ Álvaro  │ │ Miguel  │  │ Juan    │ │  + Add  │   │
│  │  [fijo] │ │  [fijo] │  │ [even.] │ │         │   │
│  └─────────┘ └─────────┘  └─────────┘ └─────────┘   │
│                                                       │
│  Clic en jugador → toggle fijo/eventual para esta    │
│  temporada. Los cambios no afectan otras temporadas.  │
└───────────────────────────────────────────────────────┘
```

- Chips/cards de jugadores con toggle de estado en vez del formulario actual
- Selector de temporada en la sección (usa la temporada activa por defecto)
- Al cambiar estado: UPSERT en `player_availability` con `season_id`
- Añadir nuevo jugador: modal simple con nombre + día + estado inicial

---

## Archivos modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `sql/supabase-seasons.sql` | NUEVO | Tabla seasons, columnas nullable, partial indexes |
| `js/dataManager.js` | EDIT | Estado de seasons, filtro por season_id |
| `js/main.js` | EDIT | Selector de temporada en sidebar |
| `app.html` | EDIT | `<select id="season-selector">` en sidebar |
| `js/ui/clasificacion.js` | EDIT | Badge de temporada |
| `js/ui/estadisticas.js` | EDIT | Badge de temporada |
| `js/ui/comparativa.js` | EDIT | Badge de temporada |
| `js/ui/simulador.js` | EDIT | Badge de temporada |
| `js/admin/panel.js` | EDIT | Sección temporadas + rediseño fijos/eventuales |
| `index.html` | EDIT | Selector de temporada + filtro en queries |

---

## Verificación

1. Ejecutar `sql/supabase-seasons.sql` en Supabase SQL Editor → verificar que `seasons` tiene las dos filas seed y que `matches`/`player_availability` tienen columna `season_id` nullable.
2. Abrir `app.html` → selector de temporada aparece en sidebar → cambiar día martes/jueves cambia las opciones → cambiar temporada re-renderiza la vista activa.
3. Vista clasificación muestra badge "2024-25" (o "Todas" si no hay filtro).
4. Partidos existentes (con `season_id = NULL`) aparecen en "Todas las temporadas" y desaparecen al seleccionar "2024-25" (hasta que se les asigne).
5. Admin → sección jugadores → selector de temporada activo → cambiar un jugador de fijo a eventual → verificar que el cambio no afecta otra temporada.
6. `index.html` → selector de temporada en hero → al cambiar, las estadísticas se recalculan.
