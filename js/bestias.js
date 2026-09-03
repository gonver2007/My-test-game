/* ============================================================
bestias.js - quiénes salen al paso, en un solo sitio

Lo mismo que aceros.js hace con las armas, este hace con lo que las
recibe. Antes las cifras de la rata y del ciempiés vivían dentro de
crearEnemigo, y sus figuras dentro de vista.js: nadie más los veía.
El bestiario del zaguán quiere enseñarlos sin entrar en la senda, y
copiarlos habría sido condenarlos a separarse en cuanto se retocara
uno. Aquí están una sola vez y beben todos del mismo sitio:

  - la mazmorra, por BESTIAS.ficha, para plantarlos en el mapa
  - la vista, por BESTIAS.lamina, para pintarlos en la senda
  - el bestiario, por BESTIAS.retrato, que enseña otro dibujo: uno de
    cuerpo entero, para mirarlo despacio, y no la figura de arriba

Las figuras no se dibujan a código: son láminas de asset/, sobre el
mismo cuadro de 56 en que se trazan los aceros y el héroe, a cuatro
veces su tamaño y mirando a la derecha. Las dos vienen de dibujos de
fuera a los que se les despegó el fondo. Lo que manda es el archivo, y
se retoca con un editor de imagen; hubo un ninja y un oni dibujados a
código en vista.js, y su trazo sigue en el historial.

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
    // El nombre no se traduce, pero el artículo sí: msg.articuloEl y
    // msg.articuloLa los resuelve cada lengua a su manera, y por eso la rata
    // es «la» y el ciempiés «el».
    //
    // vista es hasta dónde se dan por enterados, en pasos de camino. Era una
    // constante suelta de la mazmorra, igual para todos; aquí cada uno puede
    // tener la suya el día que convenga -de momento ven lo mismo que veían-.
    //
    // talla es lo que se agranda su figura al dibujarla. Sin ella todos salen
    // del mismo tamaño, porque todas las láminas miden lo mismo y llenan su
    // cuadro por igual: es lo único que puede hacer que un bicho se vea mayor
    // que otro. Quien no la trae vale 1, que es la medida de la casa.
    //
    // largo es cuántas veces es más largo que ancho. Con 1 el cuerpo es el
    // círculo de siempre; con más, se le tumba un palo de ese largo en la
    // dirección a la que mira y se le mide contra él, que es lo que hace que
    // se le acierte por el lomo y no solo por el ombligo.
    //
    // Sale de medirle la lámina, y midiendo el bulto y no la silueta entera:
    // la cola de la rata se arrastra solo por detrás, y el palo crece por los
    // dos lados por igual, así que contándola le saldría cerco por delante del
    // hocico. Su bulto ocupa 0,94 casillas de largo por 0,61 de ancho, y con
    // 1,8 el palo mide 0,94 clavadas. El ciempiés es una tira entera: 3,3 por
    // 1,5, que con 2,8 dan 3,36.
    // Las poses sueltas. Quieto es la de siempre y la que vale cuando no pasa
    // nada; las otras dos duran lo que dure el golpe. El paso va aparte, en
    // andares, porque no es una lámina: es una tira.
    const POSES = ['quieto', 'ataque', 'dano'];

    // clase separa el paso llano del semijefe: es lo que el bestiario mira
    // para enseñar una pestaña u otra. Quien no la traiga cuenta como
    // 'enemigo', que es lo que hay hasta que llegue el primero de verdad.
    const fichas = [
        {
            id: 'rata', art: 'la', nombre: 'rata', clase: 'enemigo',
            laminas: {
                bestiario: 'bestiario/rata.png',
                quieto: 'catacumbas/rata-quieto.png',
                ataque: 'catacumbas/rata-ataque.png',
                dano: 'catacumbas/rata-dano.png',
                andar: ['catacumbas/rata-andar-1.png', 'catacumbas/rata-andar-2.png',
                        'catacumbas/rata-andar-3.png', 'catacumbas/rata-andar-4.png']
            },
            r: 0.26, vel: 3.3, hp: 10, dano: 5,
            alcance: 0.6, cadencia: 0.9, vista: 13, largo: 1.8
        },
        {
            id: 'ciempies', art: 'el', nombre: 'ciempiés', clase: 'enemigo',
            laminas: {
                bestiario: 'bestiario/cienpies.png',
                quieto: 'catacumbas/ciempies-quieto.png',
                ataque: 'catacumbas/ciempies-ataque.png',
                dano: 'catacumbas/ciempies-dano.png',
                andar: ['catacumbas/ciempies-andar-1.png', 'catacumbas/ciempies-andar-2.png',
                        'catacumbas/ciempies-andar-3.png', 'catacumbas/ciempies-andar-4.png']
            },
            r: 0.6, vel: 2.1, hp: 30, dano: 10,
            alcance: 0.45, cadencia: 1.3, vista: 13, talla: 2, largo: 2.8
        }
    ];

    const ficha = id => fichas.find(f => f.id === id) || null;

    // Dónde está la lámina de uno en la pose que se pida; sin pedir nada, la
    // de quieto. A la bestia que no exista -o a la pose que no tenga- se le
    // devuelve cadena vacía o la de quieto, nunca nulo: quien lo meta en un
    // src no acaba pidiendo «undefined.png»
    function lamina(id, pose) {
        const f = ficha(id);
        if (!f) return '';
        return CARPETA + (f.laminas[pose] || f.laminas.quieto);
    }

    // El retrato del bestiario, que es otra cosa que la figura de la senda:
    // aquella se ve desde arriba y a 85px, y esta es un dibujo de cuerpo
    // entero para mirarlo despacio, en bestiario/. Quien no tenga el suyo
    // enseña su figura de quieto, que es lo que se hacía antes de haberlos.
    const retrato = id => lamina(id, 'bestiario');

    // La tira del paso, en orden. La bestia que no la traiga devuelve una tira
    // vacía, y quien la pida se queda con la de quieto: se anda sin animar,
    // pero se anda.
    function andares(id) {
        const f = ficha(id);
        return ((f && f.laminas.andar) || []).map(l => CARPETA + l);
    }

    return { CARPETA, POSES, fichas, ficha, lamina, andares, retrato };
})();

// ============================================================
//  La cuenta: lo eliminado y lo que te ha eliminado
// ============================================================
// Vive en la ranura, bajo la clave 'bestiario', con la forma
// { rata: { caidos, caidas }, ciempies: { ... } }. Una ranura de antes de que
// esto existiera sencillamente no la trae, y entonces todo empieza a cero.
const MARCA_VACIA = { caidos: 0, caidas: 0 };

// El ninja pasó a ser rata y el oni, ciempiés: otro nombre y otras láminas,
// pero los mismos bichos en el mismo sitio. Lo que se llevaba contado bajo el nombre viejo se traspasa
// al leer, que nadie tiene por qué perder una cuenta por un cambio de nombre.
// Es lo mismo que hace personaje.js con las mejoras que se llamaron de otra
// manera, y por eso se llama distinto de su NOMBRES_VIEJOS: dos const con el
// mismo nombre en el ámbito global no avisan, tumban el archivo entero.
const RENOMBRADAS = { ninja: 'rata', oni: 'ciempies' };

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
    // vacíos ya hechos: así el panel no cambia de tamaño cada vez que se
    // descubre uno. Coincide con las diez comarcas de biomas.js -de ahí que
    // COLUMNAS valga diez-, que es lo que aprovecha la pestaña de jefes para
    // reservarle su columna a cada una: ver celdasJefes más abajo.
    //
    // Se llena hacia abajo y no hacia el lado: la segunda bestia va debajo de
    // la primera, la cuarta empieza columna nueva. Quien manda en eso es el
    // grid-auto-flow de la hoja de estilo; aquí solo se cuenta igual que allí,
    // para no dejar nunca una columna a medio empezar.
    const RENGLONES = 3;
    const COLUMNAS = 10;

    // la bestia que se está mirando en grande; con null se ve la rejilla
    let abierta = null;

    // qué pestaña de la rejilla toca: el paso llano o los semijefes. Empieza
    // -y vuelve a empezar cada vez que se abre el panel- en enemigos, que es
    // lo que hay ahora mismo y lo que se pide ver primero.
    const CATEGORIAS = ['enemigo', 'jefe'];
    let categoria = 'enemigo';

    // Si esta ranura ya se ha cruzado con ella. Antes del primer golpe que la
    // tumba, el bestiario no sabe nada suyo -ni su aspecto ni sus cifras-, así
    // que no aparece: el hueco queda como el de una bestia que todavía no
    // existe, con su «?» y su título de «Sin descubrir». Es la misma cuenta
    // que ya lleva Bestiario, aquí solo se mira si ha pasado de cero.
    function descubierta(f) { return Bestiario.marca(f.id).caidos > 0; }

    // ---------- La rejilla ----------
    function celda(f, alta) {
        return `
        <button type="button" class="bestia${alta ? ' alta' : ''}" data-bestia="${f.id}">
            <span class="retrato"><img src="${BESTIAS.retrato(f.id)}" alt=""></span>
            <span class="nombre">${f.nombre.toUpperCase()}</span>
        </button>`;
    }

    // el sitio que espera bestia: se ve que está y se ve que no hay nadie.
    // El título es lo único que cambia de un hueco a otro -el signo de
    // interrogación no dice nada él solo-, y por defecto es el genérico de
    // siempre; los de la pestaña de jefes lo afinan más, ver celdaJefe
    function vacia(titulo, alta) {
        return `
        <div class="bestia vacia${alta ? ' alta' : ''}" title="${titulo || TR('bestiario.hueco')}">
            <span class="incognita">？</span>
        </div>`;
    }

    // el nombre de una comarca, traducido igual que Biomas.nombre pero sin
    // pedirle un nivel: aquí se tiene ya la ficha del bioma, no la senda
    function nombreZona(zona) {
        const clave = 'bioma.' + zona.id;
        const dicho = TR(clave);
        return dicho === clave ? zona.nombre : dicho;
    }

    // Los dos rangos de jefe que va a tener cada comarca, en el orden en que
    // se plantan en la senda: primero el semijefe -a media comarca-, luego
    // el jefe que la cierra. Cuando exista una ficha con clase 'jefe' y estas
    // dos señas -zona: el id del bioma, rango: uno de estos dos-, aparece
    // sola en su sitio; hasta entonces el hueco dice de quién es la espera.
    const RANGOS_JEFE = [['semijefe', 'bestiario.semijefe'], ['jefe', 'bestiario.jefeDeZona']];

    function celdaJefe(zona, rango, claveRotulo, alta) {
        const f = BESTIAS.fichas.find(x => x.clase === 'jefe' && x.zona === zona.id && x.rango === rango);
        // sin ficha todavía, o con ficha pero sin haberla tumbado ni una vez:
        // el hueco es el mismo en los dos casos, con el rótulo de la zona
        return (f && descubierta(f)) ? celda(f, alta)
            : vacia(`${TR(claveRotulo)} — ${nombreZona(zona)}`, alta);
    }

    // La pestaña de jefes no es un cajón donde caiga cualquiera: una columna
    // por comarca, en el mismo orden en que se atraviesan -Biomas.lista es
    // quien lo dice-, con el semijefe y el jefe uno debajo del otro.
    //
    // Y la columna no son tres sitios iguales: el primero vale por dos
    // renglones -es una lámina de pie, no un cuadradito- y el segundo se queda
    // con el que sobra. Así son dos sitios para dos rangos, en vez de dos y un
    // hueco de relleno al final. Lo alto lo hace el grid-row de la clase
    // «alta» en la hoja de estilo; aquí solo se dice quién la lleva.
    //
    // Sin biomas.js cargado -no debería pasar; prev.html lo trae solo por
    // esto- la lista sale vacía y rejilla() la rellena con columnas en blanco,
    // así que tampoco se rompe nada.
    function celdasJefes() {
        const zonas = (typeof Biomas !== 'undefined' && Biomas.lista) ? Biomas.lista : [];
        const celdas = [];
        for (const zona of zonas)
            RANGOS_JEFE.forEach(([rango, rotulo], i) =>
                celdas.push(celdaJefe(zona, rango, rotulo, i === 0)));
        return celdas;
    }

    // una columna de jefes en blanco, con sus dos sitios: el alto y el llano
    function columnaVacia() { return [vacia(null, true), vacia()]; }

    // las dos pestañas de arriba: ENEMIGOS y JEFES, con la que toca marcada
    function pestanas() {
        const rotulo = { enemigo: 'bestiario.enemigos', jefe: 'bestiario.jefes' };
        return `
        <div class="pestanas" role="tablist">
            ${CATEGORIAS.map(c => `
            <button type="button" class="pestana${c === categoria ? ' activa' : ''}"
                    role="tab" aria-selected="${c === categoria}" data-categoria="${c}">
                ${TR(rotulo[c])}
            </button>`).join('')}
        </div>`;
    }

    function rejilla() {
        const esJefes = categoria === 'jefe';

        // las bestias que de verdad hay en esta pestaña -para la nota de
        // abajo-, aparte de cómo se dispongan sus huecos en la rejilla
        const propias = BESTIAS.fichas.filter(f => (f.clase || 'enemigo') === categoria);

        // en jefes, la disposición manda: una columna por comarca. En
        // enemigos sigue siendo el cajón de siempre, en el orden en que
        // llegan las fichas
        // el map va con lambda y no con «propias.map(celda)» a posta: map le
        // pasa el índice como segundo argumento, y el segundo de celda es
        // ahora si va alta, así que la segunda bestia de la lista salía de pie
        const celdas = esJefes ? celdasJefes()
            : propias.map(f => descubierta(f) ? celda(f) : vacia());

        // Nunca menos de diez columnas, y nunca una a medio empezar. En
        // enemigos la columna son tres sitios iguales; en jefes son dos, que
        // el de arriba vale por dos renglones, así que se rellena de dos en
        // dos y no de tres en tres.
        if (esJefes) {
            const columnas = Math.max(COLUMNAS, Math.ceil(celdas.length / RANGOS_JEFE.length));
            while (celdas.length < columnas * RANGOS_JEFE.length)
                celdas.push(...columnaVacia());
        } else {
            const sitios = Math.max(COLUMNAS * RENGLONES,
                Math.ceil(celdas.length / RENGLONES) * RENGLONES);
            while (celdas.length < sitios) celdas.push(vacia());
        }

        // sin nadie en la pestaña, la nota lo dice claro y no repite el
        // «pulsa una bestia» de siempre, que ahí no hay ninguna que pulsar
        const nota = propias.length ? TR('bestiario.nota') : TR('bestiario.sinJefes');
        return `
            <h2>${TR('bestiario.titulo')}</h2>
            <p class="saldo">${TR('bestiario.lema')}</p>
            ${pestanas()}
            <div class="rejilla">${celdas.join('')}</div>
            <p class="nota">${nota}</p>`;
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
                <div class="retrato grande"><img src="${BESTIAS.retrato(f.id)}" alt=""></div>
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
        const pestana = e.target.closest('[data-categoria]');
        if (pestana) {
            const c = pestana.dataset.categoria;
            if (c !== categoria) { categoria = c; pintar(); }
            return;
        }
        const elegida = e.target.closest('[data-bestia]');
        if (elegida) { abierta = elegida.dataset.bestia; pintar(); }
    });

    // abrir y cerrar es cosa de menu.js, que sabe de todos los paneles y los
    // cierra entre sí; sin él, esto se abre igual. Se entra siempre por la
    // rejilla de enemigos, aunque la última vez se dejara una hoja abierta o
    // la pestaña de jefes puesta
    boton.addEventListener('click', () => {
        if (typeof alternar === 'function') alternar('bestiario');
        else caja.hidden = !caja.hidden;
        abierta = null;
        categoria = 'enemigo';
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
