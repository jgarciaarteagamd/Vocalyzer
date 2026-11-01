import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, OWNER } from "@/components/LegalLayout";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/legal/privacidad")({
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useLang();
  return (
    <LegalLayout titleKey="legal.privacy.title" other="terms">
      {lang === "es" ? <PrivacyES /> : <PrivacyEN />}
    </LegalLayout>
  );
}

function PrivacyES() {
  return (
    <>
      <p className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <strong>Aviso al paciente.</strong> Su voz se analiza en su propio dispositivo, dentro del navegador.{" "}
        <strong>El audio no se envía a ningún servidor ni se guarda en ninguna base de datos.</strong> Solo los
        resultados numéricos del análisis llegan a su médico, de forma anónima: no se le pide su nombre ni ningún dato
        de contacto.
      </p>

      <h2>1. Responsable y roles</h2>
      <p>
        Responsable de los datos de las cuentas profesionales: <strong>{OWNER.name}</strong>, {OWNER.role.es}, colegiado
        nº {OWNER.colegiado}, {OWNER.city}. Contacto: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>. Respecto a
        los resultados de los pacientes, el Responsable es el médico que solicita la prueba y Vocalyzer actúa como
        Encargado del tratamiento (art. 28 RGPD), según se detalla en los Términos de uso.
      </p>

      <h2>2. Qué datos se tratan</h2>
      <ul>
        <li>
          <strong>Paciente:</strong> resultados numéricos del análisis acústico (por ejemplo F0, jitter, shimmer, HNR,
          CPPS, AVQI, tiempo máximo de fonación, cociente s/z), estimaciones orientativas GRBAS/CAPE-V, indicadores de
          calidad de la grabación (ruido de fondo, saturación, frecuencia de muestreo), idioma, fecha y, solo si el
          paciente lo indica, sexo y rango de edad. <strong>No se trata audio en servidores</strong> ni datos
          identificativos o de contacto.
        </li>
        <li>
          <strong>Profesional:</strong> email y contraseña cifrada, nombre, apellidos, número de colegiado, fechas de
          aceptación de los términos, etiquetas que el propio médico añade a sus resultados y su valoración perceptual.
        </li>
        <li>
          <strong>Datos técnicos mínimos</strong> que los proveedores de infraestructura registran para el funcionamiento
          y la seguridad del servicio (por ejemplo, fecha y dirección IP de las peticiones).
        </li>
      </ul>

      <h2>3. Tratamiento del audio</h2>
      <p>
        El navegador solicita permiso para usar el micrófono. La grabación se mantiene únicamente en la memoria del
        dispositivo mientras dura la prueba; el análisis se ejecuta localmente y, al terminar o cerrar la página, el
        audio se descarta. En el modo «evaluación en consulta», el profesional puede reproducir las grabaciones en el
        mismo dispositivo durante la sesión para su valoración perceptual; tampoco en ese caso se envían ni se guardan.
      </p>

      <h2>4. Finalidad y base jurídica</h2>
      <ul>
        <li>Prestar al profesional el servicio de evaluación acústica de la voz y gestión de resultados.</li>
        <li>
          Cuentas profesionales: ejecución de la relación de servicio (art. 6.1.b RGPD) e interés legítimo en la seguridad
          (art. 6.1.f RGPD).
        </li>
        <li>
          Resultados de pacientes: la base jurídica la determina el médico Responsable (típicamente consentimiento
          explícito, arts. 6.1.a y 9.2.a RGPD, o asistencia sanitaria, art. 9.2.h RGPD). Antes de iniciar la prueba, el
          paciente debe aceptar expresamente estos términos.
        </li>
      </ul>
      <p>Los datos no se utilizan con fines publicitarios, de perfilado ni para entrenar modelos de inteligencia artificial.</p>

      <h2>5. Conservación</h2>
      <ul>
        <li>Los resultados se conservan mientras el profesional los mantenga en su bandeja; puede eliminarlos en cualquier momento.</li>
        <li>Los datos de la cuenta se conservan mientras esté activa y se eliminan al darla de baja, salvo obligación legal.</li>
      </ul>

      <h2>6. Destinatarios</h2>
      <p>
        No se ceden datos a terceros salvo obligación legal. Se utilizan proveedores de base de datos, autenticación y
        alojamiento en la nube que actúan como encargados del tratamiento con las garantías del art. 28 RGPD y, en su
        caso, cláusulas contractuales tipo para transferencias internacionales.
      </p>

      <h2>7. Derechos</h2>
      <p>
        Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo
        a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>. Como los resultados de pacientes son anónimos para
        Vocalyzer, las solicitudes relativas a ellos deben dirigirse al médico que solicitó la prueba. Puede reclamar
        ante la Agencia Española de Protección de Datos (www.aepd.es).
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Cifrado en tránsito (HTTPS), control de acceso por filas (cada médico solo puede ver sus propios resultados) y
        minimización de datos: el audio nunca sale del dispositivo.
      </p>

      <h2>9. Menores</h2>
      <p>
        Cuando la prueba la realice un menor, corresponde al profesional recabar el consentimiento de sus representantes
        legales conforme a la normativa aplicable.
      </p>

      <h2>10. Almacenamiento local</h2>
      <p>
        Solo se usa almacenamiento técnico en el navegador (sesión del profesional, idioma y aceptación de este aviso).
        No se usan cookies de análisis ni de marketing.
      </p>

      <h2>11. Cambios</h2>
      <p>Esta política puede actualizarse; la versión vigente se publica en esta página con su fecha.</p>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <p className="rounded-md border border-primary/30 bg-primary/5 p-4">
        <strong>Patient notice.</strong> Your voice is analysed on your own device, inside the browser.{" "}
        <strong>Audio is never sent to any server nor stored in any database.</strong> Only the numerical results reach
        your doctor, anonymously: you are not asked for your name or any contact details.
      </p>

      <h2>1. Controller and roles</h2>
      <p>
        Controller for professional account data: <strong>{OWNER.name}</strong>, {OWNER.role.en}, license no.{" "}
        {OWNER.colegiado}, {OWNER.city}. Contact: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>. For patient
        results, the requesting doctor is the Controller and Vocalyzer acts as Processor (Art. 28 GDPR), as detailed in
        the Terms of use.
      </p>

      <h2>2. Data processed</h2>
      <ul>
        <li>
          <strong>Patients:</strong> numerical acoustic results (e.g. F0, jitter, shimmer, HNR, CPPS, AVQI, maximum
          phonation time, s/z ratio), orientative GRBAS/CAPE-V estimates, recording quality indicators (background
          noise, clipping, sample rate), language, date and — only if provided — sex and age range.
          <strong> No audio is processed on servers</strong>, nor any identifying or contact data.
        </li>
        <li>
          <strong>Professionals:</strong> email and hashed password, name, license number, terms acceptance dates, labels
          the doctor adds to results, and their perceptual ratings.
        </li>
        <li>
          <strong>Minimal technical data</strong> logged by infrastructure providers for operation and security (e.g.
          request date and IP address).
        </li>
      </ul>

      <h2>3. Audio handling</h2>
      <p>
        The browser asks for microphone permission. Recordings exist only in the device's memory during the test; the
        analysis runs locally and the audio is discarded when the test ends or the page closes. In "in-clinic assessment"
        mode the professional can replay the recordings on the same device during the session for perceptual rating;
        they are not uploaded or stored in that case either.
      </p>

      <h2>4. Purpose and legal basis</h2>
      <ul>
        <li>Providing professionals with acoustic voice assessment and results management.</li>
        <li>Professional accounts: performance of the service relationship (Art. 6.1.b GDPR) and legitimate interest in security (Art. 6.1.f GDPR).</li>
        <li>
          Patient results: the legal basis is determined by the doctor as Controller (typically explicit consent, Arts.
          6.1.a and 9.2.a GDPR, or healthcare, Art. 9.2.h GDPR). Patients must expressly accept these terms before starting.
        </li>
      </ul>
      <p>Data is never used for advertising, profiling or training artificial intelligence models.</p>

      <h2>5. Retention</h2>
      <ul>
        <li>Results are kept while the professional keeps them in the inbox and can be deleted at any time.</li>
        <li>Account data is kept while the account is active and deleted when it is closed, unless the law requires otherwise.</li>
      </ul>

      <h2>6. Recipients</h2>
      <p>
        Data is not disclosed to third parties unless legally required. Database, authentication and cloud hosting
        providers act as processors under Art. 28 GDPR, with standard contractual clauses for international transfers
        where applicable.
      </p>

      <h2>7. Rights</h2>
      <p>
        You may exercise your rights of access, rectification, erasure, objection, restriction and portability by
        writing to <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>. As patient results are anonymous to Vocalyzer,
        requests about them should be addressed to the requesting doctor. You may lodge a complaint with your data
        protection authority (in Spain, www.aepd.es).
      </p>

      <h2>8. Security</h2>
      <p>
        Encryption in transit (HTTPS), row-level access control (each doctor can only see their own results) and data
        minimisation: audio never leaves the device.
      </p>

      <h2>9. Minors</h2>
      <p>When a minor takes the test, the professional must obtain consent from their legal guardians as required by law.</p>

      <h2>10. Local storage</h2>
      <p>
        Only technical browser storage is used (professional session, language and acceptance of this notice). No
        analytics or marketing cookies are used.
      </p>

      <h2>11. Changes</h2>
      <p>This policy may be updated; the current version is published on this page with its date.</p>
    </>
  );
}
