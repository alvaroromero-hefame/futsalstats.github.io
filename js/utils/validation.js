/**
 * Utilidades de Validación
 * Validación de inputs para prevenir SQL injection y datos inválidos
 */

import { SecurityUtils } from './security.js';

export class ValidationUtils {
    /**
     * Valida nombre de jugador
     * 
     * @param {string} name - Nombre a validar
     * @returns {Object} { valid: boolean, sanitized: string, error: string }
     */
    static validatePlayerName(name) {
        if (!name || typeof name !== 'string') {
            return { valid: false, sanitized: '', error: 'Nombre vacío o inválido' };
        }

        // Limpiar espacios y sanitizar
        const cleaned = SecurityUtils.cleanWhitespace(name);
        const sanitized = SecurityUtils.sanitizeHTML(cleaned);

        // Verificar longitud
        if (sanitized.length < 2) {
            return { valid: false, sanitized, error: 'El nombre debe tener al menos 2 caracteres' };
        }

        if (sanitized.length > 50) {
            return { valid: false, sanitized, error: 'El nombre no puede tener más de 50 caracteres' };
        }

        // Solo letras, espacios, guiones y apóstrofes
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-']+$/;
        
        if (!nameRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'El nombre solo puede contener letras, espacios, guiones y apóstrofes' };
        }

        // Verificar código malicioso
        if (SecurityUtils.containsMaliciousCode(sanitized)) {
            return { valid: false, sanitized, error: 'El nombre contiene caracteres no permitidos' };
        }

        return { valid: true, sanitized, error: null };
    }

    /**
     * Valida día de la semana
     * 
     * @param {string} day - Día a validar
     * @returns {Object} { valid: boolean, sanitized: string, error: string }
     */
    static validateDay(day) {
        if (!day || typeof day !== 'string') {
            return { valid: false, sanitized: '', error: 'Día vacío o inválido' };
        }

        const sanitized = SecurityUtils.sanitizeHTML(day.trim().toLowerCase());
        const validDays = ['martes', 'jueves', 'ambos'];

        if (!validDays.includes(sanitized)) {
            return { 
                valid: false, 
                sanitized, 
                error: `Día inválido. Debe ser: ${validDays.join(', ')}` 
            };
        }

        return { valid: true, sanitized, error: null };
    }

    /**
     * Valida un número positivo
     * 
     * @param {any} num - Número a validar
     * @param {string} fieldName - Nombre del campo (para mensajes de error)
     * @param {number} min - Valor mínimo permitido
     * @param {number} max - Valor máximo permitido
     * @returns {Object} { valid: boolean, sanitized: number, error: string }
     */
    static validatePositiveNumber(num, fieldName = 'valor', min = 0, max = Infinity) {
        const parsed = Number(num);

        if (isNaN(parsed)) {
            return { valid: false, sanitized: 0, error: `${fieldName} debe ser un número` };
        }

        if (!isFinite(parsed)) {
            return { valid: false, sanitized: 0, error: `${fieldName} debe ser un número finito` };
        }

        if (parsed < min) {
            return { valid: false, sanitized: parsed, error: `${fieldName} debe ser mayor o igual a ${min}` };
        }

        if (parsed > max) {
            return { valid: false, sanitized: parsed, error: `${fieldName} debe ser menor o igual a ${max}` };
        }

        return { valid: true, sanitized: parsed, error: null };
    }

    /**
     * Valida un número entero
     * 
     * @param {any} num - Número a validar
     * @param {string} fieldName - Nombre del campo
     * @param {number} min - Valor mínimo
     * @param {number} max - Valor máximo
     * @returns {Object} { valid: boolean, sanitized: number, error: string }
     */
    static validateInteger(num, fieldName = 'valor', min = 0, max = Infinity) {
        const result = this.validatePositiveNumber(num, fieldName, min, max);
        
        if (!result.valid) return result;

        if (!Number.isInteger(result.sanitized)) {
            return { valid: false, sanitized: result.sanitized, error: `${fieldName} debe ser un número entero` };
        }

        return result;
    }

    /**
     * Valida una fecha
     * 
     * @param {string} dateString - Fecha en formato ISO (YYYY-MM-DD)
     * @param {boolean} allowFuture - Permitir fechas futuras
     * @returns {Object} { valid: boolean, sanitized: string, error: string }
     */
    static validateDate(dateString, allowFuture = false) {
        if (!dateString || typeof dateString !== 'string') {
            return { valid: false, sanitized: '', error: 'Fecha vacía o inválida' };
        }

        const sanitized = SecurityUtils.sanitizeHTML(dateString.trim());

        // Validar formato ISO (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        
        if (!dateRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'Formato de fecha inválido. Use YYYY-MM-DD' };
        }

        const date = new Date(sanitized);

        if (isNaN(date.getTime())) {
            return { valid: false, sanitized, error: 'Fecha inválida' };
        }

        // Verificar rango razonable (año 2000 - 2100)
        const year = date.getFullYear();
        if (year < 2000 || year > 2100) {
            return { valid: false, sanitized, error: 'Fecha fuera de rango válido (2000-2100)' };
        }

        // Verificar fechas futuras si no están permitidas
        if (!allowFuture && date > new Date()) {
            return { valid: false, sanitized, error: 'La fecha no puede ser futura' };
        }

        return { valid: true, sanitized, error: null };
    }

    /**
     * Valida un booleano
     * 
     * @param {any} value - Valor a validar
     * @returns {Object} { valid: boolean, sanitized: boolean, error: string }
     */
    static validateBoolean(value) {
        if (typeof value === 'boolean') {
            return { valid: true, sanitized: value, error: null };
        }

        if (value === 'true' || value === '1' || value === 1) {
            return { valid: true, sanitized: true, error: null };
        }

        if (value === 'false' || value === '0' || value === 0 || value === '') {
            return { valid: true, sanitized: false, error: null };
        }

        return { valid: false, sanitized: false, error: 'Valor booleano inválido' };
    }

    /**
     * Valida resultado de partido (goles)
     * 
     * @param {any} goals - Número de goles
     * @returns {Object} { valid: boolean, sanitized: number, error: string }
     */
    static validateGoals(goals) {
        return this.validateInteger(goals, 'Goles', 0, 50);
    }

    /**
     * Valida asistencias
     * 
     * @param {any} assists - Número de asistencias
     * @returns {Object} { valid: boolean, sanitized: number, error: string }
     */
    static validateAssists(assists) {
        return this.validateInteger(assists, 'Asistencias', 0, 50);
    }

    /**
     * Valida goles encajados
     * 
     * @param {any} conceded - Número de goles encajados
     * @returns {Object} { valid: boolean, sanitized: number, error: string }
     */
    static validateConcededGoals(conceded) {
        return this.validateInteger(conceded, 'Goles encajados', 0, 50);
    }

    /**
     * Valida un array de jugadores para un partido
     * 
     * @param {Array} players - Array de jugadores
     * @param {number} expectedCount - Número esperado de jugadores
     * @returns {Object} { valid: boolean, sanitized: Array, error: string }
     */
    static validatePlayersArray(players, expectedCount = 5) {
        if (!Array.isArray(players)) {
            return { valid: false, sanitized: [], error: 'Debe proporcionar un array de jugadores' };
        }

        if (players.length !== expectedCount) {
            return { 
                valid: false, 
                sanitized: players, 
                error: `Se requieren exactamente ${expectedCount} jugadores` 
            };
        }

        // Validar que todos los elementos sean strings o objetos válidos
        const sanitized = players.map(player => {
            if (typeof player === 'string') {
                return SecurityUtils.sanitizeHTML(player);
            } else if (typeof player === 'object' && player !== null) {
                return SecurityUtils.sanitizeObject(player);
            }
            return player;
        });

        return { valid: true, sanitized, error: null };
    }

    /**
     * Valida UUID de Supabase
     * 
     * @param {string} uuid - UUID a validar
     * @returns {Object} { valid: boolean, sanitized: string, error: string }
     */
    static validateUUID(uuid) {
        if (!uuid || typeof uuid !== 'string') {
            return { valid: false, sanitized: '', error: 'UUID vacío o inválido' };
        }

        const sanitized = SecurityUtils.sanitizeHTML(uuid.trim());
        
        // UUID v4 format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(sanitized)) {
            return { valid: false, sanitized, error: 'Formato de UUID inválido' };
        }

        return { valid: true, sanitized, error: null };
    }

    /**
     * Valida un objeto de partido completo
     * 
     * @param {Object} match - Objeto de partido
     * @returns {Object} { valid: boolean, errors: Array, sanitizedMatch: Object }
     */
    static validateMatch(match) {
        const errors = [];
        const sanitizedMatch = {};

        // Validar fecha
        const dateValidation = this.validateDate(match.match_date);
        if (!dateValidation.valid) {
            errors.push(`Fecha: ${dateValidation.error}`);
        } else {
            sanitizedMatch.match_date = dateValidation.sanitized;
        }

        // Validar lineups
        const blueValidation = this.validatePlayersArray(match.blue_lineup, 5);
        if (!blueValidation.valid) {
            errors.push(`Equipo azul: ${blueValidation.error}`);
        } else {
            sanitizedMatch.blue_lineup = blueValidation.sanitized;
        }

        const redValidation = this.validatePlayersArray(match.red_lineup, 5);
        if (!redValidation.valid) {
            errors.push(`Equipo rojo: ${redValidation.error}`);
        } else {
            sanitizedMatch.red_lineup = redValidation.sanitized;
        }

        // Validar resultado
        const blueGoalsValidation = this.validateGoals(match.blue_goals);
        const redGoalsValidation = this.validateGoals(match.red_goals);

        if (!blueGoalsValidation.valid) {
            errors.push(`Goles equipo azul: ${blueGoalsValidation.error}`);
        } else {
            sanitizedMatch.blue_goals = blueGoalsValidation.sanitized;
        }

        if (!redGoalsValidation.valid) {
            errors.push(`Goles equipo rojo: ${redGoalsValidation.error}`);
        } else {
            sanitizedMatch.red_goals = redGoalsValidation.sanitized;
        }

        return {
            valid: errors.length === 0,
            errors,
            sanitizedMatch
        };
    }

    /**
     * Valida contraseña (requisitos mínimos de seguridad)
     * 
     * @param {string} password - Contraseña a validar
     * @returns {Object} { valid: boolean, strength: string, errors: Array }
     */
    static validatePassword(password) {
        const errors = [];
        
        if (!password || typeof password !== 'string') {
            return { valid: false, strength: 'weak', errors: ['Contraseña vacía'] };
        }

        if (password.length < 8) {
            errors.push('La contraseña debe tener al menos 8 caracteres');
        }

        if (!/[a-z]/.test(password)) {
            errors.push('Debe contener al menos una letra minúscula');
        }

        if (!/[A-Z]/.test(password)) {
            errors.push('Debe contener al menos una letra mayúscula');
        }

        if (!/[0-9]/.test(password)) {
            errors.push('Debe contener al menos un número');
        }

        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Debe contener al menos un carácter especial');
        }

        // Determinar fortaleza
        let strength = 'weak';
        if (errors.length === 0) {
            if (password.length >= 12) {
                strength = 'strong';
            } else {
                strength = 'medium';
            }
        }

        return {
            valid: errors.length === 0,
            strength,
            errors
        };
    }
}
