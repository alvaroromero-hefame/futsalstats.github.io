/**
 * Script de Migración de Datos JSON a Supabase
 * 
 * Este script lee los archivos JSON locales y los migra a las tablas de Supabase.
 * Ejecutar en la consola del navegador o como módulo independiente.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './config.js';

class DataMigration {
    constructor() {
        this.supabase = createClient(config.supabase.url, config.supabase.anonKey);
        this.stats = {
            playersInserted: 0,
            playersFailed: 0,
            matchesInserted: 0,
            matchesFailed: 0,
            settingsInserted: 0
        };
    }

    /**
     * Carga un archivo JSON
     */
    async loadJSON(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Error cargando ${path}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`❌ Error cargando ${path}:`, error);
            return null;
        }
    }

    /**
     * Migra los jugadores fijos a la tabla players
     */
    async migratePlayers(fijos, day) {
        console.log(`\n📋 Migrando ${fijos.length} jugadores fijos de ${day}...`);
        
        for (const playerName of fijos) {
            try {
                // Verificar si el jugador ya existe
                const { data: existing, error: selectError } = await this.supabase
                    .from('players')
                    .select('id, day')
                    .eq('name', playerName)
                    .maybeSingle();

                if (selectError) {
                    console.warn(`  ⚠️  Error verificando jugador ${playerName}:`, selectError.message);
                }

                if (existing) {
                    // Actualizar si es necesario (agregar día)
                    let newDay = existing.day;
                    if (existing.day !== 'ambos' && existing.day !== day) {
                        newDay = 'ambos';
                        await this.supabase
                            .from('players')
                            .update({ day: newDay })
                            .eq('name', playerName);
                        console.log(`  ✏️  ${playerName} actualizado a jugar ambos días`);
                    }
                } else {
                    // Insertar nuevo jugador
                    const { error } = await this.supabase
                        .from('players')
                        .insert({
                            name: playerName,
                            is_fixed: true,
                            day: day
                        });

                    if (error) {
                        throw error;
                    }
                    
                    this.stats.playersInserted++;
                    console.log(`  ✅ ${playerName} insertado`);
                }
            } catch (error) {
                this.stats.playersFailed++;
                console.error(`  ❌ Error con ${playerName}:`, error.message);
            }
        }
    }

    /**
     * Migra un partido a la tabla matches
     */
    async migrateMatch(match, day) {
        try {
            // Extraer datos del partido
            const blueTeam = match.teams[0].blue[0];
            const redTeam = match.teams[0].red[0];

            // Preparar datos para insertar
            const matchData = {
                match_date: match.matchDate,
                day: day,
                mvp: match.mvp && match.mvp.trim() !== '-' ? match.mvp : null,
                result: match.result,
                blue_result: blueTeam.result,
                red_result: redTeam.result,
                blue_lineup: blueTeam.lineup[0].member,
                red_lineup: redTeam.lineup[0].member
            };

            // Verificar si el partido ya existe (por fecha y día)
            const { data: existing, error: selectError } = await this.supabase
                .from('matches')
                .select('id')
                .eq('match_date', matchData.match_date)
                .eq('day', day)
                .maybeSingle();

            if (selectError) {
                console.warn(`  ⚠️  Error verificando partido existente:`, selectError.message);
            }

            if (existing) {
                console.log(`  ⏭️  Partido ${matchData.match_date} (${day}) ya existe, saltando...`);
                return;
            }

            // Insertar partido
            const { error } = await this.supabase
                .from('matches')
                .insert(matchData);

            if (error) {
                throw error;
            }

            this.stats.matchesInserted++;
            console.log(`  ✅ Partido ${matchData.match_date} insertado`);

            // Registrar jugadores eventuales (no fijos)
            await this.registerEventualPlayers([...blueTeam.lineup[0].member, ...redTeam.lineup[0].member], day);

        } catch (error) {
            this.stats.matchesFailed++;
            console.error(`  ❌ Error con partido ${match.matchDate}:`, error.message);
        }
    }

    /**
     * Registra jugadores eventuales (que no están en la lista de fijos)
     */
    async registerEventualPlayers(players, day) {
        for (const player of players) {
            try {
                // Verificar si el jugador ya existe
                const { data: existing, error: selectError } = await this.supabase
                    .from('players')
                    .select('id')
                    .eq('name', player.name)
                    .maybeSingle();

                if (selectError) {
                    // Ignorar errores silenciosamente para jugadores eventuales
                    continue;
                }

                if (!existing) {
                    // Insertar jugador eventual
                    await this.supabase
                        .from('players')
                        .insert({
                            name: player.name,
                            is_fixed: false,
                            day: day
                        });
                }
            } catch (error) {
                // Ignorar errores de jugadores eventuales (pueden ser duplicados)
            }
        }
    }

    /**
     * Migra la configuración (próximo seleccionador)
     */
    async migrateSettings(proximoSeleccionador, day) {
        try {
            console.log(`\n⚙️  Configurando próximo seleccionador de ${day}: ${proximoSeleccionador}`);

            // Verificar si ya existe configuración para este día
            const { data: existing, error: selectError } = await this.supabase
                .from('settings')
                .select('id')
                .eq('day', day)
                .maybeSingle();

            if (selectError) {
                console.warn(`  ⚠️  Error verificando settings:`, selectError.message);
            }

            if (existing) {
                // Actualizar
                const { error } = await this.supabase
                    .from('settings')
                    .update({ next_selector: proximoSeleccionador })
                    .eq('day', day);

                if (error) throw error;
                console.log(`  ✏️  Actualizado próximo seleccionador`);
            } else {
                // Insertar
                const { error } = await this.supabase
                    .from('settings')
                    .insert({
                        day: day,
                        next_selector: proximoSeleccionador
                    });

                if (error) throw error;
                console.log(`  ✅ Insertada configuración`);
            }

            this.stats.settingsInserted++;
        } catch (error) {
            console.error(`  ❌ Error con settings:`, error.message);
        }
    }

    /**
     * Ejecuta la migración completa
     */
    async migrate() {
        console.log('🚀 Iniciando migración de datos a Supabase...\n');
        console.log('⏳ Este proceso puede tomar unos minutos...\n');

        try {
            // Cargar datos de Martes
            console.log('📥 Cargando FutsalStatsMartes.json...');
            const martesData = await this.loadJSON('data/FutsalStatsMartes.json');
            
            if (martesData) {
                // Migrar jugadores fijos de martes
                await this.migratePlayers(martesData.fijos, 'martes');
                
                // Migrar partidos de martes
                console.log(`\n⚽ Migrando ${martesData.matches.length} partidos de martes...`);
                for (const match of martesData.matches) {
                    await this.migrateMatch(match, 'martes');
                }
                
                // Migrar configuración de martes
                await this.migrateSettings(martesData.proximoSeleccionador, 'martes');
            }

            // Cargar datos de Jueves
            console.log('\n📥 Cargando FutsalStatsJueves.json...');
            const juevesData = await this.loadJSON('data/FutsalStatsJueves.json');
            
            if (juevesData) {
                // Migrar jugadores fijos de jueves
                await this.migratePlayers(juevesData.fijos, 'jueves');
                
                // Migrar partidos de jueves
                console.log(`\n⚽ Migrando ${juevesData.matches.length} partidos de jueves...`);
                for (const match of juevesData.matches) {
                    await this.migrateMatch(match, 'jueves');
                }
                
                // Migrar configuración de jueves
                await this.migrateSettings(juevesData.proximoSeleccionador, 'jueves');
            }

            // Mostrar resumen
            this.showSummary();

        } catch (error) {
            console.error('❌ Error durante la migración:', error);
        }
    }

    /**
     * Muestra un resumen de la migración
     */
    showSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE MIGRACIÓN');
        console.log('='.repeat(60));
        console.log(`✅ Jugadores insertados/actualizados: ${this.stats.playersInserted}`);
        console.log(`❌ Jugadores con error: ${this.stats.playersFailed}`);
        console.log(`✅ Partidos insertados: ${this.stats.matchesInserted}`);
        console.log(`❌ Partidos con error: ${this.stats.matchesFailed}`);
        console.log(`✅ Configuraciones insertadas: ${this.stats.settingsInserted}`);
        console.log('='.repeat(60));
        
        if (this.stats.playersFailed === 0 && this.stats.matchesFailed === 0) {
            console.log('\n🎉 ¡Migración completada exitosamente!');
            console.log('💡 Ahora puedes recargar la aplicación y verificar que todo funcione correctamente.');
        } else {
            console.log('\n⚠️  Migración completada con algunos errores.');
            console.log('💡 Revisa los mensajes de error arriba para más detalles.');
        }
    }

    /**
     * Limpia todos los datos de Supabase (USAR CON CUIDADO)
     */
    async clearAllData() {
        console.log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de Supabase');
        console.log('⏳ Limpiando datos en 3 segundos...');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
            // Eliminar matches
            const { error: matchesError } = await this.supabase
                .from('matches')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

            if (matchesError) throw matchesError;
            console.log('✅ Matches eliminados');

            // Eliminar players
            const { error: playersError } = await this.supabase
                .from('players')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

            if (playersError) throw playersError;
            console.log('✅ Players eliminados');

            // Eliminar settings
            const { error: settingsError } = await this.supabase
                .from('settings')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos

            if (settingsError) throw settingsError;
            console.log('✅ Settings eliminados');

            console.log('\n🗑️  Todos los datos han sido eliminados');
        } catch (error) {
            console.error('❌ Error limpiando datos:', error);
        }
    }
}

// Función helper para ejecutar desde la consola
window.migrateData = async function() {
    const migration = new DataMigration();
    await migration.migrate();
};

// Función helper para limpiar datos (USAR CON CUIDADO)
window.clearSupabaseData = async function() {
    const migration = new DataMigration();
    await migration.clearAllData();
};

// Auto-ejecutar si se importa como módulo
if (import.meta.url === window.location.href) {
    const migration = new DataMigration();
    migration.migrate();
}

console.log('📦 Script de migración cargado');
console.log('💡 Para ejecutar la migración, escribe en la consola: migrateData()');
console.log('⚠️  Para limpiar todos los datos, escribe: clearSupabaseData()');

export default DataMigration;
