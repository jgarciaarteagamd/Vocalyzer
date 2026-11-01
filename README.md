# Vocalyzer

Evaluación acústica de la voz **en el navegador**. El paciente escanea un código QR, acepta las
condiciones, activa el micrófono y realiza un protocolo breve de lectura (~3 min). El análisis se
hace en su propio dispositivo y **el audio nunca se envía ni se guarda**: solo los resultados
numéricos llegan, de forma anónima, a la bandeja del médico. La gestión de resultados sigue el
modelo de ENT Quest (bandeja, etiquetas, leído/no leído, copiar, eliminar).

## Flujo

**Paciente** (`/p/<id-del-médico>`, abierto desde el QR):

1. Mensaje «Antes de empezar»: el análisis se hace en el navegador, la voz no se guarda en ninguna
   base de datos y solo se envían resultados numéricos anónimos. Enlaces a Términos y Privacidad,
   casilla de aceptación y botón «Aceptar y continuar».
2. Datos opcionales (sexo, rango de edad), consejos de grabación y permiso de micrófono.
3. Protocolo de 7 tareas (cada una con medidor de nivel, «Repetir» y «Escuchar» local):

   | # | Tarea | Para qué |
   |---|-------|----------|
   | 1 | 3 s de silencio | Ruido de fondo / relación señal-ruido |
   | 2 | /a/ sostenida, voz habitual (≈5 s) | F0, jitter, shimmer, HNR, CPPS, H1–H2 (3 s centrales, como AVQI) |
   | 3 | /a/ lo más larga posible | Tiempo máximo de fonación (TMF) |
   | 4 | /s/ sostenida | Cociente s/z |
   | 5 | /z/ sostenida (zumbido sonoro) | Cociente s/z |
   | 6 | 6 frases (criterios fonéticos del CAPE-V) | Habla conectada, CPPS |
   | 7 | Texto breve y fácil (≈30 s) | F0 del habla, rango tonal, CPPS lectura, AVQI |

4. Análisis local (Web Worker, unos segundos) → «Enviar resultados» → confirmación.

**Médico** (cuenta con email y contraseña):

- **Panel**: QR personal + enlace + hoja imprimible con el QR para la consulta.
- **Evaluar en consulta**: el mismo protocolo en el dispositivo del médico; puede escuchar las
  grabaciones (solo en memoria) y registrar su valoración perceptual GRBAS/CAPE-V antes de guardar.
- **Bandeja**: filtros Paciente/Consulta, nuevo/leído, etiquetas (iniciales o código interno),
  copiar resumen para la historia clínica, informe completo, valoración perceptual editable e
  informe imprimible (A4). Actualización en tiempo real.

## Parámetros

| Grupo | Parámetros | Referencia usada |
|-------|------------|------------------|
| Globales | **AVQI v03.01**, CPPS /a/, CPPS lectura | AVQI < 2,28 (validación española, Delgado Hernández et al. 2018); CPPS /a/ > 14,45 dB y lectura > 9,33 dB (Murton et al. 2020, Praat) |
| Vocal /a/ | F0 media y DE, jitter local/RAP/PPQ5, shimmer local/dB/APQ3/5/11, HNR, H1–H2, interrupciones de sonoridad, estabilidad de intensidad | Umbrales MDVP citados en Praat (jitter 1,04 %, shimmer 3,81 %, 0,35 dB, APQ11 3,07 %), HNR > 20 dB |
| Eficiencia | TMF, duraciones /s/ y /z/, cociente s/z | TMF ≥ 10 s; s/z ≤ 1,4 (Eckel & Boone 1981) |
| Habla | F0 mediana, rango P5–P95 (st), variabilidad tonal, proporción sonora, variabilidad de intensidad, duración de lectura | Informativos (F0 por sexo: H 85–155 Hz, M 165–255 Hz) |
| Calidad | Ruido de fondo, SNR, saturación, frecuencia de muestreo | SNR > 30 dB recomendable |

### GRBAS y CAPE-V

GRBAS y CAPE-V son **escalas perceptuales**. Vocalyzer muestra una **estimación acústica
orientativa** (con indicación de qué parámetros la impulsan y su fiabilidad), construida así:

- **G / Severidad global**: AVQI (peso 50 %) + CPPS lectura (25 %) + CPPS /a/ (25 %), anclados en
  sus puntos de corte publicados.
- **R / Aspereza**: jitter, shimmer, HNR, interrupciones de sonoridad.
- **B / Soplo**: CPPS /a/, HNR, H1–H2, s/z, TMF.
- **A / Astenia y S / Tensión**: correlatos acústicos débiles → marcados como baja fiabilidad.
- **CAPE-V Tono**: desviación de la F0 respecto al rango típico del sexo indicado.
- **CAPE-V Intensidad**: no estimable con un micrófono no calibrado (requiere valoración perceptual).

El médico puede registrar su **valoración perceptual** (GRBAS 0–3 y CAPE-V 0–100, C/I), que se
muestra junto a la estimación.

## Privacidad

- El audio se captura con `getUserMedia` (sin cancelación de eco, supresión de ruido ni control
  automático de ganancia) y se mantiene en memoria. **Nunca se sube**.
- A Supabase solo llega: métricas numéricas, estimaciones, sexo/edad opcionales, idioma, fecha,
  versión del protocolo. Los pacientes no pueden poner etiquetas; solo el médico.
- Row Level Security: los pacientes (anónimos) solo pueden *insertar* filas válidas para un médico
  existente; cada médico solo ve/edita/borra lo suyo; las métricas no se pueden modificar.

## Validación del motor de análisis

El motor (TypeScript, sin dependencias) reimplementa los algoritmos de Praat (pitch AC de Boersma
con Viterbi, PointProcess cc, jitter/shimmer del voice report, Harmonicity cc, PowerCepstrogram +
CPPS, LTAS) y se compara con **Praat 6.1.38** (vía parselmouth) sobre voces sintéticas con jitter,
shimmer y ruido conocidos (`tests/praat-agreement.test.ts`). Valores Vocalyzer / Praat:

| Señal | Jitter % | Shimmer % | HNR dB | CPPS dB | LTAS slope dB |
|-------|----------|-----------|--------|---------|---------------|
| Normal (H) | 0,18 / 0,18 | 2,51 / 2,51 | 30,68 / 30,71 | 18,93 / 19,06 | −18,69 / −18,69 |
| Normal (M) | 0,22 / 0,22 | 3,17 / 3,17 | 26,84 / 26,85 | 15,88 / 15,88 | −13,69 / −13,72 |
| Áspera | 1,03 / 1,03 | 11,60 / 11,60 | 16,31 / 16,33 | 14,12 / 14,20 | −18,93 / −18,93 |
| Soplada | 0,47 / 0,46 | 6,14 / 6,14 | 11,74 / 11,76 | 11,81 / 11,90 | −19,39 / −19,40 |
| Grave | 2,22 / 2,22 | 17,26 / 17,27 | 5,77 / 5,80 | 8,82 / 8,85 | −18,59 / −18,58 |
| Habla disfónica | 2,04 / 2,04 | 14,22 / 13,66 | 6,86 / 7,54 | 6,87 / 6,84 | −22,30 / −22,30 |

Otros tests: sesión completa normal vs. disfónica (`tests/session.test.ts`) y políticas RLS de la
migración ejecutadas en Postgres (PGlite) (`tests/rls.test.ts`).

```bash
npm test
```

Para regenerar la referencia de Praat (requiere Python con `praat-parselmouth` y `numpy`):

```bash
npx vite-node scripts/gen-fixtures.ts
```

```bash
python3 scripts/praat_reference.py
```

## Puesta en marcha

1. **Supabase**: cree un proyecto (región UE recomendada). En *Seguridad* deje marcada «Habilitar
   la API de datos»; «Exponer automáticamente nuevas tablas» puede desmarcarse (recomendado: la
   migración concede explícitamente cada permiso). Una vez creado, abra **SQL Editor** (menú
   lateral) → **New query**, pegue el contenido de
   `supabase/migrations/20261031000000_vocalyzer_init.sql` y pulse **Run** (debe responder
   «Success. No rows returned»). La migración es idempotente y también puede ejecutarse en el mismo
   proyecto que ENT Quest (reutiliza `doctor_profiles` y `private.doctor_exists` si ya existen), de
   modo que los médicos usen la misma cuenta en ambas aplicaciones.
2. **Auth** (Authentication → URL Configuration): ponga como *Site URL* el dominio público de
   Vocalyzer y añada `https://SU-DOMINIO/panel` a *Redirect URLs* (enlace de verificación de email).
3. **Variables de entorno** (copie `.env.example` a `.env.local`):
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y, opcionalmente, `VITE_PUBLIC_ORIGIN`
   (dominio que se codifica en los QR).
4. **Desarrollo**:

   ```bash
   npm install
   ```

   ```bash
   npm run dev
   ```

5. **Despliegue**: es una SPA estática (`npm run build` → `dist/`). Incluye `public/_redirects`
   (Netlify) y `vercel.json` (Vercel) para que funcionen los enlaces `/p/...`. El micrófono exige
   HTTPS.

## Evitar la pausa del plan gratuito de Supabase

Supabase pausa los proyectos gratuitos con poca actividad durante 7 días. La función programada
`netlify/functions/keepalive.mts` llama cada 6 horas a la función de base de datos `keepalive()`
(migración `20261102000000_keepalive.sql`) para registrar actividad. Solo se ejecuta en la versión
publicada; puede verse en Netlify → *Logs → Functions → keepalive* (y lanzarse con *Run now*).

## Limitaciones conocidas

- Micrófonos de móvil no calibrados y con respuesta en frecuencia variable: no se informan niveles
  absolutos (dB SPL) y los parámetros espectrales (LTAS, H1–H2) dependen del dispositivo. Algunos
  navegadores (sobre todo iOS) pueden no desactivar del todo el procesado de audio.
- Los umbrales de CPPS en lectura proceden del Rainbow Passage en inglés; el texto en español es
  propio (fácil de leer y fonéticamente variado), por lo que ese umbral es orientativo.
- El AVQI usa una extracción propia de los segmentos sonoros (≈3 s de habla sonora + 3 s centrales
  de la /a/, como AVQI v03.01); sus componentes coinciden con Praat, pero el índice puede diferir
  ligeramente del script original.
- La estimación GRBAS/CAPE-V es heurística y orientativa. No es un producto sanitario certificado.
