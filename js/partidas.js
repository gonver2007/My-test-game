/* partidas.js - las cinco ranuras de guardado: senda alcanzada, arma en mano,
   forja y esquirlas. Se escriben solas cuando pasa algo que recordar.
   ============================================================ */
'use strict';

const RANURAS = 5;
const CLAVE_PARTIDAS = 'sendas.partidas';
const CLAVE_ACTIVA = 'sendas.ranura';

// La ranura no recuerda por dónde ibas: cada visita empieza en la primera
// senda. Se conserva el acero y lo que se ha juntado.
function partidaNueva() {
    return {
        arma: 'tanto',
        compradas: ['tanto'],   // lo demás, katana incluida, se paga en la armería
        niveles: {},            // peldaños de forja por arma
        dones: {},              // vida, daño y energía, comprados con orbes azules
        esquirlas: 0,
        orbes: 0,
        god: false,             // inmortalidad, que solo enciende la consola
        cheat: false,           // el permiso de abrir la consola dentro de la partida
        hondo: 1,               // la senda más honda a la que ha llegado esta ranura
        completado: false,      // si esta ranura llegó a cruzar la última puerta
        creada: Date.now(),
        jugada: Date.now()
    };
}

const Partidas = {

    // el navegador puede negarse a guardar; entonces se juega igual, sin memoria
    todas() {
        let lista = [];
        try {
            const crudo = localStorage.getItem(CLAVE_PARTIDAS);
            if (crudo) lista = JSON.parse(crudo) || [];
        } catch (e) { lista = []; }
        lista.length = RANURAS;
        return Array.from(lista, p => p || null);
    },

    escribir(lista) {
        try { localStorage.setItem(CLAVE_PARTIDAS, JSON.stringify(lista)); } catch (e) { /* nada */ }
    },

    ranura(i) { return this.todas()[i] || null; },

    // -1 cuando se ha entrado a la partida sin pasar por el menú
    activa() {
        try {
            const n = parseInt(localStorage.getItem(CLAVE_ACTIVA), 10);
            return (n >= 0 && n < RANURAS) ? n : -1;
        } catch (e) { return -1; }
    },

    activar(i) {
        try { localStorage.setItem(CLAVE_ACTIVA, String(i)); } catch (e) { /* nada */ }
    },

    crear(i) {
        const lista = this.todas();
        lista[i] = partidaNueva();
        this.escribir(lista);
        this.activar(i);
        return lista[i];
    },

    borrar(i) {
        const lista = this.todas();
        lista[i] = null;
        this.escribir(lista);
        if (this.activa() === i) {
            try { localStorage.removeItem(CLAVE_ACTIVA); } catch (e) { /* nada */ }
        }
    },

    // sin ranura elegida devuelve una partida volátil: se juega, pero no se anota
    actual() {
        const i = this.activa();
        return (i >= 0 && this.ranura(i)) || partidaNueva();
    },

    guardarActual(cambios) {
        const i = this.activa();
        if (i < 0) return;
        const lista = this.todas();
        lista[i] = Object.assign({}, lista[i] || partidaNueva(), cambios, { jugada: Date.now() });
        this.escribir(lista);
    },

    // escribir en una ranura cualquiera sin hacerla la elegida: lo usa la consola
    guardarEn(i, cambios) {
        if (!(i >= 0 && i < RANURAS)) return false;
        const lista = this.todas();
        if (!lista[i]) return false;            // en una ranura vacía no se escribe
        lista[i] = Object.assign({}, lista[i], cambios, { jugada: Date.now() });
        this.escribir(lista);
        return true;
    }
};

// ---------- La lista de ranuras ----------
// Solo la monta ranura.html; las demás cargan este archivo por el almacén.
(function montarRanuras() {
    const caja = document.getElementById('ranuras');
    if (!caja) return;

    let porBorrar = -1;         // la ranura que espera el segundo clic de confirmación

    // la fecha se escribe según la lengua: «31 ago 2026» / «31 Aug 2026»
    const fecha = ms => new Date(ms).toLocaleDateString(
        Idioma.actual() === 'en' ? 'en-GB' : 'es-ES',
        { day: '2-digit', month: 'short', year: 'numeric' });

    const nombreArma = p => {
        const base = (typeof ARMAS !== 'undefined' && ARMAS.find(a => a.id === p.arma)) || null;
        const nivel = (p.niveles && p.niveles[p.arma]) || 0;
        return (base ? base.nombre : p.arma) + (nivel ? ` +${nivel}` : '');
    };

    const jade = () => (typeof ESQUIRLA_SVG !== 'undefined' ? ESQUIRLA_SVG : '');
    const orbes = () => (typeof ORBE_SVG !== 'undefined' ? ORBE_SVG : '');

    function fila(p, i) {
        if (!p) return `
            <div class="ranura vacia" data-ranura="${i}">
                <h3>${TR('ranura.numero')} ${i + 1}</h3>
                <p class="resumen">${TR('ranura.vacia')}</p>
                <p class="fecha">${TR('ranura.empezar')}</p>
            </div>`;

        const confirmando = porBorrar === i;
        // lo encendido por la consola se anuncia con su sello: inmortalidad en
        // rojo a la derecha, consola en jade a la izquierda
        const sello =
            (p.cheat ? `<span class="sello consola" title="${TR('ranura.selloConsola')}">令</span>` : '') +
            (p.god ? `<span class="sello" title="${TR('ranura.selloDios')}">神</span>` : '');
        return `
            <div class="ranura llena${p.god ? ' inmortal' : ''}" data-ranura="${i}">
                ${sello}
                <h3>${TR('ranura.numero')} ${i + 1}</h3>
                <p class="resumen">${nombreArma(p)}</p>
                <p class="monedas">${p.esquirlas}${jade()} · ${p.orbes || 0}${orbes()}</p>
                <p class="hondura"><b>${p.hondo || 1}</b><span>${TR('ranura.senda')}</span></p>
                <p class="fecha">${TR('ranura.ultima')} ${fecha(p.jugada)}</p>
                <button class="borrar${confirmando ? ' confirmar' : ''}" data-borrar="${i}">
                    ${confirmando ? TR('ranura.seguro') : TR('ranura.borrar')}
                </button>
            </div>`;
    }

    function pintar() {
        caja.innerHTML = `
            <div class="lista">${Partidas.todas().map(fila).join('')}</div>
            <p class="nota">${TR('ranura.nota')}</p>`;
    }

    function entrar(i) {
        if (!Partidas.ranura(i)) Partidas.crear(i);
        else Partidas.activar(i);
        const destino = document.body.dataset.siguiente || 'game.html';
        // irA lo pone menu.js, que carga después pero mucho antes de que nadie
        // pulse; es quien saca el marco a pantalla completa si toca
        if (typeof irA === 'function') irA(destino);
        else location.href = destino;
    }

    caja.addEventListener('click', e => {
        // borrar pide dos clics: el primero avisa, el segundo cumple
        const borrar = e.target.closest('[data-borrar]');
        if (borrar) {
            const i = +borrar.dataset.borrar;
            if (porBorrar === i) { Partidas.borrar(i); porBorrar = -1; }
            else porBorrar = i;
            pintar();
            return;
        }
        const elegida = e.target.closest('[data-ranura]');
        if (elegida) entrar(+elegida.dataset.ranura);
    });

    pintar();
})();
