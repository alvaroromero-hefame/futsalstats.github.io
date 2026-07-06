import { globalCSRF } from '../security/csrfProtection.js';
import { globalHoneypot } from '../security/honeypot.js';
import { AuditLogger } from '../utils/logger.js';
import { SecurityDashboard } from '../ui/securityDashboard.js';

/**
 * AdminPanel - Panel de administración para gestionar partidos
 */
export class AdminPanel {
    constructor(supabaseClient, dataManager) {
        this.supabase = supabaseClient;
        this.dataManager = dataManager;
        this.csrf = globalCSRF;
        this.honeypot = globalHoneypot;
        this.logger = new AuditLogger(supabaseClient);
        this.securityDashboard = new SecurityDashboard(supabaseClient, this.logger);
        this.container = null;
        this.currentDay = 'martes';
        this.currentTab = 'matches'; // Nueva propiedad para tabs
        this.matchFilters = {
            dateFrom: null,
            dateTo: null
        };
        this.editingMatchId = null;
        this.currentSection = null; // 'partidos' | 'jugadores' | 'seguridad' | 'configuracion' | null (home)

        // Temporadas
        this.adminSeasons = []; // temporadas del currentDay
        this.currentAdminSeasonId = null; // temporada elegida en el tablero de disponibilidad
        this.configSeasons = []; // temporadas de ambos días, gestionadas desde Configuración
        this.seasonModalDay = 'martes'; // día para el que "Nueva Temporada" va a crear

        // Maestro de jugadores
        this.allPlayers = [];
        this.editingPlayerId = null;
        this.mergingPlayerId = null; // jugador que se va a fusionar (y eliminar) en confirmMerge()

        // Disponibilidad (fijos/eventuales) del currentDay + currentAdminSeasonId
        this.fixedPlayers = [];
        this.eventualPlayers = [];
    }

    /**
     * Renderiza el panel de administración
     */
    async render(container) {
        this.container = container;
        this.container.innerHTML = this.getTemplate();
        this.attachEventListeners();
        this.showHome();
    }

    /**
     * Template HTML del panel: cabecera + menú de 4 accesos + hueco para la sección activa
     */
    getTemplate() {
        return `
            <div class="admin-panel">
                <div class="admin-header">
                    <h1>📊 Panel de Administración</h1>
                    <div class="admin-header-actions">
                        <button id="admin-help" class="btn btn-help" title="Ayuda">
                            ❓
                        </button>
                        <button id="admin-logout" class="btn btn-secondary">
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>

                <div class="admin-content">
                    <div id="admin-home" class="admin-home">
                        <button type="button" class="admin-nav-card" data-section="partidos">
                            <span class="admin-nav-icon">⚽</span>
                            <span>Partidos</span>
                        </button>
                        <button type="button" class="admin-nav-card" data-section="jugadores">
                            <span class="admin-nav-icon">👥</span>
                            <span>Jugadores</span>
                        </button>
                        <button type="button" class="admin-nav-card" data-section="seguridad">
                            <span class="admin-nav-icon">🛡️</span>
                            <span>Seguridad</span>
                        </button>
                        <button type="button" class="admin-nav-card" data-section="configuracion">
                            <span class="admin-nav-icon">⚙️</span>
                            <span>Configuración</span>
                        </button>
                    </div>

                    <div id="admin-section-wrap" style="display: none;">
                        <button type="button" id="admin-back" class="btn btn-secondary btn-back">← Volver</button>
                        <div id="admin-section"></div>
                    </div>
                </div>

                <!-- Modal de confirmación -->
                <div id="confirm-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>⚠️ Confirmación</h3>
                        <p id="confirm-message"></p>
                        <div class="modal-actions">
                            <button id="confirm-yes" class="btn btn-danger">Sí, eliminar</button>
                            <button id="confirm-no" class="btn btn-secondary">Cancelar</button>
                        </div>
                    </div>
                </div>

                <!-- Modal de temporada -->
                <div id="season-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>Nueva Temporada</h3>
                        <div class="form-group">
                            <label for="season-name">Nombre</label>
                            <input type="text" id="season-name" placeholder="2025-26">
                        </div>
                        <div class="form-group">
                            <label for="season-start">Fecha de inicio</label>
                            <input type="date" id="season-start">
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="adminPanel.closeSeasonModal()">Cancelar</button>
                            <button class="btn btn-primary" onclick="adminPanel.saveSeason()">Crear</button>
                        </div>
                    </div>
                </div>

                <!-- Modal del maestro de jugadores -->
                <div id="player-master-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3 id="player-master-modal-title">Nuevo Jugador</h3>
                        <div class="form-group">
                            <label for="pm-name">Nombre</label>
                            <input type="text" id="pm-name" required>
                        </div>
                        <div class="form-group">
                            <label for="pm-emoji">Emoji</label>
                            <input type="text" id="pm-emoji" maxlength="2" placeholder="👤">
                        </div>
                        <div class="form-group">
                            <label for="pm-avatar">URL de avatar</label>
                            <input type="text" id="pm-avatar" placeholder="https://...">
                        </div>
                        <div class="form-group">
                            <label for="pm-notes">Notas</label>
                            <textarea id="pm-notes" rows="3"></textarea>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="adminPanel.closePlayerModal()">Cancelar</button>
                            <button class="btn btn-primary" onclick="adminPanel.savePlayerMaster()">Guardar</button>
                        </div>
                    </div>
                </div>

                <!-- Modal de fusión de jugadores duplicados -->
                <div id="merge-player-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>Fusionar jugador duplicado</h3>
                        <p id="merge-player-desc"></p>
                        <div class="form-group">
                            <label for="merge-target-input">Nombre duplicado a fusionar</label>
                            <input type="text" id="merge-target-input" list="merge-target-datalist" placeholder="Escribe o elige un nombre...">
                            <datalist id="merge-target-datalist"></datalist>
                        </div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="adminPanel.closeMergeModal()">Cancelar</button>
                            <button class="btn btn-danger" onclick="adminPanel.confirmMerge()">Fusionar</button>
                        </div>
                    </div>
                </div>

                <!-- Modal selector de disponibilidad ("+ Añadir") -->
                <div id="availability-picker-modal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <h3>Añadir jugador a esta temporada/día</h3>
                        <div id="availability-picker-list" class="players-list"></div>
                        <div class="modal-actions">
                            <button class="btn btn-secondary" onclick="adminPanel.closeAvailabilityPicker()">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sección "Partidos": alta de partidos + partidos recientes
     */
    getPartidosTemplate() {
        return `
            <div class="day-selector">
                <button class="btn-day ${this.currentDay === 'martes' ? 'active' : ''}" data-day="martes">Martes</button>
                <button class="btn-day ${this.currentDay === 'jueves' ? 'active' : ''}" data-day="jueves">Jueves</button>
            </div>

            <div class="admin-section">
                <h2>⚽ Añadir Nuevo Partido</h2>
                <form id="match-form" class="match-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="match-date">Fecha del Partido</label>
                            <input type="date" id="match-date" required>
                        </div>
                        <div class="form-group">
                            <label for="match-mvp">MVP</label>
                            <select id="match-mvp">
                                <option value="">Sin MVP</option>
                            </select>
                        </div>
                    </div>

                    <div class="teams-container">
                        <!-- Equipo Azul -->
                        <div class="team-section team-blue">
                            <h3>🔵 Equipo Azul</h3>
                            <div class="form-group">
                                <label for="blue-result">Goles del Equipo</label>
                                <input type="number" id="blue-result" min="0" required>
                            </div>

                            <div class="form-group">
                                <label>Jugadores Fijos</label>
                                <div id="blue-players-fixed" class="players-list-detailed">
                                    <!-- Se llenará dinámicamente -->
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Jugadores Extras</label>
                                <div id="blue-players-extras" class="players-extras">
                                    <!-- Se añadirán dinámicamente -->
                                </div>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="adminPanel.addExtraPlayer('blue')">
                                    ➕ Añadir Extra
                                </button>
                            </div>
                        </div>

                        <!-- Equipo Rojo -->
                        <div class="team-section team-red">
                            <h3>🔴 Equipo Rojo</h3>
                            <div class="form-group">
                                <label for="red-result">Goles del Equipo</label>
                                <input type="number" id="red-result" min="0" required>
                            </div>

                            <div class="form-group">
                                <label>Jugadores Fijos</label>
                                <div id="red-players-fixed" class="players-list-detailed">
                                    <!-- Se llenará dinámicamente -->
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Jugadores Extras</label>
                                <div id="red-players-extras" class="players-extras">
                                    <!-- Se añadirán dinámicamente -->
                                </div>
                                <button type="button" class="btn btn-secondary btn-sm" onclick="adminPanel.addExtraPlayer('red')">
                                    ➕ Añadir Extra
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            💾 Guardar Partido
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="adminPanel.cancelEdit()" style="display:none;" id="btn-cancel-edit">
                            ❌ Cancelar Edición
                        </button>
                        <button type="reset" class="btn btn-secondary">
                            🔄 Limpiar
                        </button>
                    </div>
                </form>
            </div>

            <div class="admin-section">
                <h2>📋 Partidos Recientes</h2>

                <div class="matches-filters">
                    <div class="filter-group">
                        <label for="filter-date-from">Desde:</label>
                        <input type="date" id="filter-date-from" class="filter-input">
                    </div>
                    <div class="filter-group">
                        <label for="filter-date-to">Hasta:</label>
                        <input type="date" id="filter-date-to" class="filter-input">
                    </div>
                    <button class="btn btn-primary" onclick="adminPanel.applyMatchFilters()">
                        🔍 Filtrar
                    </button>
                    <button class="btn btn-secondary" onclick="adminPanel.clearMatchFilters()">
                        🔄 Limpiar
                    </button>
                </div>

                <div id="recent-matches" class="recent-matches">
                    <p class="loading">Cargando partidos...</p>
                </div>
            </div>
        `;
    }

    /**
     * Sección "Jugadores": maestro + disponibilidad (fijos/eventuales). La gestión de
     * temporadas (crear/activar) vive en Configuración.
     */
    getJugadoresTemplate() {
        return `
            <div class="admin-section">
                <div class="players-management-header">
                    <h2>👥 Maestro de Jugadores</h2>
                    <div class="players-management-actions">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="adminPanel.linkHistoricalPlayers()" title="Vincula por nombre los partidos antiguos con el maestro, para que un cambio de nombre se refleje solo en toda la app">
                            🔗 Vincular histórico
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="adminPanel.openPlayerModal()">
                            ➕ Nuevo Jugador
                        </button>
                    </div>
                </div>
                <div id="players-list" class="players-list">
                    <p class="loading">Cargando jugadores...</p>
                </div>
            </div>

            <div class="day-selector">
                <button class="btn-day ${this.currentDay === 'martes' ? 'active' : ''}" data-day="martes">Martes</button>
                <button class="btn-day ${this.currentDay === 'jueves' ? 'active' : ''}" data-day="jueves">Jueves</button>
            </div>

            <div class="admin-section">
                <h2>📋 Disponibilidad (Fijos / Eventuales)</h2>
                <div class="availability-controls">
                    <label for="availability-season-select">Temporada</label>
                    <select id="availability-season-select"></select>
                </div>
                <div class="availability-board">
                    <div class="availability-column">
                        <h4>Fijos</h4>
                        <div id="availability-fixed" class="chips-row"></div>
                    </div>
                    <div class="availability-column">
                        <h4>Eventuales/Suplentes</h4>
                        <div id="availability-eventual" class="chips-row"></div>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="adminPanel.openAvailabilityPicker()">
                            ➕ Añadir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Sección "Seguridad": dashboard de seguridad
     */
    getSeguridadTemplate() {
        return `
            <div class="admin-section">
                <h2>🛡️ Panel de Seguridad</h2>
                <div id="security-dashboard-container"></div>
            </div>
        `;
    }

    /**
     * Sección "Configuración": temporadas + próximo seleccionador, en dos columnas (Martes/Jueves)
     */
    getConfiguracionTemplate() {
        const dayColumn = (day, label) => `
            <div class="config-column">
                <h3>📅 ${label}</h3>

                <div class="config-subsection">
                    <h4>Temporadas</h4>
                    <div id="config-seasons-list-${day}" class="players-list">
                        <p class="loading">Cargando temporadas...</p>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="adminPanel.openSeasonModal('${day}')">
                        ➕ Nueva Temporada
                    </button>
                </div>

                <div class="form-group">
                    <label for="config-season-select-${day}">Ver fijos de la temporada</label>
                    <select id="config-season-select-${day}"></select>
                </div>

                <div class="form-group">
                    <label for="next-selector-${day}">Próximo Seleccionador</label>
                    <select id="next-selector-${day}">
                        <option value="">Seleccionar...</option>
                    </select>
                </div>
            </div>
        `;

        return `
            <div class="admin-section">
                <h2>⚙️ Configuración</h2>
                <form id="config-form">
                    <div class="config-columns">
                        ${dayColumn('martes', 'Martes')}
                        ${dayColumn('jueves', 'Jueves')}
                    </div>
                    <button type="submit" class="btn btn-primary">
                        💾 Guardar Configuración
                    </button>
                </form>
            </div>
        `;
    }

    /**
     * Adjunta los event listeners de la cabecera y el menú principal (una sola vez)
     */
    attachEventListeners() {
        document.querySelectorAll('.admin-nav-card').forEach(btn => {
            btn.addEventListener('click', () => this.showSection(btn.dataset.section));
        });

        document.getElementById('admin-back').addEventListener('click', () => this.showHome());

        document.getElementById('admin-logout').addEventListener('click', () => {
            if (confirm('¿Seguro que quieres cerrar sesión?')) {
                window.location.href = 'admin.html?logout=true';
            }
        });

        document.getElementById('admin-help').addEventListener('click', () => {
            this.showHelpModal();
        });
    }

    /**
     * Vuelve al menú principal de 4 accesos
     */
    showHome() {
        if (this.currentSection === 'seguridad') {
            this.securityDashboard.stopAutoRefresh();
        }
        this.currentSection = null;
        document.getElementById('admin-home').style.display = 'grid';
        document.getElementById('admin-section-wrap').style.display = 'none';
        document.getElementById('admin-section').innerHTML = '';
    }

    /**
     * Navega a una de las 4 secciones y carga sus datos
     */
    async showSection(section) {
        if (this.currentSection === 'seguridad' && section !== 'seguridad') {
            this.securityDashboard.stopAutoRefresh();
        }

        this.currentSection = section;
        document.getElementById('admin-home').style.display = 'none';
        document.getElementById('admin-section-wrap').style.display = 'block';

        const el = document.getElementById('admin-section');

        switch (section) {
            case 'partidos':
                el.innerHTML = this.getPartidosTemplate();
                this.attachPartidosListeners();
                await this.loadSeasonsAdmin();
                await this.loadAvailabilityBoard();
                await this.loadRecentMatches();
                break;
            case 'jugadores':
                el.innerHTML = this.getJugadoresTemplate();
                this.attachJugadoresListeners();
                await this.loadSeasonsAdmin();
                await this.loadAllPlayers();
                await this.loadAvailabilityBoard();
                break;
            case 'seguridad':
                el.innerHTML = this.getSeguridadTemplate();
                await this.securityDashboard.render('security-dashboard-container');
                break;
            case 'configuracion':
                el.innerHTML = this.getConfiguracionTemplate();
                this.attachConfiguracionListeners();
                await this.loadNextSelectors();
                break;
            default:
                console.error('❌ Sección de admin desconocida:', section);
        }
    }

    /**
     * Listeners propios de la sección Partidos (se reatan cada vez que se entra)
     */
    attachPartidosListeners() {
        document.querySelectorAll('.btn-day').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDay = e.target.dataset.day;
                this.currentAdminSeasonId = null; // se recalcula a la temporada activa del nuevo día
                await this.loadSeasonsAdmin();
                this.loadAvailabilityBoard();
                this.loadRecentMatches();
            });
        });

        const matchForm = document.getElementById('match-form');
        this.csrf.addTokenToForm(matchForm);
        this.honeypot.addToForm(matchForm);
        matchForm.addEventListener('submit', (e) => this.handleMatchSubmit(e));
    }

    /**
     * Listeners propios de la sección Jugadores (se reatan cada vez que se entra)
     */
    attachJugadoresListeners() {
        document.querySelectorAll('.btn-day').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDay = e.target.dataset.day;
                this.currentAdminSeasonId = null; // se recalcula a la temporada activa del nuevo día
                await this.loadSeasonsAdmin();
                this.loadAllPlayers();
                this.loadAvailabilityBoard();
            });
        });

        document.getElementById('availability-season-select')?.addEventListener('change', (e) => {
            this.currentAdminSeasonId = e.target.value || null;
            this.loadAvailabilityBoard();
        });
    }

    /**
     * Listeners propios de la sección Configuración (se reatan cada vez que se entra)
     */
    attachConfiguracionListeners() {
        const form = document.getElementById('config-form');
        this.csrf.addTokenToForm(form);
        this.honeypot.addToForm(form);
        form.addEventListener('submit', (e) => this.handleConfigSubmit(e));

        ['martes', 'jueves'].forEach(day => {
            document.getElementById(`config-season-select-${day}`)?.addEventListener('change', () => {
                this.refreshNextSelectorOptions();
            });
        });
    }

    /**
     * Devuelve un filtro de season_id (temporada seleccionada o "sin temporada")
     * aplicable a queries sobre player_availability
     */
    seasonFilter(query) {
        return this.currentAdminSeasonId
            ? query.eq('season_id', this.currentAdminSeasonId)
            : query.is('season_id', null);
    }

    // ── Temporadas ──────────────────────────────────────────────

    /**
     * Carga las temporadas del día actual y preselecciona la activa
     */
    async loadSeasonsAdmin() {
        try {
            const { data, error } = await this.supabase
                .from('seasons')
                .select('*')
                .eq('day', this.currentDay)
                .order('start_date', { ascending: false });
            if (error) throw error;
            this.adminSeasons = data || [];
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar temporadas (¿falta aplicar sql/supabase-seasons.sql?):', error.message);
            this.adminSeasons = [];
        }

        if (!this.adminSeasons.some(s => s.id === this.currentAdminSeasonId)) {
            const active = this.adminSeasons.find(s => s.is_active);
            this.currentAdminSeasonId = active ? active.id : (this.adminSeasons[0]?.id || null);
        }

        this.renderAvailabilitySeasonSelect();
    }

    // ── Gestión de temporadas (vive en Configuración) ────────────

    /**
     * Carga todas las temporadas (ambos días) para las dos columnas de Configuración
     */
    async loadConfigSeasons() {
        try {
            const { data, error } = await this.supabase
                .from('seasons')
                .select('*')
                .order('start_date', { ascending: false });
            if (error) throw error;
            this.configSeasons = data || [];
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar temporadas (¿falta aplicar sql/supabase-seasons.sql?):', error.message);
            this.configSeasons = [];
        }
    }

    renderConfigSeasonsList(day) {
        const el = document.getElementById(`config-seasons-list-${day}`);
        if (!el) return;
        const seasons = this.configSeasons.filter(s => s.day === day);
        el.innerHTML = seasons.map(s => `
            <div class="player-item">
                <span class="player-name">${s.name}</span>
                <span class="player-badge day">desde ${s.start_date}</span>
                ${s.is_active
                    ? '<span class="player-badge fixed">Activa</span>'
                    : `<button class="btn btn-secondary btn-sm" onclick="adminPanel.activateSeason('${s.id}', '${day}')">Activar</button>`}
            </div>
        `).join('') || '<p class="no-data">Sin temporadas para este día</p>';
    }

    renderConfigSeasonSelect(day) {
        const select = document.getElementById(`config-season-select-${day}`);
        if (!select) return;
        const seasons = this.configSeasons.filter(s => s.day === day);
        const activeId = seasons.find(s => s.is_active)?.id || seasons[0]?.id || '';
        select.innerHTML = seasons.map(s =>
            `<option value="${s.id}" ${s.id === activeId ? 'selected' : ''}>${s.is_active ? '★ ' : ''}${s.name}</option>`
        ).join('') || '<option value="">Sin temporadas</option>';
    }

    /**
     * Recarga la lista/selector de temporadas de una columna tras crear/activar una
     */
    async refreshConfigSeasonsColumn(day) {
        await this.loadConfigSeasons();
        this.renderConfigSeasonsList(day);
        this.renderConfigSeasonSelect(day);
        await this.refreshNextSelectorOptions();
    }

    openSeasonModal(day) {
        this.seasonModalDay = day;
        const year = new Date().getFullYear();
        document.getElementById('season-name').value = `${year}-${String(year + 1).slice(2)}`;
        document.getElementById('season-start').value = new Date().toISOString().slice(0, 10);
        document.getElementById('season-modal').style.display = 'flex';
    }

    closeSeasonModal() {
        document.getElementById('season-modal').style.display = 'none';
    }

    async saveSeason() {
        const name = document.getElementById('season-name').value.trim();
        const startDate = document.getElementById('season-start').value;

        if (!name || !startDate) {
            this.showNotification('Nombre y fecha de inicio son obligatorios', 'error');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('seasons')
                .insert({ name, day: this.seasonModalDay, start_date: startDate });
            if (error) throw error;

            this.closeSeasonModal();
            this.showNotification('✅ Temporada creada', 'success');
            await this.refreshConfigSeasonsColumn(this.seasonModalDay);
        } catch (error) {
            console.error('Error creando temporada:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    async activateSeason(id, day) {
        try {
            await this.supabase.from('seasons').update({ is_active: false }).eq('day', day);
            const { error } = await this.supabase.from('seasons').update({ is_active: true }).eq('id', id);
            if (error) throw error;

            this.showNotification('✅ Temporada activada', 'success');
            await this.refreshConfigSeasonsColumn(day);
        } catch (error) {
            console.error('Error activando temporada:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    // ── Maestro de jugadores ────────────────────────────────────

    /**
     * Carga el maestro completo de jugadores (sin filtro de día/temporada)
     */
    async loadAllPlayers() {
        try {
            const { data, error } = await this.supabase
                .from('players')
                .select('id, name, emoji, avatar_url, notes')
                .order('name');
            if (error) throw error;
            this.allPlayers = data || [];
            await this.loadMasterAvailabilityBadges();
            this.renderMasterList();
        } catch (error) {
            console.error('Error cargando maestro de jugadores:', error);
            this.showNotification('Error cargando maestro', 'error');
        }
    }

    /**
     * Para cada jugador del maestro, calcula si es fijo/eventual en martes y/o
     * jueves dentro de la temporada activa de cada día (o "sin temporada" si
     * ningún día tiene una activa). Alimenta this.masterAvailability como
     * { [playerId]: { martes: true|false|undefined, jueves: true|false|undefined } }
     */
    async loadMasterAvailabilityBadges() {
        this.masterAvailability = {};
        try {
            const { data: seasons, error: seasonsError } = await this.supabase
                .from('seasons')
                .select('id, day')
                .eq('is_active', true);
            if (seasonsError) throw seasonsError;

            const activeSeasonByDay = { martes: null, jueves: null };
            (seasons || []).forEach(s => { activeSeasonByDay[s.day] = s.id; });

            for (const day of ['martes', 'jueves']) {
                let query = this.supabase
                    .from('player_availability')
                    .select('player_id, is_fixed')
                    .eq('day', day);
                query = activeSeasonByDay[day]
                    ? query.eq('season_id', activeSeasonByDay[day])
                    : query.is('season_id', null);

                const { data, error } = await query;
                if (error) throw error;
                (data || []).forEach(row => {
                    if (!this.masterAvailability[row.player_id]) this.masterAvailability[row.player_id] = {};
                    this.masterAvailability[row.player_id][day] = row.is_fixed;
                });
            }
        } catch (error) {
            console.warn('⚠️ No se pudo calcular fijo/eventual del maestro:', error.message);
        }
    }

    renderMasterList() {
        const list = document.getElementById('players-list');
        if (!list) return;
        list.innerHTML = this.allPlayers.map(p => {
            const noteAttr = p.notes ? ` title="${p.notes.replace(/"/g, '&quot;')}"` : '';
            const noteText = p.notes ? `<span class="player-note">${p.notes}</span>` : '';
            const avail = this.masterAvailability?.[p.id] || {};
            const dayBadges = [
                avail.martes !== undefined ? { fixed: avail.martes, code: 'M' } : null,
                avail.jueves !== undefined ? { fixed: avail.jueves, code: 'J' } : null
            ].filter(Boolean).map(({ fixed, code }) =>
                `<span class="player-badge availability-badge ${fixed ? 'fixed' : 'eventual'}" title="${fixed ? 'Fijo' : 'Eventual'} de ${code === 'M' ? 'martes' : 'jueves'}">${fixed ? 'F' : 'E'}${code}</span>`
            ).join('');
            return `
            <div class="player-item ${p.notes ? 'has-note' : ''}"${noteAttr}>
                <span class="player-avatar">${p.emoji || '👤'}</span>
                <span class="player-name-wrap">
                    <span class="player-name">${p.name}</span>
                    ${dayBadges}
                    ${noteText}
                </span>
                <div class="player-item-actions">
                    <button class="btn-icon" onclick="adminPanel.openMergeModal('${p.id}')" title="Fusionar un nombre duplicado en este jugador">🔀</button>
                    <button class="btn-icon btn-edit" onclick="adminPanel.openPlayerModal('${p.id}')">✏️</button>
                    <button class="btn-icon btn-delete" onclick="adminPanel.deletePlayer('${p.id}', '${p.name}')">🗑️</button>
                </div>
            </div>
        `;
        }).join('') || '<p class="no-data">Sin jugadores</p>';
    }

    /**
     * Abre el modal para fusionar un nombre duplicado (del maestro o solo del histórico
     * de partidos) dentro del jugador elegido, que es el que se queda
     */
    async openMergeModal(id) {
        this.mergingPlayerId = id;
        const player = this.allPlayers.find(p => p.id === id);
        if (!player) return;

        const orphanNames = await this.getOrphanMatchNames();
        const masterNames = this.allPlayers.filter(p => p.id !== id).map(p => p.name);
        const suggestions = [...new Set([...masterNames, ...orphanNames])].sort((a, b) => a.localeCompare(b));

        document.getElementById('merge-player-desc').textContent =
            `Escribe o elige el nombre duplicado que quieres fusionar en "${player.name}". Se reescribirá su historial de partidos; si además es un jugador del maestro, se trasladará su disponibilidad y se eliminará.`;
        document.getElementById('merge-target-input').value = '';
        document.getElementById('merge-target-datalist').innerHTML =
            suggestions.map(name => `<option value="${name}"></option>`).join('');

        document.getElementById('merge-player-modal').style.display = 'flex';
    }

    closeMergeModal() {
        document.getElementById('merge-player-modal').style.display = 'none';
        this.mergingPlayerId = null;
    }

    /**
     * Nombres que aparecen en el histórico de partidos (lineups/mvp) pero no tienen
     * fila en el maestro de jugadores (p.ej. jugadores antiguos ya eliminados de players)
     */
    async getOrphanMatchNames() {
        try {
            const { data, error } = await this.supabase
                .from('matches')
                .select('mvp, blue_lineup, red_lineup');
            if (error) throw error;

            const names = new Set();
            (data || []).forEach(m => {
                (m.blue_lineup || []).forEach(p => p.name && names.add(p.name));
                (m.red_lineup || []).forEach(p => p.name && names.add(p.name));
                if (m.mvp) names.add(m.mvp);
            });

            const masterNames = new Set(this.allPlayers.map(p => p.name));
            return [...names].filter(name => !masterNames.has(name));
        } catch (error) {
            console.warn('No se pudieron cargar nombres históricos:', error.message);
            return [];
        }
    }

    /**
     * Vincula por nombre los partidos antiguos con el maestro de jugadores: añade
     * player_id a cada entrada de blue_lineup/red_lineup y mvp_player_id al partido
     * cuando el nombre guardado coincide exactamente con un jugador del maestro.
     * A partir de ahí, renombrar a ese jugador en el maestro se refleja solo en toda
     * la app, sin tener que tocar los partidos (ver Fusionar para nombres que no coincidan).
     */
    async linkHistoricalPlayers() {
        try {
            const nameToId = {};
            this.allPlayers.forEach(p => { nameToId[p.name] = p.id; });

            const { data: matches, error } = await this.supabase
                .from('matches')
                .select('id, mvp, mvp_player_id, blue_lineup, red_lineup');
            if (error) throw error;

            const unresolved = new Set();
            let linkedMatches = 0;
            let linkedEntries = 0;

            for (const match of matches || []) {
                let changed = false;

                const linkLineup = (lineup) => (lineup || []).map(p => {
                    if (p.player_id) return p;
                    const id = nameToId[p.name];
                    if (!id) {
                        if (p.name) unresolved.add(p.name);
                        return p;
                    }
                    changed = true;
                    linkedEntries++;
                    return { ...p, player_id: id };
                });

                const newBlue = linkLineup(match.blue_lineup);
                const newRed = linkLineup(match.red_lineup);

                let mvpPlayerId = match.mvp_player_id;
                if (!mvpPlayerId && match.mvp) {
                    const id = nameToId[match.mvp];
                    if (id) {
                        mvpPlayerId = id;
                        changed = true;
                    } else {
                        unresolved.add(match.mvp);
                    }
                }

                if (!changed) continue;

                const { error: updateError } = await this.supabase
                    .from('matches')
                    .update({ blue_lineup: newBlue, red_lineup: newRed, mvp_player_id: mvpPlayerId })
                    .eq('id', match.id);
                if (updateError) throw updateError;
                linkedMatches++;
            }

            let message = `✅ ${linkedMatches} partido(s) actualizados (${linkedEntries} jugadores vinculados)`;
            if (unresolved.size > 0) {
                console.warn('Nombres sin vincular (sin fila exacta en el maestro):', [...unresolved]);
                message += `. ${unresolved.size} nombre(s) sin vincular (revisa la consola, o usa 🔀 Fusionar)`;
            }
            this.showNotification(message, unresolved.size > 0 ? 'info' : 'success');

            if (this.dataManager) {
                await this.dataManager.reload();
            }
        } catch (error) {
            console.error('Error vinculando histórico:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Fusiona el nombre duplicado escrito en el input dentro del jugador elegido
     * (this.mergingPlayerId): renombra su historial en matches/settings y, si el
     * nombre duplicado corresponde a otro jugador del maestro, traslada su
     * disponibilidad y lo elimina.
     */
    async confirmMerge() {
        const duplicateName = document.getElementById('merge-target-input').value.trim();
        if (!duplicateName) {
            this.showNotification('Escribe el nombre duplicado a fusionar', 'error');
            return;
        }

        const target = this.allPlayers.find(p => p.id === this.mergingPlayerId);
        if (!target) return;

        if (duplicateName === target.name) {
            this.showNotification('Ese es el mismo nombre', 'error');
            return;
        }

        const duplicatePlayer = this.allPlayers.find(p => p.name === duplicateName);

        if (!confirm(`¿Fusionar "${duplicateName}" en "${target.name}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await this.renamePlayerEverywhere(duplicateName, target.name);

            if (duplicatePlayer) {
                await this.reassignAvailability(duplicatePlayer.id, target.id);
                const { error } = await this.supabase.from('players').delete().eq('id', duplicatePlayer.id);
                if (error) throw error;
            }

            this.closeMergeModal();
            this.showNotification(`✅ "${duplicateName}" fusionado en "${target.name}"`, 'success');
            await this.loadAllPlayers();
            await this.loadAvailabilityBoard();

            if (this.dataManager) {
                await this.dataManager.reload();
            }
        } catch (error) {
            console.error('Error fusionando jugadores:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Traslada la disponibilidad (fijo/eventual, por día y temporada) de un jugador a otro.
     * Si el destino ya tiene disponibilidad en ese día/temporada, se descarta la del origen.
     */
    async reassignAvailability(sourceId, targetId) {
        const { data: sourceRows, error } = await this.supabase
            .from('player_availability')
            .select('*')
            .eq('player_id', sourceId);
        if (error) throw error;

        for (const row of sourceRows || []) {
            let existingQuery = this.supabase
                .from('player_availability')
                .select('id')
                .eq('player_id', targetId)
                .eq('day', row.day);
            existingQuery = row.season_id
                ? existingQuery.eq('season_id', row.season_id)
                : existingQuery.is('season_id', null);

            const { data: existing } = await existingQuery.maybeSingle();

            if (existing) {
                await this.supabase.from('player_availability').delete().eq('id', row.id);
            } else {
                await this.supabase.from('player_availability').update({ player_id: targetId }).eq('id', row.id);
            }
        }
    }

    openPlayerModal(id = null) {
        this.editingPlayerId = id;
        const player = id ? this.allPlayers.find(p => p.id === id) : null;

        document.getElementById('player-master-modal-title').textContent = player ? 'Editar Jugador' : 'Nuevo Jugador';
        document.getElementById('pm-name').value = player?.name || '';
        document.getElementById('pm-emoji').value = player?.emoji || '';
        document.getElementById('pm-avatar').value = player?.avatar_url || '';
        document.getElementById('pm-notes').value = player?.notes || '';
        document.getElementById('player-master-modal').style.display = 'flex';
    }

    closePlayerModal() {
        document.getElementById('player-master-modal').style.display = 'none';
        this.editingPlayerId = null;
    }

    async savePlayerMaster() {
        const name = document.getElementById('pm-name').value.trim();
        if (!name) {
            this.showNotification('El nombre es obligatorio', 'error');
            return;
        }

        const payload = {
            name,
            emoji: document.getElementById('pm-emoji').value.trim() || null,
            avatar_url: document.getElementById('pm-avatar').value.trim() || null,
            notes: document.getElementById('pm-notes').value.trim() || null
        };

        const previousPlayer = this.editingPlayerId
            ? this.allPlayers.find(p => p.id === this.editingPlayerId)
            : null;
        const oldName = previousPlayer?.name;

        try {
            const { error } = this.editingPlayerId
                ? await this.supabase.from('players').update(payload).eq('id', this.editingPlayerId)
                : await this.supabase.from('players').insert(payload);
            if (error) throw error;

            // blue_lineup/red_lineup/mvp/next_selector guardan el nombre como texto plano
            // (no una referencia al maestro), así que un cambio de nombre hay que propagarlo a mano.
            if (oldName && oldName !== name) {
                await this.renamePlayerEverywhere(oldName, name);
            }

            this.closePlayerModal();
            this.showNotification('✅ Jugador guardado', 'success');
            await this.loadAllPlayers();

            if (this.dataManager) {
                await this.dataManager.reload();
            }
        } catch (error) {
            console.error('Error guardando jugador:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Propaga un cambio de nombre a los partidos históricos y a settings.
     * blue_lineup/red_lineup/mvp/next_selector guardan el nombre del jugador como
     * texto plano (no como referencia al maestro), así que hay que reescribirlos.
     */
    async renamePlayerEverywhere(oldName, newName) {
        try {
            const { data: matches, error } = await this.supabase
                .from('matches')
                .select('id, mvp, blue_lineup, red_lineup');
            if (error) throw error;

            const renameInLineup = (lineup) => (lineup || []).map(p =>
                p.name === oldName ? { ...p, name: newName } : p
            );

            let updatedCount = 0;
            for (const match of matches || []) {
                const blueChanged = (match.blue_lineup || []).some(p => p.name === oldName);
                const redChanged = (match.red_lineup || []).some(p => p.name === oldName);
                const mvpChanged = match.mvp === oldName;
                if (!blueChanged && !redChanged && !mvpChanged) continue;

                const { error: updateError } = await this.supabase
                    .from('matches')
                    .update({
                        blue_lineup: blueChanged ? renameInLineup(match.blue_lineup) : match.blue_lineup,
                        red_lineup: redChanged ? renameInLineup(match.red_lineup) : match.red_lineup,
                        mvp: mvpChanged ? newName : match.mvp
                    })
                    .eq('id', match.id);
                if (updateError) throw updateError;
                updatedCount++;
            }

            const { error: settingsError } = await this.supabase
                .from('settings')
                .update({ next_selector: newName })
                .eq('next_selector', oldName);
            if (settingsError) throw settingsError;

            if (updatedCount > 0) {
                this.showNotification(`🔁 Nombre actualizado en ${updatedCount} partido(s) históricos`, 'info');
            }
        } catch (error) {
            console.error('Error propagando cambio de nombre:', error);
            this.showNotification('⚠️ Jugador renombrado, pero hubo un error actualizando partidos antiguos: ' + error.message, 'error');
        }
    }

    // ── Disponibilidad por temporada (fijos/eventuales) ─────────

    /**
     * Carga la disponibilidad del día + temporada seleccionados y alimenta
     * tanto el tablero de chips como los selects del formulario de partido
     */
    async loadAvailabilityBoard() {
        try {
            let query = this.supabase
                .from('player_availability')
                .select('player_id, is_fixed, players(id, name, emoji)')
                .eq('day', this.currentDay);
            query = this.seasonFilter(query);

            const { data, error } = await query;
            if (error) throw error;

            const rows = (data || []).filter(r => r.players);
            this.fixedPlayers = rows.filter(r => r.is_fixed)
                .map(r => ({ id: r.players.id, name: r.players.name, day: this.currentDay, is_fixed: true }));
            this.eventualPlayers = rows.filter(r => !r.is_fixed)
                .map(r => ({ id: r.players.id, name: r.players.name, day: this.currentDay, is_fixed: false }));

            // El formulario de partido (sección Partidos) consume estas mismas listas, si está montado
            this.updatePlayerSelections(this.fixedPlayers, this.eventualPlayers);
            this.updateMVPSelect([...this.fixedPlayers, ...this.eventualPlayers]);

            this.renderAvailabilityBoard();
        } catch (error) {
            console.error('Error cargando disponibilidad:', error);
            this.showNotification('Error cargando disponibilidad', 'error');
        }
    }

    renderAvailabilitySeasonSelect() {
        const select = document.getElementById('availability-season-select');
        if (!select) return;
        select.innerHTML = this.adminSeasons.map(s =>
            `<option value="${s.id}" ${s.id === this.currentAdminSeasonId ? 'selected' : ''}>${s.is_active ? '★ ' : ''}${s.name}</option>`
        ).join('') || '<option value="">Sin temporadas</option>';
    }

    renderAvailabilityBoard() {
        const fixedEl = document.getElementById('availability-fixed');
        const eventualEl = document.getElementById('availability-eventual');
        if (!fixedEl || !eventualEl) return;

        const chip = (p) => `
            <span class="player-chip" onclick="adminPanel.toggleAvailability('${p.id}', ${p.is_fixed})">
                ${p.name}
                <button type="button" class="btn-icon btn-delete" onclick="event.stopPropagation(); adminPanel.removeAvailability('${p.id}')">✕</button>
            </span>`;

        fixedEl.innerHTML = this.fixedPlayers.map(chip).join('') || '<p class="no-data">Sin fijos</p>';
        eventualEl.innerHTML = this.eventualPlayers.map(chip).join('') || '<p class="no-data">Sin eventuales</p>';
    }

    /**
     * Alterna fijo/eventual de un jugador ya presente en el tablero
     */
    async toggleAvailability(playerId, currentIsFixed) {
        try {
            const { error } = await this.supabase
                .from('player_availability')
                .upsert({
                    player_id: playerId,
                    day: this.currentDay,
                    season_id: this.currentAdminSeasonId,
                    is_fixed: !currentIsFixed
                }, { onConflict: this.currentAdminSeasonId ? 'player_id,day,season_id' : 'player_id,day' });
            if (error) throw error;

            await this.loadAvailabilityBoard();
        } catch (error) {
            console.error('Error actualizando disponibilidad:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    openAvailabilityPicker() {
        const assignedIds = new Set([...this.fixedPlayers, ...this.eventualPlayers].map(p => p.id));
        const available = this.allPlayers.filter(p => !assignedIds.has(p.id));

        const list = document.getElementById('availability-picker-list');
        list.innerHTML = available.map(p => `
            <div class="player-item">
                <span class="player-avatar">${p.emoji || '👤'}</span>
                <span class="player-name">${p.name}</span>
                <div class="player-item-actions">
                    <button class="btn btn-secondary btn-sm" onclick="adminPanel.addToAvailability('${p.id}', true)">Fijo</button>
                    <button class="btn btn-secondary btn-sm" onclick="adminPanel.addToAvailability('${p.id}', false)">Eventual</button>
                </div>
            </div>
        `).join('') || '<p class="no-data">Todos los jugadores del maestro ya están asignados</p>';

        document.getElementById('availability-picker-modal').style.display = 'flex';
    }

    closeAvailabilityPicker() {
        document.getElementById('availability-picker-modal').style.display = 'none';
    }

    /**
     * Añade un jugador del maestro a esta temporada/día como eventual
     */
    async addToAvailability(playerId, isFixed) {
        try {
            const { error } = await this.supabase
                .from('player_availability')
                .upsert({
                    player_id: playerId,
                    day: this.currentDay,
                    season_id: this.currentAdminSeasonId,
                    is_fixed: isFixed
                }, { onConflict: this.currentAdminSeasonId ? 'player_id,day,season_id' : 'player_id,day' });
            if (error) throw error;

            this.closeAvailabilityPicker();
            this.showNotification(`✅ Jugador añadido como ${isFixed ? 'fijo' : 'eventual'}`, 'success');
            await this.loadAvailabilityBoard();
        } catch (error) {
            console.error('Error añadiendo disponibilidad:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    async removeAvailability(playerId) {
        try {
            let query = this.supabase
                .from('player_availability')
                .delete()
                .eq('player_id', playerId)
                .eq('day', this.currentDay);
            query = this.seasonFilter(query);

            const { error } = await query;
            if (error) throw error;

            await this.loadAvailabilityBoard();
        } catch (error) {
            console.error('Error quitando disponibilidad:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Actualiza las selecciones de jugadores para los equipos
     */
    updatePlayerSelections(fixedPlayers, eventualPlayers) {
        const blueFixedContainer = document.getElementById('blue-players-fixed');
        const redFixedContainer = document.getElementById('red-players-fixed');

        // No están montados si no estamos en la sección Partidos; no hay nada que hacer
        if (!blueFixedContainer || !redFixedContainer) {
            return;
        }

        console.log(`📝 Actualizando UI con ${fixedPlayers.length} jugadores fijos`);

        // HTML para jugadores fijos con estadísticas
        const createFixedPlayerHTML = (p, team) => `
            <div class="player-stat-row" data-player-name="${p.name}">
                <label class="player-checkbox">
                    <input type="checkbox" name="${team}-player-fixed" value="${p.name}" data-player-id="${p.id}"
                           onchange="adminPanel.togglePlayerStats(this, '${team}')">
                    <span>${p.name}</span>
                </label>
                <div class="player-stats" style="display: none;">
                    <div class="stat-group">
                        <label class="stat-label">Goles</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="goles">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Asist.</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="asistencias">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Enc.</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="portero" title="Goles encajados como portero">
                    </div>
                </div>
            </div>
        `;

        blueFixedContainer.innerHTML = fixedPlayers.map(p => createFixedPlayerHTML(p, 'blue')).join('');
        redFixedContainer.innerHTML = fixedPlayers.map(p => createFixedPlayerHTML(p, 'red')).join('');
        
        console.log('✅ UI de jugadores actualizada');
    }

    /**
     * Toggle de estadísticas de jugador
     */
    togglePlayerStats(checkbox, team) {
        const row = checkbox.closest('.player-stat-row');
        const stats = row.querySelector('.player-stats');
        
        if (checkbox.checked) {
            stats.style.display = 'flex';
        } else {
            stats.style.display = 'none';
            // Limpiar valores
            stats.querySelectorAll('input[type="number"]').forEach(input => {
                input.value = '0';
            });
        }
    }

    /**
     * Añade un jugador extra al equipo
     */
    addExtraPlayer(team) {
        const container = document.getElementById(`${team}-players-extras`);
        const extraId = `extra-${team}-${Date.now()}`;
        
        const extraHTML = `
            <div class="player-extra-row" id="${extraId}">
                <select class="extra-player-select" data-extra-id="${extraId}">
                    <option value="">-- Seleccionar eventual --</option>
                    ${this.eventualPlayers.map(p => 
                        `<option value="${p.name}">${p.name}</option>`
                    ).join('')}
                    <option value="__new__">+ Nuevo jugador...</option>
                </select>
                <input type="text" class="extra-player-name" placeholder="Nombre nuevo jugador" 
                       style="display: none;">
                <div class="player-stats">
                    <div class="stat-group">
                        <label class="stat-label">Goles</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="goles">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Asist.</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="asistencias">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Enc.</label>
                        <input type="number" min="0" value="0" 
                               class="stat-input" data-stat="portero" title="Goles encajados como portero">
                    </div>
                </div>
                <button type="button" class="btn-icon btn-delete" onclick="adminPanel.removeExtraPlayer('${extraId}')">
                    ❌
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', extraHTML);
        
        // Añadir listener para el select
        const select = document.querySelector(`[data-extra-id="${extraId}"]`);
        const nameInput = select.nextElementSibling;
        
        select.addEventListener('change', (e) => {
            if (e.target.value === '__new__') {
                nameInput.style.display = 'block';
                nameInput.required = true;
            } else {
                nameInput.style.display = 'none';
                nameInput.required = false;
                nameInput.value = '';
            }
        });
    }

    /**
     * Elimina un jugador extra
     */
    removeExtraPlayer(extraId) {
        const element = document.getElementById(extraId);
        if (element) {
            element.remove();
        }
    }

    /**
     * Añade un jugador extra con datos precargados (para edición)
     */
    addExtraPlayerWithData(team, playerData) {
        const container = document.getElementById(`${team}-players-extras`);
        const extraId = `extra-${team}-${Date.now()}-${Math.random()}`;
        
        // Cuando editamos, el jugador ya existe - simplemente mostrarlo seleccionado
        const playerName = playerData.name || '';
        
        const extraHTML = `
            <div class="player-extra-row" id="${extraId}">
                <select class="extra-player-select" data-extra-id="${extraId}">
                    <option value="">-- Seleccionar eventual --</option>
                    ${this.eventualPlayers.map(p => 
                        `<option value="${p.name}" ${p.name === playerName ? 'selected' : ''}>${p.name}</option>`
                    ).join('')}
                    <option value="__new__">+ Nuevo jugador...</option>
                </select>
                <input type="text" class="extra-player-name" placeholder="Nombre nuevo jugador" 
                       value="${playerName}"
                       style="display: none;">
                <div class="player-stats">
                    <div class="stat-group">
                        <label class="stat-label">Goles</label>
                        <input type="number" min="0" value="${playerData.goal || playerData.goles || 0}" 
                               class="stat-input" data-stat="goles">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Asist.</label>
                        <input type="number" min="0" value="${playerData.assist || playerData.asistencias || 0}" 
                               class="stat-input" data-stat="asistencias">
                    </div>
                    <div class="stat-group">
                        <label class="stat-label">Enc.</label>
                        <input type="number" min="0" value="${playerData.keeper || playerData.portero || 0}" 
                               class="stat-input" data-stat="portero" title="Goles encajados como portero">
                    </div>
                </div>
                <button type="button" class="btn-icon btn-delete" onclick="adminPanel.removeExtraPlayer('${extraId}')">
                    ❌
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', extraHTML);
        
        // Añadir listener para el select
        const select = document.querySelector(`[data-extra-id="${extraId}"]`);
        const nameInput = select.nextElementSibling;
        
        select.addEventListener('change', (e) => {
            if (e.target.value === '__new__') {
                nameInput.style.display = 'block';
                nameInput.required = true;
            } else {
                nameInput.style.display = 'none';
                nameInput.required = false;
                nameInput.value = '';
            }
        });
    }

    /**
     * Actualiza el select de MVP (solo existe si estamos en la sección Partidos)
     */
    updateMVPSelect(players) {
        const mvpSelect = document.getElementById('match-mvp');
        if (!mvpSelect) return;
        mvpSelect.innerHTML = '<option value="">Sin MVP</option>' +
            players.map(p => `<option value="${p.name}" data-id="${p.id}">${p.name}</option>`).join('');
    }

    /**
     * Maneja el envío del formulario de partido (crear o actualizar)
     */
    async handleMatchSubmit(e) {
        e.preventDefault();

        // Validar token CSRF
        const formData = new FormData(e.target);
        const csrfToken = formData.get('csrf_token');
        if (!this.csrf.validateToken(csrfToken)) {
            this.showNotification('❌ Token de seguridad inválido. Recarga la página.', 'error');
            console.error('🔒 CSRF validation failed');
            return;
        }

        // Validar honeypot anti-bot
        const honeypotValidation = this.honeypot.validate(e.target);
        if (honeypotValidation.isBot) {
            console.error('🤖 Bot detectado:', honeypotValidation.reason);
            await this.logger.logSecurityEvent('BOT_DETECTED', {
                form: 'match-form',
                reason: honeypotValidation.reason
            });
            this.showNotification('❌ Error de validación. Por favor, intenta de nuevo.', 'error');
            return;
        }

        try {
            // Obtener usuario actual
            const { data: { user } } = await this.supabase.auth.getUser();
            
            // Recoger datos del formulario
            const matchDate = document.getElementById('match-date').value;
            const mvpSelect = document.getElementById('match-mvp');
            const mvp = mvpSelect.value || null;
            const mvpPlayerId = mvpSelect.selectedOptions[0]?.dataset.id || null;
            const blueResult = parseInt(document.getElementById('blue-result').value);
            const redResult = parseInt(document.getElementById('red-result').value);

            // Recoger jugadores fijos del equipo azul
            const bluePlayers = this.getTeamPlayers('blue', 'blue-players-fixed');
            
            // Recoger jugadores fijos del equipo rojo
            const redPlayers = this.getTeamPlayers('red', 'red-players-fixed');

            // Recoger jugadores extras del equipo azul
            const blueExtras = await this.getTeamExtras('blue');
            
            // Recoger jugadores extras del equipo rojo
            const redExtras = await this.getTeamExtras('red');

            // Combinar fijos y extras
            const blueLineup = [...bluePlayers, ...blueExtras];
            const redLineup = [...redPlayers, ...redExtras];

            // Validaciones
            if (blueLineup.length === 0 || redLineup.length === 0) {
                this.showNotification('Debes seleccionar jugadores para ambos equipos', 'error');
                return;
            }

            // Determinar resultado
            let result;
            if (blueResult > redResult) {
                result = 'VictoryBlue';
            } else if (redResult > blueResult) {
                result = 'VictoryRed';
            } else {
                result = 'Draw';
            }

            const matchData = {
                match_date: matchDate,
                day: this.currentDay,
                season_id: this.currentAdminSeasonId,
                mvp: mvp,
                mvp_player_id: mvpPlayerId,
                result: result,
                blue_result: blueResult,
                red_result: redResult,
                blue_lineup: blueLineup,
                red_lineup: redLineup
            };

            console.log('💾 Guardando partido con lineups:', {
                blue: blueLineup,
                red: redLineup
            });

            // Decidir si insertar o actualizar
            if (this.editingMatchId) {
                // Actualizar partido existente
                const { error } = await this.supabase
                    .from('matches')
                    .update(matchData)
                    .eq('id', this.editingMatchId);

                if (error) throw error;

                // Log de auditoría
                await this.logger.logMatchUpdated(
                    this.editingMatchId,
                    { date: matchDate }, // old data simplificado
                    matchData,
                    user?.id
                );

                this.showNotification('✅ Partido actualizado correctamente', 'success');
                
                // Resetear modo edición
                this.editingMatchId = null;
                const submitBtn = document.querySelector('#match-form button[type="submit"]');
                submitBtn.textContent = '💾 Guardar Partido';
                submitBtn.style.background = '';
                
                // Ocultar botón cancelar
                const cancelBtn = document.getElementById('btn-cancel-edit');
                cancelBtn.style.display = 'none';
                
                // Habilitar fecha
                const dateInput = document.getElementById('match-date');
                dateInput.disabled = false;
                
            } else {
                // Insertar nuevo partido
                const { data: insertedMatch, error } = await this.supabase
                    .from('matches')
                    .insert(matchData)
                    .select()
                    .single();

                if (error) throw error;

                // Log de auditoría
                await this.logger.logMatchCreated(
                    { ...matchData, id: insertedMatch.id },
                    user?.id
                );

                this.showNotification('✅ Partido guardado correctamente', 'success');
            }

            // Limpiar formulario
            document.getElementById('match-form').reset();
            
            // Regenerar token CSRF
            const matchForm = document.getElementById('match-form');
            this.csrf.addTokenToForm(matchForm);
            
            // Limpiar jugadores extras
            document.getElementById('blue-players-extras').innerHTML = '';
            document.getElementById('red-players-extras').innerHTML = '';
            
            // Desmarcar todos los checkboxes
            document.querySelectorAll('.player-stat-row input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                const stats = cb.closest('.player-stat-row').querySelector('.player-stats');
                if (stats) stats.style.display = 'none';
            });
            
            this.loadRecentMatches();
            
            // Recargar datos en la aplicación principal
            if (this.dataManager) {
                await this.dataManager.reload();
            }

        } catch (error) {
            console.error('Error guardando partido:', error);
            this.showNotification('❌ Error guardando partido: ' + error.message, 'error');
        }
    }

    /**
     * Obtiene los jugadores fijos seleccionados de un equipo con sus estadísticas
     */
    getTeamPlayers(team, containerId) {
        const container = document.getElementById(containerId);
        const players = [];

        container.querySelectorAll('.player-stat-row').forEach(row => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                const playerName = checkbox.value;
                const stats = row.querySelector('.player-stats');

                const goles = parseInt(stats.querySelector('[data-stat="goles"]').value) || 0;
                const asistencias = parseInt(stats.querySelector('[data-stat="asistencias"]').value) || 0;
                const portero = parseInt(stats.querySelector('[data-stat="portero"]').value) || 0;

                const player = {
                    name: playerName,
                    player_id: checkbox.dataset.playerId || null,
                    goles: goles,
                    asistencias: asistencias,
                    portero: portero
                };
                
                console.log(`✅ Jugador ${team} agregado:`, player);
                players.push(player);
            }
        });

        console.log(`📋 Total jugadores fijos ${team}:`, players.length, players);
        return players;
    }

    /**
     * Obtiene los jugadores extras de un equipo con sus estadísticas
     */
    async getTeamExtras(team) {
        const container = document.getElementById(`${team}-players-extras`);
        const extras = [];

        const extraRows = container.querySelectorAll('.player-extra-row');
        
        for (const row of extraRows) {
            const select = row.querySelector('.extra-player-select');
            const nameInput = row.querySelector('.extra-player-name');
            
            let playerName = '';
            let isNewPlayer = false;
            let resolvedPlayerId = null;

            // Determinar el nombre del jugador
            if (select.value === '__new__') {
                playerName = nameInput.value.trim();
                isNewPlayer = true;
                
                if (!playerName) {
                    this.showNotification('Debes ingresar el nombre del jugador nuevo', 'error');
                    throw new Error('Nombre de jugador nuevo vacío');
                }

                // Verificar si el jugador ya existe en players
                try {
                    const { data: existingPlayer, error: checkError } = await this.supabase
                        .from('players')
                        .select('id')
                        .eq('name', playerName)
                        .maybeSingle();

                    if (checkError) {
                        console.error('Error verificando jugador existente:', checkError);
                        throw checkError;
                    }

                    let playerId = existingPlayer ? existingPlayer.id : null;

                    // Si no existe, crearlo
                    if (!playerId) {
                        const { data: newPlayer, error: playerError } = await this.supabase
                            .from('players')
                            .insert({ name: playerName })
                            .select()
                            .single();

                        if (playerError) {
                            console.error('Error insertando jugador:', playerError);
                            throw playerError;
                        }
                        
                        playerId = newPlayer.id;
                        console.log(`✅ Jugador "${playerName}" creado en players`);
                    } else {
                        console.log(`ℹ️ Jugador "${playerName}" ya existe en players (ID: ${playerId})`);
                    }

                    resolvedPlayerId = playerId;

                    // Añadir a player_availability (de esta temporada/día) si no está ya
                    if (playerId) {
                        const { data: availCheck, error: availCheckError } = await this.seasonFilter(
                            this.supabase
                                .from('player_availability')
                                .select('*')
                                .eq('player_id', playerId)
                                .eq('day', this.currentDay)
                        ).maybeSingle();

                        if (availCheckError) {
                            console.warn('Error verificando disponibilidad:', availCheckError);
                        } else if (!availCheck) {
                            const { error: availError } = await this.supabase
                                .from('player_availability')
                                .insert({
                                    player_id: playerId,
                                    day: this.currentDay,
                                    season_id: this.currentAdminSeasonId,
                                    is_fixed: false
                                });

                            if (availError) {
                                console.warn('Error creando disponibilidad:', availError);
                            } else {
                                console.log(`✅ Jugador "${playerName}" añadido como eventual del ${this.currentDay}`);
                            }
                        } else {
                            console.log(`ℹ️ Jugador "${playerName}" ya está en disponibilidad del ${this.currentDay}`);
                        }
                    }
                } catch (err) {
                    console.error('Error gestionando jugador:', err);
                    throw err;
                }
            } else if (select.value) {
                playerName = select.value;
                
                // Verificar si el jugador eventual ya está registrado para este día
                try {
                    // Buscar el ID del jugador
                    const { data: player, error: playerError } = await this.supabase
                        .from('players')
                        .select('id')
                        .eq('name', playerName)
                        .single();

                    if (player && !playerError) {
                        resolvedPlayerId = player.id;

                        // Verificar si ya existe en player_availability para esta temporada/día
                        const { data: existing, error: checkError } = await this.seasonFilter(
                            this.supabase
                                .from('player_availability')
                                .select('*')
                                .eq('player_id', player.id)
                                .eq('day', this.currentDay)
                        ).maybeSingle();

                        if (checkError) {
                            console.warn('Error verificando disponibilidad:', checkError);
                        }

                        // Si no existe, agregarlo como eventual
                        if (!existing) {
                            const { error: insertError } = await this.supabase
                                .from('player_availability')
                                .insert({
                                    player_id: player.id,
                                    day: this.currentDay,
                                    season_id: this.currentAdminSeasonId,
                                    is_fixed: false
                                });

                            if (!insertError) {
                                console.log(`✅ Jugador "${playerName}" añadido automáticamente como eventual del ${this.currentDay}`);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Error gestionando disponibilidad del jugador eventual:', err);
                }
            } else {
                continue; // Saltar si no hay selección
            }

            // Obtener estadísticas
            const stats = row.querySelector('.player-stats');
            const goles = parseInt(stats.querySelector('[data-stat="goles"]').value) || 0;
            const asistencias = parseInt(stats.querySelector('[data-stat="asistencias"]').value) || 0;
            const portero = parseInt(stats.querySelector('[data-stat="portero"]').value) || 0;

            extras.push({
                name: playerName,
                player_id: resolvedPlayerId,
                goles: goles,
                asistencias: asistencias,
                portero: portero
            });
        }

        return extras;
    }

    /**
     * Carga las temporadas y los selects de próximo seleccionador de las dos columnas de Configuración
     */
    async loadNextSelectors() {
        await this.loadConfigSeasons();
        this.renderConfigSeasonsList('martes');
        this.renderConfigSeasonsList('jueves');
        this.renderConfigSeasonSelect('martes');
        this.renderConfigSeasonSelect('jueves');
        await this.refreshNextSelectorOptions();
    }

    /**
     * Recarga los selects de próximo seleccionador con solo los FIJOS de la temporada
     * elegida en el selector de cada columna (config-season-select-martes/jueves)
     */
    async refreshNextSelectorOptions() {
        for (const day of ['martes', 'jueves']) {
            const seasonId = document.getElementById(`config-season-select-${day}`)?.value || null;
            const fixedNames = await this.getFixedPlayerNamesForDay(day, seasonId);
            const select = document.getElementById(`next-selector-${day}`);
            if (!select) continue;

            select.innerHTML = '<option value="">Seleccionar...</option>' +
                [...fixedNames].sort((a, b) => a.localeCompare(b))
                    .map(name => `<option value="${name}">${name}</option>`).join('');
        }

        // Reaplicar el valor guardado en BBDD ahora que las opciones son las de esta temporada
        await this.loadSavedNextSelectors();
    }

    /**
     * Nombres de jugadores fijos de un día para una temporada concreta (por id)
     */
    async getFixedPlayerNamesForDay(day, seasonId) {
        try {
            let query = this.supabase
                .from('player_availability')
                .select('is_fixed, players(name)')
                .eq('day', day)
                .eq('is_fixed', true);
            query = seasonId ? query.eq('season_id', seasonId) : query.is('season_id', null);

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).filter(r => r.players).map(r => r.players.name);
        } catch (error) {
            console.warn(`No se pudieron cargar los fijos de ${day}:`, error.message);
            return [];
        }
    }

    /**
     * Carga el próximo seleccionador ya guardado en settings para cada día
     */
    async loadSavedNextSelectors() {
        try {
            const { data, error } = await this.supabase
                .from('settings')
                .select('*')
                .in('day', ['martes', 'jueves']);
            if (error) throw error;

            (data || []).forEach(row => {
                const select = document.getElementById(`next-selector-${row.day}`);
                if (select && [...select.options].some(o => o.value === row.next_selector)) {
                    select.value = row.next_selector || '';
                }
            });
        } catch (error) {
            console.error('Error cargando configuración guardada:', error);
        }
    }

    /**
     * Maneja el envío del formulario de configuración (ambos días a la vez)
     */
    async handleConfigSubmit(e) {
        e.preventDefault();

        try {
            const martes = document.getElementById('next-selector-martes').value;
            const jueves = document.getElementById('next-selector-jueves').value;

            const { error } = await this.supabase
                .from('settings')
                .upsert([
                    { day: 'martes', next_selector: martes },
                    { day: 'jueves', next_selector: jueves }
                ], { onConflict: 'day' });

            if (error) throw error;

            this.showNotification('✅ Configuración guardada', 'success');

        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Carga partidos recientes con filtros aplicados
     */
    async loadRecentMatches() {
        try {
            let query = this.supabase
                .from('matches')
                .select('*');

            // Aplicar filtros
            query = query.eq('day', this.currentDay);

            if (this.matchFilters.dateFrom) {
                query = query.gte('match_date', this.matchFilters.dateFrom);
            }

            if (this.matchFilters.dateTo) {
                query = query.lte('match_date', this.matchFilters.dateTo);
            }

            const { data: matches, error } = await query
                .order('match_date', { ascending: false })
                .limit(50);

            if (error) throw error;

            const container = document.getElementById('recent-matches');
            
            if (matches.length === 0) {
                container.innerHTML = '<p class="no-data">No hay partidos registrados con estos filtros</p>';
                return;
            }

            container.innerHTML = matches.map(m => `
                <div class="match-card" id="match-card-${m.id}">
                    <div class="match-header">
                        <span class="match-date">${m.match_date}</span>
                        <span class="match-day-badge">${m.day}</span>
                        ${m.mvp ? `<span class="match-mvp">🏆 ${m.mvp}</span>` : ''}
                        <div class="match-actions">
                            <button class="btn-icon btn-edit" onclick="adminPanel.editMatch('${m.id}')" title="Editar partido">
                                ✏️
                            </button>
                            <button class="btn-icon btn-delete" onclick="adminPanel.deleteMatch('${m.id}', '${m.match_date}')" title="Eliminar partido">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="match-score">
                        <div class="team team-blue">
                            <span class="team-name">Azul</span>
                            <span class="team-score ${m.result === 'VictoryBlue' ? 'winner' : ''}">${m.blue_result}</span>
                        </div>
                        <span class="vs">VS</span>
                        <div class="team team-red">
                            <span class="team-score ${m.result === 'VictoryRed' ? 'winner' : ''}">${m.red_result}</span>
                            <span class="team-name">Rojo</span>
                        </div>
                    </div>
                    <div class="match-players">
                        <div class="team-players">
                            <strong>Azul:</strong> ${m.blue_lineup.map(p => {
                                const goles = p.goal || p.goles || 0;
                                const asists = p.assist || p.asistencias || 0;
                                const portero = p.keeper || p.portero || 0;
                                let stats = '';
                                if (goles > 0) stats += ` ⚽${goles}`;
                                if (asists > 0) stats += ` 🎯${asists}`;
                                if (portero > 0) stats += ` 🧤${portero}`;
                                return `${p.name}${stats}`;
                            }).join(', ')}
                        </div>
                        <div class="team-players">
                            <strong>Rojo:</strong> ${m.red_lineup.map(p => {
                                const goles = p.goal || p.goles || 0;
                                const asists = p.assist || p.asistencias || 0;
                                const portero = p.keeper || p.portero || 0;
                                let stats = '';
                                if (goles > 0) stats += ` ⚽${goles}`;
                                if (asists > 0) stats += ` 🎯${asists}`;
                                if (portero > 0) stats += ` 🧤${portero}`;
                                return `${p.name}${stats}`;
                            }).join(', ')}
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('Error cargando partidos:', error);
            document.getElementById('recent-matches').innerHTML = 
                '<p class="error">Error cargando partidos</p>';
        }
    }

    /**
     * Aplica filtros de búsqueda de partidos
     */
    applyMatchFilters() {
        this.matchFilters.dateFrom = document.getElementById('filter-date-from').value || null;
        this.matchFilters.dateTo = document.getElementById('filter-date-to').value || null;
        
        this.loadRecentMatches();
    }

    /**
     * Limpia filtros de búsqueda
     */
    clearMatchFilters() {
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';
        
        this.matchFilters = {
            dateFrom: null,
            dateTo: null
        };
        
        this.loadRecentMatches();
    }

    /**
     * Edita un partido existente
     */
    async editMatch(id) {
        try {
            // Cargar datos del partido
            const { data: match, error } = await this.supabase
                .from('matches')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Cambiar currentDay/temporada a los del partido
            this.currentDay = match.day;
            this.currentAdminSeasonId = match.season_id || null;
            document.querySelectorAll('.btn-day').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.day === match.day);
            });

            // Cargar temporadas/disponibilidad del día+temporada del partido
            await this.loadSeasonsAdmin();
            await this.loadAvailabilityBoard();

            // Esperar a que el DOM se actualice
            await new Promise(resolve => setTimeout(resolve, 100));

            // Rellenar formulario
            const dateInput = document.getElementById('match-date');
            dateInput.value = match.match_date;
            dateInput.disabled = true; // No permitir editar la fecha
            
            document.getElementById('blue-result').value = match.blue_result;
            document.getElementById('red-result').value = match.red_result;
            
            // Marcar MVP si existe
            const mvpSelect = document.getElementById('match-mvp');
            if (mvpSelect && match.mvp) {
                mvpSelect.value = match.mvp;
            }

            // Jugadores fijos de esta temporada/día (ya cargados por loadAvailabilityBoard)
            const fixedPlayerNames = this.fixedPlayers.map(p => p.name);

            // Marcar jugadores del equipo azul
            match.blue_lineup.forEach(player => {
                // Verificar si es jugador fijo o extra
                const isFixed = fixedPlayerNames.includes(player.name);
                
                if (isFixed) {
                    // Jugador fijo - marcar checkbox
                    const checkbox = document.querySelector(`#blue-players-fixed input[value="${player.name}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        
                        // Mostrar estadísticas
                        const row = checkbox.closest('.player-stat-row');
                        const stats = row.querySelector('.player-stats');
                        stats.style.display = 'flex';
                        
                        // Rellenar valores
                        const golesInput = stats.querySelector('[data-stat="goles"]');
                        const asistInput = stats.querySelector('[data-stat="asistencias"]');
                        const porteroInput = stats.querySelector('[data-stat="portero"]');
                        
                        if (golesInput) golesInput.value = player.goal || player.goles || 0;
                        if (asistInput) asistInput.value = player.assist || player.asistencias || 0;
                        if (porteroInput) porteroInput.value = player.keeper || player.portero || 0;
                    }
                } else {
                    // Jugador extra - crear fila extra
                    this.addExtraPlayerWithData('blue', player);
                }
            });

            // Marcar jugadores del equipo rojo
            match.red_lineup.forEach(player => {
                // Verificar si es jugador fijo o extra
                const isFixed = fixedPlayerNames.includes(player.name);
                
                if (isFixed) {
                    // Jugador fijo - marcar checkbox
                    const checkbox = document.querySelector(`#red-players-fixed input[value="${player.name}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        
                        // Mostrar estadísticas
                        const row = checkbox.closest('.player-stat-row');
                        const stats = row.querySelector('.player-stats');
                        stats.style.display = 'flex';
                        
                        // Rellenar valores
                        const golesInput = stats.querySelector('[data-stat="goles"]');
                        const asistInput = stats.querySelector('[data-stat="asistencias"]');
                        const porteroInput = stats.querySelector('[data-stat="portero"]');
                        
                        if (golesInput) golesInput.value = player.goal || player.goles || 0;
                        if (asistInput) asistInput.value = player.assist || player.asistencias || 0;
                        if (porteroInput) porteroInput.value = player.keeper || player.portero || 0;
                    }
                } else {
                    // Jugador extra - crear fila extra
                    this.addExtraPlayerWithData('red', player);
                }
            });

            // Guardar ID para actualizar en lugar de crear
            this.editingMatchId = id;

            // Cambiar texto del botón y mostrar botón de cancelar
            const submitBtn = document.querySelector('#match-form button[type="submit"]');
            submitBtn.textContent = '💾 Actualizar Partido';
            submitBtn.style.background = 'var(--ambar)';
            
            const cancelBtn = document.getElementById('btn-cancel-edit');
            cancelBtn.style.display = 'inline-block';

            // Scroll al formulario
            document.querySelector('#match-form').scrollIntoView({ behavior: 'smooth', block: 'start' });

            this.showNotification('✏️ Editando partido - Modifica los campos y guarda', 'info');

        } catch (error) {
            console.error('Error cargando partido para editar:', error);
            this.showNotification('❌ Error cargando partido', 'error');
        }
    }

    /**
     * Cancela la edición de un partido
     */
    cancelEdit() {
        // Resetear modo edición
        this.editingMatchId = null;
        
        // Restaurar botón submit
        const submitBtn = document.querySelector('#match-form button[type="submit"]');
        submitBtn.textContent = '💾 Guardar Partido';
        submitBtn.style.background = '';
        
        // Ocultar botón cancelar
        const cancelBtn = document.getElementById('btn-cancel-edit');
        cancelBtn.style.display = 'none';
        
        // Habilitar fecha
        const dateInput = document.getElementById('match-date');
        dateInput.disabled = false;
        
        // Limpiar formulario
        document.getElementById('match-form').reset();
        
        // Limpiar jugadores extras
        document.getElementById('blue-players-extras').innerHTML = '';
        document.getElementById('red-players-extras').innerHTML = '';
        
        // Desmarcar todos los checkboxes y ocultar estadísticas
        document.querySelectorAll('.player-stat-row input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            const stats = cb.closest('.player-stat-row').querySelector('.player-stats');
            if (stats) stats.style.display = 'none';
        });
        
        this.showNotification('❌ Edición cancelada', 'info');
    }

    /**
     * Elimina un partido
     */
    async deleteMatch(id, date) {
        if (!confirm(`¿Eliminar el partido del ${date}?`)) return;

        try {
            const { error } = await this.supabase
                .from('matches')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showNotification('✅ Partido eliminado', 'success');
            this.loadRecentMatches();
            
            if (this.dataManager) {
                await this.dataManager.reload();
            }

        } catch (error) {
            console.error('Error eliminando partido:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Elimina un jugador del maestro (y de toda su disponibilidad, todas las temporadas/días)
     */
    async deletePlayer(id, name) {
        if (!confirm(`¿Eliminar al jugador ${name}? Se eliminará de todas las temporadas y días.`)) return;

        try {
            await this.supabase.from('player_availability').delete().eq('player_id', id);

            const { error } = await this.supabase
                .from('players')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showNotification('✅ Jugador eliminado', 'success');
            await this.loadAllPlayers();
            await this.loadAvailabilityBoard();

        } catch (error) {
            console.error('Error eliminando jugador:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Muestra una notificación
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    /**
     * Muestra el modal de ayuda
     */
    showHelpModal() {
        // Crear modal si no existe
        let modal = document.getElementById('help-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'help-modal';
            modal.className = 'help-modal';
            modal.innerHTML = `
                <div class="help-modal-content">
                    <button class="help-modal-close">&times;</button>
                    <h2>📖 Guía de Uso - Panel de Administración</h2>
                    
                    <div class="help-section">
                        <h3>🧭 Navegación</h3>
                        <p>El menú principal tiene 4 accesos: <strong>Partidos</strong>, <strong>Jugadores</strong>, <strong>Seguridad</strong> y <strong>Configuración</strong>. Usa "← Volver" para regresar al menú.</p>
                        <p>Dentro de Partidos y Jugadores, los botones <strong>Martes</strong>/<strong>Jueves</strong> filtran todos los datos de esa sección según el día seleccionado.</p>
                    </div>

                    <div class="help-section">
                        <h3>⚽ Añadir Nuevo Partido</h3>
                        <ol>
                            <li><strong>Fecha:</strong> Selecciona la fecha del partido</li>
                            <li><strong>MVP:</strong> Selecciona el jugador MVP del partido (opcional)</li>
                            <li><strong>Goles:</strong> Indica los goles de cada equipo (Azul y Rojo)</li>
                            <li><strong>Jugadores Fijos:</strong> Marca los jugadores que participaron del equipo fijo</li>
                            <li><strong>Jugadores Extras:</strong> Haz clic en "+ Agregar Eventual" para añadir jugadores no fijos
                                <ul>
                                    <li>Selecciona de la lista o elige "+ Nuevo jugador..." para crear uno</li>
                                    <li>Indica sus goles, asistencias y encajados</li>
                                </ul>
                            </li>
                            <li>Haz clic en <strong>"💾 Guardar Partido"</strong></li>
                        </ol>
                    </div>

                    <div class="help-section">
                        <h3>✏️ Editar Partido</h3>
                        <p>En la sección <strong>Partidos Recientes</strong>:</p>
                        <ul>
                            <li>Usa los filtros de fecha para buscar partidos específicos</li>
                            <li>Haz clic en <strong>✏️ Editar</strong> para modificar un partido existente</li>
                            <li>El formulario se rellenará automáticamente con los datos</li>
                            <li>La fecha no puede editarse en modo edición</li>
                            <li>Haz clic en <strong>"🔄 Actualizar Partido"</strong> para guardar cambios</li>
                            <li>Puedes <strong>Cancelar</strong> para volver al modo normal</li>
                        </ul>
                    </div>

                    <div class="help-section">
                        <h3>👥 Maestro de Jugadores y Disponibilidad</h3>
                        <p><strong>Maestro de Jugadores:</strong> catálogo único de jugadores (nombre, emoji, avatar, notas), independiente del día. "➕ Nuevo Jugador" crea uno; ✏️ lo edita.</p>
                        <p><strong>Disponibilidad:</strong> elige temporada y usa los chips para marcar quién es fijo o eventual ese día/temporada. Clic en el chip alterna fijo/eventual; ✕ lo quita; "➕ Añadir" incorpora a alguien del maestro.</p>
                        <p><strong>Nota:</strong> Los jugadores eventuales también se añaden automáticamente a la disponibilidad al crearlos desde un partido con "+ Nuevo jugador..."</p>
                    </div>

                    <div class="help-section">
                        <h3>⚙️ Configuración</h3>
                        <p>Dos columnas independientes, una por día. En cada una: gestiona sus <strong>Temporadas</strong> (crear/activar), elige de cuál quieres ver los fijos, y selecciona el <strong>Próximo Seleccionador</strong> (aparecerá con el icono ⚽ en la clasificación de ese día).</p>
                    </div>

                    <div class="help-section">
                        <h3>💡 Consejos</h3>
                        <ul>
                            <li>Los datos se actualizan automáticamente en la aplicación principal</li>
                            <li>Puedes editar las estadísticas de un partido ya creado</li>
                            <li>Los jugadores eventuales añadidos en partidos se guardan automáticamente</li>
                            <li>Usa los filtros de fecha en "Partidos Recientes" para encontrar partidos antiguos</li>
                        </ul>
                    </div>

                    <div class="help-footer">
                        <p><strong>¿Problemas o dudas?</strong> Contacta con el administrador del sistema</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listener para cerrar
            const closeBtn = modal.querySelector('.help-modal-close');
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        modal.style.display = 'flex';
    }
}

// Instancia global para métodos onclick
window.adminPanel = null;
