// PROTOCOLOS POR LESIÓN · propuesta inicial basada en la evidencia (ver docs/protocolos.md).
// Jone ajusta los valores en Panel > Método. Los criterios y resultados de los tests
// son solo para Jone: el paciente solo ve "Enviado · te respondo en 24 h".

import type { InjuryKey, ProtoPhase, ProtoTest, Protocols, TestSpec } from './model'

const t = (id: string, name: string, how: string, measure: TestSpec['measure'], rule: TestSpec['rule'], value: number, note = ''): ProtoTest => ({
  id,
  name,
  how,
  spec: { measure, rule, value, note },
})
const ph = (objective: string, work: string, tests: ProtoTest[], goals: string[]): ProtoPhase => ({ objective, work, tests, goals, key: [] })

// tests que se repiten en varias lesiones
const pogo = (id: string) => t(id, 'Saltitos con los dos pies (pogo)', 'Saltos pequeños y rápidos sobre la punta, todo el tiempo que pueda sin dolor', 'secs', 'min', 30, 'Dolor ≤ 3/10 y sin más dolor al día siguiente')
const comba = (id: string) => t(id, 'Comba', 'Saltar a la comba a ritmo cómodo', 'secs', 'min', 120, 'Sin más dolor al día siguiente')
const hop1 = (id: string) => t(id, 'Saltos en el sitio a una pierna', 'Segundos seguidos saltando a una pierna, cada lado', 'secs', 'lsi', 90, 'Al menos 30 s por pierna, sin dolor y con buena técnica')
const hopH = (id: string) => t(id, 'Salto horizontal a una pierna', 'Mejor de 3 intentos por pierna, aterrizando estable', 'cm', 'lsi', 90, 'Orientativo: viene de rodilla operada, no usar como único criterio')
const walk30 = (id: string) => t(id, 'Caminar 30 min a paso rápido', 'Caminata de 30 min sin parar', 'check', 'check', 1, 'Sin dolor y sin empeorar al día siguiente')
const run30 = (id: string) => t(id, 'Correr 30 min seguidos en llano', 'Carrera continua suave', 'check', 'check', 1, 'Dolor ≤ 3/10 y normal al día siguiente')
const next24 = (id: string) => t(id, 'Dolor al día siguiente de correr', 'Dolor a la mañana siguiente (0-10)', 'dolor', 'max', 3, 'Si dura más de 48 h, bajar carga')
const RUN_WORK =
  "Correr-caminar progresivo: de 1' corre / 1' camina × 10 a 5' / 1' en 2-3 semanas, y luego continuo. Cambiar una sola cosa cada vez (tiempo, ritmo, cuestas). Seguir con la fuerza 2 días por semana."
const RUN_GOALS = ['Corres 20-30 minutos seguidos', 'Corres 3 días por semana durante 3 semanas sin recaída', 'Cumples tu objetivo personal']

export const PROTOCOLS: Record<InjuryKey, Record<number, ProtoPhase>> = {
  cintilla: {
    1: ph(
      'Calmar la zona y que el día a día no duela.',
      'Evitar bajadas y lo que provoque dolor. Isométricos de cadera y rodilla. Movilidad de cadera.',
      [
        t('ci1a', 'Dolor en el día a día', 'Media de la última semana (0-10)', 'dolor', 'max', 3),
        t('ci1b', 'Bajar escaleras', 'Bajar dos pisos sin agarrarse: dolor máximo (0-10)', 'dolor', 'max', 3),
      ],
      ['Dolor del día a día de 3/10 o menos durante 1-2 semanas', 'Bajas escaleras sin que el dolor te frene'],
    ),
    2: ph(
      'Recuperar la fuerza de los abductores de cadera (la clave en la cintilla).',
      'Almeja, abducción de lado, puente, paso lateral con banda, equilibrio a una pierna y sentadilla a una pierna.',
      [
        t('ci2a', 'Plancha lateral', 'Segundos aguantando, cada lado', 'secs', 'lsi', 90),
        t('ci2b', 'Abducción de cadera de lado hasta el fallo', 'Repeticiones, cada lado', 'reps', 'lsi', 90),
        t('ci2c', 'Sentadilla a una pierna', 'Repeticiones a 30-45° con buena técnica', 'reps', 'min', 10, 'Sin que la rodilla se vaya hacia dentro ni caiga la pelvis, sin dolor'),
      ],
      ['Fuerza de cadera parecida en los dos lados', 'Sentadilla a una pierna controlada, 10 por lado'],
    ),
    3: ph(
      'Que la pierna vuelva a tolerar impactos rápidos.',
      'Saltitos (pogo), saltos laterales suaves, comba.',
      [pogo('ci3a'), t('ci3b', 'Saltos laterales a dos pies', 'Segundos seguidos de lado a lado', 'secs', 'min', 30, 'Sin dolor')],
      ['Saltos con los dos pies sin dolor', 'Sin más dolor al día siguiente'],
    ),
    4: ph(
      'Preparar la carrera: saltos a una pierna y caminar rápido.',
      'Saltos a una pierna, bajar de un escalón rápido, caminar a paso rápido.',
      [walk30('ci4a'), hop1('ci4b')],
      ['Caminas 30 min rápido sin dolor', 'Saltos a una pierna parecidos en las dos piernas'],
    ),
    5: ph(
      'Volver a correr sin que vuelva el dolor.',
      'Correr 3 días por semana. Subir el volumen una vez por semana (unos 800 m más). Primero en llano; cuestas abajo y trail al final, en días separados. Correr hasta notar tensión, nunca dolor.',
      [run30('ci5a'), t('ci5b', 'Bajada de 5 minutos', 'Correr cuesta abajo suave', 'dolor', 'max', 3), next24('ci5c')],
      RUN_GOALS,
    ),
  },
  aquiles: {
    1: ph(
      'Calmar el tendón y empezar a cargarlo.',
      'Isométricos de gemelo y sóleo (por ejemplo 5 × 45 s). Elevaciones de talón con las dos piernas. Si duele en la inserción (a menos de 2 cm del talón): talones en suelo plano, sin bajar del escalón y sin estirar el gemelo.',
      [
        t('aq1a', 'Dolor en el día a día', 'Media de la última semana (0-10)', 'dolor', 'max', 3),
        t('aq1b', 'Elevaciones de talón a una pierna', 'Repeticiones seguidas en suelo plano', 'reps', 'min', 10, 'Dolor ≤ 3/10'),
      ],
      ['Dolor del día a día de 3/10 o menos', 'La rigidez de la mañana va a menos', 'Haces 10 elevaciones de talón a una pierna'],
    ),
    2: ph(
      'Recuperar la fuerza y la resistencia del gemelo y el sóleo.',
      'Talón a una pierna con peso (desde escalón solo si es porción media), sóleo con rodilla doblada, fuerza lenta y pesada.',
      [
        t('aq2a', 'Talón a una pierna hasta el fallo', 'Repeticiones con ritmo de metrónomo, cada pierna', 'reps', 'lsi', 90, 'Y al menos 25 repeticiones (la media en adultos sanos es unas 24-25)'),
        t('aq2b', 'Dolor a las 24 h del test', 'A la mañana siguiente (0-10)', 'dolor', 'max', 3),
      ],
      ['Elevación de talón a una pierna, 3 × 15 por lado', 'Tu pierna lesionada aguanta casi lo mismo que la sana'],
    ),
    3: ph('Que el tendón vuelva a tolerar impactos rápidos.', 'Saltitos (pogo) y comba.', [pogo('aq3a'), comba('aq3b')], ['Saltos a la comba 2 minutos sin más dolor al día siguiente', 'Pogo jumps 3 × 20 con buena técnica']),
    4: ph('Preparar la carrera: saltos a una pierna.', 'Saltos a una pierna, saltos hacia delante, caminar rápido.', [hop1('aq4a'), hopH('aq4b'), walk30('aq4c')], [
      'Saltos a una pierna 3 × 10 por lado',
      'Aterrizas estable en saltos horizontales',
    ]),
    5: ph(
      'Volver a correr. Puede llevar de 6 semanas a 1 año.',
      RUN_WORK + ' Si duele en la inserción: alza en la zapatilla que se va quitando poco a poco.',
      [run30('aq5a'), next24('aq5b')],
      RUN_GOALS,
    ),
  },
  fascitis: {
    1: ph(
      'Que el primer paso de la mañana y el día a día duelan menos.',
      'Elevaciones de talón con las dos piernas (3 s sube, 2 s arriba, 3 s baja), movilidad de tobillo y fuerza del pie (pie corto).',
      [
        t('fa1a', 'Dolor al primer paso de la mañana', 'Dolor (0-10) al levantarse', 'dolor', 'max', 3),
        t('fa1b', 'Dolor en el día a día', 'Media de la última semana (0-10)', 'dolor', 'max', 3),
      ],
      ['El primer paso de la mañana duele 3/10 o menos', 'Caminas por casa sin cojear'],
    ),
    2: ph(
      'Fuerza de alta carga de la planta del pie y la pantorrilla.',
      'Elevación de talón a una pierna con una toalla enrollada bajo los dedos, con peso progresivo (3 s sube, 2 s arriba, 3 s baja). Pie corto. Fuerza de cadera.',
      [
        t('fa2a', 'Talón a una pierna con toalla hasta el fallo', 'Repeticiones, cada pierna', 'reps', 'lsi', 90, 'Y unas 20-25 repeticiones (cifra práctica, no validada)'),
        walk30('fa2b'),
      ],
      ['Elevación de talón con toalla, 3 × 12 con peso', 'Caminas 30 min sin dolor'],
    ),
    3: ph('Que el pie vuelva a tolerar impactos rápidos.', 'Saltitos (pogo) y comba.', [pogo('fa3a'), comba('fa3b')], ['Saltos con los dos pies sin dolor', 'Sin más dolor al día siguiente']),
    4: ph('Preparar la carrera: saltos a una pierna.', 'Saltos a una pierna, saltos hacia delante.', [hop1('fa4a'), hopH('fa4b')], ['Saltos a una pierna sin dolor', 'Aterrizas estable a una pierna']),
    5: ph('Volver a correr mientras sigues con la fuerza.', RUN_WORK, [run30('fa5a'), next24('fa5b')], RUN_GOALS),
  },
  rotuliana: {
    1: ph(
      'Calmar el tendón con isométricos.',
      'Isométricos de cuádriceps a una pierna (por ejemplo 5 × 45 s con la rodilla a 30-60°), 2-3 veces al día.',
      [t('ro1a', 'Sentadilla a una pierna en plano inclinado', 'Tronco recto, bajar hasta 90° o hasta donde deje el dolor (0-10)', 'dolor', 'max', 3)],
      ['Dolor del día a día de 3/10 o menos durante dos semanas', 'Los isométricos no te dejan más dolor al día siguiente'],
    ),
    2: ph(
      'Fuerza lenta y pesada.',
      'Prensa, extensión de rodilla y sentadilla búlgara a una pierna, lentas y con peso. Cuestionario VISA-P cada 4 semanas o más.',
      [
        t('ro2a', 'Sentadilla a una pierna en plano inclinado', 'Dolor (0-10) bajando hasta 90°', 'dolor', 'max', 3),
        t('ro2b', 'Sentadilla a una pierna hasta el fallo', 'Repeticiones, cada pierna', 'reps', 'lsi', 90),
        t('ro2c', 'Prensa a una pierna', 'Peso que mueve con buena técnica', 'check', 'check', 1, 'Hay guías que piden 1,5 veces el peso corporal (comprobar en el original)'),
      ],
      ['Sentadilla a una pierna controlada, 3 × 8 por lado', 'Fuerza parecida en las dos piernas'],
    ),
    3: ph(
      'Almacenamiento de energía: que el tendón tolere saltos.',
      'Saltos con dos pies, saltos de caída y cambios de dirección suaves. Volver a lo normal en 24 h.',
      [pogo('ro3a'), t('ro3b', '10 saltos con los dos pies', 'Saltos seguidos hacia arriba', 'dolor', 'max', 3, 'Y normal a las 24 h')],
      ['Saltos con los dos pies sin más dolor al día siguiente', 'Pogo jumps 3 × 20 con buena técnica'],
    ),
    4: ph('Preparar la carrera: saltos a una pierna.', 'Saltos a una pierna, saltos hacia delante, cambios de dirección.', [hop1('ro4a'), hopH('ro4b')], [
      'Saltos a una pierna 3 × 10 por lado',
      'Cambios de dirección suaves sin dolor que te frene',
    ]),
    5: ph('Volver a correr. Puede llevar de 6 a 12 meses.', RUN_WORK, [run30('ro5a'), next24('ro5b')], RUN_GOALS),
  },
  periostitis: {
    1: ph(
      'Calmar la tibia: que caminar y el día a día no duelan.',
      'Reducir o parar la carrera. Fuerza sin impacto: elevación de talones, sóleo con rodilla doblada, tibial anterior. Bici o elíptica si no duele.',
      [
        t('pe1a', 'Dolor al presionar la tibia', 'Dolor (0-10) al apretar el borde interno de la tibia', 'dolor', 'max', 3),
        t('pe1b', 'Saltitos con los dos pies', '10 saltitos seguidos: dolor (0-10)', 'dolor', 'max', 2),
      ],
      ['Caminas sin dolor en la tibia', 'Te duele menos al presionar la tibia'],
    ),
    2: ph(
      'Fuerza de gemelo, sóleo y tibial para que la tibia reciba menos carga.',
      'Elevación de talón a una pierna (rodilla estirada y doblada), tibial anterior y posterior, fuerza de cadera.',
      [
        t('pe2a', 'Talón a una pierna hasta el fallo', 'Repeticiones, cada pierna', 'reps', 'lsi', 90, 'Y al menos 25'),
        t('pe2b', 'Sóleo a una pierna con rodilla doblada', 'Repeticiones, cada pierna', 'reps', 'lsi', 90),
      ],
      ['Elevación de talón a una pierna, 3 × 15 por lado', 'Fuerza parecida en las dos piernas'],
    ),
    3: ph('Que la tibia vuelva a tolerar impactos.', 'Saltitos (pogo) y comba, aumentando poco a poco.', [pogo('pe3a'), comba('pe3b')], ['Saltos con los dos pies sin dolor en la tibia', 'Sin más dolor al día siguiente']),
    4: ph('Preparar la carrera: saltos a una pierna.', 'Saltos a una pierna, saltos hacia delante, caminar rápido.', [hop1('pe4a'), walk30('pe4b')], ['Saltos a una pierna sin dolor', 'Caminas 30 min rápido sin dolor']),
    5: ph('Volver a correr sin recaer.', RUN_WORK + ' Subir cadencia un 5-10 % y evitar subir mucho volumen de golpe.', [run30('pe5a'), next24('pe5b')], RUN_GOALS),
  },
  isquios: {
    1: ph(
      'Calmar el tendón: evitar estirar el isquio con presión (sentarse mucho, estiramientos).',
      'Isométricos de isquios sin flexionar mucho la cadera (puente isométrico, curl isométrico). Evitar estiramientos.',
      [
        t('is1a', 'Dolor al estar sentado', 'Dolor (0-10) tras 30 min sentado', 'dolor', 'max', 3),
        t('is1b', 'Puente a una pierna (isométrico)', 'Segundos aguantando, cada lado', 'secs', 'lsi', 80, 'Dolor ≤ 3/10'),
      ],
      ['Estás sentado 30 min sin que el dolor te frene', 'Los isométricos no te dejan más dolor al día siguiente'],
    ),
    2: ph(
      'Fuerza del isquio, añadiendo poco a poco flexión de cadera.',
      'Puente, peso muerto rumano, curl de isquios, nórdico asistido. Avanzar la flexión de cadera según el dolor.',
      [
        t('is2a', 'Puente a una pierna hasta el fallo', 'Repeticiones, cada lado', 'reps', 'lsi', 90, 'Y al menos 20'),
        t('is2b', 'Peso muerto rumano a una pierna', 'Repeticiones con buena técnica', 'reps', 'lsi', 90),
      ],
      ['Puente a una pierna, 3 × 15 por lado', 'Peso muerto a una pierna sin dolor'],
    ),
    3: ph('Que el isquio tolere velocidad.', 'Isquios rápidos: puentes explosivos, skipping, zancadas dinámicas.', [t('is3a', 'Skipping alto 20 m', 'Dolor (0-10)', 'dolor', 'max', 2), pogo('is3b')], ['Skipping sin dolor', 'Sin más dolor al día siguiente']),
    4: ph('Preparar la carrera: zancada amplia y cuestas.', 'Zancadas largas, carrera en cuesta suave, aceleraciones progresivas.', [hopH('is4a'), t('is4b', 'Aceleraciones progresivas 4 × 60 m', 'Dolor (0-10)', 'dolor', 'max', 2)], ['Aceleraciones sin dolor', 'Zancada amplia sin molestias']),
    5: ph('Volver a correr, con ritmos y cuestas al final.', RUN_WORK + ' Cuestas y series rápidas al final.', [run30('is5a'), next24('is5b')], RUN_GOALS),
  },
  patelofemoral: {
    1: ph(
      'Calmar la rodilla: que escaleras, sentarse y agacharse duelan menos.',
      'Reducir lo que más duele (bajar escaleras, cuestas abajo). Fuerza de cadera (abductores, rotadores) y cuádriceps en rangos sin dolor.',
      [
        t('pf1a', 'Bajar escaleras', 'Bajar dos pisos: dolor (0-10)', 'dolor', 'max', 3),
        t('pf1b', 'Sentadilla a dos piernas', 'Dolor (0-10) hasta 60°', 'dolor', 'max', 3),
      ],
      ['Bajas escaleras sin que el dolor te frene', 'Te puedes agachar sin dolor fuerte'],
    ),
    2: ph(
      'Fuerza de cuádriceps y cadera.',
      'Sentadilla, prensa, step down, abducción y rotación externa de cadera. Aumentar el rango si no duele.',
      [
        t('pf2a', 'Step down de 20 cm', 'Repeticiones con buena técnica, cada pierna', 'reps', 'lsi', 90, 'Sin que la rodilla se vaya hacia dentro'),
        t('pf2b', 'Plancha lateral', 'Segundos, cada lado', 'secs', 'lsi', 90),
      ],
      ['Step down controlado, 3 × 10 por lado', 'Fuerza de cadera parecida en los dos lados'],
    ),
    3: ph('Que la rodilla tolere impactos.', 'Saltitos, comba, saltos laterales.', [pogo('pf3a'), comba('pf3b')], ['Saltos con los dos pies sin dolor', 'Sin más dolor al día siguiente']),
    4: ph('Preparar la carrera.', 'Saltos a una pierna, bajar escalón rápido, caminar rápido.', [hop1('pf4a'), walk30('pf4b')], ['Saltos a una pierna sin dolor', 'Caminas 30 min rápido sin dolor']),
    5: ph('Volver a correr cuidando las bajadas.', RUN_WORK + ' Subir cadencia un 5-10 %. Bajadas al final.', [run30('pf5a'), next24('pf5b')], RUN_GOALS),
  },
  tibialpost: {
    1: ph(
      'Calmar el tendón (detrás del maléolo interno) y descargar el arco.',
      'Isométricos de tibial posterior (llevar el pie hacia dentro contra resistencia). Valorar plantilla o calzado con soporte.',
      [
        t('tp1a', 'Dolor en el día a día', 'Media de la última semana (0-10)', 'dolor', 'max', 3),
        t('tp1b', 'Elevación de talones a dos pies', '10 seguidas: dolor (0-10)', 'dolor', 'max', 3),
      ],
      ['Dolor del día a día de 3/10 o menos', 'Caminas sin dolor detrás del tobillo'],
    ),
    2: ph(
      'Fuerza del tibial posterior y del pie.',
      'Elevación de talón con pelota entre los talones, inversión con banda, pie corto, fuerza de cadera.',
      [
        t('tp2a', 'Talón a una pierna hasta el fallo', 'Repeticiones, cada pierna', 'reps', 'lsi', 90, 'El talón tiene que ir hacia dentro al subir'),
        t('tp2b', 'Talón a una pierna: el talón gira hacia dentro', 'Lo hace bien (sí/no)', 'check', 'check', 1),
      ],
      ['Elevación de talón a una pierna, 3 × 15', 'El arco no se hunde al subir'],
    ),
    3: ph('Que el pie tolere impactos.', 'Saltitos y comba.', [pogo('tp3a'), comba('tp3b')], ['Saltos con los dos pies sin dolor', 'Sin más dolor al día siguiente']),
    4: ph('Preparar la carrera.', 'Saltos a una pierna, saltos laterales, caminar rápido.', [hop1('tp4a'), walk30('tp4b')], ['Saltos a una pierna sin dolor', 'Caminas 30 min sin dolor']),
    5: ph('Volver a correr.', RUN_WORK, [run30('tp5a'), next24('tp5b')], RUN_GOALS),
  },
}

/** Qué protocolo le toca según cómo se escribió la lesión */
export function guessProtocol(injury: string): InjuryKey | undefined {
  const s = injury
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (/cintilla|iliotibial|itb/.test(s)) return 'cintilla'
  if (/aquiles|achilles/.test(s)) return 'aquiles'
  if (/fascia|plantar/.test(s)) return 'fascitis'
  if (/patelofemoral|femoropatelar|condromalacia/.test(s)) return 'patelofemoral'
  if (/rotulian|patelar|patellar/.test(s)) return 'rotuliana'
  if (/periostitis|tibial medial|mtss|shin/.test(s)) return 'periostitis'
  if (/isquio|hamstring/.test(s)) return 'isquios'
  if (/tibial posterior|tibialis posterior/.test(s)) return 'tibialpost'
  return undefined
}

export const protocolsSeed = (): Protocols => structuredClone(PROTOCOLS)
