# Plan: Maestro de Jugadores

## Contexto

La tabla `players` existe pero es minimalista (solo `name`, `is_fixed`, `day`). El usuario quiere convertirla en un **maestro único** con campos enriquecidos (emoji, avatar_url, notas) y rediseñar el admin para separar la gestión del maestro de la asignación de disponibilidad (fijo/eventual por día).

Este plan se ejecuta **después del plan de temporadas** (`necesito-ahora-insertar-la-vectorized-rain.md`). El punto de fricción entre ambos: el `upsert` de disponibilidad usa `onConflict: 'player_id,day'`; cuando seasons cambie ese constraint, habrá que añadir `season_id` al objeto y al `onConflict`. Se documenta con `// ponytail:` en el código.

---

## Fase 1 — SQL: `sql/supabase-players-master.sql` (NUEVO)

```sql
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS emoji      VARCHAR(10);
```

Solo esto. La `UNIQUE(player_id, day)` de `player_availability` ya cubre "un jugador, máximo un registro por día". Los campos `is_fixed` y `day` de `players` quedan como legacy nullable (no se borran, no se escriben más).

---

## Fase 2 — `js/admin/panel.js`

### 2.1 Estado en el constructor
```js
this.allPlayers = []; // maestro en memoria para el modal y el selector de disponibilidad
```

### 2.2 Nuevo método `loadAllPlayers()`
Carga TODA la tabla `players` (sin filtro de día). Se llama en `render()` tras `loadPlayers()` y tras cada cambio en el maestro.

```js
async loadAllPlayers() {
    const { data, error } = await this.supabase
        .from('players')
        .select('id, name, emoji, avatar_url, notes')
        .order('name');
    if (error) { this.showNotification('Error cargando maestro', 'error'); return; }
    this.allPlayers = data || [];
    this.renderMasterList();
    this.updateAvailabilityPlayerSelect();
}
```

### 2.3 Nuevo método `renderMasterList()`
Sustituye a `updatePlayersList()`. En `loadPlayers()` reemplazar la llamada a `updatePlayersList()` por `this.renderMasterList()`.

```js
renderMasterList() {
    const list = document.getElementById('players-list');
    if (!list) return;
    list.innerHTML = this.allPlayers.map(p => `
        <div class="player-item">
            <span class="player-avatar">${p.emoji || '👤'}</span>
            <span class="player-name">${p.name}</span>
            <div class="player-item-actions">
                <button class="btn-icon btn-edit"
                    onclick="adminPanel.openPlayerModal('${p.id}')">✏️</button>
                <button class="btn-icon btn-delete"
                    onclick="adminPanel.deletePlayer('${p.id}', '${p.name}')">🗑️</button>
            </div>
        </div>
    `).join('') || '<p class="no-data">Sin jugadores</p>';
}
```

### 2.4 Nuevo método `openPlayerModal(id = null)`
Sigue el patrón de `showHelpModal()`: crea el elemento si no existe, lo rellena con los datos del jugador (o vacío para nuevo) y lo muestra.

- Campo nombre (required)
- Campo emoji (maxlength=2)
- Campo avatar_url (placeholder URL)
- Textarea notas
- Botones: Cancelar / Guardar → `savePlayerMaster(id)`

### 2.5 Nuevo método `savePlayerMaster(id)`
- Si `id` existe → UPDATE en `players`
- Si no → INSERT en `players`
- Tras guardar: cerrar modal, `showNotification`, `await this.loadAllPlayers()`

### 2.6 Modificar `deletePlayer()`
Añadir borrado previo de `player_availability` (la FK puede ser RESTRICT):
```js
await this.supabase.from('player_availability').delete().eq('player_id', id);
await this.supabase.from('players').delete().eq('id', id);
await this.loadAllPlayers();
await this.loadPlayers(); // refresca fixedPlayers/eventualPlayers
```

### 2.7 Nuevo método `updateAvailabilityPlayerSelect()`
Pobla el `<select id="avail-player-select">` con `this.allPlayers` (emoji + nombre).

### 2.8 Nuevos métodos `saveAvailability()` / `removeAvailability()`

`saveAvailability()`:
- Lee `avail-player-select` (player_id), `avail-day`, `avail-fixed`
- Upsert en `player_availability` con `{ player_id, day, is_fixed }`
- `onConflict: 'player_id,day'`
- **ponytail:** cuando el plan de seasons añada `season_id`, añadir al payload y al onConflict
- Tras guardar: `await this.loadPlayers()`

`removeAvailability()`:
- Delete de `player_availability` por `player_id` + `day`
- Tras borrar: `await this.loadPlayers()`

### 2.9 `attachEventListeners()`
Eliminar las líneas que enlazan `#player-form` (el formulario antiguo desaparece).

### 2.10 Eliminar `handlePlayerSubmit()`
Ya no hay `#player-form`. Toda creación va por `savePlayerMaster()`.

---

## Fase 3 — Template HTML en `panel.js` (sección de jugadores)

Reemplazar la sección "Gestión de Jugadores" (líneas ~177-200 del template inline) por:

```html
<!-- Maestro de Jugadores -->
<div class="admin-section">
    <h2>👥 Gestión de Jugadores</h2>

    <div class="players-management">
        <div class="players-management-header">
            <h3>📋 Maestro</h3>
            <button class="btn btn-primary btn-sm"
                onclick="adminPanel.openPlayerModal()">➕ Nuevo Jugador</button>
        </div>
        <div id="players-list" class="players-list"></div>
    </div>

    <div class="players-management" style="margin-top: 20px;">
        <h3>📅 Asignar Disponibilidad</h3>
        <div class="inline-form">
            <select id="avail-player-select">
                <option value="">-- Jugador --</option>
            </select>
            <select id="avail-day">
                <option value="martes">Martes</option>
                <option value="jueves">Jueves</option>
            </select>
            <label>
                <input type="checkbox" id="avail-fixed" checked> Fijo
            </label>
            <button class="btn btn-primary" onclick="adminPanel.saveAvailability()">💾 Guardar</button>
            <button class="btn btn-secondary" onclick="adminPanel.removeAvailability()">🗑️ Quitar</button>
        </div>
    </div>
</div>
```

---

## Fase 4 — CSS en `admin.css`

```css
.players-management-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.player-avatar { font-size: 20px; flex-shrink: 0; }
.player-item-actions { display: flex; gap: 6px; }
#player-master-modal textarea {
    width: 100%; padding: 8px; border: 2px solid #e0e0e0;
    border-radius: 8px; font-size: 14px; resize: vertical;
}
```

El `.modal`, `.modal-content`, `.modal-actions`, `.player-item`, `.player-name`, `.inline-form` ya existen en `admin.css` — reutilizarlos sin duplicar.

---

## Compatibilidad con el plan de temporadas

`saveAvailability()` hace upsert sin `season_id` (queda `null`). Cuando el plan de seasons ejecute:
- `ALTER TABLE player_availability ADD COLUMN season_id UUID...`
- Cambie el constraint de `UNIQUE(player_id, day)` a partial indexes

El único cambio aquí será añadir `season_id: this.currentSeasonId` al payload del upsert y actualizar el `onConflict`. Se marca con `// ponytail: añadir season_id cuando se ejecute el plan de seasons`.

---

## Archivos modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `sql/supabase-players-master.sql` | NUEVO | ALTER TABLE players (notes, avatar_url, emoji) |
| `js/admin/panel.js` | EDIT | loadAllPlayers, renderMasterList, openPlayerModal, savePlayerMaster, deletePlayer, saveAvailability, removeAvailability; eliminar handlePlayerSubmit |
| `css/admin.css` | EDIT | 4 reglas nuevas |

`admin.html` no se toca — el template HTML está inlineado en `panel.js` (método `getTemplate()`).

---

## Verificación

1. SQL ejecutado en Supabase → tabla `players` tiene columnas `notes`, `avatar_url`, `emoji`.
2. Admin → "Nuevo Jugador" → modal abre → rellenar nombre + emoji → guardar → aparece en lista con emoji.
3. Editar jugador → cambiar notas → guardar → persiste al recargar.
4. "Asignar Disponibilidad": seleccionar jugador, "Martes", "Fijo" → guardar → cambiar día selector del admin a "Martes" → jugador aparece en checkboxes del formulario de partido.
5. Mismo jugador asignado a "Jueves" → no viola UNIQUE (son registros distintos).
6. Asignar mismo jugador al mismo día dos veces → upsert silencioso (actualiza, no duplica).
7. "Quitar" disponibilidad → jugador desaparece del día correspondiente en el formulario de partido.
8. Eliminar jugador del maestro → desaparece de lista y de disponibilidad.
9. Formulario de partido sigue funcionando: `this.fixedPlayers` y `this.eventualPlayers` mantienen su forma `{id, name, day, is_fixed}`.
