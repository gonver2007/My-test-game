/* ============================================================
consola.js - la consola de la portada (Alt+Intro)
Aquí solo está el mueble: la caja, el historial y quien reparte lo
que se teclea. Las órdenes se añaden a mano en ORDENES. Solo vive en
index.html, y nada de lo que hace sale de este navegador.
   ============================================================ */
'use strict';

(function montarConsola() {
    const caja = document.getElementById('consola');
    if (!caja) return;

    const salida = caja.querySelector('.salida');
    const linea = caja.querySelector('input');
    const historial = [];
    let puesto = 0;            // por dónde va el paseo con las flechas

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
        lapis: { campo: 'lapis', nombre: 'lapislázuli' },
        jade:  { campo: 'esquirlas', nombre: 'jade' }
    };

    // dar y quitar son lo mismo con el signo cambiado; el saldo nunca baja de 0
    function repartir(que, ranuras, cuantas, signo, orden) {
        const moneda = MONEDAS[(que || '').toLowerCase()];
        if (!moneda)
            return decir(`Monedas: jade, lapis. Así: ${orden} jade "1,3" 50`, 'mal');

        const n = parseInt(cuantas, 10);
        if (!n) return decir(`Di cuántas: ${orden} ${que} "1,3" 50`, 'mal');

        const cuales = elegirRanuras(ranuras);
        if (!cuales.length)
            return decir('Ranuras del 1 al 5 entre comillas, o todas.', 'mal');

        const aTodas = cuales.length === 5;
        let servidas = 0;
        for (const i of cuales) {
            const p = Partidas.ranura(i);
            // en una ranura sin partida no hay nada que tocar
            if (!p) {
                if (!aTodas) decir(`Ranura ${i + 1}: vacía.`, 'mal');
                continue;
            }
            const saldo = Math.max(0, (p[moneda.campo] || 0) + signo * n);
            Partidas.guardarEn(i, { [moneda.campo]: saldo });
            decir(`Ranura ${i + 1}: ${saldo} de ${moneda.nombre}.`, 'bien');
            servidas++;
        }
        if (!servidas) decir('Ninguna de esas ranuras tiene partida.', 'mal');
    }

    // la inmortalidad se apunta en la ranura; la partida la lee al empezar
    function inmortalidad(ranuras, si) {
        const cuales = elegirRanuras(ranuras);
        if (!cuales.length)
            return decir('Ranuras del 1 al 5 entre comillas, o todas.', 'mal');

        const aTodas = cuales.length === 5;
        let servidas = 0;
        for (const i of cuales) {
            if (!Partidas.ranura(i)) {
                if (!aTodas) decir(`Ranura ${i + 1}: vacía.`, 'mal');
                continue;
            }
            Partidas.guardarEn(i, { god: si });
            decir(`Ranura ${i + 1}: ${si ? 'inmortal' : 'de carne y hueso'}.`, 'bien');
            servidas++;
        }
        if (!servidas) decir('Ninguna de esas ranuras tiene partida.', 'mal');
    }

    const ORDENES = {

        // give jade "1,3" 50   ·   give lapis todas 50
        give(que, ranuras, cuantas) {
            repartir(que, ranuras, cuantas, 1, 'give');
        },

        // ungive jade "1,3" 50   ·   ungive lapis todas 50
        ungive(que, ranuras, cuantas) {
            repartir(que, ranuras, cuantas, -1, 'ungive');
        },

        // god "1,3"   ·   god todas
        god(ranuras) { inmortalidad(ranuras, true); },

        // ungod "1,3"   ·   ungod todas
        ungod(ranuras) { inmortalidad(ranuras, false); }
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
    function abrir(si) {
        caja.hidden = si === undefined ? !caja.hidden : !si;
        if (!caja.hidden) linea.focus();
        else linea.blur();
    }

    addEventListener('keydown', e => {
        if (e.altKey && e.key === 'Enter') { e.preventDefault(); abrir(); return; }
        if (e.key === 'Escape' && !caja.hidden) abrir(false);
    });

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

    decir('Consola del santuario.', 'eco');
})();
