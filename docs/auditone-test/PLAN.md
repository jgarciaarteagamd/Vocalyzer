# Auditone Test — Plan de proyecto

> Audiometría tonal liminal por vía aérea (125–8000 Hz) en el navegador, con la misma filosofía
> que Vocalyzer y ENT Quest (QR del médico → bandeja), y el motor de cálculos, gráficos e informes
> de AudiometricReport.
>
> Repositorio destino: `jgarciaarteagamd/auditonetest` · Consulta: Huelva (Andalucía, España).
> Este documento es un plan técnico; los apartados regulatorios son orientativos y deben
> confirmarse con la AEMPS, un consultor regulatorio y el seguro de responsabilidad civil.

---

## 1. Visión y dos modos de uso

| | **A. Modo Consulta (clínico)** | **B. Modo Paciente (informativo)** |
|---|---|---|
| Quién lo usa | El médico, en su consulta | El paciente, en su móvil u ordenador (QR) |
| Equipo | MacBook + interfaz de audio USB + auriculares audiométricos DD45 calibrados + pulsador | El dispositivo y los auriculares del paciente |
| Objetivo | Umbrales tonales en dB HL, apegados a ISO 8253-1 / IEC 60645-1, para los informes propios | Información y concienciación; detectar quién debería hacerse una audiometría |
| Resultado | Audiograma completo + cálculos + informe A4 (con impedanciometría y logoaudiometría opcionales) | Mensaje sencillo para el paciente; resultado «NO CALIBRADO» en la bandeja del médico |
| Ambición | Diseñado desde el día 1 para poder tramitar un marcado CE **Clase IIa** en el futuro | Se mantiene como herramienta informativa (no diagnóstica) |

**Principio rector:** el modo A se construye *como si ya fuera un producto sanitario* (requisitos,
riesgos, trazabilidad, verificación, registros de calibración). Así, si algún día se comercializa,
la documentación técnica ya existe y no hay que rehacer el software.

---

## 2. Contexto regulatorio (España / UE)

### 2.1 Marco aplicable
- **Reglamento (UE) 2017/745 (MDR)** sobre productos sanitarios.
- **Real Decreto 192/2023** (productos sanitarios en España). Autoridad competente: **AEMPS**.
- Clasificación esperada del modo A: **Clase IIa** (Anexo VIII, regla 10 —producto activo de
  diagnóstico— y regla 11 —software que aporta información para decisiones diagnósticas—).
  Requiere **organismo notificado** (en España, p. ej., el ON 0318 de la AEMPS).
- Como fabricante en España: **licencia previa de funcionamiento** de la AEMPS para la actividad
  de fabricación (RD 192/2023).
- **RGPD + LOPDGDD (LO 3/2018)**: datos de salud = categoría especial. **Ley 41/2002** (autonomía
  del paciente e historia clínica).

### 2.2 Uso propio en consulta antes del marcado CE — riesgo a conocer
- El aviso «orientativo» **no cambia** la clasificación: lo que cuenta es la *finalidad de uso*.
- La excepción de fabricación interna del **art. 5.5 MDR** exige, entre otras cosas, que no exista
  un producto equivalente en el mercado; como los audiómetros existen, **previsiblemente no aplica**.
- Por tanto, usar el modo A para informes clínicos sin marcado CE es una **zona gris con riesgo**.
  Mitigaciones mínimas mientras tanto:
  1. Consultar a la AEMPS / consultor regulatorio y al **seguro de RC profesional**.
  2. Rotular los informes como «audiometría tonal realizada con sistema no certificado; resultado
     orientativo; ante hallazgos patológicos o decisiones terapéuticas/quirúrgicas/periciales, se
     recomienda audiometría en centro auditivo con equipo certificado».
  3. **No** usarlo para peritajes, certificados laborales/médico-legales, adaptación de audífonos
     ni indicación quirúrgica.
  4. Mantener la calibración anual y la comprobación diaria documentadas (apartado 5).

### 2.3 Normas técnicas de referencia (modo A)
| Norma | Para qué |
|---|---|
| **IEC 60645-1:2017** | Requisitos del audiómetro (precisión de frecuencia, nivel, distorsión, tiempos de subida/bajada, diafonía, tonos pulsados). Objetivo: cumplir los requisitos de un audiómetro de **solo vía aérea** (confirmar el «tipo» exacto con la norma). |
| **ISO 389-1:2017** | RETSPL de auriculares supraaurales (incluye **RadioEar DD45** con acoplador IEC 60318-3). |
| **ISO 389-4** | Niveles de referencia para el ruido de enmascaramiento (banda estrecha). |
| **ISO 8253-1:2010** | Método de audiometría tonal liminal (Hughson-Westlake modificado), niveles máximos de ruido ambiente, comprobaciones diarias. |
| **IEC 60318-3** | Acoplador acústico para calibrar auriculares supraaurales. |
| **ISO 7029** | Umbrales esperables por edad y sexo (referencia informativa en el informe). |
| **IEC 62304** | Ciclo de vida del software sanitario (clase de seguridad B previsible). |
| **ISO 14971** | Gestión de riesgos. |
| **IEC 62366-1** | Ingeniería de usabilidad. |
| **ISO 13485** | Sistema de gestión de calidad (necesario para la Clase IIa). |
| **IEC 82304-1** | Software sanitario autónomo (requisitos de producto). |
| **MDCG 2019-11 / 2019-16** | Cualificación de software y ciberseguridad. |

> Nota: un producto comercial probablemente deberá venderse como **sistema** (software + auricular
> + interfaz especificados) o exigir calibración obligatoria por técnico; el software solo, sobre
> hardware arbitrario, no puede garantizar los dB HL.

---

## 3. Arquitectura

### 3.1 Stack (igual que Vocalyzer y AudiometricReport)
- **React 19 + Vite + TypeScript**, componentes de Vocalyzer (shadcn/Tailwind).
- **Supabase** (Auth, Postgres con RLS, Realtime para la bandeja). Despliegue en **Netlify**.
- **Web Audio API** para tonos y ruidos (AudioWorklet si hace falta precisión de muestra).
- Tests con Vitest (+ Playwright para flujos).

### 3.2 Qué se reutiliza
| Origen | Qué | Destino |
|---|---|---|
| **Vocalyzer** | Auth del médico, panel con QR y hoja imprimible, bandeja (etiquetas, leído/no leído, copiar resumen, eliminar, tiempo real), consentimiento, páginas legales, envío anónimo de resultados, tarea anti-pausa de Supabase | Esqueleto de la app |
| **AudiometricReport** | `src/types.ts` (`AudiogramData`, `ImpedanceData`, `SpeechAudiometryData`, `MaskingAlert`, `NoResponseData`, `CalculationStandard`…), `src/utils/calculations.ts` (`calculateAllResults`, `analyzeDataQuality`), `AudiogramChart`, `ImpedanceChart`, `SpeechAudiometryChart`, paneles de entrada, `ReportGenerator`, `Report`, i18n (6 idiomas) | Motor clínico e informes |
| **Nuevo** | Motor de audio, calibración, procedimientos, modo paciente | Módulos propios |

Licencia: AudiometricReport está bajo PolyForm Noncommercial con titularidad de Juan Pablo García
Arteaga, que puede reutilizarlo y relicenciarlo para Auditone (incluido uso comercial), salvo que
existan contribuciones de terceros.

### 3.3 Estructura de carpetas propuesta
```
src/
  audio/            # motor de audio (sin UI)
    toneEngine.ts         # tono puro / pulsado / warble, envolvente, enrutado L/R
    noiseEngine.ts        # ruido de banda estrecha (enmascaramiento), ruido para DIN
    levels.ts             # dB HL → amplitud digital usando el perfil de calibración
    safety.ts             # límites máximos, rampas, bloqueo de nivel
  calibration/
    retspl/iso389-1.ts    # tablas RETSPL (DD45, TDH-39…) y nivel de enmascaramiento efectivo
    profile.ts            # perfil de calibración (por auricular + interfaz + volumen fijo)
    dailyCheck.ts         # comprobación subjetiva diaria (ISO 8253-1)
    loopbackCheck.ts      # autocomprobación eléctrica con cable salida→entrada de la interfaz
  procedures/
    manualAudiometer.ts   # el médico controla frecuencia y nivel
    hughsonWestlake.ts    # procedimiento automático ISO 8253-1
    masking.ts            # reglas y método de meseta (plateau)
    reliability.ts        # retest 1 kHz, falsos positivos, pruebas trampa
  remote/
    screeningTones.ts     # tonos simplificados no calibrados
    digitsInNoise.ts      # test de dígitos en ruido (español)
  report/               # importado/adaptado de AudiometricReport
  inbox/  auth/  legal/   # importado/adaptado de Vocalyzer
docs/regulatory/        # documentación técnica viva (ver apartado 8)
```

### 3.4 Rutas
- `/p/:doctorId` — modo paciente (desde el QR).
- `/app` — panel (QR, enlace, hoja imprimible).
- `/app/consulta` — audiómetro (manual y automático).
- `/app/calibracion` — perfiles, comprobación diaria, historial.
- `/app/bandeja` — resultados (consulta + pacientes).
- `/app/informe/:id` — generador de informes (vía aérea + impedanciometría + logoaudiometría).

### 3.5 Modelo de datos (Supabase, todo con RLS por médico)
| Tabla | Contenido clave |
|---|---|
| `doctors` | Perfil del médico, datos del centro para el informe |
| `devices` | Auricular (modelo, nº serie), interfaz (modelo, nº serie), ajustes fijos (volumen macOS, posición del potenciómetro) |
| `calibration_profiles` | `device_id`, fecha, técnico/servicio, nivel SPL medido por frecuencia y oído, ganancia digital resultante, salida máxima por frecuencia, linealidad, distorsión, diafonía, vigencia, PDF del certificado |
| `daily_checks` | Fecha, operador, resultado de la escucha diaria, resultado del loopback |
| `sessions` | Modo (`clinic`/`remote`), `calibration_profile_id` (null = no calibrado), versión del software, operador, tipo de transductor, cable/inalámbrico, ruido ambiente estimado, duración |
| `thresholds` | `session_id`, oído, frecuencia, nivel dB HL, `masked`, nivel de enmascaramiento, `no_response`, método (manual/automático) |
| `reliability` | Diferencia de retest a 1 kHz, tasa de falsos positivos, nº de pruebas trampa |
| `reports` | Datos de impedanciometría y logoaudiometría (JSON según tipos de AudiometricReport), diagnóstico, texto libre |
| `audit_log` | Quién hizo qué y cuándo (necesario para trazabilidad Clase IIa) |

Los resultados del modo paciente siguen el patrón Vocalyzer: **anónimos**, solo datos numéricos y
metadatos del dispositivo, sin datos identificativos salvo una etiqueta que pone el médico.

---

## 4. Modo A — Consulta (técnico)

### 4.1 Hardware
| Elemento | Recomendación | Notas |
|---|---|---|
| Auriculares | **RadioEar DD45** (supraaurales, RETSPL en ISO 389-1) | Alternativa: TDH-39. Para altas frecuencias en el futuro: Sennheiser HDA 300 (ISO 389-5/-8). |
| Atenuación de ruido | Carcasas circumaurales que alojan el DD45 (tipo *Audiocups*) | Los supraaurales atenúan poco; ayuda a cumplir los límites de ruido ambiente de ISO 8253-1. |
| Interfaz de audio | USB, 24 bits, con **entrada** además de salida (tipo Focusrite Scarlett 2i2) | La entrada permite la autocomprobación por loopback. Adaptador estéreo → 2 conectores mono (rojo/azul) del DD45. |
| Pulsador | Botón USB o Bluetooth que emule una tecla (pulsador grande o pedal) | La app escucha esa tecla; se registra el tiempo de respuesta. |
| Sala | Lo más silenciosa posible; medir una vez con sonómetro | Comparar con la tabla de ruido ambiente máximo de ISO 8253-1. |
| Calibración | Servicio técnico de calibración de audiómetros (oído artificial IEC 60318-3 + sonómetro clase 1) | Anual, con certificado. Volumen de macOS y potenciómetro fijos y marcados. |

### 4.2 Motor de audio — requisitos (a verificar contra IEC 60645-1)
- Frecuencias: 125, 250, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000, 8000 Hz; precisión de
  frecuencia dentro de tolerancia de la norma.
- Niveles: −10 dB HL hasta la **salida máxima calibrada** de cada frecuencia, en pasos de 5 dB
  (opcional 1–2 dB); por encima del máximo → bloqueado y registrado como «sin respuesta al máximo».
- Envolvente: subida/bajada suaves (rango de tiempos de IEC 60645-1) para evitar clics y
  dispersión espectral; tono continuo, **pulsado** (por defecto) y warble.
- Enrutado exclusivo a un oído (ChannelMerger); **diafonía** medida en la calibración.
- Distorsión armónica total dentro de los límites de la norma (verificar a la salida máxima).
- Ruido de fondo de la cadena por debajo del nivel equivalente a −10 dB HL (por eso 24 bits).
- **Seguridad**: techo absoluto de nivel por software, nunca saltos bruscos de más de 20 dB,
  botón de parada siempre visible, el nivel se reinicia al cambiar de auricular o perfil.
- La sesión **no arranca** si no hay perfil de calibración vigente y comprobación diaria hecha.

### 4.3 Calibración
1. **Calibración objetiva (anual):** el técnico mide, para cada frecuencia y oído, el nivel SPL que
   produce una señal digital de referencia. La app calcula la ganancia digital para cada dB HL:
   `SPL objetivo = RETSPL(f) + dB HL`. Se miden además linealidad del atenuador, salida máxima,
   distorsión y diafonía. Se guarda todo en `calibration_profiles` con el certificado.
2. **Comprobación diaria (ISO 8253-1):** escucha subjetiva rápida por el operador (ambos oídos,
   varias frecuencias, sin ruidos, sin intermitencias de cable), registrada.
3. **Autocomprobación eléctrica (opcional, recomendada):** con un cable salida→entrada de la
   interfaz, la app emite tonos y mide su nivel eléctrico; si difiere de la referencia guardada
   más de ±1 dB, avisa de que el volumen o la interfaz han cambiado. Es la forma de compensar que
   el navegador no puede leer el volumen del sistema.
4. **Sin perfil calibrado → los resultados se guardan como «no calibrados»** y no generan informe
   clínico.

### 4.4 Procedimientos
**a) Audiómetro manual (prioridad 1):** pantalla tipo audiómetro: selector de oído, frecuencia,
nivel (teclado y ratón), presentar tono, indicador del pulsador, marcar umbral, marcar
enmascarado y «sin respuesta». El audiograma se dibuja en vivo con `AudiogramChart`.

**b) Automático — Hughson-Westlake modificado (ISO 8253-1):**
1. Instrucciones y familiarización (1 kHz, nivel claramente audible, p. ej. 40 dB HL).
2. Oído mejor primero (según lo que diga el paciente).
3. Bajar 10 dB tras cada respuesta, subir 5 dB tras cada no respuesta.
4. Umbral = nivel más bajo con respuesta en ≥ 2 de 3 ascensos (≥ 50 %).
5. Orden: 1000 → 2000 → 3000 → 4000 → 6000 → 8000 → **retest 1000** → 750 → 500 → 250 → 125.
6. Interoctavas (750, 1500, 3000, 6000) cuando entre octavas haya ≥ 20 dB de diferencia.
7. Tonos de 1–2 s, intervalos aleatorios entre tonos, **pruebas trampa** (silencios) para detectar
   falsos positivos.
8. Fiabilidad: retest de 1 kHz ≤ 5 dB; tasa de falsos positivos; tiempos de respuesta.

**c) Enmascaramiento (vía aérea):**
- Regla: si el umbral del oído explorado supera en **≥ 40 dB** (atenuación interaural de
  supraaurales) al umbral del oído contralateral, hay riesgo de audición cruzada.
- Ruido de banda estrecha centrado en la frecuencia, calibrado en nivel efectivo (ISO 389-4).
- Método de meseta (plateau). Mientras no esté implementado: **alerta** (`MaskingAlert`) y el
  umbral se marca como «no enmascarado – posible curva sombra».

### 4.5 Del resultado al informe
- La sesión de consulta llega a la bandeja con el audiograma ya cargado.
- «Completar informe» abre el generador de AudiometricReport: se añaden **impedanciometría**
  (timpanometría y reflejos) y **logoaudiometría** a mano, más antecedentes y diagnóstico.
- El informe A4 incluye: datos de calibración (fecha y equipo), versión del software, indicadores
  de fiabilidad y el texto legal correspondiente (apartado 2.2).

---

## 5. Modo B — Paciente (informativo, por QR)

### 5.1 Flujo
1. **Antes de empezar:** qué es y qué no es la prueba (informativa, no diagnóstica, no sustituye a
   una audiometría en un centro auditivo), privacidad, aceptación de Términos y Privacidad.
2. **Formulario breve:** rango de edad, sexo, oído que preocupa, acúfenos, otalgia, otorrea,
   vértigo, exposición a ruido.
   - **Signos de alarma** → mensaje destacado y se detiene la prueba: pérdida de audición
     **súbita** (consultar con urgencia, idealmente en 24–72 h), otorrea/otalgia con fiebre,
     vértigo intenso, síntomas neurológicos.
3. **Elección de dispositivo** (como referencia, sin intentar corregir): intrauriculares /
   supraaurales / circumaurales; con cable / inalámbricos; modelo (opcional).
   - Avisos según la elección: preferir cable; desactivar cancelación de ruido, modo ambiente,
     audio espacial, ecualizadores y «reducir sonido fuerte»; con intrauriculares, que sellen bien.
4. **Comprobación del entorno:** estimación aproximada del ruido de la sala con el micrófono
   (opcional) y comprobación de que izquierda y derecha suenan en el oído correcto.
5. **Ajuste de volumen:** volumen del sistema fijo según instrucciones + tono de referencia.
6. **Pruebas:**
   - **Dígitos en ruido** (recomendada como prueba principal; robusta a la falta de calibración).
   - Tonos simplificados (p. ej. 500, 1000, 2000, 4000 Hz; opcionalmente 250 y 8000) con
     procedimiento ascendente acortado.
7. **Resultado para el paciente:** mensaje sencillo («dentro de lo esperado» / «recomendable
   revisión»), **sin cifras en dB HL**, siempre con la recomendación de evaluación profesional si
   hay dudas o síntomas.
8. **Envío anónimo** a la bandeja del médico, marcado **«NO CALIBRADO – INFORMATIVO»**, con el
   tipo de auricular, avisos de calidad y signos de alarma.

### 5.2 Posición regulatoria del modo B
Finalidad declarada estrictamente informativa/educativa, sin diagnóstico ni cifras clínicas al
paciente. Aun así, el cribado auditivo puede considerarse software sanitario según MDCG 2019-11:
revisar la redacción de la finalidad con el consultor regulatorio antes de publicarlo.

---

## 6. Textos legales (ambos modos)
- **Aviso legal, Términos y condiciones, Política de privacidad, Política de cookies** (partir de
  los de Vocalyzer y AudiometricReport).
- **Modo B:** «Esta prueba es informativa y no constituye un diagnóstico médico. Sus resultados
  dependen del dispositivo, los auriculares y el entorno, que no están calibrados. No sustituye a
  una audiometría realizada por un profesional en un centro auditivo. Si nota una pérdida de
  audición repentina, dolor, supuración o vértigo, consulte con un médico cuanto antes».
- **Modo A (mientras no haya marcado CE):** el texto del apartado 2.2.
- Responsable del tratamiento, base jurídica, conservación, derechos RGPD, encargados (Supabase,
  Netlify) y ubicación de los datos (región UE de Supabase).

---

## 7. Fases y entregables

| Fase | Contenido | Entregable / criterio de «hecho» |
|---|---|---|
| **0. Decisiones** | Consulta AEMPS/consultor y seguro RC; compra del hardware; elegir servicio de calibración | Hardware en consulta; respuesta regulatoria por escrito |
| **1. Esqueleto** | Repo `auditonetest`: base de Vocalyzer + motor de AudiometricReport + legales adaptados + Supabase | Bandeja, QR e informes funcionando con datos introducidos a mano |
| **2. Motor de audio** | `toneEngine`, `levels`, `safety`, enrutado L/R, tests unitarios | Tonos correctos medidos con loopback; techo de seguridad verificado |
| **3. Calibración** | Perfiles, tablas RETSPL, comprobación diaria, loopback, bloqueo sin calibración | Perfil cargado con datos del técnico; sesión bloqueada sin comprobación diaria |
| **4. Audiómetro manual** | Pantalla de audiómetro + pulsador + audiograma en vivo → bandeja → informe | Audiometría completa de un paciente con informe A4 |
| **5. Automático** | Hughson-Westlake, interoctavas, pruebas trampa, fiabilidad | Tests de simulación con «pacientes virtuales» (umbrales conocidos) |
| **6. Enmascaramiento** | Ruido de banda estrecha calibrado + método de meseta | Casos de asimetría ≥ 40 dB resueltos y documentados |
| **7. Validación clínica interna** | Comparar con un audiómetro certificado (p. ej., en un centro colaborador) | 30–50 pacientes (60–100 oídos); Bland-Altman; objetivo: diferencia media ≤ 5 dB y ≥ 90 % de umbrales dentro de ±10 dB |
| **8. Modo paciente** | Flujo QR completo, dígitos en ruido, signos de alarma | Resultado «no calibrado» llegando a la bandeja |
| **9. Preparación Clase IIa** | Completar la documentación del apartado 8, QMS ISO 13485, contacto con organismo notificado | Expediente técnico listo para auditoría |

---

## 8. Documentación «Clase IIa desde el día 1» (`docs/regulatory/`)
Mantenerla viva desde la fase 1 cuesta poco y ahorra meses después:
- **Finalidad prevista** (intended purpose) y población, usuarios y entorno de uso.
- **Requisitos de software** numerados (SRS) con **trazabilidad** requisito → código → test.
- **Registro de riesgos** (ISO 14971): p. ej., sobreexposición sonora, oído equivocado, perfil de
  calibración caducado, volumen del sistema cambiado, audición cruzada, pérdida de datos, umbral
  erróneo por falso positivo.
- **Plan de desarrollo y clasificación IEC 62304** (clase B previsible), lista de **SOUP**
  (React, Supabase, librerías de gráficos…) con versiones fijadas.
- **Plan y registros de verificación** (tests automáticos, mediciones con loopback, calibraciones).
- **Archivo de usabilidad** (IEC 62366-1): tareas críticas, pruebas con usuarios.
- **Ciberseguridad**: RLS, auditoría, copias de seguridad, gestión de vulnerabilidades.
- **Evaluación clínica**: plan y resultados de la fase 7 + revisión bibliográfica.
- **Control de versiones y cambios**: cada informe guarda la versión del software que lo generó.
- **Etiquetado e instrucciones de uso** (IFU), incluidas las limitaciones de hardware.

---

## 9. Riesgos principales y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Volumen del sistema o potenciómetro cambiados | Volumen fijo marcado, comprobación diaria, autocomprobación por loopback |
| Sobreexposición sonora | Techo de nivel por software, rampas, límite de saltos, parada visible |
| Ruido ambiente elevado | Carcasas atenuadoras, medición de la sala, aviso por micrófono |
| Audición cruzada en asimetrías | Reglas de enmascaramiento y alertas |
| Salida máxima insuficiente (125 Hz, 8 kHz) | Registrar «sin respuesta al máximo» por frecuencia |
| Actualizaciones de navegador/macOS que alteren el audio | Fijar navegador recomendado, re-verificar con loopback tras actualizaciones |
| Uso regulatorio en zona gris | Apartado 2.2; validación clínica; avance hacia el marcado CE |
| Paciente que interpreta el modo B como diagnóstico | Sin cifras clínicas, textos claros, signos de alarma |

---

## 10. Próximos pasos inmediatos
1. Crear el repo `auditonetest` (si no existe) y copiar este plan como `PLAN.md`.
2. Fase 0: consulta regulatoria + seguro RC + presupuesto de hardware y calibración.
3. Fase 1: esqueleto con Vocalyzer + AudiometricReport.
