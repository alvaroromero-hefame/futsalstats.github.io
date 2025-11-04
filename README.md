# Futsal Stats

Aplicación web para gestionar estadísticas de partidos de fútbol sala con Supabase.

## 📁 Estructura del Proyecto

```
futsalstats.github.io/
├── index.html                 # Página principal
├── admin.html                 # Panel de administración
├── css/                       # Estilos modulares
│   ├── main.css              # Estilos generales y base
│   ├── sidebar.css           # Estilos del menú lateral
│   ├── tables.css            # Estilos de tablas y estadísticas
│   ├── mobile.css            # Estilos responsive para móviles
│   ├── player-stats.css      # Estilos para estadísticas de jugadores
│   ├── simulador.css         # Estilos para simulador de partidos
│   └── admin.css             # Estilos para panel de administración
├── js/                        # JavaScript modular
│   ├── main.js               # Punto de entrada principal
│   ├── config.js             # Configuración de Supabase
│   ├── dataManager.js        # Gestión de datos con Supabase
│   ├── ui/                   # Módulos de interfaz
│   │   ├── sidebar.js        # Gestión del menú lateral
│   │   ├── clasificacion.js  # Vista de clasificación
│   │   ├── historico.js      # Vista de histórico de partidos
│   │   ├── estadisticas.js   # Vista de estadísticas
│   │   ├── playerStats.js    # Estadísticas detalladas de jugador
│   │   └── simulador.js      # Simulador de partidos
│   ├── admin/                # Módulos de administración
│   │   ├── auth.js           # Autenticación
│   │   └── panel.js          # Panel de administración
│   └── utils/                # Utilidades
│       ├── calculations.js   # Funciones de cálculo
│       └── rendering.js      # Funciones de renderizado
└── README.md                  # Este archivo
```

## 🎯 Características

- **Clasificación**: Ranking de jugadores con puntuación basada en victorias, goles, asistencias y MVPs
- **Histórico**: Registro completo de todos los partidos con filtros de búsqueda
- **Estadísticas**: Análisis de datos como goleadores, asistencias y victorias
- **Simulador de Partidos**: Genera equipos equilibrados y predice resultados
- **Panel de Administración**: Gestión completa de partidos, jugadores y configuración
- **Supabase Backend**: Base de datos PostgreSQL en la nube
- **Responsive**: Diseño adaptado para móviles, tablets y escritorio
- **Selector de días**: Soporte para ligas de Martes y Jueves

## 🏗️ Arquitectura

### Módulos Principales

#### `dataManager.js`
Gestiona la carga y acceso a los datos desde Supabase.
- Carga de datos desde Supabase PostgreSQL
- Gestión del día actual seleccionado (Martes/Jueves)
- Transformación de datos al formato esperado por la aplicación

#### `calculations.js`
Contiene todas las funciones de cálculo de estadísticas:
- Clasificación de jugadores
- Totales de goles, victorias
- Top 3 de goleadores, asistencias y encajados
- Contador de participaciones de no fijos

#### `rendering.js`
Funciones reutilizables para generar HTML:
- Selector de días
- Formato de fechas
- Detalles de partidos
- Leyendas y listas

#### Vistas (ui/)

**`sidebar.js`**
- Gestión del menú lateral
- Soporte para gestos táctiles en móviles
- Comportamiento responsive

**`clasificacion.js`**
- Muestra el ranking de jugadores
- Calcula y presenta puntuaciones
- Indicadores visuales para primero/último

**`historico.js`**
- Lista de todos los partidos
- Filtros de búsqueda (fecha, MVP, jugador)
- Detalle de lineups por partido

**`estadisticas.js`**
- Estadísticas globales de la temporada
- Gráficos de victorias
- Tops de jugadores
- Recaudación (solo Jueves)

## 📊 Sistema de Datos

FutsalStats utiliza un **sistema híbrido inteligente**:

## � Fuente de Datos

La aplicación utiliza **Supabase** como fuente única de datos:

- **🟢 Supabase**: Base de datos PostgreSQL en la nube con sincronización en tiempo real

La aplicación requiere Supabase configurado correctamente en `js/config.js`.

Para más detalles sobre la configuración, consulta: **[`SUPABASE.md`](SUPABASE.md)**

## 💻 Tecnologías

- **HTML5**
- **CSS3** (con diseño responsive)
- **JavaScript ES6+** (módulos)
- **Supabase** (base de datos PostgreSQL en la nube)
- **Supabase Client Library** para comunicación con la base de datos

## 🔌 Integración con Supabase

La aplicación está completamente integrada con Supabase para almacenamiento y gestión de datos.

### Características:
- 🌐 Base de datos PostgreSQL en la nube
- 🔄 Datos en tiempo real
- 🔒 Row Level Security para seguridad
- 📊 Almacenamiento persistente de partidos, jugadores y configuración
- 🔐 Autenticación para panel de administración

### Configuración Requerida:

1. **Crea una cuenta en Supabase**: https://supabase.com
2. **Configura las credenciales** en `js/config.js`:
   ```javascript
   supabase: {
       url: 'https://tu-proyecto.supabase.co',
       anonKey: 'tu-anon-key-aqui'
   }
   ```
3. **Ejecuta los scripts SQL** en Supabase (ver `SUPABASE-SETUP.md`)

Ver [SUPABASE.md](SUPABASE.md) para documentación completa de la integración.

## 🚀 Uso

1. **Configurar Supabase** (ver sección anterior)
2. **Abrir la aplicación**: Abre `index.html` en un navegador web
3. **Navegación**: Usa el menú lateral para acceder a diferentes secciones
4. **Administración**: Accede a `admin.html` para gestionar datos (requiere autenticación)

## 📊 Criterios de Puntuación

- **Victoria**: +3 puntos por jugador
- **Empate**: +1 punto por jugador
- **Gol marcado**: +0.25 puntos
- **Asistencia**: +0.25 puntos
- **Gol encajado**: -0.25 puntos
- **MVP del partido**: +1 punto adicional

## 🔧 Desarrollo

### Añadir nuevos partidos

Edita los archivos JSON en `data/`:
- `FutsalStatsMartes.json` para la liga de los martes
- `FutsalStatsJueves.json` para la liga de los jueves

### Estructura de un partido

```json
{
  "matchDate": "2025-10-30",
  "mvp": "Nombre del MVP",
  "result": "VictoryRed",
  "teams": [
    {
      "red": [{
        "result": 8,
        "lineup": [{
          "member": [{
            "name": "Jugador",
            "goal": 3,
            "assist": 1,
            "keeper": 0
          }]
        }]
      }],
      "blue": [...]
    }
  ]
}
```

## 📱 Soporte Móvil

La aplicación está optimizada para dispositivos móviles con:
- Menú lateral deslizable
- Tablas adaptadas a formato de tarjetas
- Gestos táctiles (swipe)
- Botones de tamaño apropiado para touch

## 🎨 Personalización

### Modificar colores

Edita las variables en los archivos CSS correspondientes:
- `css/main.css` - Colores generales
- `css/tables.css` - Colores de tablas y estadísticas
- `css/sidebar.css` - Colores del menú

### Añadir nuevas vistas

1. Crea un nuevo archivo en `js/ui/`
2. Importa y registra la vista en `js/main.js`
3. Añade un enlace en el menú lateral en `index.html`

## 📄 Licencia

Este proyecto es de uso libre para la comunidad de futsal.
