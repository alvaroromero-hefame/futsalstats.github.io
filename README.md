# Futsal Stats

Aplicación web para gestionar estadísticas de partidos de fútbol sala.

## 📁 Estructura del Proyecto

```
futsalstats.github.io/
├── index.html                 # Página principal
├── data/                      # Datos JSON
│   ├── FutsalStatsMartes.json
│   └── FutsalStatsJueves.json
├── css/                       # Estilos modulares
│   ├── main.css              # Estilos generales y base
│   ├── sidebar.css           # Estilos del menú lateral
│   ├── tables.css            # Estilos de tablas y estadísticas
│   └── mobile.css            # Estilos responsive para móviles
├── js/                        # JavaScript modular
│   ├── main.js               # Punto de entrada principal
│   ├── dataManager.js        # Gestión de datos
│   ├── ui/                   # Módulos de interfaz
│   │   ├── sidebar.js        # Gestión del menú lateral
│   │   ├── clasificacion.js  # Vista de clasificación
│   │   ├── historico.js      # Vista de histórico de partidos
│   │   └── estadisticas.js   # Vista de estadísticas
│   └── utils/                # Utilidades
│       ├── calculations.js   # Funciones de cálculo
│       └── rendering.js      # Funciones de renderizado
└── README.md                  # Este archivo
```

## 🎯 Características

- **Clasificación**: Ranking de jugadores con puntuación basada en victorias, goles, asistencias y MVPs
- **Histórico**: Registro completo de todos los partidos con filtros de búsqueda
- **Estadísticas**: Análisis de datos como goleadores, asistencias y victorias
- **Responsive**: Diseño adaptado para móviles, tablets y escritorio
- **Selector de días**: Soporte para ligas de Martes y Jueves

## 🏗️ Arquitectura

### Módulos Principales

#### `dataManager.js`
Gestiona la carga y acceso a los datos desde archivos JSON.
- Carga asíncrona de datos
- Gestión del día actual seleccionado (Martes/Jueves)
- Verificación de estado de carga

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

- **🟢 Supabase (preferido)**: Base de datos en la nube con sincronización en tiempo real
- **🟡 JSON Local (fallback)**: Archivos locales como respaldo

La aplicación detecta automáticamente la mejor fuente disponible y muestra un indicador visual en la esquina inferior derecha.

### 🔄 Comportamiento Automático

```
Intenta Supabase → ✅ Éxito: Usa Supabase
                 → ❌ Fallo: Usa JSON Local
```

Para más detalles, consulta: **[`DATASOURCE.md`](DATASOURCE.md )**

## 💻 Tecnologías

- **HTML5**
- **CSS3** (con diseño responsive)
- **JavaScript ES6+** (módulos)
- **Fetch API** para carga de datos
- **Supabase** (base de datos en la nube - opcional)

## 🔌 Integración con Supabase

La aplicación está integrada con Supabase para almacenamiento de datos en la nube. La configuración se encuentra en `js/config.js`.

### Características de Supabase:
- 🌐 Base de datos PostgreSQL en la nube
- 🔄 Sincronización en tiempo real (disponible)
- 🔒 Row Level Security para seguridad
- 📊 Almacenamiento persistente de partidos

**Modo fallback**: Si Supabase no está disponible, la aplicación funciona con archivos JSON locales.

Ver [SUPABASE.md](SUPABASE.md) para más información sobre la integración.

## 🚀 Uso

1. Abre `index.html` en un navegador web
2. Los datos se cargan automáticamente desde la carpeta `data/`
3. Navega entre las diferentes secciones usando el menú lateral

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
