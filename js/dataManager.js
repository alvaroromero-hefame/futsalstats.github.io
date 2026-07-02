import { globalRateLimiter } from './security/rateLimiter.js';

/**
 * DataManager - Gestión centralizada de datos desde Supabase
 */
export class DataManager {
    constructor(supabaseClient, rateLimiter = globalRateLimiter) {
        if (!supabaseClient) {
            throw new Error('❌ Supabase client es requerido');
        }
        this.supabase = supabaseClient;
        this.rateLimiter = rateLimiter;
        this.futsalDataMartes = null;
        this.futsalDataJueves = null;
        this.currentDay = 'martes';
        this.seasons = { martes: [], jueves: [] };
        this.currentSeason = { martes: null, jueves: null };
        this.playersById = {};
    }

    /**
     * Carga el maestro de jugadores (id -> {name, emoji, ...}) para resolver
     * el nombre actual de un jugador aunque los partidos antiguos guarden
     * el nombre como texto suelto en blue_lineup/red_lineup/mvp
     */
    async loadPlayersMap() {
        try {
            const { data, error } = await this.supabase
                .from('players')
                .select('id, name, emoji, avatar_url, notes');
            if (error) throw error;

            this.playersById = {};
            (data || []).forEach(p => { this.playersById[p.id] = p; });
        } catch (error) {
            console.warn('⚠️ [loadPlayersMap] No se pudo cargar el maestro de jugadores:', error.message);
            this.playersById = {};
        }
    }

    /**
     * Obtiene el mapa de jugadores del maestro (id -> jugador)
     */
    getPlayersById() {
        return this.playersById;
    }

    /**
     * Carga las temporadas de un día y preselecciona la activa si no hay ninguna elegida
     */
    async loadSeasons(day) {
        try {
            const { data, error } = await this.supabase
                .from('seasons')
                .select('*')
                .eq('day', day)
                .order('start_date', { ascending: false });

            if (error) throw error;

            this.seasons[day] = data || [];

            if (this.currentSeason[day] === null) {
                const active = this.seasons[day].find(s => s.is_active);
                if (active) this.currentSeason[day] = active.id;
            }
        } catch (error) {
            console.warn(`⚠️ [loadSeasons] No se pudieron cargar temporadas de ${day} (¿falta aplicar sql/supabase-seasons.sql?):`, error.message);
            this.seasons[day] = [];
        }
    }

    /**
     * Cambia la temporada activa de un día y recarga solo ese día
     */
    async setCurrentSeason(day, seasonId) {
        this.currentSeason[day] = seasonId || null;
        const dayData = await this.loadDayFromSupabase(day);
        if (day === 'martes') this.futsalDataMartes = dayData;
        else this.futsalDataJueves = dayData;
        return dayData;
    }

    /**
     * Obtiene la temporada actualmente seleccionada de un día (o null = todas)
     */
    getCurrentSeason(day) {
        return this.seasons[day]?.find(s => s.id === this.currentSeason[day]) || null;
    }

    /**
     * Obtiene las temporadas disponibles de un día
     */
    getSeasons(day) {
        return this.seasons[day] || [];
    }

    /**
     * Carga datos desde Supabase
     */
    async loadData() {
        console.log('📥 [DataManager] Cargando datos desde Supabase...');

        try {
            await Promise.all([this.loadSeasons('martes'), this.loadSeasons('jueves'), this.loadPlayersMap()]);

            // Cargar datos de martes
            console.log('⏳ [DataManager] Cargando datos de martes...');
            const martesData = await this.loadDayFromSupabase('martes');
            console.log('✓ [DataManager] Datos de martes:', martesData ? 'cargados' : 'sin datos');
            if (martesData) {
                console.log('✓ [DataManager] Partidos martes:', martesData.matches?.length || 0);
                this.futsalDataMartes = martesData;
            }

            // Cargar datos de jueves
            console.log('⏳ [DataManager] Cargando datos de jueves...');
            const juevesData = await this.loadDayFromSupabase('jueves');
            console.log('✓ [DataManager] Datos de jueves:', juevesData ? 'cargados' : 'sin datos');
            if (juevesData) {
                console.log('✓ [DataManager] Partidos jueves:', juevesData.matches?.length || 0);
                this.futsalDataJueves = juevesData;
            }

            // Verificar que al menos un día tenga datos
            if (!this.futsalDataMartes && !this.futsalDataJueves) {
                console.error('❌ [DataManager] No hay datos disponibles en ningún día');
                throw new Error('No hay datos disponibles en Supabase');
            }

            console.log('✅ [DataManager] Datos cargados desde Supabase correctamente');
            return true;
        } catch (error) {
            console.error('❌ [DataManager] Error cargando desde Supabase:', error.message);
            console.error('❌ [DataManager] Error completo:', error);
            throw error;
        }
    }

    /**
     * Carga datos de un día específico desde Supabase
     */
    async loadDayFromSupabase(day) {
        console.log(`⏳ [loadDayFromSupabase] Cargando día: ${day}`);
        
        // Verificar rate limiting
        if (!this.rateLimiter.canMakeRequest()) {
            const status = this.rateLimiter.getStatus();
            console.warn('⚠️ [loadDayFromSupabase] Rate limit excedido. Reintenta en', status.resetTime - Date.now(), 'ms');
            throw new Error('Too many requests. Please wait a moment.');
        }

        try {
            const seasonId = this.currentSeason[day];

            console.log(`⏳ [loadDayFromSupabase] Consultando player_availability para ${day}...`);
            // Cargar jugadores fijos desde player_availability con JOIN a tabla players
            let availabilityQuery = this.supabase
                .from('player_availability')
                .select('player_id, is_fixed, players(name)')
                .eq('day', day)
                .eq('is_fixed', true);
            if (seasonId) availabilityQuery = availabilityQuery.eq('season_id', seasonId);
            const { data: availability, error: availError } = await availabilityQuery;

            if (availError) {
                console.error(`❌ [loadDayFromSupabase] Error en player_availability:`, availError);
                throw availError;
            }
            console.log(`✓ [loadDayFromSupabase] Availability obtenida:`, availability?.length || 0, 'registros');

            console.log(`🔍 DEBUG - Availability con nombres para ${day}:`, availability);

            // Convertir a array de nombres
            const players = availability?.map(a => ({ 
                name: a.players?.name || 'Unknown', 
                is_fixed: true 
            })) || [];

            console.log(`🔍 DEBUG - Jugadores fijos cargados para ${day}:`, players?.length, players?.map(p => p.name));

            // Cargar partidos
            console.log(`⏳ [loadDayFromSupabase] Consultando matches para ${day}...`);
            let matchesQuery = this.supabase
                .from('matches')
                .select('*')
                .eq('day', day);
            if (seasonId) matchesQuery = matchesQuery.eq('season_id', seasonId);
            const { data: matches, error: matchesError } = await matchesQuery
                .order('match_date', { ascending: false });

            if (matchesError) {
                console.error(`❌ [loadDayFromSupabase] Error en matches:`, matchesError);
                throw matchesError;
            }
            console.log(`✓ [loadDayFromSupabase] Matches obtenidos:`, matches?.length || 0, 'partidos');

            // Cargar configuración
            console.log(`⏳ [loadDayFromSupabase] Consultando settings para ${day}...`);
            const { data: settings, error: settingsError } = await this.supabase
                .from('settings')
                .select('*')
                .eq('day', day)
                .maybeSingle();

            if (settingsError) {
                console.error(`❌ [loadDayFromSupabase] Error en settings:`, settingsError);
                throw settingsError;
            }
            console.log(`✓ [loadDayFromSupabase] Settings obtenidos:`, settings ? 'sí' : 'no');

            // Si no hay datos, retornar null
            if (!matches || matches.length === 0) {
                console.log(`⚠️ [loadDayFromSupabase] No hay datos de ${day} en Supabase`);
                return null;
            }

            console.log(`✅ [loadDayFromSupabase] Datos de ${day} procesados correctamente`);
            // Transformar al formato esperado por la aplicación
            return {
                fijos: players.map(p => p.name),
                proximoSeleccionador: settings?.next_selector || '',
                matches: matches.map(m => this.transformMatchFromSupabase(m))
            };
        } catch (error) {
            console.error(`❌ [loadDayFromSupabase] Error cargando ${day} desde Supabase:`, error.message);
            console.error(`❌ [loadDayFromSupabase] Error completo:`, error);
            console.error(`❌ [loadDayFromSupabase] Código error:`, error.code);
            console.error(`❌ [loadDayFromSupabase] Detalles:`, error.details);
            return null;
        }
    }

    /**
     * Transforma un partido de Supabase al formato esperado
     */
    transformMatchFromSupabase(match) {
        return {
            matchDate: match.match_date,
            mvp: match.mvp || '',
            result: match.result,
            blue_lineup: match.blue_lineup,
            red_lineup: match.red_lineup,
            blue_result: match.blue_result,
            red_result: match.red_result,
            // Mantener compatibilidad con formato antiguo
            teams: [
                {
                    blue: [
                        {
                            result: match.blue_result,
                            lineup: [
                                {
                                    member: match.blue_lineup
                                }
                            ]
                        }
                    ],
                    red: [
                        {
                            result: match.red_result,
                            lineup: [
                                {
                                    member: match.red_lineup
                                }
                            ]
                        }
                    ]
                }
            ]
        };
    }

    /**
     * Obtiene los datos del día actual
     */
    getCurrentData() {
        return this.currentDay === 'martes' ? this.futsalDataMartes : this.futsalDataJueves;
    }

    /**
     * Obtiene el día actual
     */
    getCurrentDay() {
        return this.currentDay;
    }

    /**
     * Establece el día actual
     */
    setCurrentDay(day) {
        if (day !== 'martes' && day !== 'jueves') {
            console.error('❌ Día inválido:', day);
            return;
        }
        this.currentDay = day;
    }

    /**
     * Verifica si hay datos disponibles para el día actual
     */
    hasData() {
        return this.getCurrentData() !== null;
    }

    /**
     * Recarga los datos (útil después de modificaciones)
     */
    async reload() {
        console.log('🔄 Recargando datos...');
        return await this.loadData();
    }

    /**
     * Obtiene todos los datos (martes y jueves) para el simulador
     */
    getAllData() {
        return {
            martes: this.futsalDataMartes,
            jueves: this.futsalDataJueves
        };
    }
}
