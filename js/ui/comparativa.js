/**
 * ComparativaView - Vista de comparación de jugadores
 */

export class ComparativaView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
        this.selectedPlayers = [];
        this.maxPlayers = 3;
        this.comparisonChart = null;
    }

    /**
     * Obtiene lista de jugadores únicos desde los partidos
     */
    getUniquePlayers(matches) {
        if (!matches || !Array.isArray(matches)) {
            return [];
        }

        const playerSet = new Set();
        
        matches.forEach(match => {
            const lineups = this.extractLineups(match);
            
            // Agregar jugadores de ambos equipos
            [...lineups.blueLineup, ...lineups.redLineup].forEach(player => {
                if (player && player.name) {
                    playerSet.add(player.name);
                }
            });
        });

        return Array.from(playerSet).sort();
    }

    /**
     * Extrae las alineaciones de un partido (dual structure support)
     */
    extractLineups(match) {
        // Estructura nueva: teams[0].blue/red[0].lineup
        if (match.teams && Array.isArray(match.teams) && match.teams.length > 0) {
            const team = match.teams[0];
            const blueLineup = team.blue?.[0]?.lineup?.[0]?.member || [];
            const redLineup = team.red?.[0]?.lineup?.[0]?.member || [];
            return { blueLineup, redLineup };
        }
        
        // Estructura legacy: blue_lineup/red_lineup directos
        return {
            blueLineup: match.blue_lineup || [],
            redLineup: match.red_lineup || []
        };
    }

    /**
     * Renderiza la vista de comparativa
     */
    render() {
        const data = this.dataManager.getCurrentData();
        
        if (!data) {
            this.container.innerHTML = '<p class="error">No hay datos disponibles</p>';
            return;
        }

        // Obtener lista de jugadores únicos desde los partidos
        const players = this.getUniquePlayers(data.matches);

        this.container.innerHTML = `
            <div class="comparativa-container">
                <div class="comparativa-header">
                    <h1>🔍 Comparativa de Jugadores</h1>
                    <p>Selecciona hasta 3 jugadores para comparar sus estadísticas</p>
                </div>

                <!-- Selector de jugadores -->
                <div class="player-selector-container">
                    <div class="player-selector">
                        <label>Selecciona jugadores:</label>
                        <select id="player-select" class="player-select-dropdown">
                            <option value="">-- Selecciona un jugador --</option>
                            ${players.map(p => `<option value="${p}">${p}</option>`).join('')}
                        </select>
                        <button id="add-player-btn" class="btn-primary" ${this.selectedPlayers.length >= this.maxPlayers ? 'disabled' : ''}>
                            ➕ Agregar
                        </button>
                    </div>

                    <!-- Jugadores seleccionados -->
                    <div id="selected-players" class="selected-players">
                        ${this.renderSelectedPlayers()}
                    </div>
                </div>

                <!-- Tabla de comparación -->
                <div id="comparison-table-container" class="comparison-table-container">
                    ${this.selectedPlayers.length >= 2 ? this.renderComparisonTable(data.matches) : '<p class="info-message">Selecciona al menos 2 jugadores para comparar</p>'}
                </div>

                <!-- Gráficos comparativos -->
                <div id="comparison-charts" class="comparison-charts">
                    ${this.selectedPlayers.length >= 2 ? this.renderCharts() : ''}
                </div>
            </div>
        `;

        this.attachEventListeners();
        
        // Crear gráficos si hay jugadores seleccionados
        if (this.selectedPlayers.length >= 2) {
            setTimeout(() => this.createComparisonChart(data.matches), 100);
        }
    }

    /**
     * Renderiza los jugadores seleccionados
     */
    renderSelectedPlayers() {
        if (this.selectedPlayers.length === 0) {
            return '<p class="no-players">No hay jugadores seleccionados</p>';
        }

        return this.selectedPlayers.map((player, index) => `
            <div class="selected-player-card player-color-${index + 1}">
                <span class="player-name">👤 ${player}</span>
                <button class="remove-player-btn" data-player="${player}">✕</button>
            </div>
        `).join('');
    }

    /**
     * Calcula estadísticas de un jugador
     */
    calculatePlayerStats(playerName, matches) {
        let totalMatches = 0;
        let wins = 0;
        let totalGoals = 0;
        let totalAssists = 0;
        let totalKeeper = 0;
        let mvpCount = 0;

        matches.forEach((match, matchIndex) => {
            // Usar el método extractLineups para consistencia
            const { blueLineup, redLineup } = this.extractLineups(match);
            
            const allPlayers = [...blueLineup, ...redLineup];
            const player = allPlayers.find(p => p.name === playerName);

            if (player) {
                totalMatches++;
                const isBlue = blueLineup.some(p => p.name === playerName);
                const isWin = (isBlue && match.result === 'VictoryBlue') || 
                             (!isBlue && match.result === 'VictoryRed');
                
                if (isWin) wins++;
                totalGoals += (player.goal || player.goles || 0);
                totalAssists += (player.assist || player.asistencias || 0);
                totalKeeper += (player.keeper || player.portero || 0);
                
                // MVP se almacena como string con el nombre del jugador
                if (match.mvp && match.mvp === playerName) {
                    mvpCount++;
                }
            }
        });

        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;
        const goalsPerMatch = totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0;
        const assistsPerMatch = totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : 0;
        const mvpRate = totalMatches > 0 ? ((mvpCount / totalMatches) * 100).toFixed(1) : 0;

        return {
            totalMatches,
            wins,
            totalGoals,
            totalAssists,
            totalKeeper,
            mvpCount,
            winRate,
            goalsPerMatch,
            assistsPerMatch,
            mvpRate
        };
    }

    /**
     * Renderiza la tabla de comparación
     */
    renderComparisonTable(matches) {
        const playersStats = this.selectedPlayers.map(playerName => {
            const stats = this.calculatePlayerStats(playerName, matches);
            return {
                name: playerName,
                stats: stats
            };
        });

        // Generar HTML de forma explícita
        let tableHTML = `
            <div class="comparison-table-wrapper">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th class="metric-column">Métrica</th>`;
        
        // Agregar headers de jugadores
        playersStats.forEach((p, i) => {
            tableHTML += `<th class="player-column player-color-${i + 1}">${p.name}</th>`;
        });
        
        tableHTML += `</tr></thead><tbody>`;
        
        // Fila: Partidos Jugados
        tableHTML += `<tr><td class="metric-name">⚽ Partidos Jugados</td>`;
        playersStats.forEach(p => {
            tableHTML += `<td class="stat-value">${p.stats.totalMatches}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Victorias
        tableHTML += `<tr><td class="metric-name">🏆 Victorias</td>`;
        playersStats.forEach(p => {
            tableHTML += `<td class="stat-value">${p.stats.wins}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: % Victorias
        tableHTML += `<tr><td class="metric-name">📊 % Victorias</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'winRate', p.stats.winRate);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.winRate}%</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Goles Totales
        tableHTML += `<tr><td class="metric-name">⚽ Goles Totales</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'totalGoals', p.stats.totalGoals);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.totalGoals}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Goles/Partido
        tableHTML += `<tr><td class="metric-name">📈 Goles/Partido</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'goalsPerMatch', p.stats.goalsPerMatch);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.goalsPerMatch}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Asistencias Totales
        tableHTML += `<tr><td class="metric-name">🎯 Asistencias Totales</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'totalAssists', p.stats.totalAssists);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.totalAssists}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Asistencias/Partido
        tableHTML += `<tr><td class="metric-name">📈 Asistencias/Partido</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'assistsPerMatch', p.stats.assistsPerMatch);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.assistsPerMatch}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: Goles Encajados
        tableHTML += `<tr><td class="metric-name">🥅 Goles Encajados</td>`;
        playersStats.forEach(p => {
            tableHTML += `<td class="stat-value">${p.stats.totalKeeper}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: MVPs
        tableHTML += `<tr><td class="metric-name">⭐ MVPs</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'mvpCount', p.stats.mvpCount);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.mvpCount}</td>`;
        });
        tableHTML += `</tr>`;
        
        // Fila: % MVP
        tableHTML += `<tr><td class="metric-name">✨ % MVP</td>`;
        playersStats.forEach(p => {
            const isHighest = this.isHighestValue(playersStats, 'mvpRate', p.stats.mvpRate);
            tableHTML += `<td class="stat-value ${isHighest ? 'best-stat' : ''}">${p.stats.mvpRate}%</td>`;
        });
        tableHTML += `</tr>`;
        
        tableHTML += `</tbody></table></div>`;
        
        return tableHTML;
    }

    /**
     * Verifica si un valor es el más alto
     */
    isHighestValue(playersStats, statKey, value) {
        const values = playersStats.map(p => parseFloat(p.stats[statKey]));
        const maxValue = Math.max(...values);
        return parseFloat(value) === maxValue && maxValue > 0;
    }

    /**
     * Renderiza el contenedor de gráficos
     */
    renderCharts() {
        return `
            <div class="chart-container">
                <h3>📊 Comparación Visual</h3>
                <canvas id="comparison-chart"></canvas>
            </div>
        `;
    }

    /**
     * Crea el gráfico de comparación
     */
    createComparisonChart(matches) {
        const ctx = document.getElementById('comparison-chart');
        if (!ctx) return;

        // Destruir gráfico anterior si existe
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
        }

        const playersStats = this.selectedPlayers.map(playerName => ({
            name: playerName,
            stats: this.calculatePlayerStats(playerName, matches)
        }));

        const colors = [
            { bg: 'rgba(102, 126, 234, 0.2)', border: 'rgba(102, 126, 234, 1)' },
            { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 1)' },
            { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 1)' }
        ];

        this.comparisonChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Win Rate %', 'Goles/Partido', 'Asistencias/Partido', 'MVP %', 'Partidos Jugados (x10)'],
                datasets: playersStats.map((p, i) => ({
                    label: p.name,
                    data: [
                        parseFloat(p.stats.winRate),
                        parseFloat(p.stats.goalsPerMatch) * 20, // Escalar para visualización
                        parseFloat(p.stats.assistsPerMatch) * 20,
                        parseFloat(p.stats.mvpRate),
                        Math.min(p.stats.totalMatches * 2, 100) // Normalizar a 100
                    ],
                    backgroundColor: colors[i].bg,
                    borderColor: colors[i].border,
                    borderWidth: 2,
                    pointBackgroundColor: colors[i].border,
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: colors[i].border
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const value = context.parsed.r;
                                // Ajustar valores escalados
                                if (context.label.includes('Goles') || context.label.includes('Asistencias')) {
                                    label += (value / 20).toFixed(2);
                                } else if (context.label.includes('Partidos')) {
                                    label += Math.round(value / 2);
                                } else {
                                    label += value.toFixed(1) + '%';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Botón agregar jugador
        const addBtn = document.getElementById('add-player-btn');
        const select = document.getElementById('player-select');

        if (addBtn && select) {
            addBtn.addEventListener('click', () => {
                const playerName = select.value;
                if (playerName && !this.selectedPlayers.includes(playerName)) {
                    if (this.selectedPlayers.length < this.maxPlayers) {
                        this.selectedPlayers.push(playerName);
                        this.render();
                    }
                }
            });
        }

        // Botones eliminar jugador
        document.querySelectorAll('.remove-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerName = e.target.dataset.player;
                this.selectedPlayers = this.selectedPlayers.filter(p => p !== playerName);
                this.render();
            });
        });
    }

    /**
     * Limpia la vista
     */
    cleanup() {
        if (this.comparisonChart) {
            this.comparisonChart.destroy();
            this.comparisonChart = null;
        }
    }
}
