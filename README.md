# Baiak Compass v0.7.7 TEST

- Ventana de 5 minutos ascendente: 00:00 → 05:00 y reinicio posterior a 00:00.
- Party compacta: nivel, HP, mana, skill principal y tácticas.
- Conserva el cierre del panel de Bosses mediante clic fuera.
- El ícono ya no abre el `default_popup` limitado de Chrome (~800x600): abre una
  ventana propia de 900x800 vía `background.js`, sin tope de tamaño.
- Auto Boss distingue "Cooldown" de "Error": una tarjeta de boss deshabilitada sin
  advertencia de nivel se trata como recarga, no como fallo.
- Auto Boss muestra en vivo qué boss se saltó y por qué (cooldown / ya completado)
  y un resumen final con el conteo por resultado.
- El layout ya no cambia de una a dos columnas al redimensionar la ventana: los
  breakpoints responsivos quedaron deshabilitados porque el ancho del panel es fijo.
- Auto Boss (Bosses detectados / Lista propia) queda fijo en una sola columna
  apilada, como el diseño original, sin importar el tamaño de la ventana.
- Nueva pestaña **Build**: recomienda el árbol de talentos por vocación/nivel/
  objetivo (daño, velocidad, XP, curación, tanque), replicando el algoritmo de
  guia-baiakidle.netlify.app (que a su vez usa el formato de código BT1 nativo
  del juego). Genera y lee códigos BT1. Datos en `build-data.js`, algoritmo en
  `build-engine.js`. Validado línea por línea contra la guía original: mismos
  puntos gastados, mismos nodos y mismo código BT1 en los 5+ escenarios probados
  (una vocación/objetivo distintos cada uno).
- Cada tarjeta de Party tiene un botón "🌳 Build" que carga vocación y nivel de
  ese personaje, cambia a la pestaña Build y genera la recomendación al toque.
- Botón "⧉ Copiar código" junto al código BT1 generado.
- Hunts (catálogo completo) ahora ordena primero las accesibles al nivel del
  personaje de mayor nivel de la party, y dentro de cada grupo de mayor a
  menor XP/h. Las hunts de nivel superior al de la party quedan atenuadas al
  final de la lista.
- Catálogo de bosses: cada tarjeta muestra su nivel mínimo (extraído de
  guia-baiakidle.netlify.app) y la lista se ordena igual que Hunts — bosses
  accesibles al nivel de la party primero (de mayor a menor nivel), el resto
  atenuado al final.
- La lista propia de Auto Boss ya persistía correctamente en
  `chrome.storage.local` entre cierres del popup — confirmado, sin cambios
  necesarios ahí.
- Auto Boss diario: todos los días a las 22:00 (hora del reloj de la PC) se
  dispara sola la lista guardada, vía `chrome.alarms` en `background.js` (no
  `setTimeout`, porque el service worker de MV3 se suspende y no sobreviviría
  hasta esa hora). Al terminar la lista completa (no si se detiene a mano),
  vuelve automáticamente a la hunt mejor rankeada según la configuración
  actual. Toggle "Auto inicio diario" en la pestaña Auto Boss para
  desactivarlo. Requiere que Chrome esté abierto a esa hora — la extensión no
  puede despertar el navegador si está cerrado.
- **Fix de pérdida de datos**: tocar "Detener" en Auto Boss sin ninguna corrida
  activa borraba silenciosamente la lista guardada (`persistBossRun` pisaba
  `bossOwnQueue` con el array vacío inicial). Corregido en dos capas: el
  handler de STOP ahora solo persiste si había una corrida real, y
  `persistBossRun` nunca vuelve a escribir un array vacío sobre la lista
  guardada, venga de donde venga la llamada.
- Agregar bosses en bloque: textarea en "Bosses detectados" para pegar una
  lista de nombres (uno por línea o separados por coma) y agregarlos todos
  de una — sin tener que clickear uno por uno. Ignora mayúsculas, tildes y
  apóstrofes curvos vs rectos; informa cuántos se agregaron, cuántos ya
  estaban y cuáles no matchearon ningún boss del catálogo.
- **Fix crítico de Auto Boss**: la detección de "Cooldown" usaba el atributo
  `disabled` del DOM como pista, pero una tarjeta también queda `disabled`
  mientras el boss está EN COMBATE (pelea todavía en curso) — eso hacía que
  la cola saltara al siguiente boss sin haber terminado de pelear al
  anterior, y marcara como "Cooldown" bosses que en realidad estaban
  disponibles. Comparado contra la versión original de la extensión (previa
  a esta sesión): el autor original ya había identificado la señal
  correcta — el juego le pone la clase CSS `.locked` a la tarjeta
  específicamente cuando está en cooldown, distinta de
  `disabled`/`aria-disabled` (que también se activa en combate). Restaurado:
  "Cooldown" ahora requiere `.locked` **y** el badge de temporizador (ej.
  "22h 22m", "04:12:33") en la tarjeta — nunca se infiere solo de
  `disabled`. Si no hay ninguna señal reconocible, se marca "Error"
  (visible) en vez de asumir "Cooldown" en silencio.
- **Fix: la lista de Auto Boss "revivía sola"**. `loadBosses()` (el poll cada
  2s) reemplazaba la lista guardada por `ownBossRun.queue` — el estado
  interno del content script, que queda pegado en memoria con la última
  corrida y nunca se limpia solo. Si tocabas "Eliminar lista", quedaba vacía
  un instante y a los 2 segundos el próximo poll la traía de vuelta. Ahora
  solo se adopta esa cola "en vivo" mientras hay una corrida realmente
  activa (running/paused); en cualquier otro momento manda la lista guardada
  en `chrome.storage.local`, que es la que vos controlás.
- Botón "Eliminar lista" (antes "Limpiar") ahora pide confirmación antes de
  borrar y avisa cuántos bosses tenía.
- El estado de cada boss en "Lista propia" ahora se calcula contra el
  catálogo detectado en vivo (el mismo que usa el panel izquierdo, con el
  fix de `.locked`) en vez de un status archivado — si un boss ya no está en
  cooldown en el juego, la lista lo refleja sin necesidad de correr Auto
  Boss de nuevo.
- Catálogo de bosses corregido contra guia-baiakidle.netlify.app: se agregaron
  3 bosses faltantes (The Baron from Below, The Duke of the Depths, The Count
  of the Core) y se corrigió la categoría de 6 bosses de quest que estaban mal
  etiquetados como archfoe/nemesis/bane. Ahora son 99/99, y el filtro tiene
  categoría "Quest".
