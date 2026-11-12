# Diseño: de arcade nocturno a un rincón tranquilo

Este documento recoge la revisión de producto, interfaz, experiencia, movimiento,
accesibilidad y bienestar que dio lugar a la v2. No es una lista de gustos: cada decisión
responde a un problema concreto de la versión anterior.

## El diagnóstico

La v1 era un arcade oscuro con acentos neón. Funcionaba, pero enviaba el mensaje
equivocado para un portal familiar:

| Señal de la v1                           | Lo que comunicaba                                  |
| ---------------------------------------- | -------------------------------------------------- |
| Fondo casi negro + lima eléctrico        | Noche, competición, urgencia, videojuego hardcore. |
| Logo orbital abstracto                   | Tecnología, no calidez ni juego compartido.        |
| Ticker en movimiento constante           | Ruido y estímulo continuo.                         |
| «No pierdas el ritmo», «caos», «3 vidas» | Presión y lenguaje de arcade clásico.              |
| Marcadores, combos y rachas              | Optimización del tiempo de sesión.                 |
| Glows, shakes y flashes                  | Más excitación, menos calma.                       |
| Letra técnica espaciada                  | Distancia; poca familiaridad.                      |

El problema no era solo estético. La interfaz empujaba a jugar «una más» y el tono no
encajaba con un público familiar que quiere pasar un rato, no competir contra el reloj.

## El equipo y sus lentes

Trabajamos el rediseño desde seis lentes complementarias:

1. **Producto.** Un catálogo pequeño, claro y honesto. Cuatro juegos, sin secciones
   escondidas ni promesas de retención.
2. **UI.** Una identidad cálida y reconocible: flor, papel, tipografía editorial y
   portadas ilustradas.
3. **UX.** Menos decisiones y menos ruido: entrar, elegir, jugar, salir. Pausa y salida
   siempre visibles.
4. **Movimiento.** Animar para orientar, no para excitar. Duraciones largas, recorridos
   cortos, sin rebotes agresivos.
5. **Accesibilidad.** Contraste AA, foco visible, teclado, `prefers-reduced-motion`,
   textos alternativos y jerarquía semántica.
6. **Bienestar y psicología.** Sin dark patterns: ni rachas, ni recompensas variables, ni
   notificaciones, ni comparaciones sociales, ni bucles infinitos que oculten el final.

## La nueva dirección

### Personalidad

**Tranquila, cálida, artesanal y juguetona sin ser infantil.** Como una mesa de madera con
un juego de mesa encima, no como una máquina recreativa en una sala a oscuras.

### Paleta

| Rol         | Color     | Uso                                            |
| ----------- | --------- | ---------------------------------------------- |
| Papel       | `#f6f1e7` | Fondo general cálido, nunca blanco puro.       |
| Crema       | `#fffaf0` | Superficies y texto sobre bosque.              |
| Bosque      | `#2f5d50` | Acción primaria, tinta principal, foco.        |
| Salvia      | `#8fb397` | Acento de Órbita, iconos, detalles tranquilos. |
| Albaricoque | `#df8b6c` | Calidez, acentos editoriales, peligro suave.   |
| Cielo       | `#7fa9c2` | Prisma, información y enlaces secundarios.     |
| Lavanda     | `#a78fbf` | Pulso y variedad cromática.                    |
| Mantequilla | `#d9b95f` | Cristales, logros y detalles.                  |

No hay negro puro ni neón. Los acentos son pasteles con suficiente profundidad para
mantener contraste y jerarquía.

### Tipografía

- **Fraunces Variable** para titulares: serif suave y editorial, con itálicas que aportan
  calidez sin perder carácter.
- **Nunito Sans Variable** para interfaz y texto: humanista, redondeada, muy legible.
- **DM Mono** solo para datos, marcadores y etiquetas técnicas puntuales.

### Logo

Una flor de cuatro pétalos de colores sobre papel. Cuatro juegos, cuatro pétalos, un mismo
centro. Funciona a 16 px como favicon y admite animación mínima al pasar el ratón. Huye del
símbolo orbital tecnológico y del rayo de «arcade».

## Principios de experiencia

1. **Entrar y jugar.** Sin registro, sin tutoriales largos, sin pantallas intermedias.
2. **Partidas cortas.** De 2 a 10 minutos. Sin relojes que metan presión.
3. **Se puede dejar.** Pausa visible, salida clara, progreso local.
4. **Sin comparación.** Récord personal, no ranking social.
5. **Sin sorpresas.** Sin anuncios, compras, monedas, notificaciones ni recompensas diarias.
6. **Un mismo idioma.** Portal, portadas, HUD y juegos comparten color, forma y tono.

## Movimiento

- Entradas de 600–700 ms con `cubic-bezier(.22,.8,.35,1)`.
- Desplazamientos de 10–14 px, no de 40 px.
- Sin marquesinas automáticas, sin pulsos rápidos, sin flashes.
- Portadas animadas a 60–70 s o con respiración suave.
- En juegos: partículas reducidas, shake máximo de 5 px y solo en impactos.
- `prefers-reduced-motion` elimina animaciones decorativas y suaviza el juego.

## Bienestar y no-adicción

El portal no mide el éxito en minutos de sesión. Medidas concretas:

- No hay rachas, calendarios, cofres ni recompensas variables.
- No hay notificaciones ni correos.
- No hay monedas, energía ni esperas artificiales.
- No hay rankings, amigos ni presión social.
- El game over ofrece salir al catálogo con la misma prominencia que reintentar.
- El historial de partidas se puede borrar y no se usa para empujar contenido.
- Las partidas tienen un final claro y no escalan indefinidamente en dificultad sin pausa.

No se prometen beneficios terapéuticos. Solo se evita el diseño que captura la atención
contra la voluntad del jugador.

## Accesibilidad

- Contraste mínimo AA en texto y controles.
- Foco visible en todos los elementos interactivos.
- Teclado completo en los cuatro juegos: flechas, espacio, números y `Esc`/`P`.
- Texto alternativo y `aria-label` en iconos y portadas.
- `aria-live` para cambios de estado relevantes.
- Objetivos táctiles de al menos 44 px.
- Estados ocultos con `hidden`, no solo visualmente.
- Respeto de `prefers-reduced-motion`.

## Los juegos, en el nuevo lenguaje

- **Órbita:** papel salvia, sol de mantequilla, escombros de albaricoque y nave de bosque.
  Tres intentos, sin cuenta atrás.
- **Prisma:** tablero de crema, haces de cielo, espejos de bosque, emisores de albaricoque y
  cristales de mantequilla.
- **Fusión:** orbes de salvia, cielo, lavanda, albaricoque y mantequilla con números crema.
- **Pulso:** cuatro pads pastel, centro de papel y audio suave. «Fin de la ronda», no
  «fallo».

## Lo que evitamos a partir de ahora

- Volver a una paleta oscura con neón.
- Añadir urgencia, cuenta atrás o presión social.
- Usar animaciones para excitar en lugar de orientar.
- Introducir monedas, rachas, misiones diarias o recompensas variables.
- Escribir copy que culpabilice por parar («no pierdas», «no puedes dejarlo»).
- Ocultar la salida o el botón de pausa.
