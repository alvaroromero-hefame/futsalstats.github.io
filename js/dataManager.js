/**
 * DataManager - Gestión centralizada de datos
 * Prioriza Supabase, fallback a JSON local
 */
export class DataManager {
    constructor(supabaseClient = null) {
        this.supabase = supabaseClient;
        this.futsalDataMartes = null;
        this.futsalDataJueves = null;
        this.currentDay = 'martes';
        this.dataSource = 'json'; // 'supabase' o 'json'
    }

    /**
     * Carga datos desde Supabase o JSON según disponibilidad
     */
    async loadData() {
        console.log('📥 Cargando datos...');
        
        // Intentar cargar desde Supabase primero
        if (this.supabase) {
            const supabaseSuccess = await this.loadFromSupabase();
            if (supabaseSuccess) {
                this.dataSource = 'supabase';
                console.log('✅ Datos cargados desde Supabase');
                return true;
            }
            console.log('⚠️ Supabase no disponible, usando JSON local');
        }

        // Fallback a JSON local
        return await this.loadFromJSON();
    }

    /**
     * Carga datos desde Supabase
     */
    async loadFromSupabase() {
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
            return this.futsalDataMartes !== null || this.futsalDataJueves !== null;
        } catch (error) {
            console.error('❌ Error cargando desde Supabase:', error);
            return false;
        }
    }

    /**
     * Carga datos de un día específico desde Supabase
     */
    async loadDayFromSupabase(day) {
        try {
            // Cargar jugadores fijos
            const { data: players, error: playersError } = await this.supabase
                .from('players')
                .select('*')
                .or(`day.eq.${day},day.eq.ambos`)
                .eq('is_fixed', true);

            if (playersError) throw playersError;

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
     * Transforma un partido de Supabase al formato JSON original
     */
    transformMatchFromSupabase(match) {
        return {
            matchDate: match.match_date,
            mvp: match.mvp || '',
            result: match.result,
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
     * Carga datos desde archivos JSON locales
     */
    async loadFromJSON() {
        try {
            const [dataMartes, dataJueves] = await Promise.all([
                fetch('data/FutsalStatsMartes.json').then(res => res.json()),
                fetch('data/FutsalStatsJueves.json').then(res => res.json()).catch(() => null)
            ]);
            
            this.futsalDataMartes = dataMartes;
            this.futsalDataJueves = dataJueves;
            this.dataSource = 'json';
            
            console.log('✅ Datos cargados desde JSON local');
            return true;
        } catch (error) {
            console.error('❌ Error cargando datos JSON:', error);
            return false;
        }
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
     * Obtiene la fuente de datos actual
     */
    getDataSource() {
        return this.dataSource;
    }

    /**
     * Verifica si Supabase está disponible
     */
    isSupabaseAvailable() {
        return this.supabase !== null && this.dataSource === 'supabase';
    }

    /**
     * Recarga los datos (útil después de modificaciones)
     */
    async reload() {
        console.log('🔄 Recargando datos...');
        return await this.loadData();
    }
}
