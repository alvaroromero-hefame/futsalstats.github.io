document.addEventListener('DOMContentLoaded', function() {
	const sidebar = document.getElementById('sidebar');
	const toggleBtn = document.getElementById('toggleBtn');
	const mainContent = document.getElementById('main-content');
	const menuClasificacion = document.getElementById('menu-clasificacion');
	const menuHistorico = document.getElementById('menu-historico');
	const mobileBackdrop = document.getElementById('mobile-backdrop');

	let futsalData = null;
	let futsalDataJueves = null;
	let currentDay = 'martes'; // 'martes' o 'jueves'
	let isMobile = window.innerWidth <= 768;

	// Cargar ambos JSONs
	Promise.all([
		fetch('FutsalStatsMartes.json').then(res => res.json()),
		fetch('FutsalStatsJueves.json').then(res => res.json()).catch(() => null)
	]).then(([dataMartes, dataJueves]) => {
		futsalData = dataMartes;
		futsalDataJueves = dataJueves;
		mostrarClasificacion();
	});

	// Function to check if device is mobile
	function checkMobile() {
		isMobile = window.innerWidth <= 768;
		if (isMobile) {
			document.body.classList.add('mobile-device');
		} else {
			document.body.classList.remove('mobile-device');
		}
	}
	
	// Initial mobile check
	checkMobile();

	// Toggle sidebar
	toggleBtn.addEventListener('click', function(e) {
		e.preventDefault();
		e.stopPropagation();
		
		if (isMobile) {
			const isOpen = sidebar.classList.contains('mobile-open');
			if (isOpen) {
				sidebar.classList.remove('mobile-open');
				mobileBackdrop.classList.remove('active');
				document.body.style.overflow = '';
			} else {
				sidebar.classList.add('mobile-open');
				mobileBackdrop.classList.add('active');
				document.body.style.overflow = 'hidden';
			}
		} else {
			sidebar.classList.toggle('collapsed');
		}
	});

	// Close mobile menu when clicking backdrop
	mobileBackdrop.addEventListener('click', function() {
		sidebar.classList.remove('mobile-open');
		mobileBackdrop.classList.remove('active');
		document.body.style.overflow = '';
	});

	// Close mobile menu when clicking menu items
	function closeMobileMenu() {
		if (isMobile) {
			sidebar.classList.remove('mobile-open');
			mobileBackdrop.classList.remove('active');
			document.body.style.overflow = '';
		}
	}

	// Handle window resize
	window.addEventListener('resize', function() {
		checkMobile();
		if (!isMobile) {
			sidebar.classList.remove('mobile-open');
			mobileBackdrop.classList.remove('active');
			document.body.style.overflow = '';
		}
	});

	// Touch gesture support for mobile sidebar
	let touchStartX = 0;
	let touchStartY = 0;
	let touchEndX = 0;
	let touchEndY = 0;

	// Add touch event listeners for mobile swipe gestures
	document.addEventListener('touchstart', function(e) {
		if (!isMobile) return;
		touchStartX = e.changedTouches[0].screenX;
		touchStartY = e.changedTouches[0].screenY;
	});

	document.addEventListener('touchend', function(e) {
		if (!isMobile) return;
		touchEndX = e.changedTouches[0].screenX;
		touchEndY = e.changedTouches[0].screenY;
		handleSwipeGesture();
	});

	function handleSwipeGesture() {
		const swipeThreshold = 50;
		const swipeDistanceX = touchEndX - touchStartX;
		const swipeDistanceY = Math.abs(touchEndY - touchStartY);
		
		// Only trigger if horizontal swipe is greater than vertical
		if (Math.abs(swipeDistanceX) > swipeThreshold && swipeDistanceY < 100) {
			if (swipeDistanceX > 0 && touchStartX < 50) {
				// Swipe right from left edge - open sidebar
				sidebar.classList.add('mobile-open');
				mobileBackdrop.classList.add('active');
				document.body.style.overflow = 'hidden';
			} else if (swipeDistanceX < 0 && sidebar.classList.contains('mobile-open')) {
				// Swipe left when sidebar is open - close sidebar
				sidebar.classList.remove('mobile-open');
				mobileBackdrop.classList.remove('active');
				document.body.style.overflow = '';
			}
		}
	}

	// Prevent scroll when sidebar is open on mobile
	document.addEventListener('touchmove', function(e) {
		if (isMobile && sidebar.classList.contains('mobile-open')) {
			e.preventDefault();
		}
	}, { passive: false });

	// Navegación
	menuClasificacion.addEventListener('click', function(e) {
		e.preventDefault();
		mostrarClasificacion();
		closeMobileMenu();
	});

	menuHistorico.addEventListener('click', function(e) {
		e.preventDefault();
		mostrarHistorico();
		closeMobileMenu();
	});

	// Función para obtener los datos del día actual
	function getCurrentData() {
		return currentDay === 'martes' ? futsalData : futsalDataJueves;
	}



	function mostrarClasificacion() {
		const data = getCurrentData();
		if (!data) {
			mainContent.innerHTML = '<p>Cargando datos...</p>';
			return;
		}
		const matches = data.matches;
		// Acumular puntos por jugador
	const jugadores = {};
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
			if (!jugadores[match.mvp]) {
				jugadores[match.mvp] = { puntos: 0, goles: 0, encajados: 0, ganados: 0, empatados: 0, perdidos: 0, mvps: 0 };
			}
			if (jugadores[match.mvp].mvps === undefined) jugadores[match.mvp].mvps = 0;
			jugadores[match.mvp].mvps++;
		}			// Procesar lineup azul
			match.teams[0].blue[0].lineup[0].member.forEach(m => {
				if (!jugadores[m.name]) {
					jugadores[m.name] = { puntos: 0, goles: 0, encajados: 0, ganados: 0, empatados: 0, perdidos: 0, mvps: 0 };
				}
				// Puntos por victoria/empate
				jugadores[m.name].puntos += puntosBlue;
				// Goles
				jugadores[m.name].puntos += m.goal * 0.25;
				jugadores[m.name].goles += m.goal;
				// Encajados
				jugadores[m.name].puntos += (m.keeper ? m.keeper : 0) * -0.25;
				jugadores[m.name].encajados += (m.keeper ? m.keeper : 0);
				// Contar partidos
				if (resultadoBlue === 'G') jugadores[m.name].ganados++;
				if (resultadoBlue === 'E') jugadores[m.name].empatados++;
				if (resultadoBlue === 'P') jugadores[m.name].perdidos++;
			});
			// Procesar lineup rojo
			match.teams[0].red[0].lineup[0].member.forEach(m => {
				if (!jugadores[m.name]) {
					jugadores[m.name] = { puntos: 0, goles: 0, encajados: 0, ganados: 0, empatados: 0, perdidos: 0, mvps: 0 };
				}
				// Puntos por victoria/empate
				jugadores[m.name].puntos += puntosRed;
				// Goles
				jugadores[m.name].puntos += m.goal * 0.25;
				jugadores[m.name].goles += m.goal;
				// Encajados
				jugadores[m.name].puntos += (m.keeper ? m.keeper : 0) * -0.25;
				jugadores[m.name].encajados += (m.keeper ? m.keeper : 0);
				// Contar partidos
				if (resultadoRed === 'G') jugadores[m.name].ganados++;
				if (resultadoRed === 'E') jugadores[m.name].empatados++;
				if (resultadoRed === 'P') jugadores[m.name].perdidos++;
			});
		});

		// Sumar 1 punto por cada MVP
		Object.values(jugadores).forEach(j => {
			if (j.mvps) {
				j.puntos += j.mvps;
			}
		});

		// Obtener lista de fijos
		const fijos = data.fijos || [];
		
		// Asegurar que todos los jugadores fijos estén en la lista, incluso si no han jugado
		fijos.forEach(fijoName => {
			if (!jugadores[fijoName]) {
				jugadores[fijoName] = { 
					puntos: 0, 
					goles: 0, 
					encajados: 0, 
					ganados: 0, 
					empatados: 0, 
					perdidos: 0, 
					mvps: 0 
				};
			}
		});

		// Ordenar por puntos
		const clasificacion = Object.entries(jugadores)
			.map(([nombre, datos]) => ({ nombre, ...datos }))
			.sort((a, b) => b.puntos - a.puntos);

		// Renderizar tabla
		let html = `<h2>Clasificación Liga</h2>
		<table class="tabla-historico tabla-clasificacion"><thead><tr><th>Posición</th><th>Jugador</th><th>Puntos</th><th>Goles</th><th>Encajados</th><th>Ganados</th><th>Empatados</th><th>Perdidos</th><th>MVPs</th></tr></thead><tbody>`;
		clasificacion.forEach((j, idx) => {
			let clase = '';
			let icono = '';
			let fijoIcon = '';
			let selectorIcon = '';
			
			if (fijos.includes(j.nombre)) {
				fijoIcon = '⭐';
			}
			
			// Ícono del próximo seleccionador
			if (data.proximoSeleccionador && j.nombre === data.proximoSeleccionador) {
				selectorIcon = '⚽';
			}
			
			if (idx === 0) {
				clase = 'primero';
				icono = '🏆';
			}
			if (idx === clasificacion.length - 1) {
				clase = 'ultimo';
				icono = '😭';
			}
			html += `<tr class="${clase}">
				<td data-label="Posición">${idx + 1}</td>
				<td data-label="Jugador">${j.nombre} ${icono} ${fijoIcon} ${selectorIcon}</td>
				<td data-label="Puntos">${j.puntos.toFixed(2)}</td>
				<td data-label="Goles">${j.goles}</td>
				<td data-label="Encajados">${j.encajados}</td>
				<td data-label="Ganados">${j.ganados}</td>
				<td data-label="Empatados">${j.empatados}</td>
				<td data-label="Perdidos">${j.perdidos}</td>
				<td data-label="MVPs">${j.mvps || 0}</td>
			</tr>`;
		});
		html += '</tbody></table>';
		html += `<div class="leyenda-clasificacion">
			<h3>Criterios de puntuación</h3>
			<ul>
				<li>Victoria: +3 puntos a cada jugador del equipo ganador</li>
				<li>Empate: +1 punto a cada jugador de ambos equipos</li>
				<li>Gol marcado: +0.25 puntos por cada gol</li>
				<li>Gol encajado: -0.25 puntos por cada gol encajado</li>
				<li>MVP: +1 punto adicional por cada vez que ha sido MVP</li>
				<li>⭐ Jugador fijo</li>
				<li>⚽ Próximo seleccionador</li>
			</ul>
		</div>`;
		
		// Añadir botones de cambio de día
		const dayButtons = `
			<div class="day-selector" style="text-align: center; margin: 20px 0;">
				<button id="btn-martes-class" class="${currentDay === 'martes' ? 'active' : ''}" style="margin: 0 10px; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; background: ${currentDay === 'martes' ? '#007bff' : '#f0f0f0'}; color: ${currentDay === 'martes' ? 'white' : 'black'};">Martes</button>
				<button id="btn-jueves-class" class="${currentDay === 'jueves' ? 'active' : ''}" style="margin: 0 10px; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; background: ${currentDay === 'jueves' ? '#007bff' : '#f0f0f0'}; color: ${currentDay === 'jueves' ? 'white' : 'black'};">Jueves</button>
			</div>
		`;
		
		mainContent.innerHTML = dayButtons + html;
		
		// Añadir event listeners para los botones de cambio de día en clasificación
		const btnMartesClass = document.getElementById('btn-martes-class');
		const btnJuevesClass = document.getElementById('btn-jueves-class');
		
		if (btnMartesClass) {
			btnMartesClass.addEventListener('click', function() {
				cambiarDiaClasificacion('martes');
			});
		}
		
		if (btnJuevesClass) {
			btnJuevesClass.addEventListener('click', function() {
				cambiarDiaClasificacion('jueves');
			});
		}
	}

	function cambiarDiaClasificacion(dia) {
		currentDay = dia;
		mostrarClasificacion(); // Volver a mostrar clasificación con el nuevo día
	}

	function mostrarHistorico() {
		const data = getCurrentData();
		if (!data) {
			mainContent.innerHTML = '<p>Cargando datos...</p>';
			return;
		}
		const matches = data.matches;

		// Filtros
		mainContent.innerHTML = `
			<h2>Histórico</h2>
			<div class="filters">
				<select id="filter-dia">
					<option value="todos">Todos los días</option>
					<option value="martes" ${currentDay === 'martes' ? 'selected' : ''}>Martes</option>
					<option value="jueves" ${currentDay === 'jueves' ? 'selected' : ''}>Jueves</option>
				</select>
				<input type="date" id="filter-fecha" placeholder="Fecha">
				<input type="text" id="filter-mvp" placeholder="MVP">
				<input type="text" id="filter-lineup" placeholder="Integrante">
				<button id="filter-btn">Buscar</button>
			</div>
			<div id="historico-table"></div>
			<div id="detalle-match"></div>
		`;

		renderTable(matches);

		// Event listener para el selector de día
		const filterDia = document.getElementById('filter-dia');
		if (filterDia) {
			filterDia.addEventListener('change', function() {
				const diaSeleccionado = this.value;
				if (diaSeleccionado !== 'todos') {
					currentDay = diaSeleccionado;
					mostrarHistorico(); // Recargar histórico con el nuevo día
				}
			});
		}

		document.getElementById('filter-btn').onclick = function() {
			const fecha = document.getElementById('filter-fecha').value;
			const mvp = document.getElementById('filter-mvp').value.toLowerCase();
			const lineup = document.getElementById('filter-lineup').value.toLowerCase();
			let filtered = matches.filter(match => {
				let ok = true;
				if (fecha) {
					ok = ok && match.matchDate.startsWith(fecha);
				}
				if (mvp) {
					ok = ok && match.mvp && match.mvp.trim() !== '-' && match.mvp.toLowerCase().includes(mvp);
				}
				if (lineup) {
					ok = ok && (
						getAllMembers(match).some(m => m.name.toLowerCase().includes(lineup))
					);
				}
				return ok;
			});
			renderTable(filtered);
			document.getElementById('detalle-match').innerHTML = '';
		};
	}

	function renderTable(matches) {
		const tableDiv = document.getElementById('historico-table');
		if (!matches.length) {
			tableDiv.innerHTML = '<p>No hay partidos que coincidan con la búsqueda.</p>';
			return;
		}
		let html = '<table class="tabla-historico"><thead><tr><th>Fecha</th><th>Resultado</th><th>MVP</th><th>Detalle</th></tr></thead><tbody>';
		matches.forEach((match, idx) => {
			let fechaObj;
			if (/^\d{4}-\d{2}-\d{2}$/.test(match.matchDate)) {
				// Formato YYYY-MM-DD
				const [y, m, d] = match.matchDate.split('-');
				fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
			} else {
				// Otros formatos
				fechaObj = new Date(match.matchDate);
			}
			const fecha = isNaN(fechaObj) ? match.matchDate : fechaObj.toLocaleDateString();
			const resultado = getResultado(match);
			html += `<tr>
				<td data-label="Fecha">${fecha}</td>
				<td data-label="Resultado">${resultado}</td>
				<td data-label="MVP">${match.mvp && match.mvp.trim() !== '-' ? match.mvp : 'Sin MVP'}</td>
				<td data-label="Detalle"><button class="detalle-btn" data-idx="${idx}">Ver detalle</button></td>
			</tr>`;
		});
		html += '</tbody></table>';
		tableDiv.innerHTML = html;

		// Botones detalle
		document.querySelectorAll('.detalle-btn').forEach(btn => {
			btn.onclick = function() {
				const idx = btn.getAttribute('data-idx');
				mostrarDetalle(matches[idx]);
			};
		});
	}

	function getResultado(match) {
		// Asume solo un equipo azul y uno rojo
		const blue = match.teams[0].blue[0].result;
		const red = match.teams[0].red[0].result;
		return `Azul ${blue} - Rojo ${red}`;
	}

	function getAllMembers(match) {
		const blueMembers = match.teams[0].blue[0].lineup[0].member;
		const redMembers = match.teams[0].red[0].lineup[0].member;
		return [...blueMembers, ...redMembers];
	}

	function mostrarDetalle(match) {
		const detalleDiv = document.getElementById('detalle-match');
		const data = getCurrentData();
		const fijos = data ? data.fijos || [] : [];
		let html = `<h3>Lineup</h3><div class="lineup-container">`;
		html += `<div class="lineup-team blue-team"><h4>Azul</h4><ul>`;
		match.teams[0].blue[0].lineup[0].member.forEach(m => {
			let fijoIcon = fijos.includes(m.name) ? ' ⭐' : '';
			html += `<li>${m.name}${fijoIcon} (Goles: ${m.goal}, Encajados: ${m.keeper})</li>`;
		});
		html += `</ul></div>`;
		html += `<div class="lineup-team red-team"><h4>Rojo</h4><ul>`;
		match.teams[0].red[0].lineup[0].member.forEach(m => {
			let fijoIcon = fijos.includes(m.name) ? ' ⭐' : '';
			html += `<li>${m.name}${fijoIcon} (Goles: ${m.goal}, Encajados: ${m.keeper})</li>`;
		});
		html += `</ul></div>`;
		html += `</div>`;
		detalleDiv.innerHTML = html;
	}

	// Estadísticas
	document.addEventListener("DOMContentLoaded", () => {
		// Cargar datos del archivo JSON
		fetch("FutsalStatsMartes.json")
			.then(response => response.json())
			.then(data => {
				if (data.matches && data.matches.length > 0) {
					// Calcular estadísticas
					const totalGoles = calcularTotalGoles(data);
					const victorias = calcularVictorias(data);
					const topGoleadores = calcularTopGoleadores(data);
					const topEncajados = calcularTopEncajados(data);

					// Mostrar estadísticas
					document.getElementById("total-goles").textContent = totalGoles;
					renderizarGraficoVictorias(victorias);
					renderizarLista("top-goleadores", topGoleadores);
					renderizarLista("top-encajados", topEncajados);
				} else {
					mostrarDatosEjemplo();
				}
			})
			.catch(() => mostrarDatosEjemplo());
	});

	function mostrarDatosEjemplo() {
		document.getElementById("total-goles").textContent = 50;
		renderizarGraficoVictorias({ red: 25, blue: 25 });
		renderizarLista("top-goleadores", ["Jugador 1 (10)", "Jugador 2 (8)", "Jugador 3 (7)"]);
		renderizarLista("top-encajados", ["Jugador A (15)", "Jugador B (12)", "Jugador C (10)"]);
	}

	function calcularTotalGoles(data) {
		return data.matches.reduce((total, match) => {
			const golesAzules = match.teams.blue[0].lineup.reduce((sum, player) => sum + player.goal, 0);
			const golesRojos = match.teams.red[0].lineup.reduce((sum, player) => sum + player.goal, 0);
			return total + golesAzules + golesRojos;
		}, 0);
	}

	function calcularVictorias(data) {
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

	function calcularTopGoleadores(data) {
    const goleadores = {};

    // Recorrer los partidos y sumar los goles de cada jugador
    data.matches.forEach(match => {
        match.teams.blue[0].lineup.forEach(player => {
            if (!goleadores[player.name]) {
                goleadores[player.name] = 0;
            }
            goleadores[player.name] += player.goal;
        });

        match.teams.red[0].lineup.forEach(player => {
            if (!goleadores[player.name]) {
                goleadores[player.name] = 0;
            }
            goleadores[player.name] += player.goal;
        });
    });

    // Ordenar los jugadores por goles y devolver el top 3 (incluyendo empates)
    const sorted = Object.entries(goleadores).sort((a, b) => b[1] - a[1]);
    const top = [];
    let rank = 1;

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
            rank++;
        }
        if (rank > 3) break;
        top.push(`${sorted[i][0]} (${sorted[i][1]})`);
    }

    return top;
}

	function calcularTopEncajados(data) {
		const encajados = {};
		data.matches.forEach(match => {
			match.teams.blue[0].lineup.concat(match.teams.red[0].lineup).forEach(player => {
				if (!encajados[player.name]) {
					encajados[player.name] = 0;
				}
				encajados[player.name] += player.keeper;
			});
		});
		return obtenerTop(encajados);
	}

	function obtenerTop(obj) {
		const sorted = Object.entries(obj).sort((a, b) => b[1] - a[1]);
		const top = [];
		let rank = 1;
		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
				rank++;
			}
			if (rank > 3) break;
			top.push(`${sorted[i][0]} (${sorted[i][1]})`);
		}
		return top;
	}

function renderizarGraficoVictorias(victorias) {
    // Obtener los datos de victorias desde el JSON
    const victoriasTexto = `<span style='color: #36a2eb;'>${victorias.blue}</span> - <span style='color: #ff6384;'>${victorias.red}</span>`;

    // Buscar el contenedor de victorias
    const chartContainer = document.getElementById("victorias-display");
    if (chartContainer) {
        chartContainer.innerHTML = `<p style='fontSize: 2em; fontWeight: bold; textAlign: center;'>${victoriasTexto}</p>`;
    }
}	function renderizarLista(elementId, items) {
		const ul = document.getElementById(elementId);
		ul.innerHTML = "";
		items.forEach(item => {
			const li = document.createElement("li");
			li.textContent = item;
			ul.appendChild(li);
		});
	}

	// Agregar event listener para estadísticas
	const menuEstadisticas = document.getElementById('menu-estadisticas');
	if (menuEstadisticas) {
		menuEstadisticas.addEventListener('click', function(e) {
			e.preventDefault();
			mostrarEstadisticas();
		});
	}

	function mostrarEstadisticas() {
		// Ocultar contenido principal y mostrar estadísticas
		mainContent.innerHTML = '';
		
		// Crear contenedor de estadísticas
		const estadisticasContainer = document.createElement('div');
		estadisticasContainer.className = 'estadisticas-container';
		estadisticasContainer.innerHTML = `
			<h1>Estadísticas de la Temporada</h1>
			<div class="day-selector" style="text-align: center; margin: 20px 0;">
				<button id="btn-martes-stats" class="${currentDay === 'martes' ? 'active' : ''}" style="margin: 0 10px; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; background: ${currentDay === 'martes' ? '#007bff' : '#f0f0f0'}; color: ${currentDay === 'martes' ? 'white' : 'black'};">Martes</button>
				<button id="btn-jueves-stats" class="${currentDay === 'jueves' ? 'active' : ''}" style="margin: 0 10px; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; background: ${currentDay === 'jueves' ? '#007bff' : '#f0f0f0'}; color: ${currentDay === 'jueves' ? 'white' : 'black'};">Jueves</button>
			</div>
			${currentDay === 'jueves' ? `
			<div class="fila" style="justify-content: center;">
				<div class="columna izquierda" style="max-width: 400px;">
					<h2>💰 Recaudación</h2>
					<p id="contador-no-fijos" class="estadistica-grande" style="color: #f39c12;">Cargando...</p>
				</div>
			</div>
			` : ''}
			<div class="fila">
				<div class="columna izquierda">
					<h2>Número de Goles Totales</h2>
					<p id="total-goles" class="estadistica-grande">Cargando...</p>
				</div>
				<div class="columna derecha izquierda">
					<h2>Victorias</h2>
					<div id="victorias-display">Cargando...</div>
				</div>
			</div>
			<div class="fila">
				<div class="columna izquierda">
					<h2>Top 3 Goleadores</h2>
					<ul id="top-goleadores">Cargando...</ul>
				</div>
				<div class="columna derecha izquierda">
					<h2>Top 3 Encajados</h2>
					<ul id="top-encajados">Cargando...</ul>
				</div>
			</div>
		`;
		
		mainContent.appendChild(estadisticasContainer);
		
		// Añadir event listeners para los botones de cambio de día
		const btnMartes = document.getElementById('btn-martes-stats');
		const btnJueves = document.getElementById('btn-jueves-stats');
		
		if (btnMartes) {
			btnMartes.addEventListener('click', function() {
				cambiarDiaEstadisticas('martes');
			});
		}
		
		if (btnJueves) {
			btnJueves.addEventListener('click', function() {
				cambiarDiaEstadisticas('jueves');
			});
		}
		
		// Cargar los datos si ya están disponibles
		const data = getCurrentData();
		if (data) {
			cargarEstadisticas(data);
		}
	}

	function cambiarDiaEstadisticas(dia) {
		currentDay = dia;
		mostrarEstadisticas(); // Volver a mostrar estadísticas con el nuevo día
	}

	function cargarEstadisticas(data) {
		const totalGoles = calcularTotalGoles(data);
		const victorias = calcularVictorias(data);
		const topGoleadores = calcularTopGoleadores(data);
		const topEncajados = calcularTopEncajados(data);

		document.getElementById("total-goles").textContent = totalGoles;
		renderizarGraficoVictorias(victorias);
		renderizarLista("top-goleadores", topGoleadores);
		renderizarLista("top-encajados", topEncajados);

		// Si es jueves, calcular y mostrar contador de no fijos
		if (currentDay === 'jueves') {
			const contadorNoFijos = calcularContadorNoFijos(data);
			const contadorElement = document.getElementById("contador-no-fijos");
			if (contadorElement) {
				contadorElement.textContent = contadorNoFijos + "€";
			}
		}
	}

	// Funciones auxiliares para calcular estadísticas
	function calcularTotalGoles(data) {
		return data.matches.reduce((total, match) => {
			const teamsData = match.teams[0];
			const golesAzules = teamsData.blue[0].lineup[0].member.reduce((sum, player) => sum + player.goal, 0);
			const golesRojos = teamsData.red[0].lineup[0].member.reduce((sum, player) => sum + player.goal, 0);
			return total + golesAzules + golesRojos;
		}, 0);
	}

	function calcularVictorias(data) {
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

	function calcularTopGoleadores(data) {
		const goleadores = {};

		data.matches.forEach(match => {
			const teamsData = match.teams[0];
			
			// Procesar equipo azul
			teamsData.blue[0].lineup[0].member.forEach(player => {
				if (!goleadores[player.name]) {
					goleadores[player.name] = 0;
				}
				goleadores[player.name] += player.goal;
			});

			// Procesar equipo rojo
			teamsData.red[0].lineup[0].member.forEach(player => {
				if (!goleadores[player.name]) {
					goleadores[player.name] = 0;
				}
				goleadores[player.name] += player.goal;
			});
		});

		const sorted = Object.entries(goleadores).sort((a, b) => b[1] - a[1]);
		const top = [];
		let rank = 1;

		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
				rank++;
			}
			if (rank > 3) break;
			top.push(`${sorted[i][0]} (${sorted[i][1]})`);
		}

		return top;
	}

	function calcularTopEncajados(data) {
		const encajados = {};
		
		data.matches.forEach(match => {
			const teamsData = match.teams[0];
			
			// Procesar equipo azul
			teamsData.blue[0].lineup[0].member.forEach(player => {
				if (!encajados[player.name]) {
					encajados[player.name] = 0;
				}
				encajados[player.name] += player.keeper;
			});

			// Procesar equipo rojo
			teamsData.red[0].lineup[0].member.forEach(player => {
				if (!encajados[player.name]) {
					encajados[player.name] = 0;
				}
				encajados[player.name] += player.keeper;
			});
		});

		const sorted = Object.entries(encajados).sort((a, b) => b[1] - a[1]);
		const top = [];
		let rank = 1;

		for (let i = 0; i < sorted.length; i++) {
			if (i > 0 && sorted[i][1] < sorted[i - 1][1]) {
				rank++;
			}
			if (rank > 3) break;
			top.push(`${sorted[i][0]} (${sorted[i][1]})`);
		}

		return top;
	}

	function calcularContadorNoFijos(data) {
		// Obtener lista de jugadores fijos
		const fijos = data.fijos || [];
		const jugadoresNoFijos = new Set();

		// Recorrer todos los partidos para encontrar jugadores que no sean fijos
		data.matches.forEach(match => {
			const teamsData = match.teams[0];
			
			// Procesar equipo azul
			teamsData.blue[0].lineup[0].member.forEach(player => {
				if (!fijos.includes(player.name)) {
					jugadoresNoFijos.add(player.name);
				}
			});

			// Procesar equipo rojo
			teamsData.red[0].lineup[0].member.forEach(player => {
				if (!fijos.includes(player.name)) {
					jugadoresNoFijos.add(player.name);
				}
			});
		});

		return jugadoresNoFijos.size;
	}

	function renderizarGraficoVictorias(victorias) {
		const victoriasTexto = `<span style='color: #36a2eb;'>${victorias.blue}</span> - <span style='color: #ff6384;'>${victorias.red}</span>`;
		const chartContainer = document.getElementById("victorias-display");
		if (chartContainer) {
			chartContainer.innerHTML = `<p style='font-size: 2.5em; font-weight: bold; text-align: center;'>${victoriasTexto}</p>`;
		}
	}

	function renderizarLista(elementId, items) {
		const ul = document.getElementById(elementId);
		if (ul) {
			ul.innerHTML = "";
			items.forEach(item => {
				const li = document.createElement("li");
				li.textContent = item;
				ul.appendChild(li);
			});
		}
	}
});
