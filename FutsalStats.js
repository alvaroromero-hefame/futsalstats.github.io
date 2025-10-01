
document.addEventListener('DOMContentLoaded', function() {
	const sidebar = document.getElementById('sidebar');
	const toggleBtn = document.getElementById('toggleBtn');
	const mainContent = document.getElementById('main-content');
	const menuClasificacion = document.getElementById('menu-clasificacion');
	const menuHistorico = document.getElementById('menu-historico');

	let futsalData = null;

	// Cargar JSON
	fetch('FutsalStatsMartes.json')
		.then(res => res.json())
		.then(data => {
			futsalData = data;
			mostrarClasificacion();
		});

	// Toggle sidebar
	toggleBtn.addEventListener('click', function() {
		sidebar.classList.toggle('collapsed');
		mainContent.classList.toggle('collapsed');
	});

	// Navegación
	menuClasificacion.addEventListener('click', function(e) {
		e.preventDefault();
		mostrarClasificacion();
	});

	menuHistorico.addEventListener('click', function(e) {
		e.preventDefault();
		mostrarHistorico();
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
		<table class="tabla-historico"><thead><tr><th>Posición</th><th>Jugador</th><th>Puntos</th><th>Goles</th><th>Encajados</th><th>Ganados</th><th>Empatados</th><th>Perdidos</th><th>MVPs</th></tr></thead><tbody>`;
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
				<td>${idx + 1}</td>
				<td>${j.nombre} ${icono} ${fijoIcon}</td>
				<td>${j.puntos.toFixed(2)}</td>
				<td>${j.goles}</td>
				<td>${j.encajados}</td>
				<td>${j.ganados}</td>
				<td>${j.empatados}</td>
				<td>${j.perdidos}</td>
				<td>${j.mvps || 0}</td>
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
				<td>${fecha}</td>
				<td>${resultado}</td>
				<td>${match.mvp}</td>
				<td><button class="detalle-btn" data-idx="${idx}">Ver detalle</button></td>
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
