import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, OWNER } from "@/components/LegalLayout";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/legal/terminos")({
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useLang();
  return (
    <LegalLayout titleKey="legal.terms.title" other="privacy">
      {lang === "es" ? <TermsES /> : <TermsEN />}
    </LegalLayout>
  );
}

function TermsES() {
  return (
    <>
      <h2>1. Objeto</h2>
      <p>
        Vocalyzer (en adelante, «la Aplicación») es una herramienta profesional de análisis acústico de la voz. Está
        dirigida <strong>a profesionales sanitarios</strong> y a sus pacientes cuando éstos son invitados a realizar la
        prueba mediante un enlace o código QR facilitado por su médico. El uso de la Aplicación implica la aceptación
        plena de los presentes Términos.
      </p>

      <h2>2. Titularidad</h2>
      <p>
        La titularidad de la Aplicación corresponde a <strong>{OWNER.name}</strong>, {OWNER.role.es}, colegiado nº{" "}
        {OWNER.colegiado}, con domicilio profesional en {OWNER.city}. Contacto:{" "}
        <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.
      </p>

      <h2>3. Funcionamiento: análisis local de la voz</h2>
      <ul>
        <li>
          La grabación y el análisis acústico se realizan <strong>íntegramente en el navegador</strong> del dispositivo
          en el que se hace la prueba.
        </li>
        <li>
          <strong>El audio no se envía a ningún servidor ni se almacena en ninguna base de datos.</strong> Permanece en
          la memoria del dispositivo durante la prueba y se descarta al terminarla o al cerrar la página.
        </li>
        <li>
          Únicamente se transmiten a la cuenta del médico los <strong>resultados numéricos</strong> del análisis
          (parámetros acústicos, índices, estimaciones orientativas e indicadores de calidad de la grabación), junto con
          el idioma, la fecha y, si el paciente decide indicarlos, el sexo y un rango de edad.
        </li>
      </ul>

      <h2>4. Cuentas de profesionales</h2>
      <ul>
        <li>El registro está reservado a profesionales sanitarios. El usuario se compromete a facilitar información veraz.</li>
        <li>El usuario es responsable de la confidencialidad de sus credenciales y de todo uso realizado con su cuenta.</li>
      </ul>

      <h2>5. Uso aceptable</h2>
      <ul>
        <li>No introducir en las etiquetas datos identificativos de pacientes (nombre completo, DNI, teléfono, dirección o email).</li>
        <li>No compartir públicamente el enlace o QR de paciente fuera del contexto asistencial para el que se emite.</li>
        <li>No intentar acceder a datos o cuentas ajenas ni alterar el funcionamiento del servicio.</li>
      </ul>

      <h2>6. Descargo médico</h2>
      <p>
        La Aplicación es una <strong>herramienta de apoyo</strong>. Los parámetros acústicos dependen del dispositivo,
        del micrófono (no calibrado) y del entorno de grabación, y sus valores de referencia son orientativos. Las
        escalas GRBAS y CAPE-V son <strong>escalas perceptuales</strong>: la Aplicación ofrece únicamente una
        estimación acústica orientativa que <strong>no sustituye</strong> la valoración auditiva del clínico, la
        exploración laríngea ni el juicio clínico. La Aplicación no ha obtenido marcado CE como producto sanitario y no
        debe utilizarse como único fundamento de un diagnóstico o tratamiento. La interpretación de los resultados
        corresponde exclusivamente al profesional sanitario.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        El código, el diseño y los textos originales de la Aplicación están protegidos por la normativa de propiedad
        intelectual. Los métodos de análisis se basan en algoritmos publicados (Boersma, 1993; Praat) y en índices de
        la literatura científica (p. ej., AVQI, CPPS); las escalas GRBAS (Hirano) y CAPE-V (ASHA) se citan como
        referencia de sus autores originales.
      </p>

      <h2>8. Disponibilidad y responsabilidad</h2>
      <p>
        Se procura mantener el servicio disponible, sin garantizar la ausencia de interrupciones o errores. En la
        medida máxima permitida por la ley, el titular no será responsable de daños indirectos ni de decisiones
        clínicas basadas total o parcialmente en la información mostrada por la Aplicación.
      </p>

      <h2>9. Encargo del tratamiento (art. 28 RGPD)</h2>
      <p>
        Respecto a los resultados de los pacientes, el médico usuario es el <strong>Responsable del tratamiento</strong>{" "}
        y Vocalyzer actúa como <strong>Encargado</strong>. La aceptación de estos Términos formaliza el encargo:
      </p>
      <ul>
        <li><strong>Objeto:</strong> recibir, almacenar y mostrar al médico los resultados numéricos de las evaluaciones de sus pacientes.</li>
        <li><strong>Datos:</strong> parámetros acústicos y estimaciones, sexo y rango de edad opcionales, idioma, fecha y la etiqueta seudonimizada que el propio médico añada. No se trata audio.</li>
        <li><strong>Obligaciones del médico:</strong> informar al paciente y contar con base jurídica adecuada; no introducir identificadores directos en las etiquetas.</li>
        <li><strong>Obligaciones de Vocalyzer:</strong> tratar los datos sólo para prestar el servicio, garantizar confidencialidad y medidas de seguridad adecuadas, y no usarlos con fines propios (publicidad, perfilado, cesión o entrenamiento de modelos de IA).</li>
        <li><strong>Subencargados:</strong> proveedores de base de datos, autenticación y alojamiento en la nube con garantías del art. 28 RGPD.</li>
        <li><strong>Supresión:</strong> el médico puede eliminar cualquier resultado desde su bandeja o su cuenta completa desde Configuración.</li>
      </ul>

      <h2>10. Legislación aplicable</h2>
      <p>
        Estos Términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los
        juzgados del domicilio del usuario cuando así lo exija la normativa de consumo y, en su defecto, a los de{" "}
        {OWNER.city}.
      </p>
    </>
  );
}

function TermsEN() {
  return (
    <>
      <h2>1. Purpose</h2>
      <p>
        Vocalyzer ("the Application") is a professional tool for acoustic voice analysis. It is intended
        <strong> for healthcare professionals</strong> and for their patients when invited to take the test through a
        link or QR code supplied by their doctor. Using the Application implies full acceptance of these Terms.
      </p>

      <h2>2. Ownership</h2>
      <p>
        The Application is owned by <strong>{OWNER.name}</strong>, {OWNER.role.en}, license no. {OWNER.colegiado},{" "}
        {OWNER.city}. Contact: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.
      </p>

      <h2>3. How it works: local voice analysis</h2>
      <ul>
        <li>Recording and acoustic analysis run <strong>entirely in the browser</strong> of the device used for the test.</li>
        <li>
          <strong>Audio is never sent to any server nor stored in any database.</strong> It stays in the device's memory
          during the test and is discarded when the test ends or the page is closed.
        </li>
        <li>
          Only the <strong>numerical results</strong> (acoustic parameters, indices, orientative estimates and recording
          quality indicators) are sent to the doctor's account, together with language, date and — if the patient
          chooses to provide them — sex and an age range.
        </li>
      </ul>

      <h2>4. Professional accounts</h2>
      <ul>
        <li>Registration is reserved for healthcare professionals, who must provide truthful information.</li>
        <li>Users are responsible for keeping their credentials confidential and for all use of their account.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <ul>
        <li>Do not enter identifying patient data in labels (full name, national ID, phone, address or email).</li>
        <li>Do not publicly share the patient link or QR outside the clinical context it is issued for.</li>
        <li>Do not attempt to access other users' data or interfere with the service.</li>
      </ul>

      <h2>6. Medical disclaimer</h2>
      <p>
        The Application is a <strong>support tool</strong>. Acoustic parameters depend on the device, the (uncalibrated)
        microphone and the recording environment, and reference values are orientative. GRBAS and CAPE-V are
        <strong> perceptual scales</strong>: the Application only provides an orientative acoustic estimate that
        <strong> does not replace</strong> the clinician's auditory rating, laryngeal examination or clinical judgement.
        The Application has not obtained CE marking as a medical device and must not be used as the sole basis for a
        diagnosis or treatment. Interpretation of results is the sole responsibility of the healthcare professional.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        The Application's code, design and original texts are protected by intellectual property law. Analysis methods
        are based on published algorithms (Boersma, 1993; Praat) and indices from the scientific literature (e.g. AVQI,
        CPPS); the GRBAS (Hirano) and CAPE-V (ASHA) scales are cited as works of their original authors.
      </p>

      <h2>8. Availability and liability</h2>
      <p>
        Reasonable efforts are made to keep the service available, without guaranteeing uninterrupted or error-free
        operation. To the maximum extent permitted by law, the owner is not liable for indirect damages or for clinical
        decisions based wholly or partly on information shown by the Application.
      </p>

      <h2>9. Data processing agreement (Art. 28 GDPR)</h2>
      <p>
        For patient results, the doctor is the <strong>Controller</strong> and Vocalyzer acts as <strong>Processor</strong>.
        Accepting these Terms formalises the processing agreement:
      </p>
      <ul>
        <li><strong>Subject:</strong> receiving, storing and displaying to the doctor the numerical results of their patients' assessments.</li>
        <li><strong>Data:</strong> acoustic parameters and estimates, optional sex and age range, language, date and any pseudonymous label added by the doctor. No audio is processed on servers.</li>
        <li><strong>Doctor's obligations:</strong> inform the patient and rely on an appropriate legal basis; never enter direct identifiers in labels.</li>
        <li><strong>Vocalyzer's obligations:</strong> process data only to provide the service, ensure confidentiality and appropriate security, and never use it for its own purposes (advertising, profiling, disclosure or AI training).</li>
        <li><strong>Sub-processors:</strong> database, authentication and cloud hosting providers bound by Art. 28 GDPR guarantees.</li>
        <li><strong>Deletion:</strong> the doctor can delete any result from the inbox, or the whole account from Settings.</li>
      </ul>

      <h2>10. Governing law</h2>
      <p>
        These Terms are governed by Spanish law. Disputes are submitted to the courts of the user's domicile where
        consumer law so requires and otherwise to those of {OWNER.city}.
      </p>
    </>
  );
}
