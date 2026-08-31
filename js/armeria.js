/* ============================================================
armeria.js - el arsenal: qué arma se lleva y cuánto está afilada
Lo usan dos pantallas: prev.html para escoger y forjar, y la
partida para arrancar con el acero elegido. Todo se guarda en el
navegador, así que la elección sobrevive de una noche a otra.
   ============================================================ */
'use strict';

// El tantō viene con el héroe; la katana hay que comprarla en jade
// antes de poder empuñarla o forjarla.
const ARMAS = [
    {
        id: 'tanto',
        nombre: 'TANTŌ',
        precio: 0,
        dano: 10, alcance: 1, arco: 0.50, cadencia: 0.2
    },
    {
        id: 'katana',
        nombre: 'KATANA',
        precio: 10,
        dano: 10, alcance: 1.50, arco: 1.00, cadencia: 0.50
    },
    {
        id: 'yari',
        nombre: 'YARI',
        precio: 18,
        dano: 15, alcance: 1.80, arco: 0.01, cadencia: 0.40
    },
    {
        id: 'tetsubo',
        nombre: 'TETSUBŌ',
        precio: 26,
        dano: 22, alcance: 1.50, arco: 1.50, cadencia: 0.75
    },
    {
        id: 'nodachi',
        nombre: 'NODACHI',
        precio: 29,
        dano: 25, alcance: 1.80, arco: 1.80, cadencia: 1.00
    },
    {
        id: 'kusarigama',
        nombre: 'KUSARIGAMA',
        precio: 32,
        dano: 20, alcance: 1.60, arco: 3.50, cadencia: 0.40
    }
];

// lo que cuesta cada peldaño de la forja, en esquirlas
const COSTES = [15, 30, 50];
const NIVEL_TOPE = COSTES.length;

// lo que suma cada peldaño: filo, un pelo de alcance y menos espera
const POR_NIVEL = { dano: 2, alcance: 0.05, cadencia: 0.93 };

const CLAVE = 'sendas.forja';
const INICIAL = { arma: 'tanto', niveles: {}, esquirlas: 0, compradas: ['tanto'] };

// la esquirla dibujada a la manera del juego: dos caras planas de jade y el
// contorno de tinta, sin degradados. La usan la armería y la lista de ranuras.
const ESQUIRLA_SVG = `
    <svg class="esquirla" viewBox="0 0 16 20" aria-hidden="true">
        <path d="M8 1 L14.5 6.5 L10 19 L3 14.5 Z" fill="#2f7a76"
              stroke="#17132b" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M8 2.4 L10.2 8.6 L4.6 13.6 Z" fill="#7fd6c4"/>
    </svg>`;

const Forja = {

    // el arsenal es parte de la partida: vive dentro de la ranura elegida.
    // Sin ranuras cargadas (o sin memoria del navegador) se recurre a una
    // clave suelta, para que abrir game.html a pelo siga funcionando.
    leer() {
        if (typeof Partidas !== 'undefined') {
            return Object.assign({}, INICIAL, Partidas.actual());
        }
        try {
            const crudo = localStorage.getItem(CLAVE);
            if (crudo) return Object.assign({}, INICIAL, JSON.parse(crudo));
        } catch (e) { /* sin memoria: valores de fábrica */ }
        return Object.assign({}, INICIAL, { niveles: {} });
    },

    guardar(estado) {
        if (typeof Partidas !== 'undefined') {
            Partidas.guardarActual({
                arma: estado.arma, niveles: estado.niveles,
                esquirlas: estado.esquirlas, compradas: estado.compradas
            });
            return;
        }
        try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* nada */ }
    },

    nivel(id) { return Math.min(NIVEL_TOPE, this.leer().niveles[id] || 0); },

    // la ficha del arma ya con la forja encima, lista para copiar al héroe
    ficha(id) {
        const base = ARMAS.find(a => a.id === id) || ARMAS[0];
        const n = this.nivel(base.id);
        return {
            id: base.id, nombre: base.nombre, nivel: n,
            dano: base.dano + POR_NIVEL.dano * n,
            alcance: +(base.alcance + POR_NIVEL.alcance * n).toFixed(2),
            arco: base.arco,
            cadencia: +(base.cadencia * Math.pow(POR_NIVEL.cadencia, n)).toFixed(3)
        };
    },

    // se sale siempre con algo en la mano: si la guardada no está comprada,
    // se recurre a la primera de la lista, que es la que se trae de casa
    equipada() {
        const estado = this.leer();
        return this.ficha(this.tiene(estado.arma) ? estado.arma : ARMAS[0].id);
    },

    tiene(id) { return (this.leer().compradas || []).indexOf(id) >= 0; },

    // El arsenal se recorre en orden: para comprar un arma hay que tener
    // desbloqueada la que va justo delante en la lista. Basta con tenerla;
    // no se le pide estar forjada. Devuelve la que falta, o null si no debe
    // nada -la primera de la lista no tiene delante a nadie-.
    requisito(id) {
        const i = ARMAS.findIndex(a => a.id === id);
        if (i <= 0) return null;
        const previa = ARMAS[i - 1];
        return this.tiene(previa.id) ? null : previa;
    },

    equipar(id) {
        if (!this.tiene(id)) return false;
        const estado = this.leer();
        estado.arma = id;
        this.guardar(estado);
        return true;
    },

    // devuelve true solo si había con qué pagar y con qué abrirla
    comprar(id) {
        const arma = ARMAS.find(a => a.id === id);
        const estado = this.leer();
        if (!arma || this.tiene(id) || estado.esquirlas < arma.precio) return false;
        if (this.requisito(id)) return false;   // falta la anterior del arsenal
        estado.esquirlas -= arma.precio;
        estado.compradas = (estado.compradas || []).concat(id);
        estado.arma = id;              // recién comprada, se empuña de inmediato
        this.guardar(estado);
        return true;
    },

    mejorar(id) {
        const estado = this.leer();
        const n = estado.niveles[id] || 0;
        if (!this.tiene(id) || n >= NIVEL_TOPE || estado.esquirlas < COSTES[n]) return false;
        estado.esquirlas -= COSTES[n];
        estado.niveles[id] = n + 1;
        this.guardar(estado);
        return true;
    },

    esquirlas() { return this.leer().esquirlas; },

    premiar(cuantas) {
        const estado = this.leer();
        estado.esquirlas += cuantas;
        this.guardar(estado);
    }
};

// ---------- El panel de prev.html ----------
// Si la pantalla no tiene armería, este archivo se queda en catálogo y ya.
(function montarArmeria() {
    const caja = document.getElementById('armeria');
    const boton = document.getElementById('btArmeria');
    if (!caja || !boton) return;

    const ESQUIRLA = ESQUIRLA_SVG;

    // la tarjeta cambia de cara según se tenga el arma o haya que comprarla
    function tarjeta(arma) {
        const estado = Forja.leer();
        const f = Forja.ficha(arma.id);
        const propia = Forja.tiene(arma.id);
        const elegida = propia && estado.arma === arma.id;

        let sello = '', pie;
        if (!propia) {
            // el arsenal se abre en orden: mientras falte la anterior no se
            // enseña el precio, sino de quién depende. De nada sirve saber lo
            // que cuesta algo que todavía no está a la venta
            const falta = Forja.requisito(arma.id);
            const alcanza = !falta && estado.esquirlas >= arma.precio;
            sello = falta
                ? '<span class="marca sellado">SELLADA</span>'
                : '<span class="marca cerrado">EN VENTA</span>';
            pie = `
                <span class="pips">${'○'.repeat(NIVEL_TOPE)}</span>
                <button class="mejorar ${falta ? 'sellada' : 'comprar'}"
                        data-compra="${arma.id}" ${alcanza ? '' : 'disabled'}>
                    ${falta ? `EXIGE ${falta.nombre}` : `COMPRAR · ${arma.precio}${ESQUIRLA}`}
                </button>`;
        } else {
            const coste = f.nivel < NIVEL_TOPE ? COSTES[f.nivel] : null;
            const alcanza = coste !== null && estado.esquirlas >= coste;
            if (elegida) sello = '<span class="marca">EN MANO</span>';
            pie = `
                <span class="pips">${'●'.repeat(f.nivel)}${'○'.repeat(NIVEL_TOPE - f.nivel)}</span>
                <button class="mejorar" data-mejora="${arma.id}" ${alcanza ? '' : 'disabled'}>
                    ${coste === null ? 'AL MÁXIMO' : `FORJAR · ${coste}${ESQUIRLA}`}
                </button>`;
        }

        return `
        <div class="arma${elegida ? ' elegida' : ''}${propia ? '' : ' cerrada'}"
             data-arma="${arma.id}">
            <h3>${arma.nombre}${sello}</h3>
            <div class="retrato" data-boceto="${arma.id}"></div>
            <dl class="fichas">
                <div><dt>Daño</dt><dd>${f.dano}</dd></div>
                <div><dt>Alcance</dt><dd>${f.alcance}</dd></div>
                <div><dt>Golpes/s</dt><dd>${(1 / f.cadencia).toFixed(1)}</dd></div>
            </dl>
            <div class="forja">${pie}</div>
        </div>`;
    }

    // El retrato de cada arma se dibuja una vez y se guarda. El panel se
    // repinta entero a cada compra, pero el boceto no cambia: lo que se hace
    // en cada repintado es volver a colgar el mismo lienzo de su hueco -uno
    // por arma, así que basta con mudarlo de sitio-.
    const RETRATO = { ancho: 196, alto: 62 };
    const retratos = {};

    function retratar() {
        if (typeof ACEROS === 'undefined') return;   // sin bocetos, la ficha va sin foto
        for (const hueco of caja.querySelectorAll('[data-boceto]')) {
            const id = hueco.dataset.boceto;
            if (!(id in retratos)) retratos[id] = ACEROS.lamina(id, RETRATO.ancho, RETRATO.alto);
            if (retratos[id]) hueco.appendChild(retratos[id]);
        }
    }

    function pintar() {
        // comprar o forjar repinta la caja entera: sin esto, el renglón se
        // olvidaría de dónde estabas y volvería siempre a la primera lámina
        const previas = caja.querySelector('.armas');
        const scroll = previas ? previas.scrollLeft : 0;

        caja.innerHTML = `
            <h2>ARMERÍA</h2>
            <p class="saldo">Esquirlas de jade: <b>${Forja.esquirlas()}${ESQUIRLA}</b></p>
            <div class="armas">${ARMAS.map(tarjeta).join('')}</div>
            <p class="nota">Cruzar la puerta de una senda a la siguiente deja una esquirla
            una de cada dos veces: el santuario no siempre paga.
            Un arma comprada se empuña al momento y ya se puede forjar.</p>`;

        retratar();
        caja.querySelector('.armas').scrollLeft = scroll;
    }

    // un solo oyente en la caja: los botones se repintan a cada cambio
    caja.addEventListener('click', e => {
        const comprar = e.target.closest('[data-compra]');
        if (comprar) { Forja.comprar(comprar.dataset.compra); pintar(); return; }
        const forjar = e.target.closest('[data-mejora]');
        if (forjar) { Forja.mejorar(forjar.dataset.mejora); pintar(); return; }
        // equipar solo funciona con lo que ya es tuyo; lo demás se compra antes
        const elegir = e.target.closest('[data-arma]');
        if (elegir) { Forja.equipar(elegir.dataset.arma); pintar(); }
    });

    // abrir y cerrar es cosa de menu.js: él sabe de todos los paneles, los
    // cierra entre sí y marca el body para que la pantalla esconda el rótulo.
    // Sin él (una pantalla que solo traiga la armería) esto se abre igual
    boton.addEventListener('click', () => {
        if (typeof alternar === 'function') alternar('armeria');
        else caja.hidden = !caja.hidden;
        if (!caja.hidden) pintar();
    });

    addEventListener('keydown', e => {
        if (e.key === 'Escape' && typeof cerrarPaneles !== 'function') caja.hidden = true;
    });
})();
