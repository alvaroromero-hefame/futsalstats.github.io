/**
 * PlayerStatsModal - Modal con estadísticas detalladas del jugador
 */

import { AIPlayerAnalyzer } from '../services/aiAnalyzer.js';

export class PlayerStatsModal {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.modal = null;
        this.chart1 = null;
        this.chart2 = null;
        this.chart3 = null;
        this.aiAnalyzer = new AIPlayerAnalyzer();
    }

    /**
     * Muestra el modal con las estadísticas del jugador
     */
    show(playerName) {
        const data = this.dataManager.getCurrentData();
        console.log('📊 Abriendo stats para:', playerName);
        console.log('📦 Datos disponibles:', data);
        
        if (!data) {
            console.error('❌ No hay datos disponibles');
            return;
        }

        const stats = this.calculatePlayerStats(playerName, data.matches);
        console.log('📈 Estadísticas calculadas:', stats);
        
        // Crear modal si no existe
        if (!this.modal) {
            this.createModal();
        }

        // Actualizar contenido
        this.updateModalContent(playerName, stats);
        
        // Mostrar modal
        this.modal.style.display = 'flex';
        
        // Crear gráficos después de que el modal sea visible
        setTimeout(() => {
            this.createCharts(stats);
        }, 100);
    }

    /**
     * Crea el elemento del modal
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'player-stats-modal';
        this.modal.innerHTML = `
            <div class="player-stats-content">
                <button class="player-stats-close">&times;</button>
                <h2 id="player-stats-title"></h2>
                
                <div class="player-stats-grid">
                    <!-- NUEVA SECCIÓN: Análisis IA -->
                    <div class="stats-card ai-analysis-card full-width">
                        <h3>🤖 Análisis IA del Jugador</h3>
                        <div id="ai-analysis-content" class="ai-analysis-content">
                            <!-- Se llenará dinámicamente -->
                        </div>
                    </div>

                    <!-- Gráfico 1: Evolución de goles, asistencias y encajados -->
                    <div class="stats-card">
                        <h3>📊 Evolución Temporal</h3>
                        <canvas id="chart-evolution"></canvas>
                    </div>
                    
                    <!-- Gráfico 2: Promedios -->
                    <div class="stats-card">
                        <h3>📈 Promedios por Partido</h3>
                        <canvas id="chart-averages"></canvas>
                    </div>

                    <!-- Resumen de estadísticas -->
                    <div class="stats-summary full-width">
                        <div class="stat-box">
                            <span class="stat-value" id="stat-total-matches">0</span>
                            <span class="stat-label">Partidos</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-total-goals">0</span>
                            <span class="stat-label">Goles</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-total-assists">0</span>
                            <span class="stat-label">Asistencias</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-total-keeper">0</span>
                            <span class="stat-label">Encajados</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="stat-win-rate">0%</span>
                            <span class="stat-label">% Victorias</span>
                        </div>
                    </div>
                    
                    <!-- Gráfico 3: Partidos ganados por mes -->
                    <div class="stats-card full-width">
                        <h3>🏆 Victorias por Mes</h3>
                        <canvas id="chart-wins-by-month"></canvas>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Event listener para cerrar
        const closeBtn = this.modal.querySelector('.player-stats-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
    }

    /**
     * Calcula las estadísticas del jugador
     */
    calculatePlayerStats(playerName, matches) {
        console.log('🔍 Calculando stats para:', playerName);
        console.log('📋 Total de partidos a analizar:', matches.length);
        
        const playerMatches = [];
        const monthlyWins = {};
        
        matches.forEach((match, idx) => {
            if (idx === 0) {
                console.log('🔎 Ejemplo de partido:', match);
            }
            
            // Extraer lineups según la estructura del dataManager
            let blueLineup = [];
            let redLineup = [];
            
            // Estructura transformada de Supabase
            if (match.teams && match.teams[0]) {
                const team = match.teams[0];
                if (team.blue && team.blue[0] && team.blue[0].lineup && team.blue[0].lineup[0]) {
                    blueLineup = team.blue[0].lineup[0].member || [];
                }
                if (team.red && team.red[0] && team.red[0].lineup && team.red[0].lineup[0]) {
                    redLineup = team.red[0].lineup[0].member || [];
                }
            }
            // Estructura directa (si viene de otro formato)
            else if (match.blue_lineup || match.blueLineup) {
                blueLineup = match.blue_lineup || match.blueLineup || [];
                redLineup = match.red_lineup || match.redLineup || [];
            }
            
            if (idx === 0) {
                console.log('🔵 Blue lineup:', blueLineup);
                console.log('🔴 Red lineup:', redLineup);
            }
            
            const allPlayers = [...blueLineup, ...redLineup];
            const player = allPlayers.find(p => p.name === playerName);
            
            if (player) {
                const isBlue = blueLineup.some(p => p.name === playerName);
                const isWin = (isBlue && match.result === 'VictoryBlue') || 
                             (!isBlue && match.result === 'VictoryRed');
                
                playerMatches.push({
                    date: match.matchDate || match.match_date || match.date,
                    goals: player.goal || player.goles || 0,
                    assists: player.assist || player.asistencias || 0,
                    keeper: player.keeper || player.portero || 0,
                    isWin: isWin
                });
                
                // Contar victorias por mes
                if (isWin) {
                    const matchDate = match.matchDate || match.match_date || match.date;
                    const monthKey = matchDate.substring(0, 7); // YYYY-MM
                    monthlyWins[monthKey] = (monthlyWins[monthKey] || 0) + 1;
                }
            }
        });
        
        console.log('✅ Partidos del jugador encontrados:', playerMatches.length);
        console.log('📊 Partidos del jugador:', playerMatches);
        
        // Ordenar por fecha
        playerMatches.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calcular totales y promedios
        const totalMatches = playerMatches.length;
        const totalGoals = playerMatches.reduce((sum, m) => sum + m.goals, 0);
        const totalAssists = playerMatches.reduce((sum, m) => sum + m.assists, 0);
        const totalKeeper = playerMatches.reduce((sum, m) => sum + m.keeper, 0);
        const totalWins = playerMatches.filter(m => m.isWin).length;
        
        return {
            matches: playerMatches,
            monthlyWins: monthlyWins,
            totals: {
                matches: totalMatches,
                goals: totalGoals,
                assists: totalAssists,
                keeper: totalKeeper,
                wins: totalWins,
                winRate: totalMatches > 0 ? (totalWins / totalMatches * 100).toFixed(1) : 0
            },
            averages: {
                goals: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0,
                assists: totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : 0,
                keeper: totalMatches > 0 ? (totalKeeper / totalMatches).toFixed(2) : 0
            }
        };
    }

    /**
     * Actualiza el contenido del modal
     */
    updateModalContent(playerName, stats) {
        document.getElementById('player-stats-title').textContent = `Estadísticas de ${playerName}`;
        document.getElementById('stat-total-matches').textContent = stats.totals.matches;
        document.getElementById('stat-total-goals').textContent = stats.totals.goals;
        document.getElementById('stat-total-assists').textContent = stats.totals.assists;
        document.getElementById('stat-total-keeper').textContent = stats.totals.keeper;
        document.getElementById('stat-win-rate').textContent = `${stats.totals.winRate}%`;
        
        // Generar análisis IA
        this.generateAIAnalysis(stats);
    }

    /**
     * Genera y muestra el análisis IA del jugador
     */
    generateAIAnalysis(stats) {
        const analysis = this.aiAnalyzer.analyze(stats);
        const container = document.getElementById('ai-analysis-content');
        
        container.innerHTML = `
            <!-- Badges principales -->
            <div class="ai-badges">
                <div class="ai-badge" style="background: ${analysis.profile.color};">
                    <span class="badge-icon">${analysis.profile.icon}</span>
                    <span class="badge-text">${analysis.profile.type}</span>
                </div>
                <div class="ai-badge" style="background: ${analysis.level.color};">
                    <span class="badge-icon">${analysis.level.icon}</span>
                    <span class="badge-text">${analysis.level.level}</span>
                </div>
                <div class="ai-badge" style="background: ${analysis.trend.color};">
                    <span class="badge-icon">${analysis.trend.icon}</span>
                    <span class="badge-text">${analysis.trend.trend}</span>
                </div>
                <div class="ai-badge score-badge">
                    <span class="badge-icon">📊</span>
                    <span class="badge-text">Score: ${analysis.score}/100</span>
                </div>
            </div>

            <!-- Descripción del perfil -->
            <div class="ai-section">
                <p class="ai-profile-description">
                    <strong>${analysis.profile.description}</strong> - ${analysis.trend.description}
                </p>
            </div>

            <!-- Resumen -->
            <div class="ai-section">
                <h4>📝 Resumen del Perfil</h4>
                <div class="ai-summary">
                    ${analysis.summary.map(line => `<p>• ${line}</p>`).join('')}
                </div>
            </div>

            <!-- Fortalezas y Mejoras -->
            <div class="ai-two-columns">
                <div class="ai-section">
                    <h4>💪 Fortalezas Principales</h4>
                    <ul class="ai-list strengths-list">
                        ${analysis.strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="ai-section">
                    <h4>📈 Áreas de Mejora</h4>
                    <ul class="ai-list improvements-list">
                        ${analysis.improvements.map(i => `<li>${i}</li>`).join('')}
                    </ul>
                </div>
            </div>

            <!-- Recomendaciones Tácticas -->
            <div class="ai-section">
                <h4>🎯 Recomendaciones Tácticas</h4>
                <ul class="ai-list recommendations-list">
                    ${analysis.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
            </div>

            <!-- Compatibilidad -->
            ${analysis.teamCompatibility.ideal.length > 0 || analysis.teamCompatibility.needsSupport.length > 0 ? `
                <div class="ai-section">
                    <h4>👥 Compatibilidad de Equipo</h4>
                    ${analysis.teamCompatibility.ideal.length > 0 ? `
                        <p><strong>Combina bien con:</strong></p>
                        <ul class="ai-list">
                            ${analysis.teamCompatibility.ideal.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    ` : ''}
                    ${analysis.teamCompatibility.needsSupport.length > 0 ? `
                        <p><strong>Necesita apoyo de:</strong></p>
                        <ul class="ai-list">
                            ${analysis.teamCompatibility.needsSupport.map(c => `<li>${c}</li>`).join('')}
                        </ul>
                    ` : ''}
                </div>
            ` : ''}
        `;
    }

    /**
     * Crea los gráficos con Chart.js
     */
    createCharts(stats) {
        // Destruir gráficos previos
        if (this.chart1) this.chart1.destroy();
        if (this.chart2) this.chart2.destroy();
        if (this.chart3) this.chart3.destroy();

        // Gráfico 1: Evolución temporal
        const ctx1 = document.getElementById('chart-evolution');
        this.chart1 = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: stats.matches.map(m => new Date(m.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
                datasets: [
                    {
                        label: 'Goles',
                        data: stats.matches.map(m => m.goals),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Asistencias',
                        data: stats.matches.map(m => m.assists),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Encajados',
                        data: stats.matches.map(m => m.keeper),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Gráfico 2: Promedios
        const ctx2 = document.getElementById('chart-averages');
        this.chart2 = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['Goles', 'Asistencias', 'Encajados'],
                datasets: [{
                    label: 'Promedio por Partido',
                    data: [stats.averages.goals, stats.averages.assists, stats.averages.keeper],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Gráfico 3: Victorias por mes
        const monthNames = {
            '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
            '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
            '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
        };
        
        const sortedMonths = Object.keys(stats.monthlyWins).sort();
        const monthLabels = sortedMonths.map(m => {
            const [year, month] = m.split('-');
            return `${monthNames[month]} ${year}`;
        });
        const monthData = sortedMonths.map(m => stats.monthlyWins[m]);

        const ctx3 = document.getElementById('chart-wins-by-month');
        this.chart3 = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Victorias',
                    data: monthData,
                    backgroundColor: 'rgba(251, 191, 36, 0.8)',
                    borderColor: 'rgba(251, 191, 36, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    /**
     * Oculta el modal
     */
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            
            // Destruir gráficos
            if (this.chart1) {
                this.chart1.destroy();
                this.chart1 = null;
            }
            if (this.chart2) {
                this.chart2.destroy();
                this.chart2 = null;
            }
            if (this.chart3) {
                this.chart3.destroy();
                this.chart3 = null;
            }
        }
    }
}
