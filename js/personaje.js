/* ============================================================
personaje.js - los orbes azules y lo que compran
Si el jade afila el acero, los orbes azules endurecen al que los lleva:
vida, daño y energía del propio héroe, que no se pierden al cambiar de
arma. Vive en la ranura, junto al resto de la partida. La clave guardada
sigue llamándose 'dones' para no dejar atrás las partidas ya jugadas.
   ============================================================ */
'use strict';

// las tres vías de mejora; cada peldaño cuesta lo que diga COSTES_MEJORA
const MEJORAS = [
    {
        id: 'vida',
        nombre: 'VIDA',
        pie: 'Un aliento más largo: el héroe aguanta más golpes antes de caer.',
        efecto: 'PV máximos', suma: 10, base: 50
    },
    {
        id: 'dano',
        nombre: 'DAÑO',
        pie: 'La mano que empuña: cada tajo entra más hondo, lleves lo que lleves.',
        efecto: 'Daño', suma: 2, base: 0
    },
    {
        id: 'energia',
        nombre: 'ENERGÍA',
        pie: 'El fuelle: más esquivas seguidas y más tajos antes de quedarse sin aire.',
        efecto: 'Estamina', suma: 10, base: 50
    }
];

// Las mejoras se llamaron vigor, filo y aguante hasta que pasaron a decirse
// por lo que hacen. Lo comprado con los nombres viejos sigue guardado bajo
// ellos, así que al leer la ranura se traspasa a los nuevos: nadie pierde
// peldaños que ya pagó por un cambio de nombre.
const NOMBRES_VIEJOS = { vigor: 'vida', filo: 'dano', aguante: 'energia' };

const COSTES_MEJORA = [50, 150, 500, 750, 1000];
const MEJORA_TOPE = COSTES_MEJORA.length;

const INICIAL_PERSONAJE = { orbes: 0, dones: {} };

// el orbe azul: una esfera de noche con el corazón encendido y el brillo alto
// de siempre, que es lo que la hace leerse redonda y no plana
const ORBE_SVG = `
    <svg class="esquirla orbe" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="7.1" fill="#24468f"
                stroke="#17132b" stroke-width="1.7"/>
        <circle cx="9" cy="9.4" r="4.3" fill="#3a6fd8"/>
        <circle cx="6.8" cy="6.5" r="1.9" fill="#a8c4ff"/>
    </svg>`;

const Personaje = {

    leer() {
        const estado = (typeof Partidas !== 'undefined')
            ? Object.assign({}, INICIAL_PERSONAJE, Partidas.actual())
            : Object.assign({}, INICIAL_PERSONAJE, { dones: {} });
        estado.dones = this.alDia(estado.dones);
        return estado;
    },

    // pasa a los nombres de ahora lo que se guardó con los de antes. Si ya
    // hubiera algo bajo el nombre nuevo manda ese, que es el que se ha
    // estado usando; el viejo se queda donde está y deja de mirarse
    alDia(dones) {
        const puesto = Object.assign({}, dones);
        for (const viejo in NOMBRES_VIEJOS) {
            const nuevo = NOMBRES_VIEJOS[viejo];
            if (puesto[viejo] !== undefined && puesto[nuevo] === undefined)
                puesto[nuevo] = puesto[viejo];
        }
        return puesto;
    },

    guardar(estado) {
        if (typeof Partidas !== 'undefined') {
            Partidas.guardarActual({ orbes: estado.orbes, dones: estado.dones });
        }
    },

    nivel(id) { return Math.min(MEJORA_TOPE, (this.leer().dones || {})[id] || 0); },

    orbes() { return this.leer().orbes; },

    premiar(cuantas) {
        const estado = this.leer();
        estado.orbes += cuantas;
        this.guardar(estado);
    },

    // devuelve true solo si había con qué pagar
    subir(id) {
        const estado = this.leer();
        const n = (estado.dones || {})[id] || 0;
        if (n >= MEJORA_TOPE || estado.orbes < COSTES_MEJORA[n]) return false;
        estado.orbes -= COSTES_MEJORA[n];
        estado.dones = Object.assign({}, estado.dones, { [id]: n + 1 });
        this.guardar(estado);
        return true;
    },

    // lo que hay que sumarle al héroe al empezar la partida. Se busca por
    // nombre y no por posición: así añadir una mejora nueva a la lista no
    // desplaza a las de al lado ni se lleva por delante a las de siempre
    sumaDe(id) {
        const m = MEJORAS.find(x => x.id === id);
        return m ? m.suma * this.nivel(id) : 0;
    },
    vida() { return this.sumaDe('vida'); },
    dano() { return this.sumaDe('dano'); },
    energia() { return this.sumaDe('energia'); }
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
        const alcanza = coste !== null && estado.orbes >= coste;
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
                <button class="mejorar orbes" data-subir="${mejora.id}"
                        ${alcanza ? '' : 'disabled'}>
                    ${coste === null ? 'AL MÁXIMO' : `SUBIR · ${coste}${ORBE_SVG}`}
                </button>
            </div>
        </div>`;
    }

    function pintar() {
        caja.innerHTML = `
            <h2>PERSONAJE</h2>
            <p class="saldo">Orbes azules: <b>${Personaje.orbes()}${ORBE_SVG}</b></p>
            <div class="armas">${MEJORAS.map(tarjeta).join('')}</div>
            <p class="nota">Cada enemigo caído suelta un orbe azul, que vuela solo hacia ti.
            Lo que compra queda en el héroe, no en el arma.</p>`;
    }

    caja.addEventListener('click', e => {
        const subir = e.target.closest('[data-subir]');
        if (subir) { Personaje.subir(subir.dataset.subir); pintar(); }
    });

    // abrir y cerrar es cosa de menu.js: él sabe de todos los paneles, los
    // cierra entre sí y marca el body para que la pantalla esconda el rótulo
    boton.addEventListener('click', () => {
        if (typeof alternar === 'function') alternar('personaje');
        else caja.hidden = !caja.hidden;
        if (!caja.hidden) pintar();
    });

    addEventListener('keydown', e => {
        if (e.key === 'Escape' && typeof cerrarPaneles !== 'function') caja.hidden = true;
    });
})();
