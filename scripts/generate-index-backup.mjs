// ponytail: script puntual, ejecutar manualmente cuando haga falta re-congelar index-backup.html
// Genera index-backup.html: copia 100% estática de index.html con los datos ya calculados,
// sin fetch ni dependencia de Supabase. Node >=18 (fetch global).

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SUPABASE_URL = 'https://nqqbeuweyxatsxjsepnj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lo3mmXzOCwyfYg2NnMBS3Q_v2eCoVpO';
const MIN_GAMES_PORTERO = 3;

async function restGet(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
        }
    });
    if (!res.ok) throw new Error(`REST ${path} -> ${res.status} ${await res.text()}`);
    return res.json();
}

async function loadMatches(day) {
    return restGet(`matches?day=eq.${day}&order=match_date.asc&select=*`);
}

async function loadFijos(day) {
    const data = await restGet(`player_availability?day=eq.${day}&is_fixed=eq.true&select=players(name)`);
    return new Set((data || []).map(r => r.players?.name).filter(Boolean));
}

// ── Copiado tal cual de index.html (funciones puras) ──────────
function buildStats(matches) {
    const players = {};

    const ensure = (name) => {
        if (!players[name]) {
            players[name] = {
                nombre: name, puntos: 0, goles: 0, asistencias: 0,
                encajados: 0, ganados: 0, empatados: 0, perdidos: 0, mvps: 0
            };
        }
        return players[name];
    };

    matches.forEach(match => {
        const blue = match.blue_lineup || [];
        const red = match.red_lineup || [];

        let ptBlue = 0, ptRed = 0, resBlue = '', resRed = '';
        if (match.result === 'VictoryBlue') { ptBlue = 3; resBlue = 'G'; resRed = 'P'; }
        else if (match.result === 'VictoryRed') { ptRed = 3; resBlue = 'P'; resRed = 'G'; }
        else if (match.result === 'Draw') { ptBlue = 1; ptRed = 1; resBlue = 'E'; resRed = 'E'; }

        if (match.mvp && match.mvp.trim() && match.mvp.trim() !== '-') {
            ensure(match.mvp.trim()).mvps++;
        }

        const encBlue = blue.reduce((s, m) => s + (m.keeper ?? m.portero ?? 0), 0);
        const encRed = red.reduce((s, m) => s + (m.keeper ?? m.portero ?? 0), 0);

        const process = (lineup, pts, res, encEquipo) => {
            lineup.forEach(m => {
                const p = ensure(m.name);
                p.puntos += pts;
                const g = m.goal ?? m.goles ?? 0;
                const a = m.assist ?? m.asistencias ?? 0;
                const k = m.keeper ?? m.portero ?? 0;
                p.puntos += g * 0.25 + a * 0.25 + encEquipo * -0.10;
                p.goles += g;
                p.asistencias += a;
                p.encajados += k;
                if (res === 'G') p.ganados++;
                if (res === 'E') p.empatados++;
                if (res === 'P') p.perdidos++;
            });
        };

        process(blue, ptBlue, resBlue, encBlue);
        process(red, ptRed, resRed, encRed);
    });

    Object.values(players).forEach(p => { p.puntos += p.mvps; });

    return Object.values(players).map(p => {
        const partidos = p.ganados + p.empatados + p.perdidos;
        return {
            ...p,
            partidos,
            ratioEncajados: partidos > 0 ? +(p.encajados / partidos).toFixed(2) : 999
        };
    });
}

const top3 = (arr, fn, asc = false) => {
    const sorted = [...arr].sort((a, b) => asc ? fn(a) - fn(b) : fn(b) - fn(a));
    return sorted.slice(0, 3);
};

const MEDALS = ['🥇', '🥈', '🥉'];

function renderPodium(players, statFn, statLabel) {
    if (!players.length) return `<p class="no-data">Sin datos suficientes</p>`;
    return players.map((p, i) => `
        <div class="podium-row rank-${i + 1}">
            <span class="medal">${MEDALS[i]}</span>
            <span class="player-name">${escHtml(p.nombre)}</span>
            <span class="player-stat">${statFn(p)} ${statLabel}</span>
        </div>`).join('');
}

function renderBlock(stats, fijos, { filterFn = () => true, sortFn, statFn, statLabel, asc = false }) {
    const sorted = (arr) => [...arr].sort((a, b) => asc ? sortFn(a) - sortFn(b) : sortFn(b) - sortFn(a));

    const titulares = sorted(stats.filter(p => fijos.has(p.nombre) && filterFn(p))).slice(0, 3);
    const suplentes = sorted(stats.filter(p => !fijos.has(p.nombre) && filterFn(p)));
    const bestSup = suplentes[0] || null;

    let html = renderPodium(titulares, statFn, statLabel);

    if (bestSup) {
        html += `
            <div class="suplente-section">
                <div class="suplente-label">✨ Mejor suplente</div>
                <div class="podium-row suplente-row">
                    <span class="medal">🌟</span>
                    <span class="player-name">${escHtml(bestSup.nombre)}</span>
                    <span class="player-stat">${statFn(bestSup)} ${statLabel}</span>
                </div>
            </div>`;
    }

    return html;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderDayCol(dayClass, dayName, html) {
    return `
        <div class="day-col">
            <div class="day-label ${dayClass}">
                <span class="day-dot"></span>${dayName}
            </div>
            ${html}
        </div>`;
}

function renderCategory({ icon, title, subtitle, martesHtml, juevesHtml }) {
    return `
        <div class="cat-card">
            <div class="cat-header">
                <span class="cat-icon">${icon}</span>
                <div>
                    <div class="cat-title">${title}</div>
                    <div class="cat-subtitle">${subtitle}</div>
                </div>
            </div>
            <div class="days-grid">
                ${renderDayCol('martes', '📅 Martes', martesHtml)}
                ${renderDayCol('jueves', '📅 Jueves', juevesHtml)}
            </div>
        </div>`;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
    const [matchesMartes, matchesJueves, fijosMartes, fijosJueves] = await Promise.all([
        loadMatches('martes'),
        loadMatches('jueves'),
        loadFijos('martes'),
        loadFijos('jueves')
    ]);

    const statsM = buildStats(matchesMartes);
    const statsJ = buildStats(matchesJueves);

    const categories = [
        {
            icon: '⭐', title: 'Líderes', subtitle: 'Jugadores con más puntos totales',
            fn: (stats, fijos) => renderBlock(stats, fijos, { sortFn: p => p.puntos, statFn: p => p.puntos.toFixed(1), statLabel: 'pts' })
        },
        {
            icon: '🏅', title: 'Top MVPs', subtitle: 'Jugadores más valiosos del partido',
            fn: (stats, fijos) => renderBlock(stats, fijos, { filterFn: p => p.mvps > 0, sortFn: p => p.mvps, statFn: p => p.mvps, statLabel: 'MVPs' })
        },
        {
            icon: '⚽', title: 'Top Goleadores', subtitle: 'Jugadores con más goles',
            fn: (stats, fijos) => renderBlock(stats, fijos, { filterFn: p => p.goles > 0, sortFn: p => p.goles, statFn: p => p.goles, statLabel: 'goles' })
        },
        {
            icon: '🎯', title: 'Top Asistentes', subtitle: 'Jugadores con más asistencias',
            fn: (stats, fijos) => renderBlock(stats, fijos, { filterFn: p => p.asistencias > 0, sortFn: p => p.asistencias, statFn: p => p.asistencias, statLabel: 'asist.' })
        },
        {
            icon: '🧤', title: 'Top Porteros', subtitle: `Menor ratio goles encajados/partido (mín. ${MIN_GAMES_PORTERO} partidos como portero)`,
            fn: (stats, fijos) => renderBlock(stats, fijos, { filterFn: p => p.encajados > 0 && p.partidos >= MIN_GAMES_PORTERO, sortFn: p => p.ratioEncajados, statFn: p => p.ratioEncajados.toFixed(2), statLabel: 'enc/ptdo', asc: true })
        },
        {
            icon: '🏃', title: 'Top Jugados', subtitle: 'Jugadores que más partidos han disputado',
            fn: (stats, fijos) => renderBlock(stats, fijos, { filterFn: p => p.partidos > 0, sortFn: p => p.partidos, statFn: p => p.partidos, statLabel: 'partidos' })
        }
    ];

    const sectionsHtml = categories.map(cat => renderCategory({
        icon: cat.icon,
        title: cat.title,
        subtitle: cat.subtitle,
        martesHtml: cat.fn(statsM, fijosMartes),
        juevesHtml: cat.fn(statsJ, fijosJueves)
    })).join('');

    const template = await readFile(join(ROOT, 'index.html'), 'utf8');

    const withContent = template.replace(
        /<div id="app-root">[\s\S]*?<\/div>\s*<\/div>\s*(?=<div class="page-footer")/,
        `<div id="app-root">\n\t<div class="sections">${sectionsHtml}</div>\n</div>\n\n`
    );

    const withVisibleFooter = withContent.replace(
        '<div class="page-footer" id="page-footer" style="display:none">',
        '<div class="page-footer" id="page-footer">'
    );

    const withoutScript = withVisibleFooter.replace(/<script type="module">[\s\S]*?<\/script>\n?/, '');

    await writeFile(join(ROOT, 'index-backup.html'), withoutScript, 'utf8');
    console.log('✅ index-backup.html generado');
}

main().catch(err => {
    console.error('❌ Error generando index-backup.html:', err);
    process.exit(1);
});
