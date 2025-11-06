/**
 * AdvancedStats - Cálculos de estadísticas avanzadas para jugadores
 * Racha actual, mejor compañero, rendimiento por equipo, evolución temporal
 */

export class AdvancedStats {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    /**
     * Extrae los lineups de un match según la estructura de datos
     */
    extractLineups(match) {
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
        
        return { blueLineup, redLineup };
    }

    /**
     * Encuentra un jugador en los lineups
     */
    findPlayerInMatch(playerName, match) {
        const { blueLineup, redLineup } = this.extractLineups(match);
        const allPlayers = [...blueLineup, ...redLineup];
        return allPlayers.find(p => p.name === playerName);
    }

    /**
     * Verifica si un jugador ganó el partido
     */
    isPlayerWinner(playerName, match) {
        const { blueLineup, redLineup } = this.extractLineups(match);
        const isBlue = blueLineup.some(p => p.name === playerName);
        return (isBlue && match.result === 'VictoryBlue') || 
               (!isBlue && match.result === 'VictoryRed');
    }

    /**
     * Calcula todas las estadísticas avanzadas de un jugador
     */
    async getPlayerAdvancedStats(playerName, day) {
        console.log('🔍 getPlayerAdvancedStats llamado para:', playerName);
        const data = this.dataManager.getCurrentData();
        console.log('📦 Data obtenida:', data);
        
        if (!data || !data.matches) {
            console.warn('⚠️ No hay datos disponibles para estadísticas avanzadas');
            console.log('Data:', data);
            console.log('Matches:', data?.matches);
            return null;
        }
        
        const matches = data.matches;
        console.log('📊 Total de matches para análisis:', matches.length);
        
        const streak = this.calculateStreak(playerName, matches);
        console.log('🔥 Streak calculado:', streak);
        
        const bestPartner = this.findBestPartner(playerName, matches);
        console.log('🤝 Best partner calculado:', bestPartner);
        
        const teamPerformance = this.calculateTeamPerformance(playerName, matches);
        console.log('⚽ Team performance calculado:', teamPerformance);
        
        const evolution = this.calculateEvolution(playerName, matches);
        console.log('📈 Evolution calculado:', evolution);
        
        const mvpProbability = this.calculateMVPProbability(playerName, matches);
        console.log('⭐ MVP probability calculado:', mvpProbability);
        
        return {
            streak,
            bestPartner,
            teamPerformance,
            evolution,
            mvpProbability
        };
    }

    /**
     * Calcula la racha actual (victorias o derrotas consecutivas)
     */
    calculateStreak(playerName, matches) {
        // Filtrar solo partidos donde jugó el jugador
        const playerMatches = matches.filter(match => {
            const player = this.findPlayerInMatch(playerName, match);
            return player !== undefined;
        });

        // Ordenar por fecha descendente (más reciente primero)
        playerMatches.sort((a, b) => {
            const dateA = new Date(a.matchDate || a.match_date || a.date);
            const dateB = new Date(b.matchDate || b.match_date || b.date);
            return dateB - dateA;
        });

        if (playerMatches.length === 0) {
            return { 
                type: 'none', 
                count: 0, 
                emoji: '➖', 
                label: 'Sin partidos' 
            };
        }

        let streakType = null;
        let streakCount = 0;

        for (const match of playerMatches) {
            const won = this.isPlayerWinner(playerName, match);
            const currentType = won ? 'win' : 'loss';

            if (streakType === null) {
                streakType = currentType;
                streakCount = 1;
            } else if (streakType === currentType) {
                streakCount++;
            } else {
                break;
            }
        }

        return {
            type: streakType,
            count: streakCount,
            emoji: streakType === 'win' 
                ? (streakCount >= 5 ? '🔥' : '✅') 
                : (streakCount >= 3 ? '❄️' : '❌'),
            label: streakType === 'win' 
                ? `${streakCount} victoria${streakCount > 1 ? 's' : ''} seguida${streakCount > 1 ? 's' : ''}`
                : `${streakCount} derrota${streakCount > 1 ? 's' : ''} seguida${streakCount > 1 ? 's' : ''}`
        };
    }

    /**
     * Encuentra el mejor compañero (jugador con mejor win rate jugando juntos)
     */
    findBestPartner(playerName, matches) {
        const partnerStats = new Map();

        matches.forEach(match => {
            const { blueLineup, redLineup } = this.extractLineups(match);
            
            let teammates = [];
            let won = false;

            const isBlue = blueLineup.some(p => p.name === playerName);
            const isRed = redLineup.some(p => p.name === playerName);

            if (isBlue) {
                teammates = blueLineup.filter(p => p.name !== playerName);
                won = match.result === 'VictoryBlue';
            } else if (isRed) {
                teammates = redLineup.filter(p => p.name !== playerName);
                won = match.result === 'VictoryRed';
            }

            teammates.forEach(teammate => {
                if (!partnerStats.has(teammate.name)) {
                    partnerStats.set(teammate.name, { matches: 0, wins: 0 });
                }
                const stats = partnerStats.get(teammate.name);
                stats.matches++;
                if (won) stats.wins++;
            });
        });

        // Encontrar mejor compañero (mínimo 3 partidos juntos)
        let bestPartner = null;
        let bestWinRate = 0;

        partnerStats.forEach((stats, name) => {
            if (stats.matches >= 3) {
                const winRate = (stats.wins / stats.matches) * 100;
                if (winRate > bestWinRate) {
                    bestWinRate = winRate;
                    bestPartner = {
                        name,
                        matches: stats.matches,
                        wins: stats.wins,
                        winRate: winRate.toFixed(1)
                    };
                }
            }
        });

        return bestPartner || { 
            name: 'N/A', 
            matches: 0, 
            wins: 0, 
            winRate: 0 
        };
    }

    /**
     * Calcula rendimiento por equipo (azul vs rojo)
     */
    calculateTeamPerformance(playerName, matches) {
        const blueStats = { matches: 0, wins: 0, goals: 0 };
        const redStats = { matches: 0, wins: 0, goals: 0 };

        matches.forEach(match => {
            const { blueLineup, redLineup } = this.extractLineups(match);
            
            const bluePlayer = blueLineup.find(p => p.name === playerName);
            const redPlayer = redLineup.find(p => p.name === playerName);
            
            if (bluePlayer) {
                blueStats.matches++;
                if (match.result === 'VictoryBlue') blueStats.wins++;
                blueStats.goals += (bluePlayer.goal || bluePlayer.goles || 0);
            } else if (redPlayer) {
                redStats.matches++;
                if (match.result === 'VictoryRed') redStats.wins++;
                redStats.goals += (redPlayer.goal || redPlayer.goles || 0);
            }
        });

        return {
            blue: {
                matches: blueStats.matches,
                wins: blueStats.wins,
                winRate: blueStats.matches > 0 
                    ? ((blueStats.wins / blueStats.matches) * 100).toFixed(1)
                    : 0,
                goalsPerMatch: blueStats.matches > 0 
                    ? (blueStats.goals / blueStats.matches).toFixed(2)
                    : 0
            },
            red: {
                matches: redStats.matches,
                wins: redStats.wins,
                winRate: redStats.matches > 0 
                    ? ((redStats.wins / redStats.matches) * 100).toFixed(1)
                    : 0,
                goalsPerMatch: redStats.matches > 0 
                    ? (redStats.goals / redStats.matches).toFixed(2)
                    : 0
            }
        };
    }

    /**
     * Calcula evolución de los últimos partidos
     */
    calculateEvolution(playerName, matches) {
        // Filtrar partidos del jugador
        const playerMatches = matches.filter(match => {
            const player = this.findPlayerInMatch(playerName, match);
            return player !== undefined;
        });

        // Ordenar por fecha descendente y tomar últimos 10
        playerMatches.sort((a, b) => {
            const dateA = new Date(a.matchDate || a.match_date || a.date);
            const dateB = new Date(b.matchDate || b.match_date || b.date);
            return dateB - dateA;
        });

        const last10 = playerMatches.slice(0, 10);

        return last10.map(match => {
            const { blueLineup, redLineup } = this.extractLineups(match);
            const player = [...blueLineup, ...redLineup].find(p => p.name === playerName);
            const won = this.isPlayerWinner(playerName, match);
            
            return {
                date: match.matchDate || match.match_date || match.date,
                result: won ? 'W' : 'L',
                goals: player ? (player.goal || player.goles || 0) : 0,
                assists: player ? (player.assist || player.asistencias || 0) : 0
            };
        }).reverse(); // Invertir para mostrar cronológicamente
    }

    /**
     * Calcula probabilidad de ser MVP
     */
    calculateMVPProbability(playerName, matches) {
        // Filtrar partidos del jugador
        const playerMatches = matches.filter(match => {
            const player = this.findPlayerInMatch(playerName, match);
            return player !== undefined;
        });

        if (playerMatches.length === 0) return 0;

        // Contar MVPs
        let mvpCount = 0;
        playerMatches.forEach(match => {
            const { blueLineup, redLineup } = this.extractLineups(match);
            const player = [...blueLineup, ...redLineup].find(p => p.name === playerName);
            if (player && (player.mvp === true || player.isMvp === true)) {
                mvpCount++;
            }
        });

        // Calcular tasa de MVP
        const mvpRate = (mvpCount / playerMatches.length) * 100;

        // Calcular win rate
        const wins = playerMatches.filter(match => this.isPlayerWinner(playerName, match)).length;
        const winRate = (wins / playerMatches.length) * 100;

        // Algoritmo: MVP rate 60% + win rate 40%
        const probability = (mvpRate * 0.6) + (winRate * 0.4);

        return Math.round(probability);
    }

    /**
     * Obtiene historial detallado de los últimos 20 partidos
     */
    getDetailedHistory(playerName, matches) {
        // Filtrar partidos del jugador
        const playerMatches = matches.filter(match => {
            const player = this.findPlayerInMatch(playerName, match);
            return player !== undefined;
        });

        // Ordenar por fecha descendente y tomar últimos 20
        playerMatches.sort((a, b) => {
            const dateA = new Date(a.matchDate || a.match_date || a.date);
            const dateB = new Date(b.matchDate || b.match_date || b.date);
            return dateB - dateA;
        });

        const last20 = playerMatches.slice(0, 20);

        return last20.map(match => {
            const { blueLineup, redLineup } = this.extractLineups(match);
            const player = [...blueLineup, ...redLineup].find(p => p.name === playerName);
            const isBlue = blueLineup.some(p => p.name === playerName);
            const won = this.isPlayerWinner(playerName, match);
            
            return {
                date: match.matchDate || match.match_date || match.date,
                team: isBlue ? 'blue' : 'red',
                result: won ? 'W' : 'L',
                goals: player ? (player.goal || player.goles || 0) : 0,
                assists: player ? (player.assist || player.asistencias || 0) : 0,
                keeper: player ? (player.keeper || player.portero || 0) : 0,
                mvp: player ? (player.mvp === true || player.isMvp === true) : false
            };
        });
    }
}

// Instancia global
let globalAdvancedStats = null;

/**
 * Inicializa el módulo de estadísticas avanzadas
 */
export function initAdvancedStats(dataManager) {
    globalAdvancedStats = new AdvancedStats(dataManager);
    console.log('✅ Módulo de estadísticas avanzadas inicializado');
}

export { globalAdvancedStats };

