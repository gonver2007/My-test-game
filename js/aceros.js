/* ============================================================
aceros.js - los bocetos de las armas, en un solo sitio

Antes vivían dentro de vista.js, y allí no los veía nadie más que
la partida. La armería quiere enseñar cada arma antes de comprarla,
y copiar los dibujos habría sido condenarlos a separarse en cuanto
se retocara uno: aquí están una sola vez y beben los dos del mismo
trazo -la partida por ACEROS.dibujos, el panel por ACEROS.lamina-.

Van dibujados sobre un cuadro de 56, mirando a la derecha, que es
como los quiere el juego para rotarlos al empuñarlos.
   ============================================================ */
'use strict';

const ACEROS = (function () {
    const LADO = 56;                 // el cuadro en que están dibujadas

    // solo los colores que tocan el acero, tomados de la paleta del juego.
    // Este archivo se vale por sí mismo a posta: la armería lo carga sin
    // cargar vista.js entero, que es la pantalla de la partida
    const P = {
        tinta: '#17132b',
        acero: '#dfe9ff',
        oro: '#e8b352', oroLuz: '#ffd784', oroSombra: '#9a6f2b',
        bufandaSombra: '#24468f',
        bermellon: '#c8402f', bermellonHondo: '#5e1a15',

        // el aparejo pobre del principio: mango de madera desnuda y guarda de
        // hierro sin dorar. El oro queda para las armas que hay que comprar,
        // así se ve de un vistazo con qué se empieza y con qué se acaba
        madera: '#7a5432', maderaLuz: '#9c6f45', maderaSombra: '#48301c',
        hierro: '#3a3340', hierroLuz: '#5d5568', hierroSombra: '#211c2a'
    };

    // los dos pinceles de siempre: el bulto entintado con su luz y su sombra,
    // y la pincelada blanca que remata. Son gemelos de los de vista.js, que
    // los necesita para todo lo demás y no puede depender de este archivo
    function pieza(g, cx, cy, rx, ry, base, luz, sombra, giro = 0, grosor = 2.4) {
        g.save();
        if (grosor) {
            g.fillStyle = P.tinta;
            g.beginPath(); g.ellipse(cx, cy, rx + grosor, ry + grosor, giro, 0, 6.2832); g.fill();
        }
        g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832);
        g.fillStyle = base; g.fill();
        g.clip();
        if (sombra) {
            g.fillStyle = sombra;
            g.beginPath(); g.ellipse(cx + rx * 0.45, cy + ry * 0.5, rx, ry, giro, 0, 6.2832); g.fill();
        }
        if (luz) {
            g.fillStyle = luz;
            g.beginPath(); g.ellipse(cx - rx * 0.36, cy - ry * 0.48, rx * 0.62, ry * 0.54, giro, 0, 6.2832); g.fill();
        }
        g.restore();
    }

    function brillo(g, cx, cy, rx, ry, giro = 0, alfa = 0.8) {
        g.save();
        g.globalAlpha = alfa;
        g.fillStyle = '#fff';
        g.beginPath(); g.ellipse(cx, cy, rx, ry, giro, 0, 6.2832); g.fill();
        g.restore();
    }

    // ---------- Los cinco aceros ----------
    // Cada uno recibe el lienzo y el centro del cuadro, y se dibuja alrededor.
    // Nada debe salirse de 0 a 56: lo que se pinte fuera se pierde sin aviso.
    const dibujos = {

        tanto(g, c) {
            g.lineCap = 'round';
            g.strokeStyle = P.tinta; g.lineWidth = 6.5;                           // entintado
            g.beginPath(); g.moveTo(c + 3, c + 1); g.quadraticCurveTo(c + 11, c - 1, c + 18, c - 3); g.stroke();
            g.strokeStyle = '#0c0a16'; g.lineWidth = 3.6;                         // hoja negra
            g.beginPath(); g.moveTo(c + 3, c + 1); g.quadraticCurveTo(c + 11, c - 1, c + 18, c - 3); g.stroke();
            g.strokeStyle = '#4a4560'; g.lineWidth = 1.2;                         // filo, apenas un reflejo frío
            g.beginPath(); g.moveTo(c + 5, c - 0.2); g.quadraticCurveTo(c + 11, c - 1.8, c + 17, c - 3.8); g.stroke();
            pieza(g, c, c + 1, 3.6, 2, P.hierro, P.hierroLuz, P.hierroSombra, 1.4, 2);   // guarda
            g.strokeStyle = P.tinta; g.lineWidth = 5.5;                          // empuñadura
            g.beginPath(); g.moveTo(c - 2, c + 2); g.lineTo(c - 8, c + 3.5); g.stroke();
            g.strokeStyle = P.madera; g.lineWidth = 3;
            g.beginPath(); g.moveTo(c - 2, c + 2); g.lineTo(c - 8, c + 3.5); g.stroke();
            g.strokeStyle = P.maderaLuz; g.lineWidth = 0.9;                      // la veta, que redondea el palo
            g.beginPath(); g.moveTo(c - 2.7, c + 1.1); g.lineTo(c - 7.7, c + 2.5); g.stroke();
        },

        katana(g, c) {
            g.lineCap = 'round';
            g.strokeStyle = P.tinta; g.lineWidth = 7.5;                           // entintado
            g.beginPath(); g.moveTo(c + 2, c); g.quadraticCurveTo(c + 14, c - 2, c + 25, c - 5); g.stroke();
            g.strokeStyle = P.acero; g.lineWidth = 4.5;                           // hoja
            g.beginPath(); g.moveTo(c + 2, c); g.quadraticCurveTo(c + 14, c - 2, c + 25, c - 5); g.stroke();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;                         // filo
            g.beginPath(); g.moveTo(c + 4, c - 1.6); g.quadraticCurveTo(c + 14, c - 3.6, c + 24, c - 6); g.stroke();
            pieza(g, c, c, 4.5, 2.4, P.hierro, P.hierroLuz, P.hierroSombra, 1.4, 2);      // guarda
            g.strokeStyle = P.tinta; g.lineWidth = 6;                             // empuñadura
            g.beginPath(); g.moveTo(c - 3, c + 1); g.lineTo(c - 10, c + 3); g.stroke();
            g.strokeStyle = P.madera; g.lineWidth = 3.5;
            g.beginPath(); g.moveTo(c - 3, c + 1); g.lineTo(c - 10, c + 3); g.stroke();
            g.strokeStyle = P.maderaLuz; g.lineWidth = 1;                         // la veta, que redondea el palo
            g.beginPath(); g.moveTo(c - 3.7, c - 0.1); g.lineTo(c - 9.7, c + 1.6); g.stroke();
        },

        yari(g, c) {
            // el asta va corrida cinco puntos a la izquierda de donde estaba:
            // acababa en c+30 y la punta se salía del cuadro -que llega a c+28,
            // y aún hay que descontarle el redondeo del trazo-. Mide lo mismo,
            // pero ahora se ve entera
            g.lineCap = 'round';
            g.strokeStyle = P.tinta; g.lineWidth = 5.5;                           // asta, larga y recta
            g.beginPath(); g.moveTo(c - 18, c + 5); g.lineTo(c + 25, c - 8); g.stroke();
            g.strokeStyle = '#5a3a22'; g.lineWidth = 3.4;
            g.beginPath(); g.moveTo(c - 18, c + 5); g.lineTo(c + 25, c - 8); g.stroke();
            g.strokeStyle = P.acero; g.lineWidth = 3.4;                          // punta, un triángulo estrecho
            g.beginPath(); g.moveTo(c + 15, c - 5); g.lineTo(c + 25, c - 8); g.lineTo(c + 16, c - 3); g.stroke();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1.2;                        // filo
            g.beginPath(); g.moveTo(c + 16, c - 5.6); g.lineTo(c + 24, c - 7.8); g.stroke();
            pieza(g, c + 12, c - 4.4, 2.6, 1.8, P.oro, P.oroLuz, P.oroSombra, -0.35, 2);  // virola
        },

        tetsubo(g, c) {
            // No es una maza: el tetsubō es una barra larga de hierro que va
            // engordando del puño al remate, con las caras planas sembradas de
            // clavos. Ni bola ni pinchos -lo que hace daño es el peso-.
            // Todo se mide sobre un eje, para que clavos y aros caigan a plomo
            g.lineCap = 'round';
            // el cuadro mide 56 y la cabeza es gruesa: el remate se queda en
            // c+22 para que el redondeo del trazo no se salga por la punta
            const ax = c - 14, ay = c + 7, bx = c + 22, by = c - 7;
            const L = Math.hypot(bx - ax, by - ay);
            const dx = (bx - ax) / L, dy = (by - ay) / L;    // a lo largo
            const nx = -dy, ny = dx;                          // de través
            const pt = (t, o) => [ax + dx * L * t + nx * o, ay + dy * L * t + ny * o];
            const tramo = (t1, t2, ancho, color, off) => {
                const [x1, y1] = pt(t1, off || 0), [x2, y2] = pt(t2, off || 0);
                g.strokeStyle = color; g.lineWidth = ancho;
                g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
            };

            tramo(0.03, 0.44, 7, P.tinta);                    // entintado: puño fino
            tramo(0.38, 0.99, 11, P.tinta);                   // y cabeza gruesa
            tramo(0.04, 0.44, 4.4, '#3b3742');                // el hierro del puño
            tramo(0.40, 0.98, 8, '#5c5c68');                  // el de la cabeza
            tramo(0.42, 0.97, 2.2, '#8a8a98', -2.4);          // el canto que coge la luz

            // los aros del agarre
            g.strokeStyle = '#26232e'; g.lineWidth = 1.1;
            for (const t of [0.11, 0.18, 0.25, 0.32]) {
                const [x1, y1] = pt(t, -2.2), [x2, y2] = pt(t, 2.2);
                g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
            }

            // los clavos: dos hileras en la cara y una tercera asomando por el
            // canto, que es lo que le da al perfil ese mordiente de sierra
            for (let i = 0; i < 8; i++) {
                const t = 0.46 + i * 0.068;
                for (const o of [-3.2, 0.4, 3.6]) {
                    const [x, y] = pt(t, o);
                    const borde = Math.abs(o) > 3;
                    g.fillStyle = borde ? '#2c2c34' : '#3a3a46';
                    g.beginPath(); g.arc(x, y, borde ? 1.7 : 1.3, 0, 6.2832); g.fill();
                    g.fillStyle = '#9a9aa8';                   // el reflejo de cada cabeza
                    g.beginPath(); g.arc(x - 0.45, y - 0.5, borde ? 0.65 : 0.5, 0, 6.2832); g.fill();
                }
            }

            // el pomo del extremo, que hace de contrapeso
            const [kx, ky] = pt(0.01, 0);
            g.fillStyle = P.tinta; g.beginPath(); g.arc(kx, ky, 4.2, 0, 6.2832); g.fill();
            g.fillStyle = '#55515f'; g.beginPath(); g.arc(kx, ky, 2.8, 0, 6.2832); g.fill();
            brillo(g, kx - 0.8, ky - 1, 1.5, 1.1, -0.35, 0.6);
        },

        nodachi(g, c) {
            // El espadón de campo. Frente a la katana no basta con alargarle
            // la hoja: lo que lo delata es el puño, largo para las dos manos y
            // envuelto en cordón cruzado, la guarda mayor y el temple ondulado
            // que le corre por el filo. Va en rojo donde la katana va en azul,
            // para distinguirlos de un vistazo en el panel.
            g.lineCap = 'round';

            // ---- el puño, que es media arma ----
            const px0 = c - 17, py0 = c + 7, px1 = c - 2, py1 = c + 2.5;
            g.strokeStyle = P.tinta; g.lineWidth = 7.5;
            g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.stroke();
            g.strokeStyle = P.bermellon; g.lineWidth = 4.5;
            g.beginPath(); g.moveTo(px0, py0); g.lineTo(px1, py1); g.stroke();

            // el cordón, cruzado en rombos como el de verdad
            g.strokeStyle = P.bermellonHondo; g.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const t = 0.13 + i * 0.18;
                const x = px0 + (px1 - px0) * t, y = py0 + (py1 - py0) * t;
                g.beginPath(); g.moveTo(x - 1.5, y - 2.2); g.lineTo(x + 1.5, y + 2.2); g.stroke();
                g.beginPath(); g.moveTo(x + 1.5, y - 2.2); g.lineTo(x - 1.5, y + 2.2); g.stroke();
            }
            pieza(g, px0, py0, 2.2, 1.9, P.oro, P.oroLuz, P.oroSombra, -0.3, 1.8);   // pomo

            // ---- la hoja, larga y de curva suave ----
            const hx0 = c - 1, hy0 = c + 2, hcx = c + 11, hcy = c - 2, hx1 = c + 23, hy1 = c - 9;
            const enHoja = t => {                       // un punto sobre la curva
                const u = 1 - t;
                return [u * u * hx0 + 2 * u * t * hcx + t * t * hx1,
                        u * u * hy0 + 2 * u * t * hcy + t * t * hy1];
            };
            const trazoHoja = (ancho, color) => {
                g.strokeStyle = color; g.lineWidth = ancho;
                g.beginPath(); g.moveTo(hx0, hy0);
                g.quadraticCurveTo(hcx, hcy, hx1, hy1); g.stroke();
            };
            trazoHoja(8, P.tinta);                      // entintado
            trazoHoja(5, P.acero);                      // el acero

            g.strokeStyle = '#ffffff'; g.lineWidth = 1.6;                        // el filo
            g.beginPath(); g.moveTo(c + 1, c + 0.4);
            g.quadraticCurveTo(c + 11, c - 3.6, c + 22, c - 10.2); g.stroke();

            // el temple: la onda que deja el barro al templar. Es el detalle
            // que hace que una hoja grande no se lea como una barra de acero
            g.strokeStyle = 'rgba(255, 255, 255, .5)'; g.lineWidth = 0.9;
            g.beginPath();
            for (let i = 0; i <= 22; i++) {
                const t = i / 22;
                const [x, y] = enHoja(t);
                const [x2, y2] = enHoja(Math.min(1, t + 0.02));
                const ang = Math.atan2(y2 - y, x2 - x);   // de través a la hoja
                const d = 1.15 + Math.sin(t * 17) * 0.45;  // el vaivén del temple
                // (-sen, cos) es la perpendicular: así la onda cae siempre
                // hacia el filo, siga la hoja la curva que siga
                const hx = x - Math.sin(ang) * d, hy = y + Math.cos(ang) * d;
                if (i === 0) g.moveTo(hx, hy); else g.lineTo(hx, hy);
            }
            g.stroke();

            // la guarda, más ancha que la de la katana, y su virola
            pieza(g, c - 1, c + 2, 2, 1.4, P.oro, P.oroLuz, P.oroSombra, 1.35, 1.6);
            pieza(g, c - 2.5, c + 2.6, 5.6, 3, P.oro, P.oroLuz, P.oroSombra, 1.35, 2);
        },

        kusarigama(g, c) {
            g.lineCap = 'round';
            g.strokeStyle = P.tinta; g.lineWidth = 5.5;                              // mango corto
            g.beginPath(); g.moveTo(c - 8, c + 4); g.lineTo(c + 3, c - 1); g.stroke();
            g.strokeStyle = '#4a3018'; g.lineWidth = 3;
            g.beginPath(); g.moveTo(c - 8, c + 4); g.lineTo(c + 3, c - 1); g.stroke();
            g.strokeStyle = P.acero; g.lineWidth = 3.2;                              // hoz, curva y ganchuda
            g.beginPath(); g.moveTo(c + 3, c - 1); g.quadraticCurveTo(c + 14, c - 9, c + 9, c - 15); g.stroke();
            g.strokeStyle = '#ffffff'; g.lineWidth = 1;                              // filo interior
            g.beginPath(); g.moveTo(c + 4, c - 2.4); g.quadraticCurveTo(c + 12, c - 8.5, c + 9, c - 13.2); g.stroke();
            // la cadena se recoge: con el paso largo de antes, ella y el
            // contrapeso caían fuera del cuadro y no se llegaban a ver
            g.strokeStyle = '#8a8a98'; g.lineWidth = 1.1;                            // cadena, eslabón a eslabón
            for (let i = 0, px = c + 3, py = c + 1; i < 6; i++) {
                const nx = px + 3.2, ny = py + 2.6;
                g.beginPath(); g.ellipse((px + nx) / 2, (py + ny) / 2, 1.7, 1,
                    Math.atan2(ny - py, nx - px), 0, 6.2832); g.stroke();
                px = nx; py = ny;
            }
            pieza(g, c + 22, c + 17, 3, 3, '#5c5c68', '#8a8a98', '#2c2c34', 0, 1.6);  // contrapeso
        }
    };

    // ---------- La lámina del panel ----------
    // Devuelve un lienzo con el arma encajada en el hueco que se le pida.
    // El recorte no está escrito a mano: se dibuja en grande, se mira qué
    // píxeles quedaron pintados y se ajusta a esa caja. Así un boceto que
    // se retoque -o uno nuevo- se encuadra solo, sin medidas que actualizar.
    function limites(g, lado) {
        const datos = g.getImageData(0, 0, lado, lado).data;
        let x1 = lado, y1 = lado, x2 = -1, y2 = -1;
        for (let y = 0; y < lado; y++) {
            for (let x = 0; x < lado; x++) {
                if (datos[(y * lado + x) * 4 + 3] < 8) continue;   // transparente
                if (x < x1) x1 = x;
                if (x > x2) x2 = x;
                if (y < y1) y1 = y;
                if (y > y2) y2 = y;
            }
        }
        if (x2 < 0) return null;                                   // no se pintó nada
        return { x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1 };
    }

    function lamina(id, ancho, alto) {
        const dibujo = dibujos[id];
        if (!dibujo) return null;

        const F = 6;                        // el borrador va holgado para medir fino
        const bruto = document.createElement('canvas');
        bruto.width = bruto.height = LADO * F;
        const gb = bruto.getContext('2d');
        gb.scale(F, F);
        dibujo(gb, LADO / 2);

        const caja = limites(gb, LADO * F);
        if (!caja) return null;

        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const lienzo = document.createElement('canvas');
        lienzo.width = Math.round(ancho * dpr);
        lienzo.height = Math.round(alto * dpr);
        lienzo.style.width = ancho + 'px';
        lienzo.style.height = alto + 'px';

        const g = lienzo.getContext('2d');
        // el 0.92 es el aire que se le deja alrededor, para que no vaya
        // rozando los bordes de su hueco
        const escala = Math.min(lienzo.width / caja.w, lienzo.height / caja.h) * 0.92;
        const w = caja.w * escala, h = caja.h * escala;
        g.drawImage(bruto, caja.x, caja.y, caja.w, caja.h,
            (lienzo.width - w) / 2, (lienzo.height - h) / 2, w, h);
        return lienzo;
    }

    return { LADO, dibujos, lamina };
})();
