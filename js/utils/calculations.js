/**
 * Calculations - Funciones de cálculo para estadísticas y clasificación
 */

/**
 * Calcula la clasificación de jugadores basada en los partidos
 * @param {Array} matches - Array de partidos
 * @param {Array} fijos - Array con nombres de jugadores fijos
 * @returns {Array} Array de jugadores con sus estadísticas, ordenado por puntos
 */
export function calcularClasificacion(matches, fijos = []) {
    const jugadores = {};

    matches.forEach(match => {
        // Identificar puntos de victoria por el campo 'result'
        let puntosBlue = 0, puntosRed = 0;
        let resultadoBlue = '', resultadoRed = '';
        
        if (match.result === 'VictoryBlue') {
            puntosBlue = 3;
            puntosRed = 0;
            resultadoBlue = 'G';
            resultadoRed = 'P';
        } else if (match.result === 'VictoryRed') {
            puntosBlue = 0;
            puntosRed = 3;
            resultadoBlue = 'P';
            resultadoRed = 'G';
        } else if (match.result === 'Draw') {
            puntosBlue = 1;
            puntosRed = 1;
            resultadoBlue = 'E';
            resultadoRed = 'E';
        }

        // MVP
        if (match.mvp && match.mvp.trim() !== '' && match.mvp.trim() !== '-') {
            if (!jugadores[match.mvp]) {
                jugadores[match.mvp] = crearJugadorVacio();
            }
            jugadores[match.mvp].mvps++;
        }

        // Detectar estructura de datos (Supabase vs antigua)
        let blueLineup, redLineup;
        
        if (match.blue_lineup && match.red_lineup) {
            // Estructura de Supabase (plana)
            blueLineup = match.blue_lineup;
            redLineup = match.red_lineup;
        } else if (match.teams && match.teams[0]) {
            // Estructura antigua (anidada)
            blueLineup = match.teams[0].blue[0].lineup[0].member;
            redLineup = match.teams[0].red[0].lineup[0].member;
        } else {
            console.warn('Estructura de partido no reconocida:', match);
            return;
        }

        // Procesar lineup azul
        blueLineup.forEach(m => {
            if (!jugadores[m.name]) {
                jugadores[m.name] = crearJugadorVacio();
            }
            procesarJugador(jugadores[m.name], m, puntosBlue, resultadoBlue);
        });

        // Procesar lineup rojo
        redLineup.forEach(m => {
            if (!jugadores[m.name]) {
                jugadores[m.name] = crearJugadorVacio();
            }
            procesarJugador(jugadores[m.name], m, puntosRed, resultadoRed);
        });
    });

    // Sumar 1 punto por cada MVP
    Object.values(jugadores).forEach(j => {
        if (j.mvps) {
            j.puntos += j.mvps;
        }
    });

    // Asegurar que todos los jugadores fijos estén en la lista
    fijos.forEach(fijoName => {
        if (!jugadores[fijoName]) {
            jugadores[fijoName] = crearJugadorVacio();
        }
    });

    // Ordenar por puntos
    return Object.entries(jugadores)
        .map(([nombre, datos]) => ({ nombre, ...datos }))
        .sort((a, b) => b.puntos - a.puntos);
}

/**
 * Crea un objeto jugador vacío con todas las estadísticas inicializadas
 * @returns {Object} Objeto jugador vacío
 */
function crearJugadorVacio() {
    return {
        puntos: 0,
        goles: 0,
        asistencias: 0,
        encajados: 0,
        ganados: 0,
        empatados: 0,
        perdidos: 0,
        mvps: 0
    };
}

/**
 * Procesa las estadísticas de un jugador individual
 * @param {Object} jugador - Objeto del jugador a actualizar
 * @param {Object} member - Datos del miembro del partido
 * @param {number} puntosVictoria - Puntos por victoria/empate
 * @param {string} resultado - 'G', 'E' o 'P'
 */
function procesarJugador(jugador, member, puntosVictoria, resultado) {
    // Puntos por victoria/empate
    jugador.puntos += puntosVictoria;
    
    // Goles (soportar ambos formatos: goal y goles)
    const goles = member.goal !== undefined ? member.goal : (member.goles || 0);
    jugador.puntos += goles * 0.25;
    jugador.goles += goles;
    
    // Asistencias (soportar ambos formatos: assist y asistencias)
    const asistencias = member.assist !== undefined ? member.assist : (member.asistencias || 0);
    jugador.puntos += asistencias * 0.25;
    jugador.asistencias += asistencias;
    
    // Encajados (soportar ambos formatos: keeper y portero)
    const encajados = member.keeper !== undefined ? member.keeper : (member.portero || 0);
    jugador.puntos += encajados * -0.25;
    jugador.encajados += encajados;
    
    // Contar partidos
    if (resultado === 'G') jugador.ganados++;
    if (resultado === 'E') jugador.empatados++;
    if (resultado === 'P') jugador.perdidos++;
}

/**
 * Obtiene los lineups de un partido en cualquier formato
 * @param {Object} match - Partido
 * @returns {Object} {blue: Array, red: Array}
 */
function getLineups(match) {
    if (match.blue_lineup && match.red_lineup) {
        // Estructura de Supabase (plana)
        return {
            blue: match.blue_lineup,
            red: match.red_lineup
        };
    } else if (match.teams && match.teams[0]) {
        // Estructura antigua (anidada)
        return {
            blue: match.teams[0].blue[0].lineup[0].member,
            red: match.teams[0].red[0].lineup[0].member
        };
    }
    console.warn('Estructura de partido no reconocida:', match);
    return { blue: [], red: [] };
}

/**
 * Calcula el total de goles de todos los partidos
 * @param {Object} data - Datos con matches
 * @returns {number} Total de goles
 */
export function calcularTotalGoles(data) {
    return data.matches.reduce((total, match) => {
        const lineups = getLineups(match);
        const golesAzules = lineups.blue.reduce((sum, player) => {
            const goles = player.goal !== undefined ? player.goal : (player.goles || 0);
            return sum + goles;
        }, 0);
        const golesRojos = lineups.red.reduce((sum, player) => {
            const goles = player.goal !== undefined ? player.goal : (player.goles || 0);
            return sum + goles;
        }, 0);
        return total + golesAzules + golesRojos;
    }, 0);
}

/**
 * Calcula las victorias de cada equipo
 * @param {Object} data - Datos con matches
 * @returns {Object} Objeto con victorias {red: number, blue: number}
 */
export function calcularVictorias(data) {
    const victorias = { red: 0, blue: 0 };
    data.matches.forEach(match => {
        if (match.result === "VictoryRed") {
            victorias.red++;
        } else if (match.result === "VictoryBlue") {
            victorias.blue++;
        }
    });
    return victorias;
}

/**
 * Calcula el top 3 de goleadores
 * @param {Object} data - Datos con matches
 * @returns {Array} Array de strings con formato "Nombre (goles)"
 */
export function calcularTopGoleadores(data) {
    const goleadores = {};

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        
        // Procesar equipo azul
        lineups.blue.forEach(player => {
            if (!goleadores[player.name]) {
                goleadores[player.name] = 0;
            }
            const goles = player.goal !== undefined ? player.goal : (player.goles || 0);
            goleadores[player.name] += goles;
        });

        // Procesar equipo rojo
        lineups.red.forEach(player => {
            if (!goleadores[player.name]) {
                goleadores[player.name] = 0;
            }
            const goles = player.goal !== undefined ? player.goal : (player.goles || 0);
            goleadores[player.name] += goles;
        });
    });

    return obtenerTop3(goleadores);
}

/**
 * Calcula el top 3 de jugadores con más goles encajados
 * @param {Object} data - Datos con matches
 * @returns {Array} Array de strings con formato "Nombre (encajados)"
 */
export function calcularTopEncajados(data) {
    const encajados = {};
    
    data.matches.forEach(match => {
        const lineups = getLineups(match);
        
        // Procesar equipo azul
        lineups.blue.forEach(player => {
            if (!encajados[player.name]) {
                encajados[player.name] = 0;
            }
            const keeper = player.keeper !== undefined ? player.keeper : (player.portero || 0);
            encajados[player.name] += keeper;
        });

        // Procesar equipo rojo
        lineups.red.forEach(player => {
            if (!encajados[player.name]) {
                encajados[player.name] = 0;
            }
            const keeper = player.keeper !== undefined ? player.keeper : (player.portero || 0);
            encajados[player.name] += keeper;
        });
    });

    return obtenerTop3(encajados);
}

/**
 * Calcula el top 3 de jugadores con más asistencias
 * @param {Object} data - Datos con matches
 * @returns {Array} Array de strings con formato "Nombre (asistencias)"
 */
export function calcularTopAsistencias(data) {
    const asistencias = {};
    
    data.matches.forEach(match => {
        const lineups = getLineups(match);
        
        // Procesar equipo azul
        lineups.blue.forEach(player => {
            if (!asistencias[player.name]) {
                asistencias[player.name] = 0;
            }
            const assists = player.assist !== undefined ? player.assist : (player.asistencias || 0);
            asistencias[player.name] += assists;
        });

        // Procesar equipo rojo
        lineups.red.forEach(player => {
            if (!asistencias[player.name]) {
                asistencias[player.name] = 0;
            }
            const assists = player.assist !== undefined ? player.assist : (player.asistencias || 0);
            asistencias[player.name] += assists;
        });
    });

    return obtenerTop3(asistencias);
}

/**
 * Obtiene el top 3 de un objeto de estadísticas
 * @param {Object} obj - Objeto con nombre:valor
 * @returns {Array} Array de strings con formato "Nombre (valor)"
 */
function obtenerTop3(obj) {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const top = [];
    let rank = 1;

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
            rank++;
        }
        if (rank > 3) break;
        top.push(`${sorted[i][0]} (${sorted[i][1]})`);
    }

    return top;
}

/**
 * Calcula el contador de participaciones de jugadores no fijos
 * @param {Object} data - Datos con matches y fijos
 * @returns {number} Número total de participaciones de no fijos
 */
export function calcularContadorNoFijos(data) {
    const fijos = data.fijos || [];
    let contadorParticipaciones = 0;

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        
        // Procesar equipo azul
        lineups.blue.forEach(player => {
            if (!fijos.includes(player.name)) {
                contadorParticipaciones++;
            }
        });

        // Procesar equipo rojo
        lineups.red.forEach(player => {
            if (!fijos.includes(player.name)) {
                contadorParticipaciones++;
            }
        });
    });

    return contadorParticipaciones;
}

/**
 * Obtiene el resultado de un partido en formato string
 * @param {Object} match - Datos del partido
 * @returns {string} Resultado en formato "Azul X - Rojo Y"
 */
export function getResultado(match) {
    // Estructura de Supabase
    if (match.blue_result !== undefined && match.red_result !== undefined) {
        return `Azul ${match.blue_result} - Rojo ${match.red_result}`;
    }
    // Estructura antigua
    if (match.teams && match.teams[0]) {
        const blue = match.teams[0].blue[0].result;
        const red = match.teams[0].red[0].result;
        return `Azul ${blue} - Rojo ${red}`;
    }
    return 'Resultado no disponible';
}

/**
 * Obtiene todos los miembros de un partido (ambos equipos)
 * @param {Object} match - Datos del partido
 * @returns {Array} Array con todos los jugadores del partido
 */
export function getAllMembers(match) {
    const lineups = getLineups(match);
    return [...lineups.blue, ...lineups.red];
}
