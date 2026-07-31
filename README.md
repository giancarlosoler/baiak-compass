# Baiak Compass v1.0

Extensión para **Baiak Idle** que reúne recomendaciones de hunt, métricas reales,
gestión de party, builds, stamina y automatización de bosses en una ventana propia.

## Pestañas

### Advisor

Muestra la mejor hunt para XP, gold y balance según la party detectada. También
registra una medición real de 5 minutos, compara la estimación con el rendimiento
real y permite ir directamente a una hunt recomendada.

### Hunts

Catálogo completo de hunts con búsqueda, requisitos de nivel y orden de prioridad.
Las hunts accesibles para el personaje de mayor nivel aparecen primero.

### Party

Detecta los personajes de la party y resume nivel, HP, mana, skill principal y
tácticas. Desde cada personaje se puede abrir directamente su recomendación de
Build.

### Build

Genera una recomendación de árbol de talentos por vocación, nivel y objetivo:
daño, velocidad de ataque, XP, curación o tanque. Permite exportar, copiar e
importar códigos BT1.

### Analytics

Guarda el historial de mediciones reales de 5 minutos para consultar XP/h, gold/h,
profit y la diferencia frente a las estimaciones de cada hunt.

### Auto Boss

Permite buscar bosses, agregarlos a una cola y definir su orden. Al iniciar:

- Omite bosses ya completados o en cooldown y comienza en el primer pendiente.
- Elegir un boss inicia su combate automáticamente.
- Avanza al siguiente cuando aparece `Nombre del boss defeated!`.
- También avanza si aparece `You fell to Nombre del boss.`: el intento ya fue
  consumido y el boss queda en cooldown.
- Marca los bosses ya procesados como **Ya completado** durante la ejecución.
- Si no recibe un mensaje terminal, permanece esperando y no salta al siguiente
  boss a ciegas.

La cola se guarda entre cierres. Opcionalmente puede iniciarse todos los días a
las 22:00, hora del PC; al terminar, vuelve a la hunt recomendada.

### Stamina

Automatiza la entrada a Training cuando la stamina baja del porcentaje elegido y
la salida cuando se recupera. Se puede volver a la hunt recomendada, a la anterior
o limitarse a notificar.

## Uso

1. Carga la extensión descomprimida desde `chrome://extensions` con el modo de
   desarrollador activado.
2. Abre Baiak Idle y pulsa el icono de Baiak Compass.
3. Recarga la extensión y la pestaña del juego después de actualizar sus archivos.
