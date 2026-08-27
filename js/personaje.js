/* ============================================================
personaje.js - el lapislázuli y lo que compra
Si el jade afila el acero, el lapislázuli endurece al que lo lleva:
aguante y filo del propio héroe, que no se pierden al cambiar de arma.
Vive en la ranura, junto al resto de la partida. La clave guardada
sigue llamándose 'dones' para no dejar atrás las partidas ya jugadas.
   ============================================================ */
'use strict';

// las dos vías de mejora; cada peldaño cuesta lo que diga COSTES_MEJORA
const MEJORAS = [
    {
        id: 'vigor',
        nombre: 'VIGOR',
        pie: 'Un aliento más largo: el héroe aguanta más golpes antes de caer.',
        efecto: 'PV máximos', suma: 10, base: 50
    },
    {
        id: 'filo',
        nombre: 'FILO',
        pie: 'La mano que empuña: cada tajo entra más hondo, lleves lo que lleves.',
        efecto: 'Daño', suma: 2, base: 0
    }
];

const COSTES_MEJORA = [50, 150, 500, 750, 1000];
const MEJORA_TOPE = COSTES_MEJORA.length;

const INICIAL_PERSONAJE = { lapis: 0, dones: {} };

// el lapislázuli: la misma talla que la esquirla de jade, en azul de noche
// con su veta clara
const LAPIS_SVG = `
    <svg class="esquirla lapis" viewBox="0 0 16 20" aria-hidden="true">
        <path d="M8 1 L14.5 6.5 L10 19 L3 14.5 Z" fill="#24468f"
              stroke="#17132b" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M8 2.4 L10.2 8.6 L4.6 13.6 Z" fill="#6b9cf2"/>
    </svg>`;

const Personaje = {

    leer() {
        if (typeof Partidas !== 'undefined') {
            return Object.assign({}, INICIAL_PERSONAJE, Partidas.actual());
        }
        return Object.assign({}, INICIAL_PERSONAJE, { dones: {} });
    },

    guardar(estado) {
        if (typeof Partidas !== 'undefined') {
            Partidas.guardarActual({ lapis: estado.lapis, dones: estado.dones });
        }
    },

    nivel(id) { return Math.min(MEJORA_TOPE, (this.leer().dones || {})[id] || 0); },

    lapis() { return this.leer().lapis; },

    premiar(cuantas) {
        const estado = this.leer();
        estado.lapis += cuantas;
        this.guardar(estado);
    },

    // devuelve true solo si había con qué pagar
    subir(id) {
        const estado = this.leer();
        const n = (estado.dones || {})[id] || 0;
        if (n >= MEJORA_TOPE || estado.lapis < COSTES_MEJORA[n]) return false;
        estado.lapis -= COSTES_MEJORA[n];
        estado.dones = Object.assign({}, estado.dones, { [id]: n + 1 });
        this.guardar(estado);
        return true;
    },

    // lo que hay que sumarle al héroe al empezar la partida
    vigor() { return MEJORAS[0].suma * this.nivel('vigor'); },
    filo() { return MEJORAS[1].suma * this.nivel('filo'); }
};

// ---------- El panel de prev.html ----------
(function montarPersonaje() {
    const caja = document.getElementById('personaje');
    const boton = document.getElementById('btPersonaje');
    if (!caja || !boton) return;

    function tarjeta(mejora) {
        const estado = Personaje.leer();
        const n = Personaje.nivel(mejora.id);
        const coste = n < MEJORA_TOPE ? COSTES_MEJORA[n] : null;
        const alcanza = coste !== null && estado.lapis >= coste;
        const total = mejora.base + mejora.suma * n;

        return `
        <div class="arma mejora">
            <h3>${mejora.nombre}</h3>
            <p class="pie">${mejora.pie}</p>
            <dl class="fichas">
                <div><dt>${mejora.efecto}</dt><dd>${total}</dd></div>
                <div><dt>Siguiente</dt><dd>${coste === null ? '—' : `+${mejora.suma}`}</dd></div>
            </dl>
            <div class="forja">
                <span class="pips">${'●'.repeat(n)}${'○'.repeat(MEJORA_TOPE - n)}</span>
                <button class="mejorar lapislazuli" data-subir="${mejora.id}"
                        ${alcanza ? '' : 'disabled'}>
                    ${coste === null ? 'AL MÁXIMO' : `SUBIR · ${coste}${LAPIS_SVG}`}
                </button>
            </div>
        </div>`;
    }

    function pintar() {
        caja.innerHTML = `
            <h2>PERSONAJE</h2>
            <p class="saldo">Esquirlas de lapislázuli: <b>${Personaje.lapis()}${LAPIS_SVG}</b></p>
            <div class="armas">${MEJORAS.map(tarjeta).join('')}</div>
            <p class="nota">Cada enemigo caído deja una esquirla de lapislázuli.
            Lo que compra queda en el héroe, no en el arma.</p>`;
    }

    caja.addEventListener('click', e => {
        const subir = e.target.closest('[data-subir]');
        if (subir) { Personaje.subir(subir.dataset.subir); pintar(); }
    });

    boton.addEventListener('click', () => {
        const armeria = document.getElementById('armeria');
        if (armeria) armeria.hidden = true;     // los dos paneles comparten hueco
        caja.hidden = !caja.hidden;
        if (!caja.hidden) pintar();
    });

    addEventListener('keydown', e => { if (e.key === 'Escape') caja.hidden = true; });
})();
