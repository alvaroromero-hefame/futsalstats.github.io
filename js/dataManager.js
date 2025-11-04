/**
 * DataManager - Gestión centralizada de datos desde Supabase
 */
export class DataManager {
    constructor(supabaseClient) {
        if (!supabaseClient) {
            throw new Error('❌ Supabase client es requerido');
        }
        this.supabase = supabaseClient;
        this.futsalDataMartes = null;
        this.futsalDataJueves = null;
        this.currentDay = 'martes';
    }

    /**
     * Carga datos desde Supabase
     */
    async loadData() {
        console.log('📥 Cargando datos desde Supabase...');
        
        try {
            // Cargar datos de martes
            const martesData = await this.loadDayFromSupabase('martes');
            if (martesData) {
                this.futsalDataMartes = martesData;
            }

            // Cargar datos de jueves
            const juevesData = await this.loadDayFromSupabase('jueves');
            if (juevesData) {
                this.futsalDataJueves = juevesData;
            }

            // Verificar que al menos un día tenga datos
            if (!this.futsalDataMartes && !this.futsalDataJueves) {
                throw new Error('No hay datos disponibles en Supabase');
            }

            console.log('✅ Datos cargados desde Supabase correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error cargando desde Supabase:', error);
            throw error;
        }
    }

    /**
     * Carga datos de un día específico desde Supabase
     */
    async loadDayFromSupabase(day) {
        try {
            // Cargar jugadores fijos desde player_availability con JOIN a tabla players
            const { data: availability, error: availError } = await this.supabase
                .from('player_availability')
                .select('player_id, is_fixed, players(name)')
                .eq('day', day)
                .eq('is_fixed', true);

            if (availError) throw availError;

            console.log(`🔍 DEBUG - Availability con nombres para ${day}:`, availability);

            // Convertir a array de nombres
            const players = availability?.map(a => ({ 
                name: a.players?.name || 'Unknown', 
                is_fixed: true 
            })) || [];

            console.log(`🔍 DEBUG - Jugadores fijos cargados para ${day}:`, players?.length, players?.map(p => p.name));

            // Cargar partidos
            const { data: matches, error: matchesError } = await this.supabase
                .from('matches')
                .select('*')
                .eq('day', day)
                .order('match_date', { ascending: false });

            if (matchesError) throw matchesError;

            // Cargar configuración
            const { data: settings, error: settingsError } = await this.supabase
                .from('settings')
                .select('*')
                .eq('day', day)
                .maybeSingle();

            if (settingsError) throw settingsError;

            // Si no hay datos, retornar null
            if (!matches || matches.length === 0) {
                console.log(`⚠️ No hay datos de ${day} en Supabase`);
                return null;
            }

            // Transformar al formato esperado por la aplicación
            return {
                fijos: players.map(p => p.name),
                proximoSeleccionador: settings?.next_selector || '',
                matches: matches.map(m => this.transformMatchFromSupabase(m))
            };
        } catch (error) {
            console.error(`❌ Error cargando ${day} desde Supabase:`, error);
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
