
document.addEventListener('DOMContentLoaded', function() {
	const sidebar = document.getElementById('sidebar');
	const toggleBtn = document.getElementById('toggleBtn');
	const mainContent = document.getElementById('main-content');
	const menuClasificacion = document.getElementById('menu-clasificacion');
	const menuHistorico = document.getElementById('menu-historico');
	const mobileBackdrop = document.getElementById('mobile-backdrop');

	let futsalData = null;
	let isMobile = window.innerWidth <= 768;

	// Cargar JSON
	fetch('FutsalStatsMartes.json')
		.then(res => res.json())
		.then(data => {
			futsalData = data;
			mostrarClasificacion();
		});

	// Function to check if device is mobile
	function checkMobile() {
		isMobile = window.innerWidth <= 768;
	}

	// Toggle sidebar
	toggleBtn.addEventListener('click', function() {
		if (isMobile) {
			sidebar.classList.toggle('mobile-open');
			mobileBackdrop.classList.toggle('active');
			document.body.style.overflow = sidebar.classList.contains('mobile-open') ? 'hidden' : '';
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

	function mostrarClasificacion() {
		if (!futsalData) {
			mainContent.innerHTML = '<p>Cargando datos...</p>';
			return;
		}
		const matches = futsalData.matches;
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
			if (match.mvp && match.mvp.trim() !== '') {
				if (!jugadores[match.mvp]) {
					jugadores[match.mvp] = { puntos: 0, goles: 0, encajados: 0, ganados: 0, empatados: 0, perdidos: 0, mvps: 0 };
				}
				if (jugadores[match.mvp].mvps === undefined) jugadores[match.mvp].mvps = 0;
				jugadores[match.mvp].mvps++;
			}

			// Procesar lineup azul
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
		const fijos = futsalData.fijos || [];

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
			if (fijos.includes(j.nombre)) {
				fijoIcon = '⭐';
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
				<td data-label="Jugador">${j.nombre} ${icono} ${fijoIcon}</td>
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
			</ul>
		</div>`;
		mainContent.innerHTML = html;
	}

	function mostrarHistorico() {
		if (!futsalData) {
			mainContent.innerHTML = '<p>Cargando datos...</p>';
			return;
		}
		const matches = futsalData.matches;

		// Filtros
		mainContent.innerHTML = `
			<h2>Histórico</h2>
			<div class="filters">
				<input type="date" id="filter-fecha" placeholder="Fecha">
				<input type="text" id="filter-mvp" placeholder="MVP">
				<input type="text" id="filter-lineup" placeholder="Integrante">
				<button id="filter-btn">Buscar</button>
			</div>
			<div id="historico-table"></div>
			<div id="detalle-match"></div>
		`;

		renderTable(matches);

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
					ok = ok && match.mvp.toLowerCase().includes(mvp);
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
				<td data-label="MVP">${match.mvp}</td>
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
		const fijos = futsalData.fijos || [];
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
});
