# Plan: Temporadas + Maestro de Jugadores (fusión)

## Contexto

Hay dos planes independientes que se solapan en el mismo módulo (`js/admin/panel.js`, sección "Gestión de Jugadores") y en la misma tabla (`player_availability`):

- **`plan_temporadas.md`**: añade el concepto de temporada (ciclo Septiembre–Septiembre) a toda la app — filtro global en vistas, `season_id` en `matches` y `player_availability`, y en el admin: gestión de temporadas + rediseño de fijos/eventuales por temporada.
- **`plan_jugadores.md`**: convierte `players` en un maestro enriquecido (emoji, avatar_url, notas) con CRUD propio en el admin, separado de la asignación de disponibilidad. Ya indicaba explícitamente que debía ejecutarse **después** del plan de temporadas, y dejaba un `// ponytail:` marcando que el upsert de disponibilidad necesitaría `season_id` cuando temporadas se implementase.

Al fusionar en un único plan, ese punto de fricción desaparece: no hace falta el parche `ponytail` intermedio, la sección de disponibilidad se construye ya con `season_id` desde el principio, y el diseño de "chips fijos/eventuales por temporada" (fase 6b de temporadas) sustituye directamente al formulario simple de selects que proponía el plan de jugadores — son la misma pieza de UI en distintos estados de evolución, no dos features paralelas.

**Orden de ejecución:** primero un snapshot estático de seguridad del `index.html` actual, después un backup SQL de `matches`/`player_availability`/`players` en Supabase, después toda la infraestructura de temporadas (BD, DataManager, selector global, vistas), luego el maestro de jugadores, y al final la sección de disponibilidad del admin ya integrada con `season_id`.

---

## Fase 0a — Snapshot estático de seguridad: `index-backup.html` (NUEVO)

`index.html` ("Resumen de Temporada") calcula sus estadísticas en el propio navegador, con `fetch` en vivo a Supabase (`loadMatches`, `loadFijos` en `index.html:307-326`) y las funciones puras `buildStats`/`renderCategory`/`renderBlock` (`index.html:329-473`). Si la migración de temporadas rompe algo (esquema, RLS, JS), esta página deja de mostrar datos. Antes de tocar nada, se congela una copia 100% estática, sin `fetch` ni dependencia de Supabase, con los datos ya calculados incrustados como HTML fijo.

**Cómo generarla (sin nuevas dependencias, Node ≥18 con `fetch` global):**

1. Script puntual `scripts/generate-index-backup.mjs` que:
   - Lee `SUPABASE_URL`/`SUPABASE_KEY` (los mismos valores que hoy están hardcodeados en `index.html:299-300`).
   - Reimplementa/reutiliza tal cual las funciones puras `buildStats`, `top3`, `renderPodium`, `renderBlock`, `renderCategory`, `renderDayCol`, `escHtml` de `index.html` (copiar-pegar, son puras y no dependen del DOM salvo el `document.getElementById` final).
   - Hace las mismas 4 queries que `main()` (`matches` y `player_availability` para `martes`/`jueves`) vía REST directo (`fetch` a `${SUPABASE_URL}/rest/v1/...` con el header `apikey`), igual que hace el cliente de `supabase-js`.
   - Genera el mismo `sectionsHtml` que hoy se inyecta en `#app-root`.
   - Toma el `index.html` actual como plantilla y produce `index-backup.html`: mismo `<head>`/CSS/hero, pero con `#app-root` ya relleno con el `sectionsHtml` calculado (no el spinner), `page-footer` visible, y **sin** el `<script type="module">` de fetch (se elimina por completo — página puramente estática).
2. Ejecutar el script una vez, revisar visualmente `index-backup.html` en el navegador (mismos números que `index.html` en ese momento, sin peticiones de red a `supabase.co` en la pestaña Network).
3. Commit de `index-backup.html` (y del script generador, por si hace falta re-congelar en otro punto) antes de aplicar cualquier cambio de las fases siguientes.

Si algo se rompe durante la migración, restaurar es copiar `index-backup.html` sobre `index.html` (o servirlo aparte) — no depende de Supabase ni del resto del código.

---

## Fase 0b — Backup de datos en Supabase: `sql/supabase-backup-pre-seasons.sql` (NUEVO)

La Fase 1a hace `ALTER TABLE`, `DROP CONSTRAINT player_availability_player_id_day_key` y un `UPDATE` masivo de `season_id` sobre las tablas de producción `matches` y `player_availability`. Antes de tocarlas, se congela un snapshot de filas reutilizando el mismo patrón ya usado en `sql/supabase-audit-logs-backup.sql` (`CREATE TABLE ... LIKE ... INCLUDING ALL` + `INSERT ... SELECT *`) — SQL nativo, sin dependencias nuevas, ejecutable directamente en el SQL Editor de Supabase.

Ejecutar **inmediatamente antes** de `supabase-seasons.sql` y `supabase-players-master.sql`:

```sql
-- Backup previo a supabase-seasons.sql / supabase-players-master.sql
-- Restaurar solo si Fase 1 deja datos corruptos; limpiar (DROP TABLE) una vez verificado todo.

CREATE TABLE IF NOT EXISTS matches_backup_pre_seasons (LIKE matches INCLUDING ALL);
INSERT INTO matches_backup_pre_seasons SELECT * FROM matches;

CREATE TABLE IF NOT EXISTS player_availability_backup_pre_seasons (LIKE player_availability INCLUDING ALL);
INSERT INTO player_availability_backup_pre_seasons SELECT * FROM player_availability;

CREATE TABLE IF NOT EXISTS players_backup_pre_seasons (LIKE players INCLUDING ALL);
INSERT INTO players_backup_pre_seasons SELECT * FROM players;

-- Verificación: los recuentos deben coincidir con las tablas originales
SELECT 'matches' AS tabla, COUNT(*) FROM matches_backup_pre_seasons
UNION ALL SELECT 'player_availability', COUNT(*) FROM player_availability_backup_pre_seasons
UNION ALL SELECT 'players', COUNT(*) FROM players_backup_pre_seasons;
```

Restauración documentada como comentario en el mismo script (igual que hace `supabase-audit-logs-backup.sql` en su punto 7):

```sql
-- Restaurar (solo si algo falla tras Fase 1 — season_id es columna nueva, no existía antes):
-- UPDATE matches SET season_id = NULL;
-- UPDATE player_availability SET season_id = NULL;
-- players solo recibe columnas nuevas en Fase 1b (notes/avatar_url/emoji);
-- revertir con: ALTER TABLE players DROP COLUMN notes, DROP COLUMN avatar_url, DROP COLUMN emoji;
-- Si player_availability_player_id_day_key hiciera falta recrearla:
-- ALTER TABLE player_availability ADD CONSTRAINT player_availability_player_id_day_key UNIQUE(player_id, day);
```

No se usa `TRUNCATE`/reinserción completa como mecanismo de rollback porque `player_availability.player_id` tiene `ON DELETE CASCADE` hacia `players` — un `TRUNCATE`/`DELETE` en `players` arrastraría en cascada `player_availability`. Como las únicas modificaciones de Fase 1 sobre filas existentes son "rellenar una columna nueva" (nunca se borra ni sobrescribe dato preexistente), restaurar es tan simple como poner esas columnas nuevas a `NULL` de nuevo; las tablas `*_backup_pre_seasons` quedan como red de seguridad ante lo inesperado (RLS mal aplicada, error humano al pegar el SQL, etc.).

Una vez validados todos los pasos de la sección Verificación, limpiar las tablas de archivo:

```sql
DROP TABLE matches_backup_pre_seasons, player_availability_backup_pre_seasons, players_backup_pre_seasons;
```

---

## Fase 1 — SQL

### 1a. `sql/supabase-seasons.sql` (NUEVO)

```sql
CREATE TABLE seasons (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(50) NOT NULL,
  day        VARCHAR(10) NOT NULL CHECK (day IN ('martes', 'jueves')),
  start_date DATE NOT NULL,
  end_date   DATE,
  is_active  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(day, name)
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);

ALTER TABLE player_availability ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE CASCADE;
ALTER TABLE player_availability DROP CONSTRAINT IF EXISTS player_availability_player_id_day_key;
CREATE UNIQUE INDEX IF NOT EXISTS pa_global_unique
  ON player_availability(player_id, day) WHERE season_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS pa_season_unique
  ON player_availability(player_id, day, season_id) WHERE season_id IS NOT NULL;

INSERT INTO seasons (name, day, start_date, is_active) VALUES
  ('2025-26', 'martes', '2025-09-01', true),
  ('2025-26', 'jueves', '2025-09-01', true)
ON CONFLICT DO NOTHING;

UPDATE matches
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = matches.day)
WHERE season_id IS NULL;

UPDATE player_availability
SET season_id = (SELECT id FROM seasons WHERE name = '2025-26' AND day = player_availability.day)
WHERE season_id IS NULL;
```

### 1b. `sql/supabase-players-master.sql` (NUEVO)

```sql
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS emoji      VARCHAR(10);
```

Los campos legacy `is_fixed`/`day` de `players` quedan nullable, sin borrarse ni escribirse más.

Ambos scripts son independientes entre sí (tablas distintas); pueden ejecutarse en cualquier orden pero se listan en el orden en que se implementa el resto del plan.

---

## Fase 2 — DataManager: `js/dataManager.js`

1. Estado: `this.seasons = {martes:[], jueves:[]}`, `this.currentSeason = {martes:null, jueves:null}` (null = todas).
2. `async loadSeasons(day)` — query a `seasons WHERE day = ?` ORDER BY `start_date DESC`. Se llama dentro de `loadData()`.
3. `loadDayFromSupabase(day)`: si `this.currentSeason[day]` no es null, añadir `.eq('season_id', id)` a las queries de `matches` y `player_availability`.
4. Métodos públicos: `setCurrentSeason(day, id)` (recarga solo ese día vía `loadDayFromSupabase`, sin reload completo), `getCurrentSeason(day)`, `getSeasons(day)`.

---

## Fase 3 — Selector global de temporada: `js/main.js` + `app.html`

Selector visible en el sidebar junto al selector de día, preseleccionando la temporada `is_active = true`.

`app.html`:
```html
<div class="season-selector-wrap">
  <label>Temporada</label>
  <select id="season-selector"></select>
</div>
```

`main.js`:
- Poblar `#season-selector` con `dataManager.getSeasons(currentDay)` (★ en la activa).
- `onchange` → `dataManager.setCurrentSeason(currentDay, value)` → re-render vista activa.
- Al cambiar de día → repoblar con las temporadas de ese día.
- Persistir selección en `localStorage` (`season_${day}`).

---

## Fase 4 — Badge de temporada en vistas

`js/ui/clasificacion.js`, `estadisticas.js`, `comparativa.js`, `simulador.js`: en `render()`,

```js
const season = this.dataManager.getCurrentSeason(day);
const badge = season ? `<span class="season-badge">${season.name}</span>` : '';
```

El filtrado ya lo aplica DataManager; las vistas no cambian su lógica de cálculo. `simulador.js` usa `getAllData()`, y como el selector es global, la misma temporada se aplica a ambos días.

---

## Fase 5 — Resumen de Temporada: `index.html`

Tiene su propio cliente Supabase inline (`loadMatches(day)`, `loadFijos(day)`):

1. `async function loadSeasons()` — query a `seasons`.
2. `<select id="season-select">` en el hero.
3. `loadMatches(day, seasonId)` / `loadFijos(day, seasonId)` añaden `.eq('season_id', seasonId)` si viene informado.
4. Cambiar el select re-ejecuta `main()` con el `seasonId` elegido.

---

## Fase 6 — Admin: Gestión de Temporadas: `js/admin/panel.js`

Nueva sección "Temporadas":
- Tabla por día con nombre, fecha inicio, estado activo.
- "Nueva temporada" → modal (nombre auto-sugerido, fecha inicio) → INSERT en `seasons`.
- "Activar" → UPDATE `is_active` (desactiva las demás del mismo día).

---

## Fase 7 — Admin: Maestro de Jugadores: `js/admin/panel.js`

### 7.1 Estado
```js
this.allPlayers = []; // maestro en memoria para el modal y el selector de disponibilidad
```

### 7.2 `loadAllPlayers()`
Carga toda la tabla `players` (sin filtro de día), se llama en `render()` tras `loadPlayers()`:
```js
async loadAllPlayers() {
    const { data, error } = await this.supabase
        .from('players')
        .select('id, name, emoji, avatar_url, notes')
        .order('name');
    if (error) { this.showNotification('Error cargando maestro', 'error'); return; }
    this.allPlayers = data || [];
    this.renderMasterList();
}
```

### 7.3 `renderMasterList()`
Sustituye a `updatePlayersList()`:
```js
renderMasterList() {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = this.allPlayers.map(p => `
        <div class="player-item">
            <span class="player-avatar">${p.emoji || '👤'}</span>
            <span class="player-name">${p.name}</span>
            <div class="player-item-actions">
                <button class="btn-icon btn-edit" onclick="adminPanel.openPlayerModal('${p.id}')">✏️</button>
                <button class="btn-icon btn-delete" onclick="adminPanel.deletePlayer('${p.id}', '${p.name}')">🗑️</button>
            </div>
        </div>
    `).join('') || '<p class="no-data">Sin jugadores</p>';
}
```

### 7.4 `openPlayerModal(id = null)`
Sigue el patrón de `showHelpModal()`: nombre (required), emoji (maxlength=2), avatar_url, notas (textarea). Botones Cancelar / Guardar → `savePlayerMaster(id)`.

### 7.5 `savePlayerMaster(id)`
UPDATE si `id` existe, INSERT si no. Tras guardar: cerrar modal, `showNotification`, `await this.loadAllPlayers()`.

### 7.6 `deletePlayer()` (modificado)
```js
await this.supabase.from('player_availability').delete().eq('player_id', id);
await this.supabase.from('players').delete().eq('id', id);
await this.loadAllPlayers();
await this.loadAvailabilityBoard(); // ver Fase 8
```

### 7.7 `attachEventListeners()` / `handlePlayerSubmit()`
Eliminar el binding de `#player-form` y el método `handlePlayerSubmit()` — toda creación pasa por `savePlayerMaster()`.

---

## Fase 8 — Admin: Disponibilidad por Temporada (fijos/eventuales): `js/admin/panel.js`

Sustituye directamente al formulario lineal actual. Diseño (chips agrupados, por temporada y día):

```
┌─── Gestión de Jugadores ─────────────────────────────┐
│  Temporada: [2025-26 ▼]   Día: [Jueves ▼]            │
│                                                        │
│  FIJOS                    EVENTUALES/SUPLENTES        │
│  [Álvaro] [Miguel]        [Juan]        [+ Añadir]    │
│                                                        │
│  Clic en un chip → toggle fijo/eventual para esta     │
│  temporada. "+ Añadir" abre el selector del maestro.  │
└────────────────────────────────────────────────────────┘
```

### 8.1 `loadAvailabilityBoard()`
Query a `player_availability` (join `players` vía `select('player_id, is_fixed, players(id, name, emoji)')`) filtrando por `season_id` (temporada seleccionada en el propio admin, por defecto la activa) y `day`. Separa en `this.fixedPlayers` / `this.eventualPlayers` — mantiene la forma `{id, name, day, is_fixed}` que ya consume el formulario de partido.

### 8.2 `toggleAvailability(playerId, currentIsFixed)`
```js
await this.supabase.from('player_availability').upsert({
    player_id: playerId,
    day: this.currentAdminDay,
    season_id: this.currentAdminSeasonId,
    is_fixed: !currentIsFixed
}, { onConflict: 'player_id,day,season_id' });
await this.loadAvailabilityBoard();
```
Usa el índice parcial `pa_season_unique` de la Fase 1a — no hace falta ningún parche posterior.

### 8.3 `openAvailabilityPicker()`
Botón "+ Añadir": lista `this.allPlayers` que aún no tengan registro en `player_availability` para esa temporada/día, seleccionar uno → `toggleAvailability(id, false)` (entra como eventual por defecto).

### 8.4 `removeAvailability(playerId)`
Delete de `player_availability` por `player_id` + `day` + `season_id`.

---

## Fase 9 — CSS: `admin.css`

```css
.players-management-header {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
}
.player-avatar { font-size: 20px; flex-shrink: 0; }
.player-item-actions { display: flex; gap: 6px; }
#player-master-modal textarea {
    width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; resize: vertical;
}
.availability-board { display: flex; gap: 24px; }
.availability-column h4 { margin-bottom: 8px; }
.player-chip {
    display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px;
    border-radius: 16px; background: #f0f0f0; cursor: pointer;
}
```

`.modal`, `.modal-content`, `.modal-actions`, `.player-item`, `.player-name` ya existen — reutilizar sin duplicar.

---

## Archivos modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `scripts/generate-index-backup.mjs` | NUEVO | Genera el snapshot estático a partir de los datos actuales de Supabase |
| `index-backup.html` | NUEVO | Copia estática de `index.html` con los datos incrustados, sin `fetch` a Supabase |
| `sql/supabase-backup-pre-seasons.sql` | NUEVO | Snapshot de `matches`/`player_availability`/`players` antes de aplicar Fase 1 |
| `sql/supabase-seasons.sql` | NUEVO | Tabla `seasons`, `season_id` en `matches`/`player_availability`, partial indexes |
| `sql/supabase-players-master.sql` | NUEVO | `notes`, `avatar_url`, `emoji` en `players` |
| `js/dataManager.js` | EDIT | Estado de seasons, filtro por `season_id` |
| `js/main.js` | EDIT | Selector de temporada en sidebar |
| `app.html` | EDIT | `<select id="season-selector">` |
| `js/ui/clasificacion.js`, `estadisticas.js`, `comparativa.js`, `simulador.js` | EDIT | Badge de temporada |
| `index.html` | EDIT | Selector de temporada + filtro en queries |
| `js/admin/panel.js` | EDIT | Sección Temporadas; maestro de jugadores (modal CRUD); tablero de disponibilidad por temporada; eliminar `handlePlayerSubmit` |
| `css/admin.css` | EDIT | Reglas para maestro, chips y tablero de disponibilidad |

`admin.html` no se toca — el template está inlineado en `panel.js` (`getTemplate()`).

---

## Verificación

0. `index-backup.html` abre igual que `index.html` (mismas cifras) y no dispara ninguna petición de red a `supabase.co` (comprobar en la pestaña Network del navegador).
0.5. Ejecutar `supabase-backup-pre-seasons.sql`, confirmar que los 3 `COUNT(*)` coinciden con `SELECT COUNT(*) FROM matches` / `player_availability` / `players` antes de tocar nada más.
1. Ejecutar ambos SQL en Supabase → `seasons` con 2 filas seed, `matches`/`player_availability` con `season_id` nullable, `players` con `notes`/`avatar_url`/`emoji`.
2. `app.html` → selector de temporada en sidebar, cambia opciones al cambiar de día, re-renderiza vista activa al cambiar temporada.
3. Vistas de clasificación/estadísticas/comparativa muestran badge de temporada.
4. `index.html` → selector de temporada en hero recalcula estadísticas al cambiar.
5. Admin → "Temporadas": crear una nueva, activarla, verificar que desactiva la anterior del mismo día.
6. Admin → "Nuevo Jugador" (maestro): modal, nombre + emoji, guardar → aparece en la lista del maestro.
7. Admin → tablero de disponibilidad: temporada + día seleccionados, click en chip alterna fijo/eventual, "+ Añadir" incorpora jugador del maestro no asignado aún, "Quitar" lo elimina de esa temporada/día.
8. Mismo jugador en `martes` y `jueves` de la misma temporada → no viola `UNIQUE` (registros distintos). Mismo jugador en dos temporadas distintas del mismo día → tampoco (índice `pa_season_unique` incluye `season_id`).
9. Eliminar jugador del maestro → desaparece del maestro y de todos los tableros de disponibilidad (todas las temporadas).
10. Formulario de partido sigue funcionando: `this.fixedPlayers`/`this.eventualPlayers` mantienen la forma `{id, name, day, is_fixed}` que ya consumía.
11. Una vez validados los pasos 0.5–10, ejecutar `DROP TABLE matches_backup_pre_seasons, player_availability_backup_pre_seasons, players_backup_pre_seasons;` para no dejar tablas de archivo huérfanas en Supabase.
</content>
