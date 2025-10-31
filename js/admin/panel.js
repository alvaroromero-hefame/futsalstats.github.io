/**
 * AdminPanel - Panel de administración para gestionar partidos
 */
export class AdminPanel {
    constructor(supabaseClient, dataManager) {
        this.supabase = supabaseClient;
        this.dataManager = dataManager;
        this.container = null;
        this.currentDay = 'martes';
        this.matchFilters = {
            dateFrom: null,
            dateTo: null
        };
        this.editingMatchId = null;
    }

    /**
     * Renderiza el panel de administración
     */
    async render(container) {
        this.container = container;
        this.container.innerHTML = this.getTemplate();
        this.attachEventListeners();
        
        // Cargar datos iniciales después de renderizar
        await this.loadPlayers();
        await this.loadRecentMatches();
    }

    /**
     * Template HTML del panel
     */
    getTemplate() {
        return `
            <div class="admin-panel">
                <div class="admin-header">
                    <h1>📊 Panel de Administración</h1>
                    <button id="admin-logout" class="btn btn-secondary">
                        🚪 Cerrar Sesión
                    </button>
                </div>

                <div class="admin-content">
                    <!-- Selector de día -->
                    <div class="day-selector">
                        <button class="btn-day active" data-day="martes">Martes</button>
                        <button class="btn-day" data-day="jueves">Jueves</button>
                    </div>

                    <!-- Formulario para nuevo partido -->
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

                    <!-- Lista de partidos recientes -->
                    <div class="admin-section">
                        <h2>📋 Partidos Recientes</h2>
                        
                        <!-- Filtros -->
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

                    <!-- Gestión de jugadores -->
                    <div class="admin-section">
                        <h2>👥 Gestión de Jugadores</h2>
                        <div class="players-management">
                            <form id="player-form" class="inline-form">
                                <input type="text" id="player-name" placeholder="Nombre del jugador" required>
                                <select id="player-day">
                                    <option value="martes">Martes</option>
                                    <option value="jueves">Jueves</option>
                                    <option value="ambos">Ambos</option>
                                </select>
                                <label>
                                    <input type="checkbox" id="player-fixed" checked>
                                    Fijo
                                </label>
                                <button type="submit" class="btn btn-primary">
                                    ➕ Añadir Jugador
                                </button>
                            </form>
                            <div id="players-list" class="players-list">
                                <!-- Se llenará dinámicamente -->
                            </div>
                        </div>
                    </div>

                    <!-- Configuración -->
                    <div class="admin-section">
                        <h2>⚙️ Configuración</h2>
                        <form id="settings-form" class="settings-form">
                            <div class="form-group">
                                <label for="next-selector">Próximo Seleccionador</label>
                                <select id="next-selector">
                                    <option value="">Seleccionar...</option>
                                </select>
                            </div>
                            <button type="submit" class="btn btn-primary">
                                💾 Guardar Configuración
                            </button>
                        </form>
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
            </div>
        `;
    }

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Selector de día
        document.querySelectorAll('.btn-day').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-day').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentDay = e.target.dataset.day;
                this.loadPlayers();
                this.loadRecentMatches();
            });
        });

        // Formulario de partido
        const matchForm = document.getElementById('match-form');
        matchForm.addEventListener('submit', (e) => this.handleMatchSubmit(e));

        // Formulario de jugador
        const playerForm = document.getElementById('player-form');
        playerForm.addEventListener('submit', (e) => this.handlePlayerSubmit(e));

        // Formulario de configuración
        const settingsForm = document.getElementById('settings-form');
        settingsForm.addEventListener('submit', (e) => this.handleSettingsSubmit(e));

        // Logout
        document.getElementById('admin-logout').addEventListener('click', () => {
            if (confirm('¿Seguro que quieres cerrar sesión?')) {
                window.location.href = 'admin.html?logout=true';
            }
        });
    }

    /**
     * Carga la lista de jugadores
     * Compatible con estructura antigua (players) y nueva (player_availability)
     */
    async loadPlayers() {
        try {
            console.log(`🔍 Cargando jugadores para: ${this.currentDay}`);
            
            // Intentar primero con la nueva estructura (player_availability)
            let fixedPlayers, eventualPlayers;
            let usingNewStructure = false;
            
            try {
                // Verificar si la tabla player_availability tiene datos
                const { data: availCheck, error: checkErr } = await this.supabase
                    .from('player_availability')
                    .select('id')
                    .limit(1);

                console.log('🔍 Verificación player_availability:', { 
                    error: checkErr, 
                    hasData: availCheck && availCheck.length > 0,
                    data: availCheck 
                });

                // Si la tabla existe y tiene al menos un registro, usar nueva estructura
                if (!checkErr && availCheck && availCheck.length > 0) {
                    console.log('✓ Tabla player_availability tiene datos, usando nueva estructura');
                    
                    // Nueva estructura con JOIN a player_availability
                    const { data: fixedData, error: fixedErr } = await this.supabase
                        .from('players')
                        .select(`
                            id,
                            name,
                            player_availability!inner(day, is_fixed)
                        `)
                        .eq('player_availability.day', this.currentDay)
                        .eq('player_availability.is_fixed', true)
                        .order('name');

                    const { data: eventualData, error: eventualErr } = await this.supabase
                        .from('players')
                        .select(`
                            id,
                            name,
                            player_availability!inner(day, is_fixed)
                        `)
                        .eq('player_availability.day', this.currentDay)
                        .eq('player_availability.is_fixed', false)
                        .order('name');

                    if (fixedErr) throw fixedErr;
                    if (eventualErr) throw eventualErr;

                    // Transformar datos de nueva estructura
                    fixedPlayers = fixedData.map(p => ({
                        id: p.id,
                        name: p.name,
                        day: this.currentDay,
                        is_fixed: true
                    }));

                    eventualPlayers = eventualData.map(p => ({
                        id: p.id,
                        name: p.name,
                        day: this.currentDay,
                        is_fixed: false
                    }));

                    usingNewStructure = true;
                    console.log('✓ Usando nueva estructura player_availability');
                } else {
                    throw new Error('Tabla player_availability vacía o no existe');
                }

            } catch (newStructureError) {
                // Fallback: Usar estructura antigua
                console.log('→ Usando estructura antigua (players.day/is_fixed)');

                // Primero, verificar si hay jugadores en la tabla
                const { data: allPlayers, error: checkError } = await this.supabase
                    .from('players')
                    .select('*')
                    .limit(5);

                console.log('📊 Primeros 5 jugadores en BBDD:', allPlayers);

                const { data: fixedData, error: fixedError } = await this.supabase
                    .from('players')
                    .select('*')
                    .or(`day.eq.${this.currentDay},day.eq.ambos`)
                    .eq('is_fixed', true)
                    .order('name');

                if (fixedError) {
                    console.error('❌ Error cargando jugadores fijos:', fixedError);
                    throw fixedError;
                }

                console.log(`📋 Query fijos para "${this.currentDay}":`, fixedData);

                const { data: eventualData, error: eventualError } = await this.supabase
                    .from('players')
                    .select('*')
                    .or(`day.eq.${this.currentDay},day.eq.ambos`)
                    .eq('is_fixed', false)
                    .order('name');

                if (eventualError) {
                    console.error('❌ Error cargando jugadores eventuales:', eventualError);
                    throw eventualError;
                }

                console.log(`📋 Query eventuales para "${this.currentDay}":`, eventualData);

                fixedPlayers = fixedData || [];
                eventualPlayers = eventualData || [];
            }

            console.log(`✅ Jugadores cargados - Fijos: ${fixedPlayers.length}, Eventuales: ${eventualPlayers.length}`);

            // Guardar en memoria para uso posterior
            this.fixedPlayers = fixedPlayers;
            this.eventualPlayers = eventualPlayers;
            
            // Actualizar selecciones de jugadores en el formulario
            this.updatePlayerSelections(fixedPlayers, eventualPlayers);
            
            // Actualizar MVP select
            this.updateMVPSelect([...fixedPlayers, ...eventualPlayers]);
            
            // Actualizar próximo seleccionador
            this.updateNextSelectorSelect(fixedPlayers);
            
            // Actualizar lista de jugadores
            this.updatePlayersList([...fixedPlayers, ...eventualPlayers]);

        } catch (error) {
            console.error('Error cargando jugadores:', error);
            this.showNotification('Error cargando jugadores', 'error');
        }
    }

    /**
     * Actualiza las selecciones de jugadores para los equipos
     */
    updatePlayerSelections(fixedPlayers, eventualPlayers) {
        const blueFixedContainer = document.getElementById('blue-players-fixed');
        const redFixedContainer = document.getElementById('red-players-fixed');

        if (!blueFixedContainer || !redFixedContainer) {
            console.error('❌ Contenedores de jugadores no encontrados en el DOM');
            return;
        }

        console.log(`📝 Actualizando UI con ${fixedPlayers.length} jugadores fijos`);

        // HTML para jugadores fijos con estadísticas
        const createFixedPlayerHTML = (p, team) => `
            <div class="player-stat-row" data-player-name="${p.name}">
                <label class="player-checkbox">
                    <input type="checkbox" name="${team}-player-fixed" value="${p.name}" 
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
     * Actualiza el select de MVP
     */
    updateMVPSelect(players) {
        const mvpSelect = document.getElementById('match-mvp');
        mvpSelect.innerHTML = '<option value="">Sin MVP</option>' + 
            players.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    }

    /**
     * Actualiza el select de próximo seleccionador
     */
    updateNextSelectorSelect(players) {
        const selectorSelect = document.getElementById('next-selector');
        selectorSelect.innerHTML = '<option value="">Seleccionar...</option>' + 
            players.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
        
        // Cargar valor actual
        this.loadCurrentSettings();
    }

    /**
     * Actualiza la lista de jugadores
     */
    updatePlayersList(players) {
        const listContainer = document.getElementById('players-list');
        listContainer.innerHTML = players.map(p => `
            <div class="player-item">
                <span class="player-name">${p.name}</span>
                <span class="player-badge ${p.is_fixed ? 'fixed' : 'eventual'}">
                    ${p.is_fixed ? 'Fijo' : 'Eventual'}
                </span>
                <span class="player-badge day">${p.day}</span>
                <button class="btn-icon btn-delete" onclick="adminPanel.deletePlayer('${p.id}', '${p.name}')">
                    🗑️
                </button>
            </div>
        `).join('');
    }

    /**
     * Maneja el envío del formulario de partido (crear o actualizar)
     */
    async handleMatchSubmit(e) {
        e.preventDefault();

        try {
            // Recoger datos del formulario
            const matchDate = document.getElementById('match-date').value;
            const mvp = document.getElementById('match-mvp').value || null;
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
                mvp: mvp,
                result: result,
                blue_result: blueResult,
                red_result: redResult,
                blue_lineup: blueLineup,
                red_lineup: redLineup
            };

            // Decidir si insertar o actualizar
            if (this.editingMatchId) {
                // Actualizar partido existente
                const { error } = await this.supabase
                    .from('matches')
                    .update(matchData)
                    .eq('id', this.editingMatchId);

                if (error) throw error;

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
                const { error } = await this.supabase
                    .from('matches')
                    .insert(matchData);

                if (error) throw error;

                this.showNotification('✅ Partido guardado correctamente', 'success');
            }

            // Limpiar formulario
            document.getElementById('match-form').reset();
            
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

                players.push({
                    name: playerName,
                    goles: goles,
                    asistencias: asistencias,
                    portero: portero
                });
            }
        });

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

            // Determinar el nombre del jugador
            if (select.value === '__new__') {
                playerName = nameInput.value.trim();
                isNewPlayer = true;
                
                if (!playerName) {
                    this.showNotification('Debes ingresar el nombre del jugador nuevo', 'error');
                    throw new Error('Nombre de jugador nuevo vacío');
                }

                // Crear el jugador en la base de datos si es nuevo
                try {
                    // 1. Insertar jugador en la tabla players
                    const { data: newPlayer, error: playerError } = await this.supabase
                        .from('players')
                        .insert({ 
                            name: playerName,
                            // Fallback para estructura antigua
                            day: this.currentDay,
                            is_fixed: false
                        })
                        .select()
                        .single();

                    if (playerError && !playerError.message.includes('duplicate')) {
                        throw playerError;
                    }

                    // 2. Si existe la tabla player_availability, insertar disponibilidad
                    if (newPlayer) {
                        try {
                            const { error: availError } = await this.supabase
                                .from('player_availability')
                                .insert({
                                    player_id: newPlayer.id,
                                    day: this.currentDay,
                                    is_fixed: false
                                });

                            if (availError && !availError.message.includes('duplicate') && !availError.message.includes('does not exist')) {
                                console.warn('Error creando disponibilidad:', availError);
                            }
                        } catch (availErr) {
                            // Ignorar si la tabla no existe (estructura antigua)
                            console.log('→ Tabla player_availability no existe aún (usando estructura antigua)');
                        }
                    }
                } catch (err) {
                    console.warn('Jugador ya existe o error menor:', err);
                }
            } else if (select.value) {
                playerName = select.value;
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
                goles: goles,
                asistencias: asistencias,
                portero: portero
            });
        }

        return extras;
    }

    /**
     * Maneja el envío del formulario de jugador
     */
    async handlePlayerSubmit(e) {
        e.preventDefault();

        try {
            const name = document.getElementById('player-name').value.trim();
            const day = document.getElementById('player-day').value;
            const isFixed = document.getElementById('player-fixed').checked;

            const { error } = await this.supabase
                .from('players')
                .insert({
                    name: name,
                    day: day,
                    is_fixed: isFixed
                });

            if (error) throw error;

            this.showNotification('✅ Jugador añadido correctamente', 'success');
            document.getElementById('player-form').reset();
            this.loadPlayers();

        } catch (error) {
            console.error('Error añadiendo jugador:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Maneja el envío del formulario de configuración
     */
    async handleSettingsSubmit(e) {
        e.preventDefault();

        try {
            const nextSelector = document.getElementById('next-selector').value;

            const { error } = await this.supabase
                .from('settings')
                .upsert({
                    day: this.currentDay,
                    next_selector: nextSelector
                }, {
                    onConflict: 'day'
                });

            if (error) throw error;

            this.showNotification('✅ Configuración guardada', 'success');

        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.showNotification('❌ Error: ' + error.message, 'error');
        }
    }

    /**
     * Carga la configuración actual
     */
    async loadCurrentSettings() {
        try {
            const { data, error } = await this.supabase
                .from('settings')
                .select('*')
                .eq('day', this.currentDay)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                document.getElementById('next-selector').value = data.next_selector || '';
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
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
                            <strong>Azul:</strong> ${m.blue_lineup.map(p => 
                                `${p.name}${p.goles ? ` ⚽${p.goles}` : ''}${p.asistencias ? ` 🎯${p.asistencias}` : ''}${p.portero ? ` 🧤${p.portero}` : ''}`
                            ).join(', ')}
                        </div>
                        <div class="team-players">
                            <strong>Rojo:</strong> ${m.red_lineup.map(p => 
                                `${p.name}${p.goles ? ` ⚽${p.goles}` : ''}${p.asistencias ? ` 🎯${p.asistencias}` : ''}${p.portero ? ` 🧤${p.portero}` : ''}`
                            ).join(', ')}
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

            // Cambiar currentDay al día del partido
            this.currentDay = match.day;
            document.querySelectorAll('.btn-day').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.day === match.day);
            });

            // Cargar jugadores del día correspondiente
            await this.loadPlayers();

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

            // Marcar jugadores del equipo azul
            match.blue_lineup.forEach(player => {
                console.log('🔵 Cargando jugador azul:', player);
                const checkbox = document.querySelector(`#blue-players-fixed input[value="${player.name}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    
                    // Mostrar estadísticas
                    const row = checkbox.closest('.player-stat-row');
                    const stats = row.querySelector('.player-stats');
                    stats.style.display = 'flex';
                    
                    // Rellenar valores (los datos vienen como goal, assist, keeper de la BD)
                    const golesInput = stats.querySelector('[data-stat="goles"]');
                    const asistInput = stats.querySelector('[data-stat="asistencias"]');
                    const porteroInput = stats.querySelector('[data-stat="portero"]');
                    
                    console.log('Inputs encontrados:', { golesInput, asistInput, porteroInput });
                    console.log('Valores a asignar:', { 
                        goles: player.goal || player.goles, 
                        asistencias: player.assist || player.asistencias, 
                        portero: player.keeper || player.portero 
                    });
                    
                    if (golesInput) golesInput.value = player.goal || player.goles || 0;
                    if (asistInput) asistInput.value = player.assist || player.asistencias || 0;
                    if (porteroInput) porteroInput.value = player.keeper || player.portero || 0;
                } else {
                    console.warn('❌ No se encontró checkbox para:', player.name);
                }
            });

            // Marcar jugadores del equipo rojo
            match.red_lineup.forEach(player => {
                console.log('🔴 Cargando jugador rojo:', player);
                const checkbox = document.querySelector(`#red-players-fixed input[value="${player.name}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    
                    // Mostrar estadísticas
                    const row = checkbox.closest('.player-stat-row');
                    const stats = row.querySelector('.player-stats');
                    stats.style.display = 'flex';
                    
                    // Rellenar valores (los datos vienen como goal, assist, keeper de la BD)
                    const golesInput = stats.querySelector('[data-stat="goles"]');
                    const asistInput = stats.querySelector('[data-stat="asistencias"]');
                    const porteroInput = stats.querySelector('[data-stat="portero"]');
                    
                    console.log('Inputs encontrados:', { golesInput, asistInput, porteroInput });
                    console.log('Valores a asignar:', { 
                        goles: player.goal || player.goles, 
                        asistencias: player.assist || player.asistencias, 
                        portero: player.keeper || player.portero 
                    });
                    
                    if (golesInput) golesInput.value = player.goal || player.goles || 0;
                    if (asistInput) asistInput.value = player.assist || player.asistencias || 0;
                    if (porteroInput) porteroInput.value = player.keeper || player.portero || 0;
                } else {
                    console.warn('❌ No se encontró checkbox para:', player.name);
                }
            });

            // Guardar ID para actualizar en lugar de crear
            this.editingMatchId = id;

            // Cambiar texto del botón y mostrar botón de cancelar
            const submitBtn = document.querySelector('#match-form button[type="submit"]');
            submitBtn.textContent = '💾 Actualizar Partido';
            submitBtn.style.background = '#f59e0b';
            
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
     * Elimina un jugador
     */
    async deletePlayer(id, name) {
        if (!confirm(`¿Eliminar al jugador ${name}?`)) return;

        try {
            const { error } = await this.supabase
                .from('players')
                .delete()
                .eq('id', id);

            if (error) throw error;

            this.showNotification('✅ Jugador eliminado', 'success');
            this.loadPlayers();

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
}

// Instancia global para métodos onclick
window.adminPanel = null;
