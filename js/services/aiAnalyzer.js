/**
 * AIPlayerAnalyzer - Análisis inteligente de jugadores (100% gratuito)
 * Sistema de reglas avanzado que simula análisis profesional
 */

export class AIPlayerAnalyzer {
    constructor() {
        this.profiles = {
            'Goleador': { icon: 'i-balon', color: 'var(--team-blue)' },
            'Playmaker': { icon: 'i-diana', color: 'var(--win)' },
            'Defensor': { icon: 'i-escudo', color: 'var(--navy)' },
            'Portero': { icon: 'i-escudo', color: 'var(--team-red)' },
            'Polivalente': { icon: 'i-estrella', color: 'var(--ambar)' }
        };
    }

    /**
     * Analiza un jugador y genera perfil completo
     */
    analyze(stats) {
        const profile = this.determineProfile(stats);
        const level = this.determineLevel(stats);
        const trend = this.analyzeTrend(stats);
        const strengths = this.identifyStrengths(stats, profile);
        const improvements = this.identifyImprovements(stats, profile);
        const summary = this.generateSummary(stats, profile, level);
        const recommendations = this.generateRecommendations(stats, profile);
        const teamCompatibility = this.analyzeTeamCompatibility(stats, profile);
        
        return {
            profile,
            level,
            trend,
            strengths,
            improvements,
            summary,
            recommendations,
            teamCompatibility,
            score: this.calculateOverallScore(stats)
        };
    }

    /**
     * Determina el perfil del jugador
     */
    determineProfile(stats) {
        const avg = stats.averages;
        const totals = stats.totals;
        
        // Calcular ratios
        const goalsRatio = parseFloat(avg.goals);
        const assistsRatio = parseFloat(avg.assists);
        const keeperRatio = parseFloat(avg.keeper);
        const keeperFrequency = totals.keeper / totals.matches;
        
        // Portero: juega frecuentemente de portero
        if (keeperFrequency > 0.4) {
            return {
                type: 'Portero',
                ...this.profiles['Portero'],
                description: 'Especialista en portería'
            };
        }
        
        // Goleador: alto promedio de goles
        if (goalsRatio >= 2.0) {
            return {
                type: 'Goleador',
                ...this.profiles['Goleador'],
                description: 'Delantero nato con instinto goleador'
            };
        }
        
        // Playmaker: altas asistencias
        if (assistsRatio >= 1.5 && assistsRatio > goalsRatio) {
            return {
                type: 'Playmaker',
                ...this.profiles['Playmaker'],
                description: 'Creador de juego y asistente'
            };
        }
        
        // Defensor: bajo promedio ofensivo, pocas veces portero
        if (goalsRatio < 1.0 && assistsRatio < 1.0) {
            return {
                type: 'Defensor',
                ...this.profiles['Defensor'],
                description: 'Especialista defensivo'
            };
        }
        
        // Polivalente: balance en todas las áreas
        return {
            type: 'Polivalente',
            ...this.profiles['Polivalente'],
            description: 'Jugador versátil y adaptable'
        };
    }

    /**
     * Determina el nivel del jugador
     */
    determineLevel(stats) {
        const score = this.calculateOverallScore(stats);
        
        if (score >= 85) return { level: 'Elite', color: 'var(--gold)', icon: 'i-trofeo' };
        if (score >= 70) return { level: 'Avanzado', color: 'var(--primary)', icon: 'i-actividad' };
        if (score >= 55) return { level: 'Intermedio', color: 'var(--team-blue)', icon: 'i-estrella' };
        if (score >= 40) return { level: 'En desarrollo', color: 'var(--win)', icon: 'i-grafica' };
        return { level: 'Principiante', color: 'var(--muted)', icon: 'i-sparkle' };
    }

    /**
     * Calcula puntuación global (0-100)
     */
    calculateOverallScore(stats) {
        const avg = stats.averages;
        const totals = stats.totals;
        
        // Pesos: victorias 35%, ofensiva 40%, defensa 25%
        const winScore = parseFloat(totals.winRate) * 0.35;
        
        const offensiveScore = (
            Math.min(parseFloat(avg.goals) * 10, 30) + 
            Math.min(parseFloat(avg.assists) * 8, 25)
        ) * 0.4;
        
        const defensiveScore = (
            10 - Math.min(parseFloat(avg.keeper) * 2, 10)
        ) * 2.5;
        
        // Bonus por experiencia
        const experienceBonus = Math.min(totals.matches / 2, 5);
        
        return Math.min(100, Math.round(winScore + offensiveScore + defensiveScore + experienceBonus));
    }

    /**
     * Analiza tendencia del jugador
     */
    analyzeTrend(stats) {
        if (stats.matches.length < 5) {
            return {
                trend: 'Datos insuficientes',
                icon: 'i-info',
                color: 'var(--muted)',
                description: 'Necesita más partidos para análisis de tendencia'
            };
        }
        
        // Comparar últimos 5 vs anteriores
        const recent = stats.matches.slice(-5);
        const previous = stats.matches.slice(0, -5);
        
        if (previous.length === 0) {
            return {
                trend: 'Nuevo',
                icon: 'i-sparkle',
                color: 'var(--win)',
                description: 'Jugador en etapa inicial'
            };
        }
        
        const recentGoals = recent.reduce((s, m) => s + m.goals, 0) / recent.length;
        const previousGoals = previous.reduce((s, m) => s + m.goals, 0) / previous.length;
        
        const recentWins = recent.filter(m => m.isWin).length / recent.length;
        const previousWins = previous.filter(m => m.isWin).length / previous.length;
        
        const goalsDiff = recentGoals - previousGoals;
        const winsDiff = recentWins - previousWins;
        
        // Mejorando significativamente
        if (goalsDiff > 0.5 || winsDiff > 0.15) {
            return {
                trend: 'En ascenso',
                icon: 'i-grafica',
                color: 'var(--win)',
                description: 'Rendimiento claramente al alza'
            };
        }
        
        // Bajando
        if (goalsDiff < -0.5 || winsDiff < -0.15) {
            return {
                trend: 'En descenso',
                icon: 'i-grafica',
                color: 'var(--loss)',
                description: 'Rendimiento en baja, necesita recuperación'
            };
        }
        
        // Estable
        return {
            trend: 'Estable',
            icon: 'i-actividad',
            color: 'var(--team-blue)',
            description: 'Rendimiento consistente'
        };
    }

    /**
     * Identifica fortalezas del jugador
     */
    identifyStrengths(stats, profile) {
        const strengths = [];
        const avg = stats.averages;
        const totals = stats.totals;
        
        // Goles
        if (parseFloat(avg.goals) >= 2.5) {
            strengths.push('Excelente finalizador - promedio superior a 2.5 goles/partido');
        } else if (parseFloat(avg.goals) >= 1.5) {
            strengths.push('Buen promedio goleador');
        }
        
        // Asistencias
        if (parseFloat(avg.assists) >= 2.0) {
            strengths.push('Creador de juego excepcional');
        } else if (parseFloat(avg.assists) >= 1.0) {
            strengths.push('Buen generador de asistencias');
        }
        
        // Victorias
        if (parseFloat(totals.winRate) >= 70) {
            strengths.push('Alto impacto en victorias del equipo');
        } else if (parseFloat(totals.winRate) >= 55) {
            strengths.push('Balance positivo de victorias');
        }
        
        // Portería
        if (parseFloat(avg.keeper) <= 2.0 && totals.keeper > 0) {
            strengths.push('Portero confiable con buen promedio defensivo');
        }
        
        // Experiencia
        if (totals.matches >= 30) {
            strengths.push('Gran experiencia con ' + totals.matches + ' partidos');
        } else if (totals.matches >= 15) {
            strengths.push('Experiencia sólida');
        }
        
        // Consistencia ofensiva
        const contributionRate = (totals.goals + totals.assists) / totals.matches;
        if (contributionRate >= 3) {
            strengths.push('Alta contribución ofensiva constante');
        }
        
        if (strengths.length === 0) {
            strengths.push('En desarrollo, buscando su mejor versión');
        }
        
        return strengths;
    }

    /**
     * Identifica áreas de mejora
     */
    identifyImprovements(stats, profile) {
        const improvements = [];
        const avg = stats.averages;
        const totals = stats.totals;
        
        // Goles
        if (parseFloat(avg.goals) < 1.0 && profile.type !== 'Portero' && profile.type !== 'Defensor') {
            improvements.push('Aumentar efectividad goleadora');
        }
        
        // Asistencias
        if (parseFloat(avg.assists) < 0.8) {
            improvements.push('Mejorar visión de juego y pases clave');
        }
        
        // Victorias
        if (parseFloat(totals.winRate) < 50) {
            improvements.push('Trabajar en impacto sobre el resultado del equipo');
        }
        
        // Portería (si juega de portero frecuentemente)
        if (parseFloat(avg.keeper) > 4.0 && totals.keeper > totals.matches * 0.2) {
            improvements.push('Reducir goles encajados en portería');
        }
        
        // Experiencia
        if (totals.matches < 10) {
            improvements.push('Ganar más experiencia con más partidos');
        }
        
        // Consistencia
        const variance = this.calculateVariance(stats.matches);
        if (variance > 2) {
            improvements.push('Buscar mayor regularidad en el rendimiento');
        }
        
        if (improvements.length === 0) {
            improvements.push('Rendimiento sólido, mantener el nivel');
        }
        
        return improvements;
    }

    /**
     * Calcula varianza de goles
     */
    calculateVariance(matches) {
        if (matches.length < 3) return 0;
        
        const goals = matches.map(m => m.goals);
        const mean = goals.reduce((a, b) => a + b, 0) / goals.length;
        const variance = goals.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) / goals.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Genera resumen personalizado
     */
    generateSummary(stats, profile, level) {
        const avg = stats.averages;
        const totals = stats.totals;
        
        const summaries = {
            'Goleador': [
                `Delantero con instinto goleador que promedia ${avg.goals} goles por partido.`,
                `Su efectividad frente a portería y ${totals.winRate}% de victorias lo hacen clave en ataque.`,
                `Con ${totals.matches} partidos de experiencia, es una amenaza constante para las defensas rivales.`
            ],
            'Playmaker': [
                `Cerebro del equipo con ${avg.assists} asistencias de promedio.`,
                `Su visión de juego y ${totals.winRate}% de victorias demuestran su importancia estratégica.`,
                `Combina creatividad con efectividad, siendo el motor ofensivo del equipo.`
            ],
            'Defensor': [
                `Especialista defensivo enfocado en solidez y equilibrio.`,
                `Con ${totals.winRate}% de victorias, aporta estabilidad al equipo.`,
                `Su juego sin balón y lectura táctica son sus mejores armas.`
            ],
            'Portero': [
                `Guardameta con ${avg.keeper} goles encajados de promedio por partido.`,
                `Su presencia bajo los tres palos aporta seguridad al equipo.`,
                `Experiencia en ${totals.matches} partidos lo hacen un portero confiable.`
            ],
            'Polivalente': [
                `Jugador versátil que se adapta a diferentes roles con ${totals.winRate}% de victorias.`,
                `Aporta ${avg.goals} goles y ${avg.assists} asistencias, mostrando balance ofensivo.`,
                `Su capacidad de adaptación lo hace valioso en cualquier sistema táctico.`
            ]
        };
        
        return summaries[profile.type] || [
            `Jugador con ${totals.matches} partidos de experiencia.`,
            `Contribuye con ${avg.goals} goles y ${avg.assists} asistencias por partido.`,
            `Mantiene ${totals.winRate}% de victorias en su trayectoria.`
        ];
    }

    /**
     * Genera recomendaciones tácticas
     */
    generateRecommendations(stats, profile) {
        const recommendations = [];
        const avg = stats.averages;
        
        switch (profile.type) {
            case 'Goleador':
                recommendations.push('Posicionar en zona de remate, cerca del área rival');
                recommendations.push('Aprovechar velocidad en contragolpes');
                if (parseFloat(avg.assists) < 1) {
                    recommendations.push('Trabajar asociaciones con compañeros');
                }
                break;
                
            case 'Playmaker':
                recommendations.push('Darle libertad creativa en el centro del campo');
                recommendations.push('Posición de pivote o media punta');
                recommendations.push('Fomentar circulación de balón a través suyo');
                break;
                
            case 'Defensor':
                recommendations.push('Rol defensivo, cubriendo espacios');
                recommendations.push('Enfocarse en anticipación y lectura');
                recommendations.push('Apoyar transiciones ofensivas cuando sea seguro');
                break;
                
            case 'Portero':
                recommendations.push('Rol de portero titular o suplente confiable');
                if (parseFloat(avg.keeper) > 3) {
                    recommendations.push('Mejorar colocación y reflejos');
                }
                recommendations.push('Comunicación constante con defensa');
                break;
                
            case 'Polivalente':
                recommendations.push('Rotar en diferentes posiciones según necesidad');
                recommendations.push('Utilizar para equilibrar el equipo');
                recommendations.push('Mantener versatilidad como fortaleza');
                break;
        }
        
        return recommendations;
    }

    /**
     * Analiza compatibilidad con el equipo
     */
    analyzeTeamCompatibility(stats, profile) {
        const compatibility = {
            ideal: [],
            needsSupport: []
        };
        
        const avg = stats.averages;
        
        // Jugadores ideales para combinar
        if (profile.type === 'Goleador') {
            compatibility.ideal.push('Playmakers que le den asistencias');
            compatibility.ideal.push('Defensores que recuperen balón rápido');
        } else if (profile.type === 'Playmaker') {
            compatibility.ideal.push('Goleadores que finalicen sus pases');
            compatibility.ideal.push('Jugadores con movilidad');
        } else if (profile.type === 'Defensor') {
            compatibility.ideal.push('Portero seguro para respaldo');
            compatibility.ideal.push('Centrocampistas que ayuden en recuperación');
        }
        
        // Necesita apoyo de
        if (parseFloat(avg.goals) < 1 && profile.type !== 'Defensor' && profile.type !== 'Portero') {
            compatibility.needsSupport.push('Jugadores que creen ocasiones');
        }
        if (parseFloat(stats.totals.winRate) < 50) {
            compatibility.needsSupport.push('Equipo con experiencia que lidere');
        }
        
        return compatibility;
    }
}
