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

                <div class="generator-controls">
                    <div class="generator-selector">
                        <label for="day-selector">Seleccionar día:</label>
                        <select id="day-selector" class="day-select">
                            <option value="martes">Martes</option>
                            <option value="jueves">Jueves</option>
                        </select>
                    </div>
                    <button id="generate-balanced-teams" class="btn btn-generator">
                        ⚖️ Generador de Fijos
                    </button>
                    <p class="generator-description">
                        Genera automáticamente dos equipos equilibrados usando solo jugadores fijos del día seleccionado
                    </p>
                </div>

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
        const playersInfo = {}; // Mover al inicio para tener toda la info desde el principio
        
        // PASO 1: Obtener información de jugadores fijos de ambos días
        ['martes', 'jueves'].forEach(day => {
            if (data[day]) {
                // Para datos JSON: usar array "fijos"
                if (data[day].fijos) {
                    data[day].fijos.forEach(playerName => {
                        // Limpiar espacios en blanco al inicio y final del nombre
                        const cleanName = playerName.trim();
                        
                        // Si el jugador ya existe, añadir el día adicional
                        if (!playersInfo[cleanName]) {
                            playersInfo[cleanName] = {
                                days: [day], // Array de días donde es fijo
                                is_fixed: true
                            };
                        } else {
                            // Jugador fijo en múltiples días
                            if (!playersInfo[cleanName].days.includes(day)) {
                                playersInfo[cleanName].days.push(day);
                            }
                        }
                        // Inicializar stats para jugadores fijos
                        if (!playerStats[cleanName]) {
                            playerStats[cleanName] = {
                                matches: 0,
                                wins: 0,
                                goals: 0,
                                assists: 0,
                                keeper: 0
                            };
                        }
                    });
                }
                // Para datos Supabase: usar array "players"
                else if (data[day].players) {
                    data[day].players.forEach(player => {
                        // Si el jugador ya existe, añadir el día adicional
                        if (!playersInfo[player.name]) {
                            playersInfo[player.name] = {
                                days: [day], // Array de días donde es fijo
                                is_fixed: player.is_fixed
                            };
                        } else {
                            // Jugador en múltiples días
                            if (!playersInfo[player.name].days.includes(day)) {
                                playersInfo[player.name].days.push(day);
                            }
                            // Actualizar is_fixed si es true en cualquier día
                            if (player.is_fixed) {
                                playersInfo[player.name].is_fixed = true;
                            }
                        }
                        // Inicializar stats para jugadores fijos
                        if (player.is_fixed && !playerStats[player.name]) {
                            playerStats[player.name] = {
                                matches: 0,
                                wins: 0,
                                goals: 0,
                                assists: 0,
                                keeper: 0
                            };
                        }
                    });
                }
            }
        });
        
        // PASO 2: Procesar datos de partidos de martes y jueves
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

        // PASO 3: Marcar jugadores que aparecen en partidos pero no están en la lista de fijos como eventuales
        Object.keys(playerStats).forEach(playerName => {
            if (!playersInfo[playerName]) {
                // Determinar el día basándose en donde aparece más frecuentemente
                let martesCount = 0, juevesCount = 0;
                
                ['martes', 'jueves'].forEach(day => {
                    if (data[day] && data[day].matches) {
                        data[day].matches.forEach(match => {
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

                            const allPlayersInMatch = [...blueLineup, ...redLineup];
                            if (allPlayersInMatch.some(p => p.name === playerName)) {
                                if (day === 'martes') martesCount++;
                                else juevesCount++;
                            }
                        });
                    }
                });

                // Asignar al día donde aparece más frecuentemente
                const dominantDay = martesCount >= juevesCount ? 'martes' : 'jueves';
                playersInfo[playerName] = {
                    days: [dominantDay],
                    is_fixed: false
                };
            }
        });

        // PASO 4: Convertir a array y calcular promedios
        // Agrupar jugadores por nombre (un jugador = una entrada con todas sus estadísticas)
        this.allPlayers = [];
        Object.entries(playerStats).forEach(([name, stats]) => {
            const playerInfo = playersInfo[name] || { days: ['unknown'], is_fixed: false };
            
            // Crear una sola entrada por jugador con todos sus días
            this.allPlayers.push({
                name,
                days: playerInfo.days, // Array de días donde juega
                day: playerInfo.days[0], // Día principal para compatibilidad
                is_fixed: playerInfo.is_fixed,
                matches: stats.matches,
                winRate: stats.matches > 0 ? (stats.wins / stats.matches * 100).toFixed(1) : 0,
                goalsPerGame: stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : 0,
                assistsPerGame: stats.matches > 0 ? (stats.assists / stats.matches).toFixed(2) : 0,
                keeperPerGame: stats.matches > 0 ? (stats.keeper / stats.matches).toFixed(2) : 0,
                avgGoals: stats.matches > 0 ? (stats.goals / stats.matches).toFixed(2) : 0,
                avgAssists: stats.matches > 0 ? (stats.assists / stats.matches).toFixed(2) : 0,
                avgKeeper: stats.matches > 0 ? (stats.keeper / stats.matches).toFixed(2) : 0
            });
        });
        
        // Filtrar y ordenar
        this.allPlayers = this.allPlayers
            .filter(player => player.matches > 0 || player.is_fixed)
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
        // Botón generador de equipos equilibrados
        document.getElementById('generate-balanced-teams').addEventListener('click', () => {
            this.generateBalancedTeams();
        });

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
        
        // Ocultar resultado de simulación al quitar jugadores
        const resultContainer = document.getElementById('simulation-result');
        if (resultContainer) {
            resultContainer.style.display = 'none';
        }
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
     * Genera equipos equilibrados usando solo jugadores fijos
     */
    generateBalancedTeams() {
        // Obtener el día seleccionado
        const selectedDay = document.getElementById('day-selector').value;
        
        // Filtrar solo jugadores fijos del día seleccionado
        const fixedPlayers = this.allPlayers.filter(player => 
            player.is_fixed && player.days.includes(selectedDay)
        );
        
        if (fixedPlayers.length < 10) {
            alert(`Se necesitan al menos 10 jugadores fijos del ${selectedDay} para generar equipos equilibrados. Actualmente hay ${fixedPlayers.length} jugadores fijos.`);
            return;
        }

        // Limpiar equipos actuales
        this.selectedPlayers = { blue: [], red: [] };

        // Calcular puntuaciones de rendimiento
        const scoredPlayers = fixedPlayers.map(player => ({
            ...player,
            performanceScore: this.calculatePerformanceScore(player)
        }));

        // Ordenar por puntuación
        scoredPlayers.sort((a, b) => b.performanceScore - a.performanceScore);

        // ALEATORIZACIÓN: Agrupar en niveles de habilidad y mezclar dentro de cada nivel
        const topTier = scoredPlayers.slice(0, 3); // Top 3
        const midTier = scoredPlayers.slice(3, 7); // Medios 4
        const lowTier = scoredPlayers.slice(7, 10); // Bajos 3
        
        this.shuffleArray(topTier);
        this.shuffleArray(midTier);
        this.shuffleArray(lowTier);

        // Recombinar
        const shuffledPlayers = [...topTier, ...midTier, ...lowTier];

        // Algoritmo de balanceo: distribuir alternadamente
        for (let i = 0; i < Math.min(10, shuffledPlayers.length); i++) {
            const player = shuffledPlayers[i];
            
            // Alternar entre equipos, pero equilibrando las puntuaciones
            if (i % 2 === 0) {
                // Los pares van al equipo con menor puntuación acumulada
                const blueTotal = this.calculateTeamTotalScore(this.selectedPlayers.blue);
                const redTotal = this.calculateTeamTotalScore(this.selectedPlayers.red);
                
                if (this.selectedPlayers.blue.length < 5 && (blueTotal <= redTotal || this.selectedPlayers.red.length >= 5)) {
                    this.selectedPlayers.blue.push(player);
                } else if (this.selectedPlayers.red.length < 5) {
                    this.selectedPlayers.red.push(player);
                }
            } else {
                // Los impares van al equipo con mayor puntuación acumulada para equilibrar
                const blueTotal = this.calculateTeamTotalScore(this.selectedPlayers.blue);
                const redTotal = this.calculateTeamTotalScore(this.selectedPlayers.red);
                
                if (this.selectedPlayers.red.length < 5 && (redTotal <= blueTotal || this.selectedPlayers.blue.length >= 5)) {
                    this.selectedPlayers.red.push(player);
                } else if (this.selectedPlayers.blue.length < 5) {
                    this.selectedPlayers.blue.push(player);
                }
            }
        }

        // Actualizar la visualización
        this.updateTeamDisplay('blue');
        this.updateTeamDisplay('red');
        this.updateSimulatorButtons();
    }

    /**
     * Calcula una puntuación de rendimiento combinada para un jugador
     */
    calculatePerformanceScore(player) {
        const weights = {
            winRate: 0.3,
            goalsPerGame: 0.25,
            assistsPerGame: 0.25,
            keeperDefenseRate: 0.2 // Menor encajados = mejor
        };

        const winRate = player.winRate || 0;
        const goalsPerGame = player.goalsPerGame || 0;
        const assistsPerGame = player.assistsPerGame || 0;
        const keeperPerGame = player.keeperPerGame || 0;
        
        // Para keeper, invertimos el valor (menos encajados = mejor)
        const keeperDefenseRate = keeperPerGame > 0 ? 100 - (keeperPerGame * 10) : 50;

        return (
            winRate * weights.winRate +
            goalsPerGame * 10 * weights.goalsPerGame +
            assistsPerGame * 10 * weights.assistsPerGame +
            keeperDefenseRate * weights.keeperDefenseRate
        );
    }

    /**
     * Calcula la puntuación total de un equipo
     */
    calculateTeamTotalScore(team) {
        return team.reduce((total, player) => total + this.calculatePerformanceScore(player), 0);
    }

    /**
     * Mezcla aleatoriamente un array (Fisher-Yates shuffle)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
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