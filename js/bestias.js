/* ============================================================
bestias.js - quiénes salen al paso, en un solo sitio

Lo mismo que aceros.js hace con las armas, este hace con lo que las
recibe. Antes las cifras de la rata y del oni vivían dentro de
crearEnemigo, y sus figuras dentro de vista.js: nadie más los veía.
El bestiario del zaguán quiere enseñarlos sin entrar en la senda, y
copiarlos habría sido condenarlos a separarse en cuanto se retocara
uno. Aquí están una sola vez y beben todos del mismo sitio:

  - la mazmorra, por BESTIAS.ficha, para plantarlos en el mapa
  - la vista y el panel, por BESTIAS.lamina, para pintarlos

Las figuras no se dibujan a código: son láminas de asset/, sobre el
mismo cuadro de 56 en que se trazan los aceros y el héroe, a cuatro
veces su tamaño y mirando a la derecha. El oni viene de un puñado de
elipses que estuvieron en vista.js -el trazo sigue en el historial-;
la rata, de un dibujo de fuera al que se le despegó el fondo. Lo que
manda es el archivo, y se retoca con un editor de imagen.

Cada bestia tiene tres poses sueltas -quieta, dando el golpe y
recibiéndolo- y una tira de cuatro para andar. La de daño hace lo que
antes hacía un filtro de brillo sobre la de siempre -la sangre se le va
de golpe-, pero ahora es lámina y puede decir algo más: el respingo
hacia atrás y la mirada que se apaga.

Y con ellos va la cuenta: cuántos ha eliminado esta ranura de cada uno
y cuántas veces la ha eliminado él. Se guarda en la propia ranura, junto
al acero y el jade, y no se pierde al caer -morir cuesta el botín, no
lo aprendido-.

Las láminas miran a la derecha y conservan entero el cuadro en que se
trazaron, con su aire alrededor: la senda dibuja la figura centrada en
ese cuadro, y recortarla al bulto la movería de sitio y la cambiaría
de tamaño.
   ============================================================ */
'use strict';

const BESTIAS = (function () {

    // Relativo a html/, que es de donde se carga esto: lo mismo que hacen las
    // carpetas de sonido de vista.js. Cada bestia dice dentro qué comarca la
    // guarda, que es como están repartidas las láminas.
    const CARPETA = '../asset/enemigos/';

    // ---------- Las fichas ----------
    // Lo que mide y lo que pega cada uno. Son las cifras con que la mazmorra
    // los planta, así que el bestiario no promete nada que no se cumpla en la
    // senda: es la misma línea leída dos veces.
    //
    // El nombre no se traduce -un oni es un oni en todas partes-, pero el
    // artículo sí: msg.articuloEl lo resuelve cada lengua a su manera.
    //
    // vista es hasta dónde se dan por enterados, en pasos de camino. Era una
    // constante suelta de la mazmorra, igual para todos; aquí cada uno puede
    // tener la suya el día que convenga -de momento ven lo mismo que veían-.
    // Las poses sueltas. Quieto es la de siempre y la que vale cuando no pasa
    // nada; las otras dos duran lo que dure el golpe. El paso va aparte, en
    // andares, porque no es una lámina: es una tira.
    const POSES = ['quieto', 'ataque', 'dano'];

    const fichas = [
        {
            id: 'rata', art: 'la', nombre: 'rata',
            laminas: {
                quieto: 'catacumbas/rata-quieto.png',
                ataque: 'catacumbas/rata-ataque.png',
                dano: 'catacumbas/rata-dano.png',
                andar: ['catacumbas/rata-andar-1.png', 'catacumbas/rata-andar-2.png',
                        'catacumbas/rata-andar-3.png', 'catacumbas/rata-andar-4.png']
            },
            r: 0.26, vel: 3.3, hp: 10, dano: 5,
            alcance: 0.6, cadencia: 0.9, vista: 13
        },
        {
            id: 'oni', art: 'el', nombre: 'oni',
            laminas: {
                quieto: 'catacumbas/oni-quieto.png',
                ataque: 'catacumbas/oni-ataque.png',
                dano: 'catacumbas/oni-dano.png',
                andar: ['catacumbas/oni-andar-1.png', 'catacumbas/oni-andar-2.png',
                        'catacumbas/oni-andar-3.png', 'catacumbas/oni-andar-4.png']
            },
            r: 0.38, vel: 2.1, hp: 30, dano: 10,
            alcance: 0.85, cadencia: 1.3, vista: 13
        }
    ];

    const ficha = id => fichas.find(f => f.id === id) || null;

    // Dónde está la lámina de uno en la pose que se pida; sin pedir nada, la
    // de quieto, que es la que enseña el bestiario. A la bestia que no exista
    // -o a la pose que no tenga- se le devuelve cadena vacía o la de quieto,
    // nunca nulo: quien lo meta en un src no acaba pidiendo «undefined.png»
    function lamina(id, pose) {
        const f = ficha(id);
        if (!f) return '';
        return CARPETA + (f.laminas[pose] || f.laminas.quieto);
    }

    // La tira del paso, en orden. La bestia que no la traiga devuelve una tira
    // vacía, y quien la pida se queda con la de quieto: se anda sin animar,
    // pero se anda.
    function andares(id) {
        const f = ficha(id);
        return ((f && f.laminas.andar) || []).map(l => CARPETA + l);
    }

    return { CARPETA, POSES, fichas, ficha, lamina, andares };
})();

// ============================================================
//  La cuenta: lo eliminado y lo que te ha eliminado
// ============================================================
// Vive en la ranura, bajo la clave 'bestiario', con la forma
// { rata: { caidos, caidas }, oni: { ... } }. Una ranura de antes de que
// esto existiera sencillamente no la trae, y entonces todo empieza a cero.
const MARCA_VACIA = { caidos: 0, caidas: 0 };

// El ninja pasó a ser rata: otro nombre y otra lámina, pero el mismo bicho en
// el mismo sitio. Lo que se llevaba contado bajo el nombre viejo se traspasa
// al leer, que nadie tiene por qué perder una cuenta por un cambio de nombre.
// Es lo mismo que hace personaje.js con las mejoras que se llamaron de otra
// manera, y por eso se llama distinto de su NOMBRES_VIEJOS: dos const con el
// mismo nombre en el ámbito global no avisan, tumban el archivo entero.
const RENOMBRADAS = { ninja: 'rata' };

const Bestiario = {

    leer() {
        const guardado = (typeof Partidas !== 'undefined')
            ? (Partidas.actual().bestiario || {}) : {};
        return this.alDia(guardado);
    },

    // pasa al nombre de ahora lo que se guardó con el de antes. Si ya hubiera
    // algo bajo el nuevo manda ese, que es el que se ha estado usando; el
    // viejo se queda donde está y deja de mirarse
    alDia(cuenta) {
        const puesta = Object.assign({}, cuenta);
        for (const viejo in RENOMBRADAS) {
            const nuevo = RENOMBRADAS[viejo];
            if (puesta[viejo] !== undefined && puesta[nuevo] === undefined)
                puesta[nuevo] = puesta[viejo];
        }
        return puesta;
    },

    guardar(cuenta) {
        if (typeof Partidas !== 'undefined') Partidas.guardarActual({ bestiario: cuenta });
    },

    // nunca devuelve nulo: lo que no se ha visto todavía vale cero
    marca(id) {
        return Object.assign({}, MARCA_VACIA, this.leer()[id]);
    },

    // se anota al momento, no al cruzar la puerta: caer cuesta el botín de la
    // senda, pero lo que ya se sabe de un bicho no se desaprende
    anotar(id, campo) {
        if (!BESTIAS.ficha(id)) return;
        const cuenta = this.leer();
        const marca = Object.assign({}, MARCA_VACIA, cuenta[id]);
        marca[campo]++;
        this.guardar(Object.assign({}, cuenta, { [id]: marca }));
    },

    anotarCaido(id) { this.anotar(id, 'caidos'); },
    anotarCaida(id) { this.anotar(id, 'caidas'); }
};

// ---------- El panel de prev.html ----------
// Las demás pantallas cargan este archivo solo por las fichas y las láminas;
// al no encontrar la caja, esto no monta nada.
//
// El panel tiene dos caras y enseña una cada vez: la rejilla, que es el
// muestrario -retrato y nombre, y nada más-, y la hoja, que se abre al pulsar
// una de ellas y es donde ya cabe todo lo que se sabe del bicho.
//
// La salida es siempre la misma y está siempre en el mismo sitio: el botón de
// debajo del panel. Lo que cambia es a dónde lleva -de la hoja, a la rejilla;
// de la rejilla, fuera-, y lo dice su rótulo. Dos botones de salida, uno
// dentro y otro debajo, era una salida de más.
(function montarBestiario() {
    const caja = document.getElementById('bestiario');
    const boton = document.getElementById('btBestiario');
    if (!caja || !boton) return;

    // el de debajo del panel, que es de todos y aquí se toma prestado
    const salida = document.getElementById('btCerrarPanel');

    // La rejilla va de tres renglones desde el primer día, con los sitios
    // vacíos ya hechos: quedan por venir los semijefes y lo que caiga, y así
    // el panel no cambia de tamaño cada vez que se descubre uno.
    //
    // Se llena hacia abajo y no hacia el lado: la segunda bestia va debajo de
    // la primera, la cuarta empieza columna nueva. Quien manda en eso es el
    // grid-auto-flow de la hoja de estilo; aquí solo se cuenta igual que allí,
    // para no dejar nunca una columna a medio empezar.
    const RENGLONES = 3;
    const COLUMNAS = 4;

    // la bestia que se está mirando en grande; con null se ve la rejilla
    let abierta = null;

    // ---------- La rejilla ----------
    function celda(f) {
        return `
        <button type="button" class="bestia" data-bestia="${f.id}">
            <span class="retrato"><img src="${BESTIAS.lamina(f.id)}" alt=""></span>
            <span class="nombre">${f.nombre.toUpperCase()}</span>
        </button>`;
    }

    // el sitio que espera bestia: se ve que está y se ve que no hay nadie
    function vacia() {
        return `
        <div class="bestia vacia" title="${TR('bestiario.hueco')}">
            <span class="incognita">？</span>
        </div>`;
    }

    function rejilla() {
        // nunca menos de tres columnas de tres, y nunca una a medio empezar
        const sitios = Math.max(COLUMNAS * RENGLONES,
            Math.ceil(BESTIAS.fichas.length / RENGLONES) * RENGLONES);
        const celdas = BESTIAS.fichas.map(celda);
        while (celdas.length < sitios) celdas.push(vacia());
        return `
            <h2>${TR('bestiario.titulo')}</h2>
            <p class="saldo">${TR('bestiario.lema')}</p>
            <div class="rejilla">${celdas.join('')}</div>
            <p class="nota">${TR('bestiario.nota')}</p>`;
    }

    // ---------- La hoja ----------
    // Lo que es el bicho arriba y lo tuyo con él debajo, en dos listas: una
    // cosa es la ficha del animal y otra la cuenta de vuestros encuentros.
    const dato = (clave, valor) => `<div><dt>${TR(clave)}</dt><dd>${valor}</dd></div>`;

    function hoja(f) {
        const marca = Bestiario.marca(f.id);
        return `
            <h2>${TR('bestiario.titulo')}</h2>
            <div class="hoja">
                <div class="retrato grande"><img src="${BESTIAS.lamina(f.id)}" alt=""></div>
                <div class="cuerpo">
                    <h3>${f.nombre.toUpperCase()}</h3>
                    <p class="pie">${TR('bestia.' + f.id + '.pie')}</p>
                    <dl class="fichas">
                        ${dato('bestiario.pv', f.hp)}
                        ${dato('bestiario.dano', f.dano)}
                        ${dato('bestiario.golpes', (1 / f.cadencia).toFixed(1))}
                        ${dato('bestiario.velocidad', f.vel.toFixed(1))}
                        ${dato('bestiario.vista', f.vista)}
                    </dl>
                    <dl class="fichas cuenta">
                        ${dato('bestiario.caidos', marca.caidos)}
                        ${dato('bestiario.caidas', marca.caidas)}
                    </dl>
                </div>
            </div>`;
    }

    // El botón de debajo dice a dónde lleva: con una hoja abierta es el VOLVER
    // que la recoge, y en la rejilla vuelve a ser el CERRAR de siempre. Se le
    // cambia también el data-t, que es de donde se resurte al cambiar de
    // lengua: sin eso, la próxima traducción lo devolvería al rótulo de antes.
    function vestirSalida() {
        if (!salida) return;
        const clave = abierta ? 'comun.volver' : 'comun.cerrar';
        salida.dataset.t = clave;
        salida.textContent = TR(clave);
    }

    function pintar() {
        const f = abierta && BESTIAS.ficha(abierta);
        caja.innerHTML = f ? hoja(f) : rejilla();
        vestirSalida();
    }

    // un solo oyente en la caja: dentro se repinta entera a cada paso
    caja.addEventListener('click', e => {
        const elegida = e.target.closest('[data-bestia]');
        if (elegida) { abierta = elegida.dataset.bestia; pintar(); }
    });

    // abrir y cerrar es cosa de menu.js, que sabe de todos los paneles y los
    // cierra entre sí; sin él, esto se abre igual. Se entra siempre por la
    // rejilla, aunque la última vez se dejara una hoja abierta
    boton.addEventListener('click', () => {
        if (typeof alternar === 'function') alternar('bestiario');
        else caja.hidden = !caja.hidden;
        abierta = null;
        if (caja.hidden) vestirSalida(); else pintar();
    });

    // Las dos salidas -el botón de debajo y Esc- deshacen un paso cada vez:
    // con una hoja abierta vuelven a la rejilla, y solo desde la rejilla
    // cierran el panel. Lo segundo lo hace menu.js, que escucha después que
    // este -por el orden de los <script> de prev.html-, y por eso aquí basta
    // con cortarle el paso mientras haya hoja que recoger.
    function recogerHoja(e) {
        if (caja.hidden || !abierta) return false;
        abierta = null;
        pintar();
        e.stopImmediatePropagation();
        return true;
    }

    if (salida) salida.addEventListener('click', recogerHoja);

    addEventListener('keydown', e => {
        if (e.key !== 'Escape' || caja.hidden) return;
        if (recogerHoja(e)) return;
        if (typeof cerrarPaneles !== 'function') { caja.hidden = true; vestirSalida(); }
    });
})();
