// Recording protocol: short (~2–3 min), easy to follow on a phone, and complete enough to compute
// perturbation (sustained /a/), aerodynamic-efficiency proxies (MPT, s/z) and connected-speech
// measures (CAPE-V-style sentences + a phonetically varied passage), plus AVQI v03.01.

import type { Lang } from "./i18n";
import type { TaskId } from "./voice/types";

export const PROTOCOL_VERSION = "vocalyzer-1.0";

export interface TaskDef {
  id: TaskId;
  /** fixed: stops automatically after `seconds`; free: the user stops (optionally auto-stop on silence). */
  mode: "fixed" | "free";
  seconds?: number;
  maxSeconds: number;
  minSeconds: number;
  autoStopOnSilence?: boolean;
  expectSound: boolean;
}

export const TASKS: TaskDef[] = [
  { id: "silence", mode: "fixed", seconds: 3, maxSeconds: 3, minSeconds: 2.5, expectSound: false },
  { id: "vowel", mode: "fixed", seconds: 6, maxSeconds: 6, minSeconds: 3, expectSound: true },
  { id: "mpt", mode: "free", maxSeconds: 60, minSeconds: 1, autoStopOnSilence: true, expectSound: true },
  { id: "s", mode: "free", maxSeconds: 60, minSeconds: 1, autoStopOnSilence: true, expectSound: true },
  { id: "z", mode: "free", maxSeconds: 60, minSeconds: 1, autoStopOnSilence: true, expectSound: true },
  { id: "sentences", mode: "free", maxSeconds: 90, minSeconds: 4, expectSound: true },
  { id: "reading", mode: "free", maxSeconds: 150, minSeconds: 8, expectSound: true },
];

interface TaskText {
  title: string;
  instruction: string;
  note?: string;
  prompt?: string; // big text shown while recording (e.g. "aaaa")
  lines?: string[]; // sentences / passage paragraphs
}

const ES: Record<TaskId, TaskText> = {
  silence: {
    title: "Silencio ambiente",
    instruction:
      "Permanezca en silencio durante 3 segundos sin tocar el teléfono. Así medimos el ruido de fondo de la habitación.",
    prompt: "🤫",
  },
  vowel: {
    title: "Vocal «a» sostenida",
    instruction:
      "Inspire y diga «aaaa» con su voz habitual, ni fuerte ni baja, de forma mantenida y estable hasta que termine la cuenta (unos 5 segundos).",
    prompt: "aaaaa…",
  },
  mpt: {
    title: "Tiempo máximo de fonación",
    instruction:
      "Inspire profundamente y diga «aaaa» con voz normal todo el tiempo que pueda, sin forzar. Pulse «Terminar» cuando se quede sin aire (la grabación también se detiene sola).",
    prompt: "aaaaaaaaaa…",
  },
  s: {
    title: "Sonido «s» sostenido",
    instruction:
      "Inspire profundamente y mantenga el sonido «ssss» (como una serpiente) todo el tiempo que pueda, sin forzar.",
    prompt: "ssssss…",
  },
  z: {
    title: "Sonido «z» sostenido (zumbido)",
    instruction:
      "Inspire profundamente y mantenga un zumbido «zzzz», como el de una abeja, haciendo vibrar la garganta, todo el tiempo que pueda.",
    note: "No es la «z» de «zapato»: es como una «s» pero con voz (al tocarse el cuello notará la vibración).",
    prompt: "zzzzzz…",
  },
  sentences: {
    title: "Frases",
    instruction: "Lea en voz alta, con su voz habitual, las seis frases. Haga una pequeña pausa entre ellas.",
    lines: [
      "Ayer fui a la playa con Luisa.",
      "Juan jugaba con su hijo en el jardín.",
      "Nadie vino a ver la luna llena.",
      "Ana y Elena iban a Oviedo en enero.",
      "Mi mamá me mima y yo la amo.",
      "Paco tapa la copa con un trapo.",
    ],
  },
  reading: {
    title: "Lectura de un texto",
    instruction: "Lea el texto en voz alta, a su ritmo habitual, como si se lo leyera a otra persona.",
    lines: [
      "Hoy es un día tranquilo de primavera. Por la mañana, Marta abre la ventana y mira el jardín. El sol brilla, los pájaros cantan y el aire huele a flores.",
      "—¿Vamos a caminar un rato? —pregunta su hermano Jorge.",
      "Juntos bajan por la calle hasta el parque, donde muchos niños juegan con una pelota roja. Al mediodía comen pan, queso y fruta fresca bajo un árbol.",
      "—¡Qué día tan bonito! —dice Marta, feliz.",
    ],
  },
};

const EN: Record<TaskId, TaskText> = {
  silence: {
    title: "Room silence",
    instruction:
      "Stay silent for 3 seconds without touching the phone. This measures the background noise of the room.",
    prompt: "🤫",
  },
  vowel: {
    title: "Sustained vowel “ah”",
    instruction:
      "Take a breath and say “aaah” in your usual voice, neither loud nor soft, steadily until the countdown ends (about 5 seconds).",
    prompt: "aaaah…",
  },
  mpt: {
    title: "Maximum phonation time",
    instruction:
      "Take a deep breath and say “aaah” in a normal voice for as long as you can, without straining. Press “Finish” when you run out of air (recording also stops by itself).",
    prompt: "aaaaaaaaah…",
  },
  s: {
    title: "Sustained “s”",
    instruction: "Take a deep breath and hold the sound “ssss” (like a snake) for as long as you can, without straining.",
    prompt: "ssssss…",
  },
  z: {
    title: "Sustained “z” (buzz)",
    instruction:
      "Take a deep breath and hold a buzzing “zzzz”, like a bee, letting your throat vibrate, for as long as you can.",
    note: "It is like an “s” but voiced: touching your neck you should feel the vibration.",
    prompt: "zzzzzz…",
  },
  sentences: {
    title: "Sentences",
    instruction: "Read the six sentences aloud in your usual voice, with a short pause between them.",
    lines: [
      "The blue spot is on the key again.",
      "How hard did he hit him?",
      "We were away a year ago.",
      "We eat eggs every Easter.",
      "My mama makes lemon muffins.",
      "Peter will keep at the peak.",
    ],
  },
  reading: {
    title: "Reading passage",
    instruction: "Read the text aloud at your usual pace, as if you were reading it to someone.",
    lines: [
      "Today is a calm spring day. In the morning, Mary opens the window and looks at the garden. The sun is shining, the birds are singing and the air smells of flowers.",
      "“Shall we go for a walk?” asks her brother George.",
      "Together they walk down the street to the park, where children play with a red ball. At noon they share bread, cheese and fresh fruit under a big tree.",
      "“What a lovely day!” says Mary happily.",
    ],
  },
};

export function taskText(id: TaskId, lang: Lang): TaskText {
  return (lang === "en" ? EN : ES)[id];
}

/** Short note on how the sentence set was built (shown in the doctor's reference panel). */
export const SENTENCES_NOTE = {
  es: "Frases construidas siguiendo los criterios fonéticos del CAPE-V (vocales variadas, ataque suave, todo sonoro, ataque duro, nasales y oclusivas sordas). En inglés se usan las frases originales del CAPE-V (Kempster et al., 2009).",
  en: "Spanish sentences follow the CAPE-V phonetic criteria; English uses the original CAPE-V sentences (Kempster et al., 2009).",
};
