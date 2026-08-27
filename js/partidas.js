/* ============================================================ 
partidas.js - las cinco ranuras de guardado
Cada ranura recuerda por dónde iba la partida y con qué acero:
patio alcanzado, arma en mano, forja y esquirlas. Se escribe sola
cada vez que pasa algo que merezca la pena recordar.
   ============================================================ */
'use strict';

const RANURAS = 5;
const CLAVE_PARTIDAS = 'sendas.partidas';
const CLAVE_ACTIVA = 'sendas.ranura';

// La ranura no recuerda por dónde ibas: cada visita al santuario empieza en el
// primer patio. Lo que se conserva es el acero y lo que se ha juntado.
function partidaNueva() {
    return {
        arma: 'katana',
        compradas: ['katana'],  // lo demás se paga en la armería
        niveles: {},            // peldaños de forja por arma
        dones: {},              // vigor y filo, comprados con lapislázuli
        esquirlas: 0,
        lapis: 0,
        god: false,             // inmortalidad, que solo enciende la consola
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

    // escribir en una ranura cualquiera, sin tener que hacerla la elegida:
    // lo usa la consola para repartir entre varias de una vez
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
// Tiene pantalla propia, ranura.html; las demás cargan este archivo solo por
// el almacén, y al no encontrar la caja no montan nada.
(function montarRanuras() {
    const caja = document.getElementById('ranuras');
    if (!caja) return;

    let porBorrar = -1;         // la ranura que espera el segundo clic de confirmación

    const fecha = ms => new Date(ms).toLocaleDateString('es-ES',
        { day: '2-digit', month: 'short', year: 'numeric' });

    const nombreArma = p => {
        const base = (typeof ARMAS !== 'undefined' && ARMAS.find(a => a.id === p.arma)) || null;
        const nivel = (p.niveles && p.niveles[p.arma]) || 0;
        return (base ? base.nombre : p.arma) + (nivel ? ` +${nivel}` : '');
    };

    const jade = () => (typeof ESQUIRLA_SVG !== 'undefined' ? ESQUIRLA_SVG : '');
    const lapis = () => (typeof LAPIS_SVG !== 'undefined' ? LAPIS_SVG : '');

    function fila(p, i) {
        if (!p) return `
            <div class="ranura vacia" data-ranura="${i}">
                <h3>RANURA ${i + 1}</h3>
                <p class="resumen">— sin partida —</p>
                <p class="fecha">Empezar una nueva aquí</p>
            </div>`;

        const confirmando = porBorrar === i;
        return `
            <div class="ranura llena" data-ranura="${i}">
                <h3>RANURA ${i + 1}</h3>
                <p class="resumen">${nombreArma(p)}
                    · ${p.esquirlas}${jade()} · ${p.lapis || 0}${lapis()}</p>
                <p class="fecha">Última vez: ${fecha(p.jugada)}</p>
                <button class="borrar${confirmando ? ' confirmar' : ''}" data-borrar="${i}">
                    ${confirmando ? '¿SEGURO?' : 'BORRAR'}
                </button>
            </div>`;
    }

    function pintar() {
        caja.innerHTML = `
            <div class="lista">${Partidas.todas().map(fila).join('')}</div>
            <p class="nota">Cada ranura guarda su arma y sus esquirlas.
            El santuario se recorre siempre desde el primer patio.</p>`;
    }

    function entrar(i) {
        if (!Partidas.ranura(i)) Partidas.crear(i);
        else Partidas.activar(i);
        location.href = document.body.dataset.siguiente || 'game.html';
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
