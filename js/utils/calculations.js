/**
 * Calculations - Funciones de cálculo para estadísticas y clasificación
 */

/**
 * Clave de agrupación de un jugador: su player_id si el partido ya está
 * vinculado al maestro, o su nombre literal si no (partidos aún sin vincular)
 */
function claveDeJugador(m) {
    return m.player_id || m.name;
}

/**
 * Nombre a mostrar de un jugador: el nombre ACTUAL del maestro si el partido
 * está vinculado por player_id (así un cambio de nombre se refleja solo,
 * sin tocar partidos históricos); si no, el nombre literal guardado en el partido
 */
function nombreDeJugador(m, playersById = {}) {
    if (m.player_id && playersById[m.player_id]) {
        return playersById[m.player_id].name;
    }
    return m.name;
}

/**
 * Calcula la clasificación de jugadores basada en los partidos
 * @param {Array} matches - Array de partidos
 * @param {Array} fijos - Array con nombres de jugadores fijos
 * @param {Object} playersById - Maestro de jugadores (id -> {name, ...}), opcional
 * @returns {Array} Array de jugadores con sus estadísticas, ordenado por puntos
 */
export function calcularClasificacion(matches, fijos = [], playersById = {}) {
    const jugadores = {};

    const ensure = (m) => {
        const key = claveDeJugador(m);
        if (!jugadores[key]) {
            jugadores[key] = { nombre: nombreDeJugador(m, playersById), ...crearJugadorVacio() };
        } else {
            jugadores[key].nombre = nombreDeJugador(m, playersById);
        }
        return jugadores[key];
    };

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
            const mvpEntry = match.mvp_player_id
                ? { player_id: match.mvp_player_id, name: match.mvp.trim() }
                : { name: match.mvp.trim() };
            ensure(mvpEntry).mvps++;
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

        // NUEVO SISTEMA: Calcular encajados totales por equipo
        const encajadosBlue = blueLineup.reduce((sum, m) => {
            const encajados = m.keeper !== undefined ? m.keeper : (m.portero || 0);
            return sum + encajados;
        }, 0);

        const encajadosRed = redLineup.reduce((sum, m) => {
            const encajados = m.keeper !== undefined ? m.keeper : (m.portero || 0);
            return sum + encajados;
        }, 0);

        // Procesar lineup azul
        blueLineup.forEach(m => {
            procesarJugador(ensure(m), m, puntosBlue, resultadoBlue, encajadosBlue);
        });

        // Procesar lineup rojo
        redLineup.forEach(m => {
            procesarJugador(ensure(m), m, puntosRed, resultadoRed, encajadosRed);
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
        const yaEsta = Object.values(jugadores).some(j => j.nombre === fijoName);
        if (!yaEsta) {
            jugadores[fijoName] = { nombre: fijoName, ...crearJugadorVacio() };
        }
    });

    // Ordenar por puntos
    return Object.values(jugadores).sort((a, b) => b.puntos - a.puntos);
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
 * @param {number} encajadosEquipo - Total de goles encajados por todo el equipo en este partido
 */
function procesarJugador(jugador, member, puntosVictoria, resultado, encajadosEquipo) {
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

    // NUEVO SISTEMA DE ENCAJADOS:
    // Los encajados del equipo se distribuyen entre todos los jugadores
    // Cada jugador pierde -0.10 por cada gol encajado por el equipo
    jugador.puntos += encajadosEquipo * -0.10;

    // Los encajados individuales se siguen registrando para estadísticas
    // pero solo para el jugador que estuvo de portero
    const encajadosIndividuales = member.keeper !== undefined ? member.keeper : (member.portero || 0);
    jugador.encajados += encajadosIndividuales;

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
 * @param {Object} playersById - Maestro de jugadores (id -> {name, ...}), opcional
 * @returns {Array} Array de strings con formato "Nombre (goles)"
 */
export function calcularTopGoleadores(data, playersById = {}) {
    const goleadores = {};
    const nombres = {};

    const procesar = (player) => {
        const key = claveDeJugador(player);
        nombres[key] = nombreDeJugador(player, playersById);
        const goles = player.goal !== undefined ? player.goal : (player.goles || 0);
        goleadores[key] = (goleadores[key] || 0) + goles;
    };

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        lineups.blue.forEach(procesar);
        lineups.red.forEach(procesar);
    });

    return obtenerTop3(goleadores, nombres);
}

/**
 * Calcula el top 3 de jugadores con más goles encajados
 * @param {Object} data - Datos con matches
 * @param {Object} playersById - Maestro de jugadores (id -> {name, ...}), opcional
 * @returns {Array} Array de strings con formato "Nombre (encajados)"
 */
export function calcularTopEncajados(data, playersById = {}) {
    const encajados = {};
    const nombres = {};

    const procesar = (player) => {
        const key = claveDeJugador(player);
        nombres[key] = nombreDeJugador(player, playersById);
        const keeper = player.keeper !== undefined ? player.keeper : (player.portero || 0);
        encajados[key] = (encajados[key] || 0) + keeper;
    };

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        lineups.blue.forEach(procesar);
        lineups.red.forEach(procesar);
    });

    return obtenerTop3(encajados, nombres);
}

/**
 * Calcula el top 3 de jugadores con más asistencias
 * @param {Object} data - Datos con matches
 * @param {Object} playersById - Maestro de jugadores (id -> {name, ...}), opcional
 * @returns {Array} Array de strings con formato "Nombre (asistencias)"
 */
export function calcularTopAsistencias(data, playersById = {}) {
    const asistencias = {};
    const nombres = {};

    const procesar = (player) => {
        const key = claveDeJugador(player);
        nombres[key] = nombreDeJugador(player, playersById);
        const assists = player.assist !== undefined ? player.assist : (player.asistencias || 0);
        asistencias[key] = (asistencias[key] || 0) + assists;
    };

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        lineups.blue.forEach(procesar);
        lineups.red.forEach(procesar);
    });

    return obtenerTop3(asistencias, nombres);
}

/**
 * Obtiene el top 3 de un objeto de estadísticas
 * @param {Object} obj - Objeto con clave:valor
 * @param {Object} nombres - Mapa clave:nombre a mostrar (opcional, por defecto la propia clave)
 * @returns {Array} Array de strings con formato "Nombre (valor)"
 */
function obtenerTop3(obj, nombres = {}) {
    const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const top = [];
    let rank = 1;

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
            rank++;
        }
        if (rank > 3) break;
        const nombre = nombres[sorted[i][0]] || sorted[i][0];
        top.push(`${nombre} (${sorted[i][1]})`);
    }

    return top;
}

/**
 * Calcula el contador de participaciones de jugadores no fijos
 * @param {Object} data - Datos con matches y fijos
 * @param {Object} playersById - Maestro de jugadores (id -> {name, ...}), opcional
 * @returns {number} Número total de participaciones de no fijos
 */
export function calcularContadorNoFijos(data, playersById = {}) {
    const fijos = data.fijos || [];
    let contadorParticipaciones = 0;

    const procesar = (player) => {
        if (!fijos.includes(nombreDeJugador(player, playersById))) {
            contadorParticipaciones++;
        }
    };

    data.matches.forEach(match => {
        const lineups = getLineups(match);
        lineups.blue.forEach(procesar);
        lineups.red.forEach(procesar);
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
