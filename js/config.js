/**
 * Configuración de la aplicación
 * 
 * IMPORTANTE: Este archivo contiene configuraciones sensibles.
 * En producción, estas variables deberían estar en variables de entorno.
 */

export const config = {
    // Configuración de Supabase
    supabase: {
        url: 'https://nqqbeuweyxatsxjsepnj.supabase.co',
        // Supabase Anon Key (pública, segura para usar en el frontend)
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcWJldXdleXhhdHN4anNlcG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NzE0ODEsImV4cCI6MjA3NzM0NzQ4MX0.ZWrWEX9_55wIeew8p4Ar0zojHUMf7_2mtsuNI4aws_Y'
    },
    
    // Rutas de datos locales (fallback)
    data: {
        martesUrl: 'data/FutsalStatsMartes.json',
        juevesUrl: 'data/FutsalStatsJueves.json'
    },
    
    // Configuración de la aplicación
    app: {
        defaultDay: 'martes',
        version: '2.0.0'
    }
};

// Validar configuración
export function validateConfig() {
    const errors = [];
    
    if (!config.supabase.url) {
        errors.push('Supabase URL no configurada');
    }
    
    if (config.supabase.anonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        console.warn('⚠️ Supabase Anon Key no configurada. La aplicación funcionará con datos locales.');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}
