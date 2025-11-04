/**
 * SimuladorView - Vista del simulador de partidos
 */
export class SimuladorView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
        this.allPlayers = []; // Todos los jugadores disponibles
        this.selectedPlayers = {
            blue: [],
            red: []
        };
    }

    /**
     * Renderiza la vista del simulador
     */
    render() {
        const data = this.dataManager.getAllData(); // Obtenemos datos de ambos días
        if (!data || (!data.martes && !data.jueves)) {
            this.container.innerHTML = '<p>Cargando datos...</p>';
            return;
        }

        // Calcular estadísticas de todos los jugadores
        this.calculateAllPlayersStats(data);

        let html = `
            <div class="simulador-container">
                <h1>⚽ Simulador de Partidos</h1>
                <p class="simulador-description">
                    Selecciona 5 jugadores para cada equipo y ve las estadísticas del partido simulado
                </p>

                <div class="teams-simulator">
                    <!-- Equipo Azul -->
                    <div class="team-simulator team-blue">
                        <h2>🔵 Equipo Azul</h2>
                        <div class="player-selector">
                            <select id="blue-player-select" class="player-select">
                                <option value="">-- Seleccionar jugador --</option>
                                ${this.renderPlayerOptions()}
                            </select>
                            <button id="add-blue-player" class="btn btn-primary">Añadir</button>
                        </div>
                        <div id="blue-team-list" class="team-players-list">
                            <!-- Jugadores seleccionados -->
                        </div>
                        <div id="blue-team-stats" class="team-stats">
                            <!-- Estadísticas del equipo -->
                        </div>
                    </div>

                    <!-- Equipo Rojo -->
                    <div class="team-simulator team-red">
                        <h2>🔴 Equipo Rojo</h2>
                        <div class="player-selector">
                            <select id="red-player-select" class="player-select">
                                <option value="">-- Seleccionar jugador --</option>
                                ${this.renderPlayerOptions()}
                            </select>
                            <button id="add-red-player" class="btn btn-primary">Añadir</button>
                        </div>
                        <div id="red-team-list" class="team-players-list">
                            <!-- Jugadores seleccionados -->
                        </div>
                        <div id="red-team-stats" class="team-stats">
                            <!-- Estadísticas del equipo -->
                        </div>
                    </div>
                </div>

                <!-- Resultado de la simulación -->
                <div id="simulation-result" class="simulation-result" style="display: none;">
                    <h2>📊 Resultado de la Simulación</h2>
                    <div class="vs-container">
                        <div class="team-prediction team-prediction-blue">
                            <h3>🔵 Equipo Azul</h3>
                            <div id="blue-prediction" class="prediction-stats"></div>
                        </div>
                        <div class="vs-divider">VS</div>
                        <div class="team-prediction team-prediction-red">
                            <h3>🔴 Equipo Rojo</h3>
                            <div id="red-prediction" class="prediction-stats"></div>
                        </div>
                    </div>
                </div>

                <!-- Botones de acción -->
                <div class="simulator-actions">
                    <button id="simulate-match" class="btn btn-success" style="display: none;">
                        🎯 Simular Partido
                    </button>
                    <button id="clear-simulation" class="btn btn-secondary" style="display: none;">
                        🗑️ Limpiar Todo
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Calcula las estadísticas de todos los jugadores
     */
    calculateAllPlayersStats(data) {
        const playerStats = {};
        
        // Procesar datos de martes y jueves
        ['martes', 'jueves'].forEach(day => {
            if (data[day] && data[day].matches) {
                data[day].matches.forEach(match => {
                    // Obtener lineups
                    let blueLineup, redLineup;
                    if (match.blue_lineup && match.red_lineup) {
                        blueLineup = match.blue_lineup;
                        redLineup = match.red_lineup;
                    } else if (match.teams && match.teams[0]) {
                        blueLineup = match.teams[0].blue[0].lineup[0].member;
                        redLineup = match.teams[0].red[0].lineup[0].member;
                    } else {
                        return;
                    }

                    // Determinar resultado
                    let blueWin = false, redWin = false;
                    if (match.result === 'VictoryBlue') {
                        blueWin = true;
                    } else if (match.result === 'VictoryRed') {
                        redWin = true;
                    }

                    // Procesar jugadores azules
                    blueLineup.forEach(player => {
                        if (!playerStats[player.name]) {
                            playerStats[player.name] = {
                                matches: 0,
                                wins: 0,
                                goals: 0,
                                assists: 0,
                                keeper: 0
                            };
                        }
                        
                        const stats = playerStats[player.name];
                        stats.matches++;
                        if (blueWin) stats.wins++;
                        stats.goals += player.goal !== undefined ? player.goal : (player.goles || 0);
                        stats.assists += player.assist !== undefined ? player.assist : (player.asistencias || 0);
                        stats.keeper += player.keeper !== undefined ? player.keeper : (player.portero || 0);
                    });

                    // Procesar jugadores rojos
                    redLineup.forEach(player => {
                        if (!playerStats[player.name]) {
                            playerStats[player.name] = {
                                matches: 0,
                                wins: 0,
                                goals: 0,
                                assists: 0,
                                keeper: 0
                            };
                        }
                        
                        const stats = playerStats[player.name];
                        stats.matches++;
                        if (redWin) stats.wins++;
                        stats.goals += player.goal !== undefined ? player.goal : (player.goles || 0);
                        stats.assists += player.assist !== undefined ? player.assist : (player.asistencias || 0);
                        stats.keeper += player.keeper !== undefined ? player.keeper : (player.portero || 0);
                    });
                });
            }
        });

        // Convertir a array y calcular promedios
        this.allPlayers = Object.entries(playerStats)
            .map(([name, stats]) => ({
                name,
                matches: stats.matches,
                winRate: stats.matches > 0 ? (stats.wins / stats.matches * 100).toFixed(1) : 0,
                avgGoals: stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : 0,
                avgAssists: stats.matches > 0 ? (stats.assists / stats.matches).toFixed(2) : 0,
                avgKeeper: stats.matches > 0 ? (stats.keeper / stats.matches).toFixed(2) : 0
            }))
            .filter(player => player.matches > 0)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Renderiza las opciones de jugadores para los selects
     */
    renderPlayerOptions() {
        return this.allPlayers
            .map(player => `<option value="${player.name}">${player.name}</option>`)
            .join('');
    }

    /**
     * Adjunta los event listeners
     */
    attachEventListeners() {
        // Botón añadir jugador azul
        document.getElementById('add-blue-player').addEventListener('click', () => {
            this.addPlayerToTeam('blue');
        });

        // Botón añadir jugador rojo
        document.getElementById('add-red-player').addEventListener('click', () => {
            this.addPlayerToTeam('red');
        });

        // Botón simular partido
        document.getElementById('simulate-match').addEventListener('click', () => {
            this.simulateMatch();
        });

        // Botón limpiar todo
        document.getElementById('clear-simulation').addEventListener('click', () => {
            this.clearSimulation();
        });
    }

    /**
     * Añade un jugador al equipo
     */
    addPlayerToTeam(team) {
        const selectId = `${team}-player-select`;
        const select = document.getElementById(selectId);
        const playerName = select.value;

        if (!playerName) {
            alert('Selecciona un jugador');
            return;
        }

        if (this.selectedPlayers[team].length >= 5) {
            alert('Ya tienes 5 jugadores en este equipo');
            return;
        }

        // Verificar que el jugador no esté ya seleccionado en ningún equipo
        const allSelected = [...this.selectedPlayers.blue, ...this.selectedPlayers.red];
        if (allSelected.some(p => p.name === playerName)) {
            alert('Este jugador ya está seleccionado');
            return;
        }

        // Encontrar datos del jugador
        const playerData = this.allPlayers.find(p => p.name === playerName);
        if (!playerData) return;

        // Añadir al equipo
        this.selectedPlayers[team].push(playerData);
        
        // Resetear select
        select.value = '';

        // Actualizar vista
        this.updateTeamDisplay(team);
        this.updateSimulatorButtons();
    }

    /**
     * Actualiza la visualización del equipo
     */
    updateTeamDisplay(team) {
        const container = document.getElementById(`${team}-team-list`);
        const players = this.selectedPlayers[team];

        if (players.length === 0) {
            container.innerHTML = '<p class="no-players">No hay jugadores seleccionados</p>';
            document.getElementById(`${team}-team-stats`).innerHTML = '';
            return;
        }

        // Tabla de jugadores
        let html = `
            <table class="players-stats-table">
                <thead>
                    <tr>
                        <th>Jugador</th>
                        <th>Partidos</th>
                        <th>% Victorias</th>
                        <th>Goles/P</th>
                        <th>Asist./P</th>
                        <th>Encaj./P</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        players.forEach((player, idx) => {
            html += `
                <tr>
                    <td><strong>${player.name}</strong></td>
                    <td>${player.matches}</td>
                    <td>${player.winRate}%</td>
                    <td>${player.avgGoals}</td>
                    <td>${player.avgAssists}</td>
                    <td>${player.avgKeeper}</td>
                    <td>
                        <button class="btn-remove-player" onclick="simuladorView.removePlayer('${team}', ${idx})" title="Eliminar">
                            ❌
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        container.innerHTML = html;

        // Estadísticas del equipo
        this.updateTeamStats(team);
    }

    /**
     * Actualiza las estadísticas del equipo
     */
    updateTeamStats(team) {
        const players = this.selectedPlayers[team];
        if (players.length === 0) return;

        const avgWinRate = (players.reduce((sum, p) => sum + parseFloat(p.winRate), 0) / players.length).toFixed(1);
        const avgGoals = (players.reduce((sum, p) => sum + parseFloat(p.avgGoals), 0) / players.length).toFixed(2);
        const avgAssists = (players.reduce((sum, p) => sum + parseFloat(p.avgAssists), 0) / players.length).toFixed(2);
        const avgKeeper = (players.reduce((sum, p) => sum + parseFloat(p.avgKeeper), 0) / players.length).toFixed(2);

        const statsContainer = document.getElementById(`${team}-team-stats`);
        statsContainer.innerHTML = `
            <div class="team-summary">
                <h3>📊 Estadísticas del Equipo</h3>
                <div class="team-stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${avgWinRate}%</span>
                        <span class="stat-label">% Victorias</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${avgGoals}</span>
                        <span class="stat-label">Goles/Partido</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${avgAssists}</span>
                        <span class="stat-label">Asist./Partido</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${avgKeeper}</span>
                        <span class="stat-label">Encaj./Partido</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Elimina un jugador del equipo
     */
    removePlayer(team, index) {
        this.selectedPlayers[team].splice(index, 1);
        this.updateTeamDisplay(team);
        this.updateSimulatorButtons();
    }

    /**
     * Actualiza la visibilidad de los botones
     */
    updateSimulatorButtons() {
        const blueCount = this.selectedPlayers.blue.length;
        const redCount = this.selectedPlayers.red.length;
        
        const simulateBtn = document.getElementById('simulate-match');
        const clearBtn = document.getElementById('clear-simulation');

        if (blueCount > 0 || redCount > 0) {
            clearBtn.style.display = 'inline-block';
        } else {
            clearBtn.style.display = 'none';
        }

        if (blueCount === 5 && redCount === 5) {
            simulateBtn.style.display = 'inline-block';
        } else {
            simulateBtn.style.display = 'none';
        }
    }

    /**
     * Simula el partido
     */
    simulateMatch() {
        const blueTeam = this.selectedPlayers.blue;
        const redTeam = this.selectedPlayers.red;

        // Calcular estadísticas de predicción
        const blueStats = this.calculateTeamPrediction(blueTeam);
        const redStats = this.calculateTeamPrediction(redTeam);

        // Mostrar resultado
        const resultContainer = document.getElementById('simulation-result');
        
        document.getElementById('blue-prediction').innerHTML = this.renderPredictionStats(blueStats);
        document.getElementById('red-prediction').innerHTML = this.renderPredictionStats(redStats);

        resultContainer.style.display = 'block';
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Calcula la predicción del equipo
     */
    calculateTeamPrediction(players) {
        const avgWinRate = players.reduce((sum, p) => sum + parseFloat(p.winRate), 0) / players.length;
        const totalGoals = players.reduce((sum, p) => sum + parseFloat(p.avgGoals), 0);
        const totalAssists = players.reduce((sum, p) => sum + parseFloat(p.avgAssists), 0);
        const totalKeeper = players.reduce((sum, p) => sum + parseFloat(p.avgKeeper), 0);

        return {
            winRate: avgWinRate.toFixed(1),
            expectedGoals: totalGoals.toFixed(1),
            expectedAssists: totalAssists.toFixed(1),
            expectedKeeper: totalKeeper.toFixed(1)
        };
    }

    /**
     * Renderiza las estadísticas de predicción
     */
    renderPredictionStats(stats) {
        return `
            <div class="prediction-grid">
                <div class="prediction-item">
                    <span class="prediction-value">${stats.winRate}%</span>
                    <span class="prediction-label">Probabilidad Victoria</span>
                </div>
                <div class="prediction-item">
                    <span class="prediction-value">${stats.expectedGoals}</span>
                    <span class="prediction-label">Goles Esperados</span>
                </div>
                <div class="prediction-item">
                    <span class="prediction-value">${stats.expectedAssists}</span>
                    <span class="prediction-label">Asistencias Esperadas</span>
                </div>
                <div class="prediction-item">
                    <span class="prediction-value">${stats.expectedKeeper}</span>
                    <span class="prediction-label">Encajados Esperados</span>
                </div>
            </div>
        `;
    }

    /**
     * Limpia toda la simulación
     */
    clearSimulation() {
        if (!confirm('¿Limpiar toda la simulación?')) return;

        this.selectedPlayers = { blue: [], red: [] };
        
        document.getElementById('blue-team-list').innerHTML = '<p class="no-players">No hay jugadores seleccionados</p>';
        document.getElementById('red-team-list').innerHTML = '<p class="no-players">No hay jugadores seleccionados</p>';
        document.getElementById('blue-team-stats').innerHTML = '';
        document.getElementById('red-team-stats').innerHTML = '';
        document.getElementById('simulation-result').style.display = 'none';
        
        this.updateSimulatorButtons();
    }
}

// Instancia global para métodos onclick
window.simuladorView = null;