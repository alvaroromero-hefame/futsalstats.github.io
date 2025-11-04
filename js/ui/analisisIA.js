/**
 * AnalisisIAView - Vista de análisis IA de jugadores
 */

import { AIPlayerAnalyzer } from '../services/aiAnalyzer.js';

export class AnalisisIAView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
        this.aiAnalyzer = new AIPlayerAnalyzer();
        this.allPlayers = [];
    }

    /**
     * Renderiza la vista de análisis IA
     */
    render() {
        const data = this.dataManager.getAllData();
        if (!data || (!data.martes && !data.jueves)) {
            this.container.innerHTML = '<p>Cargando datos...</p>';
            return;
        }

        // Calcular lista de jugadores únicos
        this.calculateAllPlayers(data);

        let html = `
            <div class="analisis-ia-container">
                <h1>🤖 Análisis IA de Jugadores</h1>
                <p class="description">
                    Análisis profesional basado en todas las estadísticas del jugador (martes y jueves combinados)
                </p>

                <div class="player-selector-container">
                    <label for="player-selector">Selecciona un jugador:</label>
                    <select id="player-selector" class="player-selector">
                        <option value="">-- Selecciona un jugador --</option>
                        ${this.renderPlayerOptions()}
                    </select>
                    <button id="analyze-player-btn" class="btn-analyze" disabled>
                        Analizar Jugador
                    </button>
                </div>

                <div id="analysis-result" class="analysis-result" style="display: none;">
                    <!-- El análisis se mostrará aquí -->
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Calcula la lista de todos los jugadores únicos
     */
    calculateAllPlayers(data) {
        const playerStats = {};
        
        // Procesar datos de ambos días
        ['martes', 'jueves'].forEach(day => {
            if (data[day] && data[day].matches) {
                data[day].matches.forEach(match => {
                    // Extraer lineups
                    let blueLineup = [];
                    let redLineup = [];
                    
                    if (match.teams && match.teams[0]) {
                        const team = match.teams[0];
                        if (team.blue && team.blue[0] && team.blue[0].lineup && team.blue[0].lineup[0]) {
                            blueLineup = team.blue[0].lineup[0].member || [];
                        }
                        if (team.red && team.red[0] && team.red[0].lineup && team.red[0].lineup[0]) {
                            redLineup = team.red[0].lineup[0].member || [];
                        }
                    } else if (match.blue_lineup || match.blueLineup) {
                        blueLineup = match.blue_lineup || match.blueLineup || [];
                        redLineup = match.red_lineup || match.redLineup || [];
                    }

                    const allPlayersInMatch = [...blueLineup, ...redLineup];
                    allPlayersInMatch.forEach(player => {
                        if (!playerStats[player.name]) {
                            playerStats[player.name] = {
                                matches: 0,
                                wins: 0,
                                goals: 0,
                                assists: 0,
                                keeper: 0
                            };
                        }

                        const isBlue = blueLineup.some(p => p.name === player.name);
                        const isWin = (isBlue && match.result === 'VictoryBlue') || 
                                     (!isBlue && match.result === 'VictoryRed');
                        
                        playerStats[player.name].matches++;
                        if (isWin) playerStats[player.name].wins++;
                        playerStats[player.name].goals += player.goal || player.goles || 0;
                        playerStats[player.name].assists += player.assist || player.asistencias || 0;
                        playerStats[player.name].keeper += player.keeper || player.portero || 0;
                    });
                });
            }
        });

        // Convertir a array y ordenar
        this.allPlayers = Object.keys(playerStats)
            .filter(name => playerStats[name].matches > 0)
            .sort((a, b) => a.localeCompare(b));
    }

    /**
     * Renderiza las opciones del selector
     */
    renderPlayerOptions() {
        return this.allPlayers
            .map(name => `<option value="${name}">${name}</option>`)
            .join('');
    }

    /**
     * Adjunta los event listeners
     */
    attachEventListeners() {
        const selector = document.getElementById('player-selector');
        const analyzeBtn = document.getElementById('analyze-player-btn');

        selector.addEventListener('change', () => {
            analyzeBtn.disabled = !selector.value;
        });

        analyzeBtn.addEventListener('click', () => {
            const playerName = selector.value;
            if (playerName) {
                this.analyzePlayer(playerName);
            }
        });
    }

    /**
     * Analiza un jugador específico
     */
    analyzePlayer(playerName) {
        const data = this.dataManager.getAllData();
        const stats = this.calculatePlayerCompleteStats(playerName, data);
        
        if (!stats || stats.totals.matches === 0) {
            alert('No hay datos suficientes para analizar este jugador');
            return;
        }

        // Generar análisis IA
        const analysis = this.aiAnalyzer.analyze(stats);
        
        // Mostrar resultado
        this.displayAnalysis(playerName, stats, analysis);
    }

    /**
     * Calcula estadísticas completas del jugador (martes + jueves)
     */
    calculatePlayerCompleteStats(playerName, data) {
        const playerMatches = [];
        const monthlyWins = {};
        
        ['martes', 'jueves'].forEach(day => {
            if (data[day] && data[day].matches) {
                data[day].matches.forEach(match => {
                    let blueLineup = [];
                    let redLineup = [];
                    
                    if (match.teams && match.teams[0]) {
                        const team = match.teams[0];
                        if (team.blue && team.blue[0] && team.blue[0].lineup && team.blue[0].lineup[0]) {
                            blueLineup = team.blue[0].lineup[0].member || [];
                        }
                        if (team.red && team.red[0] && team.red[0].lineup && team.red[0].lineup[0]) {
                            redLineup = team.red[0].lineup[0].member || [];
                        }
                    } else if (match.blue_lineup || match.blueLineup) {
                        blueLineup = match.blue_lineup || match.blueLineup || [];
                        redLineup = match.red_lineup || match.redLineup || [];
                    }
                    
                    const allPlayers = [...blueLineup, ...redLineup];
                    const player = allPlayers.find(p => p.name === playerName);
                    
                    if (player) {
                        const isBlue = blueLineup.some(p => p.name === playerName);
                        const isWin = (isBlue && match.result === 'VictoryBlue') || 
                                     (!isBlue && match.result === 'VictoryRed');
                        
                        playerMatches.push({
                            date: match.matchDate || match.match_date || match.date,
                            day: day, // Añadir el día
                            goals: player.goal || player.goles || 0,
                            assists: player.assist || player.asistencias || 0,
                            keeper: player.keeper || player.portero || 0,
                            isWin: isWin
                        });
                        
                        if (isWin) {
                            const matchDate = match.matchDate || match.match_date || match.date;
                            const monthKey = matchDate.substring(0, 7);
                            monthlyWins[monthKey] = (monthlyWins[monthKey] || 0) + 1;
                        }
                    }
                });
            }
        });
        
        // Ordenar por fecha
        playerMatches.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calcular totales
        const totalMatches = playerMatches.length;
        const totalGoals = playerMatches.reduce((sum, m) => sum + m.goals, 0);
        const totalAssists = playerMatches.reduce((sum, m) => sum + m.assists, 0);
        const totalKeeper = playerMatches.reduce((sum, m) => sum + m.keeper, 0);
        const totalWins = playerMatches.filter(m => m.isWin).length;
        
        // Calcular por día
        const martesMatches = playerMatches.filter(m => m.day === 'martes');
        const juevesMatches = playerMatches.filter(m => m.day === 'jueves');
        
        return {
            matches: playerMatches,
            monthlyWins: monthlyWins,
            totals: {
                matches: totalMatches,
                goals: totalGoals,
                assists: totalAssists,
                keeper: totalKeeper,
                wins: totalWins,
                losses: totalMatches - totalWins,
                winRate: totalMatches > 0 ? (totalWins / totalMatches * 100).toFixed(1) : 0
            },
            averages: {
                goals: totalMatches > 0 ? (totalGoals / totalMatches).toFixed(2) : 0,
                assists: totalMatches > 0 ? (totalAssists / totalMatches).toFixed(2) : 0,
                keeper: totalMatches > 0 ? (totalKeeper / totalMatches).toFixed(2) : 0
            },
            byDay: {
                martes: {
                    matches: martesMatches.length,
                    wins: martesMatches.filter(m => m.isWin).length,
                    goals: martesMatches.reduce((sum, m) => sum + m.goals, 0),
                    assists: martesMatches.reduce((sum, m) => sum + m.assists, 0)
                },
                jueves: {
                    matches: juevesMatches.length,
                    wins: juevesMatches.filter(m => m.isWin).length,
                    goals: juevesMatches.reduce((sum, m) => sum + m.goals, 0),
                    assists: juevesMatches.reduce((sum, m) => sum + m.assists, 0)
                }
            }
        };
    }

    /**
     * Muestra el análisis en pantalla
     */
    displayAnalysis(playerName, stats, analysis) {
        const resultContainer = document.getElementById('analysis-result');
        
        resultContainer.innerHTML = `
            <div class="analysis-header">
                <h2>📊 Análisis Completo de ${playerName}</h2>
                <p class="analysis-subtitle">Datos combinados de Martes y Jueves</p>
            </div>

            <!-- Resumen de estadísticas -->
            <div class="stats-overview">
                <div class="stat-card">
                    <div class="stat-value">${stats.totals.matches}</div>
                    <div class="stat-label">Partidos Totales</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totals.goals}</div>
                    <div class="stat-label">Goles</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totals.assists}</div>
                    <div class="stat-label">Asistencias</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totals.winRate}%</div>
                    <div class="stat-label">Victorias</div>
                </div>
            </div>

            <!-- Desglose por día -->
            <div class="day-breakdown">
                <div class="day-card">
                    <h3>📅 Martes</h3>
                    <p>${stats.byDay.martes.matches} partidos • ${stats.byDay.martes.wins} victorias</p>
                    <p>${stats.byDay.martes.goals} goles • ${stats.byDay.martes.assists} asistencias</p>
                </div>
                <div class="day-card">
                    <h3>📅 Jueves</h3>
                    <p>${stats.byDay.jueves.matches} partidos • ${stats.byDay.jueves.wins} victorias</p>
                    <p>${stats.byDay.jueves.goals} goles • ${stats.byDay.jueves.assists} asistencias</p>
                </div>
            </div>

            <!-- Análisis IA -->
            <div class="ai-analysis-section">
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
            </div>
        `;
        
        resultContainer.style.display = 'block';
        resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
