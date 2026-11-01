import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "es" | "en";

type Dict = Record<string, { es: string; en: string }>;

const DICT: Dict = {
  // Brand
  "app.name": { es: "Vocalyzer", en: "Vocalyzer" },
  "app.tagline": { es: "Evaluación acústica de la voz", en: "Acoustic voice assessment" },
  "lang.toggle": { es: "Idioma", en: "Language" },

  // Nav
  "nav.panel": { es: "Panel", en: "Dashboard" },
  "nav.evaluate": { es: "Evaluar en consulta", en: "Assess in clinic" },
  "nav.inbox": { es: "Bandeja", en: "Inbox" },
  "nav.settings": { es: "Configuración", en: "Settings" },
  "nav.logout": { es: "Salir", en: "Log out" },

  // Landing
  "landing.access": { es: "Acceder", en: "Sign in" },
  "landing.title": { es: "Evaluación acústica de la voz, desde el navegador", en: "Acoustic voice assessment, in the browser" },
  "landing.subtitle": {
    es: "Su paciente escanea un código QR, lee unos textos breves y el análisis acústico se realiza en su propio dispositivo. Usted recibe los parámetros vocales (F0, jitter, shimmer, HNR, CPPS, AVQI, TMF, cociente s/z) y una estimación orientativa GRBAS y CAPE-V.",
    en: "Your patient scans a QR code, reads a few short texts and the acoustic analysis runs on their own device. You receive the voice parameters (F0, jitter, shimmer, HNR, CPPS, AVQI, MPT, s/z ratio) and an orientative GRBAS and CAPE-V estimate.",
  },
  "landing.cta": { es: "Empezar ahora", en: "Get started" },
  "landing.f1.title": { es: "Privacidad por diseño", en: "Privacy by design" },
  "landing.f1.desc": {
    es: "La voz se analiza en el navegador y nunca se envía ni se guarda. Solo se guardan los resultados numéricos, de forma anónima.",
    en: "The voice is analysed in the browser and is never uploaded or stored. Only the numerical results are saved, anonymously.",
  },
  "landing.f2.title": { es: "Protocolo breve", en: "Short protocol" },
  "landing.f2.desc": {
    es: "Unos 3 minutos: vocal sostenida, tiempo máximo de fonación, s/z, seis frases y un texto corto.",
    en: "About 3 minutes: sustained vowel, maximum phonation time, s/z, six sentences and a short passage.",
  },
  "landing.f3.title": { es: "Gestión sencilla", en: "Simple management" },
  "landing.f3.desc": {
    es: "Bandeja de resultados con etiquetas, leído/no leído, valoración perceptual GRBAS/CAPE-V e informe imprimible.",
    en: "Results inbox with labels, read/unread, perceptual GRBAS/CAPE-V rating and printable report.",
  },
  "landing.legal.terms": { es: "Términos de uso", en: "Terms of use" },
  "landing.legal.privacy": { es: "Privacidad", en: "Privacy" },
  "setup.not_configured": {
    es: "La aplicación aún no está conectada a su base de datos (faltan VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY). Consulte el README.",
    en: "The app is not connected to its database yet (VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are missing). See the README.",
  },

  // Consent gate
  "consent.title": { es: "Antes de empezar", en: "Before you start" },
  "consent.voice.local": {
    es: "El análisis de su voz se realiza íntegramente en este navegador, en su propio dispositivo.",
    en: "Your voice is analysed entirely in this browser, on your own device.",
  },
  "consent.voice.not_stored": {
    es: "Su voz no se envía a ningún servidor ni se guarda en ninguna base de datos: el audio permanece solo en la memoria de este dispositivo durante la prueba y se elimina al terminar o al cerrar la página.",
    en: "Your voice is not sent to any server or stored in any database: the audio stays only in this device's memory during the test and is deleted when you finish or close the page.",
  },
  "consent.voice.results": {
    es: "Solo se enviarán a su médico los resultados numéricos del análisis, de forma anónima, sin su nombre ni ningún dato que le identifique.",
    en: "Only the numerical results of the analysis will be sent to your doctor, anonymously, without your name or any identifying data.",
  },
  "consent.voice.mic": {
    es: "A continuación le pediremos permiso para usar el micrófono.",
    en: "Next, we will ask for permission to use the microphone.",
  },
  "consent.accept_prefix": { es: "He leído y acepto los", en: "I have read and accept the" },
  "consent.terms_link": { es: "Términos de uso", en: "Terms of use" },
  "consent.and": { es: "y la", en: "and the" },
  "consent.privacy_link": { es: "Política de privacidad", en: "Privacy policy" },
  "consent.accept_button": { es: "Aceptar y continuar", en: "Accept and continue" },

  // Setup
  "setup.title": { es: "Preparación", en: "Setup" },
  "setup.optional": {
    es: "Datos opcionales (ayudan a interpretar los resultados)",
    en: "Optional data (helps interpret the results)",
  },
  "setup.sex": { es: "Sexo", en: "Sex" },
  "setup.sex.male": { es: "Hombre", en: "Male" },
  "setup.sex.female": { es: "Mujer", en: "Female" },
  "setup.sex.unspecified": { es: "Prefiero no indicarlo", en: "Prefer not to say" },
  "setup.age": { es: "Edad", en: "Age" },
  "setup.age.<18": { es: "Menor de 18", en: "Under 18" },
  "setup.age.18-39": { es: "18–39 años", en: "18–39 years" },
  "setup.age.40-59": { es: "40–59 años", en: "40–59 years" },
  "setup.age.60+": { es: "60 años o más", en: "60 or older" },
  "setup.age.unspecified": { es: "Prefiero no indicarlo", en: "Prefer not to say" },
  "setup.tips.title": { es: "Consejos para una buena grabación", en: "Tips for a good recording" },
  "setup.tip1": {
    es: "Busque un lugar silencioso (sin televisión, ventiladores ni conversaciones).",
    en: "Find a quiet place (no TV, fans or conversations).",
  },
  "setup.tip2": {
    es: "Sujete el teléfono a unos 20–30 cm de la boca, sin tapar el micrófono.",
    en: "Hold the phone about 20–30 cm (8–12 in) from your mouth, without covering the microphone.",
  },
  "setup.tip3": {
    es: "No use auriculares Bluetooth: use el micrófono del propio dispositivo.",
    en: "Do not use Bluetooth headsets: use the device's own microphone.",
  },
  "setup.tip4": {
    es: "Siéntese con la espalda recta y hable con su voz habitual.",
    en: "Sit up straight and speak in your usual voice.",
  },
  "setup.duration": { es: "Duración aproximada: 3 minutos.", en: "Approximate duration: 3 minutes." },
  "setup.mic_button": { es: "Activar micrófono", en: "Enable microphone" },
  "setup.mic_requesting": { es: "Solicitando permiso…", en: "Requesting permission…" },
  "mic.denied": {
    es: "No se ha podido acceder al micrófono. Revise los permisos del navegador (icono junto a la dirección web) y vuelva a intentarlo.",
    en: "The microphone could not be accessed. Check the browser permissions (icon next to the address bar) and try again.",
  },
  "mic.unsupported": {
    es: "Este navegador no permite grabar audio. Pruebe con una versión reciente de Chrome, Safari, Edge o Firefox.",
    en: "This browser cannot record audio. Try a recent version of Chrome, Safari, Edge or Firefox.",
  },
  "mic.insecure": {
    es: "El micrófono solo está disponible en conexiones seguras (https).",
    en: "The microphone is only available over secure connections (https).",
  },

  // Tasks
  "task.step": { es: "Paso {0} de {1}", en: "Step {0} of {1}" },
  "task.start": { es: "Empezar a grabar", en: "Start recording" },
  "task.start_silence": { es: "Empezar", en: "Start" },
  "task.stop": { es: "Terminar", en: "Finish" },
  "task.recording": { es: "Grabando…", en: "Recording…" },
  "task.countdown": { es: "Quedan {0} s", en: "{0} s left" },
  "task.recorded": { es: "Grabado ({0} s)", en: "Recorded ({0} s)" },
  "task.retry": { es: "Repetir", en: "Retry" },
  "task.next": { es: "Siguiente", en: "Next" },
  "task.listen": { es: "Escuchar", en: "Listen" },
  "task.stop_listen": { es: "Parar", en: "Stop" },
  "task.analyze": { es: "Analizar", en: "Analyse" },
  "task.cancel": { es: "Cancelar prueba", en: "Cancel test" },
  "task.no_sound": {
    es: "No se ha detectado sonido. Acérquese un poco al micrófono y repita.",
    en: "No sound was detected. Move a little closer to the microphone and retry.",
  },
  "task.too_short": { es: "La grabación es demasiado corta. Repítala, por favor.", en: "The recording is too short. Please retry." },
  "task.too_loud": {
    es: "La señal está saturada (demasiado fuerte o demasiado cerca). Aléjese un poco y repita.",
    en: "The signal is clipping (too loud or too close). Move back a little and retry.",
  },
  "task.too_noisy": {
    es: "Hay bastante ruido de fondo. Si puede, busque un lugar más silencioso y repita.",
    en: "There is considerable background noise. If possible, move somewhere quieter and retry.",
  },
  "task.level": { es: "Nivel del micrófono", en: "Microphone level" },

  // Analysis / submission
  "analyze.title": { es: "Analizando la voz…", en: "Analysing the voice…" },
  "analyze.body": {
    es: "El análisis se realiza en este dispositivo y puede tardar unos segundos.",
    en: "The analysis runs on this device and may take a few seconds.",
  },
  "analyze.error": {
    es: "No se ha podido completar el análisis. Repita la prueba, por favor.",
    en: "The analysis could not be completed. Please repeat the test.",
  },
  "submit.title": { es: "Enviar resultados a su médico", en: "Send results to your doctor" },
  "submit.body": {
    es: "Se enviarán únicamente los resultados numéricos, de forma anónima. El audio se elimina de este dispositivo.",
    en: "Only the numerical results will be sent, anonymously. The audio is deleted from this device.",
  },
  "submit.button": { es: "Enviar resultados", en: "Send results" },
  "submit.sending": { es: "Enviando…", en: "Sending…" },
  "submit.error": {
    es: "No se pudieron enviar los resultados. Compruebe su conexión e inténtelo de nuevo.",
    en: "The results could not be sent. Check your connection and try again.",
  },
  "done.title": { es: "Evaluación enviada", en: "Assessment sent" },
  "done.body": {
    es: "Sus resultados ya están disponibles para su médico y el audio se ha eliminado de este dispositivo. Puede cerrar esta ventana. Gracias por su tiempo.",
    en: "Your results are now available to your doctor and the audio has been deleted from this device. You can close this window. Thank you for your time.",
  },
  "patient.header": { es: "Evaluación de la voz", en: "Voice assessment" },
  "patient.invalid": {
    es: "El enlace no es válido. Pida a su médico un nuevo código QR.",
    en: "This link is not valid. Ask your doctor for a new QR code.",
  },
  "patient.quality_warning": {
    es: "Aviso: la grabación tiene ruido o saturación; los resultados podrían ser menos fiables. Si lo desea, puede repetir la prueba en un lugar más silencioso.",
    en: "Note: the recording is noisy or clipped; results may be less reliable. You may repeat the test somewhere quieter.",
  },
  "patient.repeat": { es: "Repetir la prueba", en: "Repeat the test" },

  // Doctor in-clinic evaluation
  "evaluate.title": { es: "Evaluación en consulta", en: "In-clinic assessment" },
  "evaluate.subtitle": {
    es: "Realice la prueba con el paciente presente. Puede escuchar cada grabación en este dispositivo para su valoración perceptual; el audio no se guarda.",
    en: "Run the test with the patient present. You can listen to each recording on this device for your perceptual rating; audio is never stored.",
  },
  "evaluate.save": { es: "Guardar en la bandeja", en: "Save to inbox" },
  "evaluate.saving": { es: "Guardando…", en: "Saving…" },
  "evaluate.saved": { es: "Guardado en la bandeja", en: "Saved to inbox" },
  "evaluate.new": { es: "Nueva evaluación", en: "New assessment" },
  "evaluate.recordings": { es: "Grabaciones (solo en este dispositivo)", en: "Recordings (this device only)" },

  // Panel
  "panel.title": { es: "Panel", en: "Dashboard" },
  "panel.qr.title": { es: "Código QR para sus pacientes", en: "QR code for your patients" },
  "panel.qr.desc": {
    es: "El paciente escanea el código con la cámara del móvil, acepta las condiciones, activa el micrófono y realiza la prueba. Los resultados llegan a su bandeja de forma anónima.",
    en: "The patient scans the code with their phone camera, accepts the terms, enables the microphone and takes the test. Results reach your inbox anonymously.",
  },
  "panel.qr.copy": { es: "Copiar enlace", en: "Copy link" },
  "panel.qr.copied": { es: "Enlace copiado", en: "Link copied" },
  "panel.qr.print": { es: "Imprimir hoja con QR", en: "Print QR sheet" },
  "panel.evaluate.desc": {
    es: "Realice la prueba en este dispositivo con el paciente presente y añada su valoración perceptual.",
    en: "Run the test on this device with the patient present and add your perceptual rating.",
  },
  "panel.evaluate.button": { es: "Iniciar evaluación", en: "Start assessment" },
  "panel.inbox.desc": { es: "{0} resultado(s) sin leer.", en: "{0} unread result(s)." },
  "panel.inbox.button": { es: "Abrir bandeja", en: "Open inbox" },

  // Print QR sheet
  "print.kicker": { es: "Evaluación de la voz", en: "Voice assessment" },
  "print.title": { es: "Escanee el código con su teléfono", en: "Scan the code with your phone" },
  "print.instructions": {
    es: "Necesitará unos 3 minutos en un lugar silencioso. Siga las instrucciones en pantalla: le pediremos que diga «aaaa», que mantenga los sonidos «s» y «z» y que lea unas frases y un texto breve.",
    en: "You will need about 3 minutes in a quiet place. Follow the on-screen instructions: you will say “aaah”, hold the sounds “s” and “z”, and read a few sentences and a short text.",
  },
  "print.privacy": {
    es: "Su voz se analiza en su propio teléfono y no se guarda. Su médico recibirá solo los resultados, de forma anónima.",
    en: "Your voice is analysed on your own phone and is not stored. Your doctor will receive only the results, anonymously.",
  },
  "print.back": { es: "Volver", en: "Back" },
  "print.print": { es: "Imprimir", en: "Print" },

  // Inbox
  "inbox.title": { es: "Bandeja de resultados", en: "Results inbox" },
  "inbox.subtitle": {
    es: "Evaluaciones de voz realizadas por sus pacientes y en consulta.",
    en: "Voice assessments completed by your patients and in clinic.",
  },
  "inbox.new": { es: "nuevas", en: "new" },
  "inbox.loading": { es: "Cargando…", en: "Loading…" },
  "inbox.empty": {
    es: "Aún no hay resultados. Comparta su código QR con sus pacientes o realice una evaluación en consulta.",
    en: "No results yet. Share your QR code with your patients or run an in-clinic assessment.",
  },
  "inbox.filter.all": { es: "Todas", en: "All" },
  "inbox.filter.patient": { es: "Paciente", en: "Patient" },
  "inbox.filter.doctor": { es: "Consulta", en: "Clinic" },
  "inbox.source.patient": { es: "Paciente", en: "Patient" },
  "inbox.source.doctor": { es: "Consulta", en: "Clinic" },
  "inbox.item": { es: "Evaluación de voz", en: "Voice assessment" },
  "inbox.mark_read": { es: "Marcar leído", en: "Mark read" },
  "inbox.mark_unread": { es: "Marcar no leído", en: "Mark unread" },
  "inbox.confirm_delete": { es: "¿Eliminar este resultado?", en: "Delete this result?" },
  "inbox.new_badge": { es: "Nuevo", en: "New" },
  "inbox.label.add": { es: "Añadir etiqueta", en: "Add label" },
  "inbox.label.edit": { es: "Editar etiqueta", en: "Edit label" },
  "inbox.label.save": { es: "Guardar", en: "Save" },
  "inbox.label.saving": { es: "Guardando…", en: "Saving…" },
  "inbox.label.placeholder": { es: "Ej: J.P. / HC-1234", en: "E.g. J.D. / MRN-1234" },
  "inbox.label.hint": {
    es: "Use iniciales o un código interno. No incluya datos identificativos (nombre completo, DNI, teléfono, email).",
    en: "Use initials or an internal code. Do not include identifying data (full name, national ID, phone, email).",
  },
  "inbox.copy": { es: "Copiar", en: "Copy" },
  "inbox.copied": { es: "Copiado", en: "Copied" },
  "inbox.details.show": { es: "Ver informe", en: "View report" },
  "inbox.details.hide": { es: "Ocultar informe", en: "Hide report" },
  "inbox.print": { es: "Imprimir", en: "Print" },
  "inbox.estimated": { es: "estimado", en: "estimated" },
  "inbox.clinician": { es: "clínico", en: "clinician" },
  "inbox.error": { es: "No se pudo completar la acción.", en: "The action could not be completed." },

  // Report
  "report.title": { es: "Informe de evaluación acústica de la voz", en: "Acoustic voice assessment report" },
  "report.estimates.title": { es: "Estimación acústica GRBAS / CAPE-V", en: "Acoustic GRBAS / CAPE-V estimate" },
  "report.estimates.disclaimer": {
    es: "GRBAS y CAPE-V son escalas perceptuales. Esta estimación se calcula a partir de correlatos acústicos validados (AVQI, CPPS, perturbación y ruido) y es solo orientativa: no sustituye la valoración auditiva del clínico.",
    en: "GRBAS and CAPE-V are perceptual scales. This estimate is derived from validated acoustic correlates (AVQI, CPPS, perturbation and noise) and is orientative only: it does not replace the clinician's auditory rating.",
  },
  "report.confidence": { es: "Fiabilidad de la estimación", en: "Estimate reliability" },
  "report.confidence.high": { es: "alta", en: "high" },
  "report.confidence.medium": { es: "media", en: "medium" },
  "report.confidence.low": { es: "baja", en: "low" },
  "report.grbas.G": { es: "Grado (G)", en: "Grade (G)" },
  "report.grbas.R": { es: "Aspereza (R)", en: "Roughness (R)" },
  "report.grbas.B": { es: "Soplo (B)", en: "Breathiness (B)" },
  "report.grbas.A": { es: "Astenia (A)", en: "Asthenia (A)" },
  "report.grbas.S": { es: "Tensión (S)", en: "Strain (S)" },
  "report.capev.overall": { es: "Severidad global", en: "Overall severity" },
  "report.capev.roughness": { es: "Aspereza", en: "Roughness" },
  "report.capev.breathiness": { es: "Soplo", en: "Breathiness" },
  "report.capev.strain": { es: "Tensión", en: "Strain" },
  "report.capev.pitch": { es: "Tono", en: "Pitch" },
  "report.capev.loudness": { es: "Intensidad", en: "Loudness" },
  "report.capev.high": { es: "agudo", en: "high" },
  "report.capev.low": { es: "grave", en: "low" },
  "report.capev.not_estimable": { es: "Requiere valoración perceptual", en: "Requires perceptual rating" },
  "report.capev.pitch_unknown": { es: "Indique el sexo para estimarlo", en: "Sex needed to estimate" },
  "report.low_reliability": { es: "baja fiabilidad acústica", en: "low acoustic reliability" },
  "report.drivers": { es: "Basado en", en: "Based on" },
  "report.section.overall": { es: "Índices globales", en: "Global indices" },
  "report.section.vowel": { es: "Vocal sostenida /a/", en: "Sustained vowel /a/" },
  "report.section.aero": { es: "Eficiencia fonatoria", en: "Phonatory efficiency" },
  "report.section.speech": { es: "Habla conectada", en: "Connected speech" },
  "report.section.quality": { es: "Calidad de la grabación", en: "Recording quality" },
  "report.col.param": { es: "Parámetro", en: "Parameter" },
  "report.col.value": { es: "Valor", en: "Value" },
  "report.col.ref": { es: "Referencia", en: "Reference" },
  "report.status.normal": { es: "Normal", en: "Normal" },
  "report.status.borderline": { es: "Límite", en: "Borderline" },
  "report.status.abnormal": { es: "Alterado", en: "Abnormal" },
  "report.sex": { es: "Sexo", en: "Sex" },
  "report.age": { es: "Edad", en: "Age" },
  "report.date": { es: "Fecha", en: "Date" },
  "report.protocol": { es: "Protocolo", en: "Protocol" },
  "report.label": { es: "Etiqueta", en: "Label" },
  "report.disclaimer": {
    es: "Análisis acústico realizado en el navegador con algoritmos compatibles con Praat (validados frente a Praat 6.1.38). Micrófono no calibrado: no se informan niveles absolutos (dB SPL). Los valores de referencia son orientativos y la interpretación clínica corresponde exclusivamente al facultativo.",
    en: "Acoustic analysis performed in the browser with Praat-compatible algorithms (validated against Praat 6.1.38). Uncalibrated microphone: no absolute levels (dB SPL) are reported. Reference values are orientative and clinical interpretation is the sole responsibility of the physician.",
  },
  "report.sources": { es: "Referencias", en: "References" },
  "report.not_available": { es: "No disponible", en: "Not available" },

  // Parameters
  "param.avqi": { es: "AVQI v03.01", en: "AVQI v03.01" },
  "param.avqiComponents": { es: "Componentes AVQI", en: "AVQI components" },
  "param.cppsVowel": { es: "CPPS /a/", en: "CPPS /a/" },
  "param.cppsReading": { es: "CPPS lectura", en: "CPPS reading" },
  "param.cppsSentences": { es: "CPPS frases", en: "CPPS sentences" },
  "param.f0Mean": { es: "F0 media", en: "Mean F0" },
  "param.f0Sd": { es: "Estabilidad de F0 (DE)", en: "F0 stability (SD)" },
  "param.jitterLocal": { es: "Jitter local", en: "Jitter (local)" },
  "param.jitterRap": { es: "Jitter RAP", en: "Jitter RAP" },
  "param.jitterPpq5": { es: "Jitter PPQ5", en: "Jitter PPQ5" },
  "param.shimmerLocal": { es: "Shimmer local", en: "Shimmer (local)" },
  "param.shimmerDb": { es: "Shimmer (dB)", en: "Shimmer (dB)" },
  "param.shimmerApq11": { es: "Shimmer APQ11", en: "Shimmer APQ11" },
  "param.hnr": { es: "HNR (armónicos/ruido)", en: "HNR (harmonics-to-noise)" },
  "param.h1h2": { es: "H1–H2", en: "H1–H2" },
  "param.voiceBreaks": { es: "Interrupciones de sonoridad", en: "Voice breaks" },
  "param.intensitySd": { es: "Estabilidad de intensidad (DE)", en: "Intensity stability (SD)" },
  "param.mpt": { es: "Tiempo máximo de fonación (TMF)", en: "Maximum phonation time (MPT)" },
  "param.sDur": { es: "Duración /s/", en: "/s/ duration" },
  "param.zDur": { es: "Duración /z/", en: "/z/ duration" },
  "param.sz": { es: "Cociente s/z", en: "s/z ratio" },
  "param.speechF0": { es: "F0 del habla (mediana)", en: "Speaking F0 (median)" },
  "param.speechF0Range": { es: "Rango tonal (P5–P95)", en: "Pitch range (P5–P95)" },
  "param.speechF0Sd": { es: "Variabilidad tonal (DE)", en: "Pitch variability (SD)" },
  "param.voicedPct": { es: "Proporción sonora del habla", en: "Voiced proportion of speech" },
  "param.speechIntSd": { es: "Variabilidad de intensidad", en: "Intensity variability" },
  "param.readingDur": { es: "Duración de la lectura", en: "Reading duration" },
  "param.noise": { es: "Ruido de fondo", en: "Background noise" },
  "param.snr": { es: "Relación señal/ruido (/a/)", en: "Signal-to-noise ratio (/a/)" },
  "param.clipping": { es: "Saturación", en: "Clipping" },
  "param.sampleRate": { es: "Frecuencia de muestreo", en: "Sample rate" },
  "ref.typical": { es: "Típico", en: "Typical" },
  "ref.info": { es: "Informativo", en: "Informative" },

  // Quality warnings
  "warning.noisy_environment": { es: "Ambiente ruidoso", en: "Noisy environment" },
  "warning.low_snr": { es: "Relación señal/ruido baja", en: "Low signal-to-noise ratio" },
  "warning.clipping": { es: "Señal saturada", en: "Clipped signal" },
  "warning.low_sample_rate": { es: "Frecuencia de muestreo baja", en: "Low sample rate" },
  "warning.vowel_too_short": { es: "Vocal sostenida demasiado corta", en: "Sustained vowel too short" },
  "warning.vowel_unvoiced": { es: "No se detectó sonoridad en la vocal", en: "No voicing detected in the vowel" },
  "warning.speech_too_short": { es: "Habla insuficiente para el análisis", en: "Not enough speech to analyse" },
  "warning.missing_tasks": { es: "Faltan tareas del protocolo", en: "Protocol tasks missing" },

  // Clinician rating
  "rating.title": { es: "Valoración perceptual del clínico", en: "Clinician perceptual rating" },
  "rating.desc": {
    es: "Registre su propia valoración auditiva GRBAS y CAPE-V (por ejemplo, si escuchó la prueba en consulta).",
    en: "Record your own auditory GRBAS and CAPE-V rating (e.g. if you listened to the test in clinic).",
  },
  "rating.grbas": { es: "GRBAS (0 normal – 3 grave)", en: "GRBAS (0 normal – 3 severe)" },
  "rating.capev": { es: "CAPE-V (0–100)", en: "CAPE-V (0–100)" },
  "rating.consistency": { es: "Consistencia", en: "Consistency" },
  "rating.consistent": { es: "Consistente (C)", en: "Consistent (C)" },
  "rating.intermittent": { es: "Intermitente (I)", en: "Intermittent (I)" },
  "rating.save": { es: "Guardar valoración", en: "Save rating" },
  "rating.saving": { es: "Guardando…", en: "Saving…" },
  "rating.saved": { es: "Valoración guardada", en: "Rating saved" },
  "rating.copy_estimate": { es: "Partir de la estimación", en: "Start from estimate" },
  "rating.clear": { es: "Borrar", en: "Clear" },
  "rating.not_rated": { es: "Sin valorar", en: "Not rated" },

  // Auth
  "auth.signin": { es: "Iniciar sesión", en: "Sign in" },
  "auth.signup": { es: "Crear cuenta", en: "Create account" },
  "auth.email": { es: "Email", en: "Email" },
  "auth.password": { es: "Contraseña", en: "Password" },
  "auth.password2": { es: "Repetir contraseña", en: "Repeat password" },
  "auth.enter": { es: "Entrar", en: "Enter" },
  "auth.register": { es: "Registrarse", en: "Register" },
  "auth.loading": { es: "Cargando…", en: "Loading…" },
  "auth.error": { es: "Error de autenticación", en: "Authentication error" },
  "auth.toSignUp": { es: "¿No tiene cuenta? Regístrese", en: "No account? Register" },
  "auth.toSignIn": { es: "¿Ya tiene cuenta? Inicie sesión", en: "Already have an account? Sign in" },
  "auth.first_name": { es: "Nombre", en: "First name" },
  "auth.last_name": { es: "Apellidos", en: "Last name" },
  "auth.license": { es: "Número de colegiado", en: "Medical license number" },
  "auth.pass_mismatch": { es: "Las contraseñas no coinciden.", en: "Passwords do not match." },
  "auth.pass_short": { es: "La contraseña debe tener al menos 8 caracteres.", en: "Password must be at least 8 characters." },
  "auth.missing_fields": { es: "Complete todos los campos obligatorios.", en: "Please fill in all required fields." },
  "auth.must_accept": {
    es: "Debe aceptar la declaración profesional y los términos legales.",
    en: "You must accept the professional declaration and the legal terms.",
  },
  "auth.too_fast": { es: "Envío demasiado rápido, inténtelo de nuevo.", en: "Submitted too quickly, please try again." },
  "auth.check_email_verify": {
    es: "Cuenta creada. Revise su correo y haga clic en el enlace de verificación antes de iniciar sesión.",
    en: "Account created. Check your email and click the verification link before signing in.",
  },
  "auth.declaration": {
    es: "Declaro que soy profesional sanitario (médico otorrinolaringólogo, foniatra o logopeda), me hago responsable de la veracidad de los datos introducidos y del uso responsable y profesional de la aplicación.",
    en: "I declare that I am a healthcare professional (ENT physician, phoniatrician or speech-language pathologist), that I am responsible for the accuracy of the data provided, and that I will use the application responsibly and professionally.",
  },
  "auth.accept_terms": { es: "He leído y acepto los", en: "I have read and accept the" },

  // Settings
  "settings.title": { es: "Configuración", en: "Settings" },
  "settings.profile": { es: "Datos profesionales", en: "Professional details" },
  "settings.language": { es: "Idioma", en: "Language" },
  "settings.password": { es: "Cambio de contraseña", en: "Change password" },
  "settings.new_password": { es: "Nueva contraseña", en: "New password" },
  "settings.change_pass": { es: "Actualizar contraseña", en: "Update password" },
  "settings.pass_ok": { es: "Contraseña actualizada", en: "Password updated" },
  "settings.save": { es: "Guardar cambios", en: "Save changes" },
  "settings.saved": { es: "Guardado con éxito", en: "Saved successfully" },
  "settings.danger": { es: "Zona peligrosa", en: "Danger zone" },
  "settings.delete_warn": {
    es: "Eliminar su cuenta borrará sus datos profesionales y todos los resultados de su bandeja. Esta acción no se puede deshacer.",
    en: "Deleting your account removes your professional details and every result in your inbox. This cannot be undone.",
  },
  "settings.delete": { es: "Eliminar cuenta", en: "Delete account" },
  "settings.delete_title": { es: "Confirmar eliminación", en: "Confirm deletion" },
  "settings.delete_desc": { es: "Escriba DELETE para confirmar.", en: "Type DELETE to confirm." },
  "settings.cancel": { es: "Cancelar", en: "Cancel" },
  "settings.confirm_delete": { es: "Eliminar definitivamente", en: "Delete permanently" },
  "settings.deleted": { es: "Cuenta eliminada", en: "Account deleted" },

  // Legal
  "legal.terms.title": { es: "Términos de uso", en: "Terms of use" },
  "legal.privacy.title": { es: "Política de privacidad", en: "Privacy policy" },
  "legal.updated": { es: "Última actualización", en: "Last updated" },
  "legal.back": { es: "Volver al inicio", en: "Back home" },

  // Cookies
  "cookies.text": {
    es: "Usamos únicamente almacenamiento técnico necesario para el funcionamiento (sesión de inicio e idioma). No usamos cookies de análisis ni de marketing.",
    en: "We only use technical storage strictly necessary for the app (login session and language). No analytics or marketing cookies.",
  },
  "cookies.more": { es: "Más información", en: "Learn more" },
  "cookies.accept": { es: "Aceptar", en: "Accept" },

  // 404
  "notfound.title": { es: "Página no encontrada", en: "Page not found" },
  "notfound.home": { es: "Ir al inicio", en: "Go home" },
};

const STORAGE_KEY = "vocalyzer.lang";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, ...args: (string | number)[]) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

function translate(lang: Lang, key: string, args: (string | number)[]) {
  const entry = DICT[key];
  let str = entry ? (entry[lang] ?? entry.es) : key;
  args.forEach((a, i) => {
    str = str.replace(new RegExp(`\\{${i}\\}`, "g"), String(a));
  });
  return str;
}

function detectLang(): Lang {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
    const langs = (navigator.languages?.length ? navigator.languages : [navigator.language ?? ""]).map((l) =>
      l.toLowerCase(),
    );
    if (langs.some((l) => l.startsWith("es"))) return "es";
    if (langs.some((l) => l.startsWith("en"))) return "en";
  } catch {
    // ignore
  }
  return "es";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (typeof window === "undefined" ? "es" : detectLang()));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: (key, ...args) => translate(lang, key, args) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: "es", setLang: () => {}, t: (key, ...args) => translate("es", key, args) };
  return ctx;
}
