/* ============================================================
consola.js - la consola de la portada (Alt+Intro)
Aquí solo está el mueble: la caja, el historial y quien reparte lo
que se teclea. Las órdenes se añaden a mano en ORDENES. Vive en la
portada y, con «cheat on», también en la partida; nada de lo que hace
sale de este navegador.
   ============================================================ */
'use strict';

(function montarConsola() {
    const caja = document.getElementById('consola');
    if (!caja) return;

    const salida = caja.querySelector('.salida');
    const linea = caja.querySelector('input');
    const historial = [];
    let puesto = 0;            // por dónde va el paseo con las flechas

    // la misma consola sirve en los dos sitios, pero no hace lo mismo en cada
    // uno: hay órdenes que solo tienen sentido con una partida delante
    const enPartida = document.body.classList.contains('juego');

    // ---------- Escribir ----------
    // clase: sin nada el color de siempre, 'eco' apagado, 'bien' jade, 'mal' rojo
    function decir(texto, clase) {
        const p = document.createElement('div');
        if (clase) p.className = clase;
        p.textContent = texto;
        salida.appendChild(p);
        salida.scrollTop = salida.scrollHeight;
    }

    // "1,3" o "1, 3" o todas -> [0, 2] / [0, 1, 2, 3, 4]
    function elegirRanuras(texto) {
        const dicho = (texto || '').toLowerCase();
        if (dicho === 'todas' || dicho === '*') return [0, 1, 2, 3, 4];
        const cuales = [];
        for (const trozo of dicho.split(',')) {
            const n = parseInt(trozo.trim(), 10) - 1;
            if (n >= 0 && n < 5 && cuales.indexOf(n) < 0) cuales.push(n);
        }
        return cuales;
    }

    // ---------- Comandos ----------
    // Una entrada por orden: el nombre tecleado y lo que hace. Lo que se
    // escriba detrás llega como argumentos sueltos, siempre en texto:
    //
    //   saludo(nombre) { decir(`Hola, ${nombre || 'forastero'}.`); }
    //
    // cada moneda dice cómo se llama en la ranura y cómo se lee en voz alta
    const MONEDAS = {
        orbes: { campo: 'orbes', nombre: 'orbes azules' },
        jade:  { campo: 'esquirlas', nombre: 'jade' }
    };

    // El esqueleto de toda orden que toca ranuras: se eligen, se recorren
    // saltando las que no tienen partida -sin dar la lata una por una cuando se
    // han pedido todas- y se avisa al final si no había ninguna. Lo propio de
    // cada orden es solo lo que hace con las que sí valen.
    function porCadaRanura(ranuras, hacer) {
        const cuales = elegirRanuras(ranuras);
        if (!cuales.length)
            return decir('Ranuras del 1 al 5 entre comillas, o todas.', 'mal');

        const aTodas = cuales.length === 5;
        let servidas = 0;
        for (const i of cuales) {
            const p = Partidas.ranura(i);
            if (!p) {
                if (!aTodas) decir(`Ranura ${i + 1}: vacía.`, 'mal');
                continue;
            }
            hacer(i, p);
            servidas++;
        }
        if (!servidas) decir('Ninguna de esas ranuras tiene partida.', 'mal');
    }

    // dar y quitar son lo mismo con el signo cambiado; el saldo nunca baja de 0
    function repartir(que, ranuras, cuantas, signo, orden) {
        const moneda = MONEDAS[(que || '').toLowerCase()];
        if (!moneda)
            return decir(`Monedas: jade, orbes. Así: ${orden} jade "1,3" 50`, 'mal');

        const n = parseInt(cuantas, 10);
        if (!n) return decir(`Di cuántas: ${orden} ${que} "1,3" 50`, 'mal');

        porCadaRanura(ranuras, (i, p) => {
            const saldo = Math.max(0, (p[moneda.campo] || 0) + signo * n);
            Partidas.guardarEn(i, { [moneda.campo]: saldo });
            decir(`Ranura ${i + 1}: ${saldo} de ${moneda.nombre}.`, 'bien');
        });
    }

    // un sí o un no apuntado en las ranuras que se digan; el rótulo cuenta en
    // voz alta cómo queda cada una
    function apuntar(ranuras, campo, si, rotulo) {
        porCadaRanura(ranuras, i => {
            Partidas.guardarEn(i, { [campo]: si });
            decir(`Ranura ${i + 1}: ${rotulo(si)}.`, 'bien');
        });
    }

    // la inmortalidad se apunta en la ranura; la partida la lee al empezar
    function inmortalidad(ranuras, si) {
        apuntar(ranuras, 'god', si,
            si => si ? 'inmortal' : 'de carne y hueso');
    }

    // el permiso de consola también vive en la ranura: game.html lo mira al
    // cargar y, si está encendido, deja abrirla desde el menú de Esc
    function permisoConsola(ranuras, si) {
        apuntar(ranuras, 'cheat', si,
            si => si ? 'con consola en la partida' : 'sin consola en la partida');
    }

    // Saltar de senda sin cruzar puertas. Esto no toca ninguna ranura: pasa
    // en la partida que se está jugando, así que solo vale dentro de
    // game.html y con el camino ya en pie
    function teletransportar(aDonde) {
        if (!enPartida)
            return decir('«tp» solo vale dentro de la partida.', 'mal');
        if (typeof J === 'undefined' || typeof nuevoNivel !== 'function'
            || typeof construirLienzoNivel !== 'function')
            return decir('El camino todavía no está trazado.', 'mal');
        if (J.muerto)
            return decir('Has caído: desde aquí no se va a ninguna senda.', 'mal');

        // el camino llega hasta donde diga biomas.js; sin él, las cien de siempre
        const tope = (typeof Biomas !== 'undefined') ? Biomas.FINAL : 100;
        const n = parseInt(aDonde, 10);
        if (!(n >= 1 && n <= tope))
            return decir(`Una senda del 1 al ${tope}. Así: tp 7`, 'mal');

        J.nivel = n;
        J.completado = false;       // se salta a una senda, no al final del camino
        nuevoNivel();               // el recinto nuevo, con el héroe en su entrada
        construirLienzoNivel();     // y la vista repintada con la comarca que toque
        const comarca = (typeof Biomas !== 'undefined') ? Biomas.nombre(n) : 'santuario';
        decir(`Senda ${n}: ${comarca}.`, 'bien');
    }

    // Enseñar o esconder los cercos. Como «tp», esto pasa en la partida que se
    // está jugando y no toca ninguna ranura: solo vale dentro de game.html, y
    // quien pinta es la vista.
    function cercos(si) {
        if (!enPartida)
            return decir('«hitbox» solo vale dentro de la partida.', 'mal');
        if (typeof mostrarCercos !== 'function')
            return decir('La vista todavía no está en pie.', 'mal');
        mostrarCercos(si);
        decir(si ? 'Cercos a la vista: el cuadrado es su caja, y el círculo de dentro es lo que de verdad choca.'
                 : 'Cercos escondidos.', 'bien');
    }

    // cada orden con su forma de escribirla y lo que hace: es la lista que
    // se recita con «gon info ver»
    const AYUDA = [
        ['give <moneda> <ranuras> <cuántas>',   'añade jade u orbes azules a esas ranuras'],
        ['ungive <moneda> <ranuras> <cuántas>', 'quita jade u orbes azules de esas ranuras'],
        ['god <ranuras>',                       'el personaje de esas ranuras se vuelve inmortal'],
        ['ungod <ranuras>',                     'les devuelve la carne y el hueso'],
        ['cheat on <ranuras>',                  'deja abrir esta consola desde el menú de Esc de la partida'],
        ['cheat of <ranuras>',                  'vuelve a cerrarles la consola dentro de la partida'],
        ['tp <senda>',                          'salta a esa senda; solo dentro de la partida'],
        ['hitbox',                              'enseña el cerco del héroe y el de cada enemigo'],
        ['unhitbox',                            'los vuelve a esconder'],
        ['gon info ver',                        'recita esta misma lista'],
        ['clear',                               'borra el chat de la consola y el historial']
    ];

    function recitarOrdenes() {
        decir('Órdenes del santuario:', 'bien');
        for (const orden of AYUDA) decir('  ' + orden[0] + ' — ' + orden[1]);
        decir('  monedas: jade, orbes · ranuras: "1,3" entre comillas, o todas', 'eco');
    }

    const ORDENES = {

        // gon info ver -> la lista de todo lo que se puede teclear
        gon(a, b) {
            if ((a || '').toLowerCase() === 'info' && (b || '').toLowerCase() === 'ver')
                return recitarOrdenes();
            decir('Así: gon info ver', 'mal');
        },

        // clear -> la consola queda como recién abierta: sin chat y sin
        // nada que pasear con las flechas
        clear() {
            salida.textContent = '';
            historial.length = 0;
            puesto = 0;
        },

        // give jade "1,3" 50   ·   give orbes todas 50
        give(que, ranuras, cuantas) {
            repartir(que, ranuras, cuantas, 1, 'give');
        },

        // ungive jade "1,3" 50   ·   ungive orbes todas 50
        ungive(que, ranuras, cuantas) {
            repartir(que, ranuras, cuantas, -1, 'ungive');
        },

        // god "1,3"   ·   god todas
        god(ranuras) { inmortalidad(ranuras, true); },

        // ungod "1,3"   ·   ungod todas
        ungod(ranuras) { inmortalidad(ranuras, false); },

        // cheat on "1,3"   ·   cheat of todas
        // «of» es como está escrito en las notas; «off» también vale
        cheat(estado, ranuras) {
            const dicho = (estado || '').toLowerCase();
            if (dicho === 'on') return permisoConsola(ranuras, true);
            if (dicho === 'of' || dicho === 'off') return permisoConsola(ranuras, false);
            decir('Así: cheat on "1,3"  ·  cheat of todas', 'mal');
        },

        // tp 7 — la senda a la que se salta, del 1 al último peldaño del camino
        tp(aDonde) { teletransportar(aDonde); },

        // hitbox · unhitbox — el cerco del héroe y el de cada enemigo, encima
        // de todo lo demás
        hitbox() { cercos(true); },
        unhitbox() { cercos(false); }
    };

    // se parte por espacios, salvo dentro de comillas: así "1, 3" llega de una
    // pieza y sin ellas
    function trocear(texto) {
        const trozos = texto.match(/"[^"]*"|'[^']*'|\S+/g) || [];
        return trozos.map(t => t.replace(/^["']|["']$/g, ''));
    }

    function ejecutar(texto) {
        const partes = trocear(texto);
        const orden = (partes.shift() || '').toLowerCase();
        if (!orden) return;
        decir('> ' + texto, 'eco');
        if (!ORDENES[orden]) return decir(`No conozco «${orden}».`, 'mal');
        try { ORDENES[orden].apply(null, partes); }
        catch (e) { decir('Algo ha fallado: ' + e.message, 'mal'); }
    }

    // ---------- Abrir y cerrar ----------
    // En la portada la consola es de la casa. Dentro de la partida solo se
    // abre si la ranura lleva el permiso que enciende «cheat on»
    function permitida() {
        if (!enPartida) return true;
        return !!(typeof Partidas !== 'undefined' && Partidas.actual().cheat);
    }

    function abrir(si) {
        if (!permitida()) return;
        caja.hidden = si === undefined ? !caja.hidden : !si;
        if (!caja.hidden) linea.focus();
        else linea.blur();
    }

    addEventListener('keydown', e => {
        if (e.altKey && e.key === 'Enter') { e.preventDefault(); abrir(); return; }
        if (e.key === 'Escape' && !caja.hidden) {
            // el Esc que cierra la consola no le sirve además al menú del juego
            e.stopImmediatePropagation();
            abrir(false);
        }
    });

    // el botón del menú de Esc: solo lo tiene game.html, y solo se enseña a
    // quien haya encendido el permiso desde la portada
    const botonMenu = document.getElementById('mjConsola');
    if (botonMenu && permitida()) {
        botonMenu.hidden = false;
        botonMenu.addEventListener('click', () => abrir(true));
    }

    linea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.altKey) {
            e.stopPropagation();               // que el menú no se lleve el Intro
            const texto = linea.value;
            if (texto.trim()) { historial.push(texto); ejecutar(texto); }
            puesto = historial.length;
            linea.value = '';
            return;
        }
        // las flechas pasean por lo ya tecleado
        if (e.key === 'ArrowUp' && puesto > 0) {
            linea.value = historial[--puesto] || '';
            e.preventDefault();
        }
        if (e.key === 'ArrowDown' && puesto < historial.length) {
            linea.value = historial[++puesto] || '';
            e.preventDefault();
        }
    });

    decir('Consola del santuario. Escribe «gon info ver» para la lista.', 'eco');
})();
