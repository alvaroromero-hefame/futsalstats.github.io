# Integración con Supabase

## 🔌 Configuración

La aplicación ahora está integrada con Supabase para almacenamiento de datos en la nube.

### Credenciales

Las credenciales están configuradas en `js/config.js`:

```javascript
export const config = {
    supabase: {
        url: 'https://nqqbeuweyxatsxjsepnj.supabase.co',
        anonKey: 'tu-anon-key-aqui'
    }
};
```

> **Nota**: La `anonKey` es segura para uso en el frontend ya que tiene Row Level Security (RLS) configurado en Supabase.

## 📊 Estructura de Base de Datos

### Tabla: `matches`

Almacena todos los partidos jugados.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL,
  day VARCHAR(10) NOT NULL, -- 'martes' o 'jueves'
  mvp VARCHAR(100),
  result VARCHAR(20) NOT NULL, -- 'VictoryRed', 'VictoryBlue', 'Draw'
  blue_result INTEGER NOT NULL,
  red_result INTEGER NOT NULL,
  blue_lineup JSONB NOT NULL,
  red_lineup JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla: `players`

Almacena información de los jugadores.

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  is_fixed BOOLEAN DEFAULT FALSE,
  day VARCHAR(10), -- 'martes', 'jueves', o 'ambos'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabla: `settings`

Configuración global de la liga.

```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day VARCHAR(10) NOT NULL UNIQUE,
  next_selector VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Row Level Security (RLS)

### Políticas recomendadas

```sql
-- Permitir lectura pública de partidos
CREATE POLICY "Allow public read access on matches"
ON matches FOR SELECT
TO anon
USING (true);

-- Permitir lectura pública de jugadores
CREATE POLICY "Allow public read access on players"
ON players FOR SELECT
TO anon
USING (true);

-- Solo usuarios autenticados pueden insertar/actualizar
CREATE POLICY "Authenticated users can insert matches"
ON matches FOR INSERT
TO authenticated
WITH CHECK (true);
```

## 🚀 Uso en la Aplicación

### Verificación de Conexión

Al iniciar la aplicación, se verifica la conexión a Supabase:

```javascript
const supabaseConnected = await this.initSupabase();
if (supabaseConnected) {
    console.log('✅ Conexión a Supabase establecida');
} else {
    console.log('⚠️ Usando datos locales (JSON)');
}
```

### Acceso al Cliente

El cliente de Supabase está disponible en la instancia de `FutsalApp`:

```javascript
// Obtener partidos
const { data, error } = await app.supabase
    .from('matches')
    .select('*')
    .eq('day', 'martes');

// Insertar partido
const { data, error } = await app.supabase
    .from('matches')
    .insert({
        match_date: '2025-10-30',
        day: 'martes',
        mvp: 'Alvaro',
        result: 'VictoryRed',
        // ... más datos
    });
```

## 📝 Migración de Datos JSON a Supabase

### Script de Migración

Crear un script para migrar los datos existentes de JSON a Supabase:

```javascript
// migrate-to-supabase.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(URL, KEY);

async function migrateData() {
    // Leer datos JSON
    const martesData = JSON.parse(fs.readFileSync('data/FutsalStatsMartes.json'));
    const juevesData = JSON.parse(fs.readFileSync('data/FutsalStatsJueves.json'));
    
    // Migrar jugadores fijos
    const allPlayers = new Set([...martesData.fijos, ...juevesData.fijos]);
    for (const player of allPlayers) {
        await supabase.from('players').insert({
            name: player,
            is_fixed: true,
            day: 'ambos'
        });
    }
    
    // Migrar partidos de martes
    for (const match of martesData.matches) {
        await supabase.from('matches').insert({
            match_date: match.matchDate,
            day: 'martes',
            mvp: match.mvp,
            result: match.result,
            blue_result: match.teams[0].blue[0].result,
            red_result: match.teams[0].red[0].result,
            blue_lineup: match.teams[0].blue[0].lineup[0].member,
            red_lineup: match.teams[0].red[0].lineup[0].member
        });
    }
    
    // Similar para jueves...
}
```

## 🔄 Sincronización Bidireccional

### Modo Offline

La aplicación puede funcionar sin conexión usando los archivos JSON locales como fallback:

```javascript
async loadData() {
    if (this.supabase) {
        // Intentar cargar desde Supabase
        const { data, error } = await this.supabase
            .from('matches')
            .select('*');
            
        if (!error) {
            return data;
        }
    }
    
    // Fallback a JSON local
    return fetch('data/FutsalStatsMartes.json').then(res => res.json());
}
```

## 🎯 Próximos Pasos

1. **Crear las tablas en Supabase Dashboard**
   - SQL Editor > New Query
   - Copiar y ejecutar los CREATE TABLE de arriba

2. **Configurar RLS**
   - Authentication > Policies
   - Añadir las políticas mencionadas

3. **Migrar datos existentes**
   - Ejecutar script de migración
   - Verificar que los datos se insertaron correctamente

4. **Actualizar DataManager**
   - Modificar `dataManager.js` para usar Supabase como fuente primaria
   - Mantener JSON como fallback

5. **Implementar funcionalidades de escritura**
   - Formulario para añadir nuevos partidos
   - Gestión de jugadores fijos
   - Actualización de próximo seleccionador

## 🛠️ Comandos Útiles

### Consultar todos los partidos

```javascript
const { data } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: false });
```

### Consultar estadísticas de un jugador

```javascript
const { data } = await supabase
    .rpc('get_player_stats', { player_name: 'Alvaro' });
```

### Insertar nuevo partido

```javascript
const { data, error } = await supabase
    .from('matches')
    .insert({
        match_date: '2025-11-01',
        day: 'jueves',
        mvp: 'Carlos',
        result: 'VictoryBlue',
        blue_result: 7,
        red_result: 5,
        blue_lineup: [...],
        red_lineup: [...]
    });
```

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
