# Procedimiento de Ejercicio de Derechos de los Interesados (ARSLOP)

**Aplicable a:** MediMaestro (plataforma SaaS de gestión clínica)
**Versión:** 1.0
**Fecha:** 27 de marzo de 2026
**Estado:** Pendiente de validación por el DPO
**Referencia DPIA:** Acción A17

---

## 1. Objeto

El presente documento establece el procedimiento interno para atender las solicitudes de ejercicio de derechos de los pacientes y demás interesados, conforme al Reglamento General de Protección de Datos (UE) 2016/679 (en adelante, RGPD) y a la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (en adelante, LOPDGDD).

Los derechos contemplados son: **Acceso, Rectificación, Supresión, Limitación, Oposición y Portabilidad** (ARSLOP), así como el derecho a no ser objeto de decisiones automatizadas (Art. 22 RGPD).

## 2. Alcance

Este procedimiento aplica a todos los datos personales tratados a través de la plataforma MediMaestro, incluyendo:

- Datos identificativos de pacientes (nombre, DNI/NIE, fecha de nacimiento, datos de contacto)
- Historiales clínicos y datos de salud
- Citas y agenda médica
- Prescripciones y tratamientos
- Consentimientos informados
- Datos de facturación
- Registros de acceso y auditoría

## 3. Derechos reconocidos

### 3.1 Derecho de acceso (Art. 15 RGPD)

El paciente tiene derecho a obtener del responsable del tratamiento confirmación de si se están tratando o no datos personales que le conciernen y, en tal caso, derecho de acceso a los datos personales y a la siguiente información:

- Fines del tratamiento
- Categorías de datos tratados
- Destinatarios o categorías de destinatarios
- Plazo previsto de conservación
- Existencia de otros derechos (rectificación, supresión, limitación, oposición)
- Derecho a presentar reclamación ante la AEPD
- Origen de los datos (cuando no se hayan obtenido directamente del interesado)
- Existencia de decisiones automatizadas

**Plazo de respuesta:** 1 mes desde la recepción de la solicitud, prorrogable 2 meses adicionales en casos de especial complejidad o volumen de solicitudes.

**Formato de entrega:** Copia electrónica de los datos en formato PDF o JSON, según preferencia del interesado.

**Datos incluidos en la respuesta:**

- Datos identificativos y de contacto
- Historial médico completo (episodios clínicos, evoluciones, diagnósticos)
- Registro de citas (pasadas y futuras)
- Prescripciones emitidas
- Consentimientos informados firmados
- Facturas emitidas
- Registro de accesos a sus datos (quién, cuándo, qué operación)

### 3.2 Derecho de rectificación (Art. 16 RGPD)

El interesado tiene derecho a obtener sin dilación indebida la rectificación de los datos personales inexactos que le conciernan, así como a completar los datos personales incompletos.

**Plazo de respuesta:** 1 mes.

**Procedimiento técnico:**

1. El administrador de la clínica modifica los datos desde la interfaz de MediMaestro
2. El sistema registra automáticamente el cambio en el log de auditoría (valor anterior, valor nuevo, usuario que ejecuta, fecha y hora)
3. Se genera confirmación de la rectificación para el interesado

**Nota sobre datos clínicos:** La rectificación de datos del historial clínico se realizará sin eliminar la información original, añadiendo una nota de rectificación conforme a la Ley 41/2002, Art. 17.

### 3.3 Derecho de supresión (Art. 17 RGPD)

El denominado "derecho al olvido" permite al interesado solicitar la supresión de sus datos personales.

**Limitaciones importantes en el ámbito sanitario:**

- **Art. 17.3.b) RGPD:** No procede la supresión cuando el tratamiento sea necesario para el cumplimiento de una obligación legal.
- **Art. 17.3.c) RGPD:** No procede cuando el tratamiento sea necesario por razones de interés público en el ámbito de la salud pública.
- **Ley 41/2002, Art. 17:** La documentación clínica debe conservarse como mínimo cinco años contados desde la fecha del alta de cada proceso asistencial.
- **Legislación autonómica (Comunitat Valenciana):** Puede establecer plazos de conservación superiores.

**En la práctica:**

| Categoría de datos | Suprimibles | Observaciones |
|---|---|---|
| Datos de contacto (teléfono, email, dirección) | Sí, tras fin relación asistencial + plazo legal | Previa verificación de que no hay obligación de conservación |
| Datos administrativos no esenciales | Sí | Preferencias, notas no clínicas |
| Historiales médicos | No directamente | Se anonimizarán al expirar el plazo legal de conservación |
| Datos de facturación | No durante 6 años | Código de Comercio, Art. 30 |
| Consentimientos informados | No durante el tratamiento + 5 años | Ley 41/2002, Art. 8 |

**Procedimiento de anonimización:** Cuando proceda, los datos identificativos se reemplazarán por valores genéricos irreversibles (ej.: "PACIENTE-ANON-XXXX"), conservando los datos clínicos anonimizados para fines estadísticos o de investigación conforme al Art. 9.2.j) RGPD.

### 3.4 Derecho de limitación del tratamiento (Art. 18 RGPD)

El interesado puede solicitar la limitación del tratamiento cuando:

- Impugne la exactitud de los datos (durante el plazo de verificación)
- El tratamiento sea ilícito y el interesado se oponga a la supresión
- El responsable ya no necesite los datos pero el interesado los necesite para reclamaciones
- Se haya ejercido el derecho de oposición (durante la verificación de si los motivos legítimos del responsable prevalecen)

**Implementación técnica:** Los datos se marcarán con un indicador de "tratamiento limitado" en el sistema. Solo se podrán tratar con el consentimiento del interesado, para la protección de derechos de otra persona, por razones de interés público o para la formulación de reclamaciones.

### 3.5 Derecho de oposición (Art. 21 RGPD)

El interesado puede oponerse al tratamiento de sus datos en determinadas circunstancias.

**Limitaciones en contexto sanitario:** Cuando el tratamiento se base en el cumplimiento de una obligación legal (Art. 6.1.c) RGPD) o en el interés público (Art. 6.1.e), el responsable podrá demostrar motivos legítimos imperiosos que prevalezcan sobre los intereses del interesado.

**Evaluación caso por caso:** Cada solicitud de oposición será evaluada individualmente por el responsable del tratamiento, con asesoramiento del DPO.

### 3.6 Derecho de portabilidad (Art. 20 RGPD)

El interesado tiene derecho a recibir los datos personales que le incumban, que haya facilitado a un responsable del tratamiento, en un formato estructurado, de uso común y lectura mecánica, y a transmitirlos a otro responsable.

**Aplica cuando:**

- El tratamiento se base en el consentimiento o en un contrato
- El tratamiento se efectúe por medios automatizados

**Formato de entrega:**

- **JSON estructurado:** Exportación completa de los datos del paciente en formato JSON, organizado por categorías (identificación, historial, citas, prescripciones, facturas)
- **PDF estructurado:** Documento PDF con índice, incluyendo todas las categorías de datos

**Procedimiento actual:** Extracción realizada por el administrador del sistema mediante herramientas de administración de MediMaestro. Pendiente de implementación de endpoint automatizado (`GET /patients/:id/export`).

**Plazo:** 1 mes.

## 4. Canal de solicitud

### 4.1 Medios de presentación

El paciente o su representante legal puede ejercer sus derechos mediante cualquiera de los siguientes canales:

| Canal | Detalle |
|---|---|
| **Presencial** | Formulario disponible en la recepción de la clínica (ver Anexo A) |
| **Correo electrónico** | [EMAIL DE LA CLINICA] — con asunto: "Ejercicio de derechos RGPD" |
| **Correo postal** | [DIRECCION POSTAL DE LA CLINICA] |

### 4.2 Datos requeridos en la solicitud

Toda solicitud deberá contener, como mínimo:

1. **Identificación del solicitante:** Nombre y apellidos completos
2. **Documento identificativo:** Copia del DNI, NIE, pasaporte u otro documento oficial en vigor
3. **Derecho solicitado:** Indicación clara del derecho que desea ejercer (acceso, rectificación, supresión, limitación, oposición o portabilidad)
4. **Motivo o justificación:** Descripción del motivo de la solicitud (especialmente para rectificación, supresión y oposición)
5. **Dirección de notificación:** Dirección postal o electrónica para recibir la respuesta
6. **Fecha y firma** del solicitante

**En caso de representación legal:** Deberá adjuntarse, además, copia del documento de identidad del representante y documentación acreditativa de la representación (poder notarial, tutela, patria potestad en caso de menores).

### 4.3 Solicitudes incompletas

Si la solicitud no reúne los requisitos indicados, se requerirá al interesado para que subsane la solicitud en un plazo de 10 días hábiles, indicando las deficiencias detectadas. El plazo de respuesta se suspenderá hasta la subsanación.

## 5. Procedimiento interno

### 5.1 Fase 1 — Recepción y registro

| Paso | Responsable | Acción |
|---|---|---|
| 1 | Recepción / Administración | Recibir la solicitud y sellar con fecha de entrada |
| 2 | Recepción / Administración | Verificar la identidad del solicitante mediante cotejo del documento presentado |
| 3 | Recepción / Administración | Asignar un número de referencia único (formato: `DER-AAAA-NNN`) |
| 4 | Recepción / Administración | Registrar en el libro de solicitudes: fecha, solicitante, derecho, referencia |
| 5 | Recepción / Administración | Enviar acuse de recibo al solicitante (plazo: 48 horas) |
| 6 | Recepción / Administración | Trasladar la solicitud al responsable del tratamiento |

### 5.2 Fase 2 — Evaluación

| Paso | Responsable | Acción |
|---|---|---|
| 7 | Responsable del tratamiento | Identificar el derecho solicitado y los datos afectados |
| 8 | Responsable del tratamiento | Evaluar si procede o existen excepciones legales aplicables |
| 9 | DPO (si designado) | Asesorar sobre la procedencia de la solicitud en casos dudosos |
| 10 | Responsable del tratamiento | Determinar la acción a ejecutar |

### 5.3 Fase 3 — Ejecución técnica

Según el derecho solicitado:

**Acceso / Portabilidad:**

1. El administrador del sistema extrae los datos del paciente desde MediMaestro
2. Se genera un documento en formato PDF o JSON según la preferencia del interesado
3. Se incluyen todas las categorías de datos indicadas en el apartado 3.1
4. Se verifica que no se incluyan datos de terceros (otros pacientes)

**Rectificación:**

1. El administrador modifica los datos en el sistema
2. El sistema registra automáticamente el cambio en el log de auditoría
3. Se genera un certificado de rectificación

**Supresión:**

1. Evaluar qué datos son suprimibles y cuáles están sujetos a obligación de conservación
2. Para datos suprimibles: eliminar de la base de datos activa
3. Para datos no suprimibles: informar al interesado de la imposibilidad y su base legal
4. Para anonimización: reemplazar datos identificativos por valores genéricos
5. Registrar la operación en el log de auditoría

**Limitación:**

1. Marcar los datos del paciente con indicador de "tratamiento limitado" en el sistema
2. Restringir el acceso a los datos limitados
3. Documentar el alcance de la limitación

**Oposición:**

1. Evaluar los motivos del interesado frente a los motivos legítimos del responsable
2. Si procede: cesar el tratamiento de los datos para la finalidad objeto de oposición
3. Si no procede: informar motivadamente al interesado

### 5.4 Fase 4 — Respuesta al interesado

| Aspecto | Detalle |
|---|---|
| **Plazo máximo** | 1 mes desde la recepción de la solicitud completa |
| **Prórroga** | Hasta 2 meses adicionales, informando al interesado antes de que finalice el primer mes, con indicación de los motivos de la prórroga |
| **Coste** | Gratuito. Se podrá cobrar un canon razonable o denegar la solicitud en caso de solicitudes manifiestamente infundadas o excesivas (Art. 12.5 RGPD) |
| **Canal de respuesta** | El indicado por el interesado en su solicitud |
| **Contenido** | Información sobre las actuaciones realizadas, o en su caso, los motivos de la denegación con indicación del derecho a reclamar ante la AEPD |

### 5.5 Fase 5 — Registro y archivo

- Registrar en el libro de solicitudes: fecha de respuesta, acciones realizadas, resultado
- Archivar la documentación completa de la solicitud (solicitud, evaluación, acciones, respuesta)
- **Plazo de conservación del registro:** 5 años desde la fecha de resolución
- En caso de denegación: conservar la justificación detallada

## 6. Plazos resumen

| Acción | Plazo |
|---|---|
| Acuse de recibo al solicitante | 48 horas |
| Requerimiento de subsanación | 10 días hábiles para completar |
| Respuesta al interesado | 1 mes (máximo 3 meses con prórroga) |
| Conservación del expediente | 5 años |

## 7. Responsabilidades

| Rol | Responsabilidad |
|---|---|
| **Recepción / Administración de la clínica** | Recepción de solicitudes, verificación de identidad, registro, acuse de recibo |
| **Responsable del tratamiento** | Evaluación de la solicitud, toma de decisión, firma de la respuesta |
| **DPO** (cuando sea designado) | Asesoramiento en casos complejos, supervisión del cumplimiento de plazos, formación |
| **Administrador del sistema (MediMaestro)** | Extracción de datos, modificación técnica, anonimización, generación de informes |

## 8. Reclamación ante la autoridad de control

En caso de que el interesado considere que sus derechos no han sido debidamente atendidos, tiene derecho a presentar una reclamación ante:

**Agencia Española de Protección de Datos (AEPD)**
- Web: [https://www.aepd.es](https://www.aepd.es)
- Sede electrónica: [https://sedeagpd.gob.es](https://sedeagpd.gob.es)
- Dirección: C/ Jorge Juan, 6, 28001 Madrid
- Teléfono: 901 100 099 / 91 266 35 17

## Anexo A — Modelo de solicitud de ejercicio de derechos

---

### SOLICITUD DE EJERCICIO DE DERECHOS EN MATERIA DE PROTECCION DE DATOS

**Datos del solicitante:**

| Campo | Valor |
|---|---|
| Nombre y apellidos | |
| DNI / NIE / Pasaporte | |
| Dirección postal | |
| Correo electrónico | |
| Teléfono de contacto | |

**En caso de representante legal:**

| Campo | Valor |
|---|---|
| Nombre y apellidos del representante | |
| DNI / NIE / Pasaporte del representante | |
| Relación con el interesado | |
| Documentación acreditativa adjunta | [ ] Sí |

**Derecho que desea ejercer** (marque con X):

- [ ] Acceso (Art. 15 RGPD)
- [ ] Rectificación (Art. 16 RGPD)
- [ ] Supresión (Art. 17 RGPD)
- [ ] Limitación del tratamiento (Art. 18 RGPD)
- [ ] Oposición (Art. 21 RGPD)
- [ ] Portabilidad (Art. 20 RGPD)

**Descripción de la solicitud:**
(Indique los datos concretos a los que se refiere su solicitud y, en su caso, las modificaciones que solicita)

___________________________________________________________________________

___________________________________________________________________________

___________________________________________________________________________

**Canal preferido para recibir la respuesta:**

- [ ] Correo electrónico
- [ ] Correo postal
- [ ] Recogida presencial en la clínica

**Documentación adjunta:**

- [ ] Copia del documento de identidad
- [ ] Documentación acreditativa de representación (si aplica)
- [ ] Otra: _______________

**Declaración:** Declaro que los datos proporcionados son ciertos y que soy el interesado o su representante legal debidamente acreditado.

Fecha: ____/____/________

Firma: ______________________________

---

**Espacio reservado para la clínica:**

| Campo | Valor |
|---|---|
| Fecha de recepción | |
| Número de referencia | DER-____-____ |
| Recibido por | |
| Acuse de recibo enviado | [ ] Sí — Fecha: |

---

## Anexo B — Información al paciente

Se incluirá la siguiente información en la política de privacidad de la clínica, en los formularios de consentimiento informado y en un cartel visible en la recepción:

> **Sus derechos en materia de protección de datos**
>
> De conformidad con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD), usted tiene derecho a:
>
> - **Acceder** a sus datos personales
> - **Rectificar** los datos inexactos o incompletos
> - **Solicitar la supresión** de sus datos (con las limitaciones legales aplicables a datos de salud)
> - **Limitar** el tratamiento de sus datos
> - **Oponerse** al tratamiento en determinadas circunstancias
> - **Solicitar la portabilidad** de sus datos en formato electrónico
>
> Para ejercer cualquiera de estos derechos, puede dirigirse a la recepción de la clínica o enviar un correo electrónico a [EMAIL DE LA CLINICA] adjuntando copia de su documento de identidad.
>
> Si considera que sus derechos no han sido debidamente atendidos, tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).

---

## Historial de revisiones

| Versión | Fecha | Autor | Descripción |
|---|---|---|---|
| 1.0 | 2026-03-27 | [RESPONSABLE] | Versión inicial |
