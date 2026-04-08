# Registro de Actividades de Tratamiento — Art. 30 RGPD

**Documento:** RAT-MEDIMAESTRO-001
**Versión:** 1.0
**Fecha de creación:** 2026-03-27
**Última revisión:** 2026-03-27
**Estado:** Pendiente de validación por DPO
**Normativa aplicable:** Reglamento (UE) 2016/679 (RGPD), Ley Orgánica 3/2018 (LOPDGDD)

---

## Datos del Responsable del Tratamiento

| Campo | Valor |
|---|---|
| **Razón social** | [NOMBRE SOCIEDAD] |
| **CIF** | [CIF] |
| **Dirección** | [DIRECCIÓN] |
| **Teléfono** | [TELÉFONO] |
| **Correo electrónico** | [EMAIL CONTACTO] |
| **Representante legal** | [NOMBRE REPRESENTANTE] |
| **Delegado de Protección de Datos (DPO)** | [NOMBRE DPO] |
| **Contacto DPO** | [EMAIL DPO] |

## Datos del Encargado del Tratamiento

| Campo | Valor |
|---|---|
| **Proveedor de alojamiento** | Hostinger International Ltd. |
| **Ubicación del centro de datos** | Frankfurt, Alemania (Unión Europea) |
| **DPA firmado** | [PENDIENTE / FECHA FIRMA] |
| **Proveedor de correo (SMTP)** | [NOMBRE PROVEEDOR SMTP] |
| **DPA SMTP firmado** | [PENDIENTE / FECHA FIRMA] |

---

## Tratamientos de Datos Personales

---

### 1. Gestión de pacientes

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-001 |
| **Denominación** | Gestión administrativa y sanitaria de pacientes |
| **Finalidad** | Registro, identificación y gestión integral de los pacientes de la clínica, incluyendo la creación y mantenimiento de su ficha personal, datos de contacto y datos de seguro médico. Gestión del historial clínico, diagnósticos, tratamientos, alergias, antecedentes y constantes vitales. |
| **Base jurídica** | Art. 6.1.b) RGPD — Ejecución de contrato (prestación de servicios sanitarios). Art. 6.1.c) RGPD — Cumplimiento de obligación legal (Ley 41/2002 de autonomía del paciente). Art. 9.2.h) RGPD — Tratamiento necesario para fines de medicina preventiva o laboral, diagnóstico médico, prestación de asistencia o tratamiento de tipo sanitario o social, o gestión de los sistemas y servicios de asistencia sanitaria. |
| **Categorías de interesados** | Pacientes de la clínica (personas físicas que reciben atención sanitaria) |
| **Categorías de datos personales** | **Datos identificativos:** nombre, apellidos, DNI/NIE/pasaporte, fecha de nacimiento, sexo, nacionalidad, número de historia clínica. **Datos de contacto:** teléfono fijo, teléfono móvil, correo electrónico, dirección postal, código postal, ciudad, provincia. **Datos de salud (categoría especial Art. 9):** historial médico, episodios clínicos, diagnósticos (CIE-10), tratamientos, evoluciones clínicas, alergias e intolerancias, antecedentes personales y familiares, constantes vitales (tensión arterial, frecuencia cardíaca, temperatura, peso, talla, IMC, saturación O2), notas clínicas. **Datos de seguro médico:** compañía aseguradora, número de póliza, tipo de cobertura. **Datos económicos:** número de cuenta (si aplica para domiciliación). |
| **Destinatarios (cesiones)** | Personal sanitario de la clínica (médicos, enfermeros) con acceso limitado por roles (RBAC). Personal administrativo (secretaría) con acceso restringido a datos no clínicos según permisos asignados. No se realizan cesiones a terceros salvo obligación legal (juzgados, inspección sanitaria, autoridades competentes). |
| **Transferencias internacionales** | No se realizan. Todos los datos se almacenan y procesan dentro del Espacio Económico Europeo (servidor en Frankfurt, Alemania). |
| **Plazos de conservación y supresión** | Historiales clínicos: mínimo 5 años desde el alta del paciente conforme a la Ley 41/2002, Art. 17.1. Se aplica un plazo extendido de 15 años desde la última atención como buena práctica en el sector sanitario (recomendación de diversas CCAA). Datos identificativos y de contacto: mientras dure la relación asistencial + plazo de conservación del historial. Datos de seguro médico: duración de la cobertura + 6 años (prescripción de obligaciones fiscales). |
| **Medidas técnicas de seguridad** | Cifrado TLS 1.2/1.3 en tránsito (HTTPS obligatorio). Aislamiento multi-tenant (cada clínica en base de datos PostgreSQL independiente). Control de acceso basado en roles (RBAC) con más de 50 permisos granulares. Autenticación mediante JWT con expiración de 2 horas + refresh token de 7 días. Autenticación de dos factores TOTP disponible. Copias de seguridad diarias cifradas con GPG (clave asimétrica). Registro de auditoría de más de 30 tipos de eventos. |
| **Medidas organizativas de seguridad** | Política de contraseñas robusta (bcrypt). Principio de mínimo privilegio en asignación de roles. Formación del personal en protección de datos [PENDIENTE]. Procedimiento de gestión de incidentes documentado. |

---

### 2. Gestión de citas

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-002 |
| **Denominación** | Gestión de citas y agenda de la clínica |
| **Finalidad** | Programación, modificación, cancelación y seguimiento de las citas de los pacientes. Gestión de la agenda de los profesionales sanitarios. Organización de los recursos de la clínica (salas, equipos). |
| **Base jurídica** | Art. 6.1.b) RGPD — Ejecución de contrato (prestación del servicio sanitario contratado). Art. 6.1.f) RGPD — Interés legítimo (organización eficiente de la actividad sanitaria). |
| **Categorías de interesados** | Pacientes de la clínica. Profesionales sanitarios (como titulares de la agenda). |
| **Categorías de datos personales** | **Datos del paciente:** nombre, apellidos, teléfono, correo electrónico (para recordatorios). **Datos de la cita:** fecha, hora, duración, motivo de consulta, tipo de cita, profesional asignado, sala asignada, estado (confirmada, cancelada, completada, no presentado). **Datos del profesional:** nombre, especialidad, horario de disponibilidad. |
| **Destinatarios (cesiones)** | Personal sanitario (visualización de su propia agenda y pacientes asignados). Personal administrativo (gestión de todas las agendas según permisos). No se realizan cesiones a terceros. |
| **Transferencias internacionales** | No se realizan. |
| **Plazos de conservación y supresión** | Datos de citas: 2 años desde la fecha de la cita para fines estadísticos y de gestión. Citas vinculadas a actos médicos: se conservan como parte del historial clínico (15 años). |
| **Medidas técnicas de seguridad** | Las mismas medidas generales de la plataforma (RBAC, TLS, aislamiento multi-tenant, auditoría de accesos, JWT). Acceso restringido por permisos específicos de agenda (APPOINTMENTS_VIEW, APPOINTMENTS_CREATE, APPOINTMENTS_EDIT, APPOINTMENTS_DELETE). |
| **Medidas organizativas de seguridad** | Segregación de agendas por profesional. Acceso limitado según rol (secretaría gestiona agenda, profesional ve solo la suya salvo permisos ampliados). |

---

### 3. Facturación y presupuestos

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-003 |
| **Denominación** | Gestión de facturación, presupuestos y cobros |
| **Finalidad** | Emisión de facturas, elaboración de presupuestos, gestión de cobros y seguimiento de pagos. Cumplimiento de las obligaciones fiscales y contables. |
| **Base jurídica** | Art. 6.1.b) RGPD — Ejecución de contrato (facturación de servicios prestados). Art. 6.1.c) RGPD — Cumplimiento de obligación legal (Ley 58/2003 General Tributaria, Real Decreto 1619/2012 de facturación, Código de Comercio Art. 30). |
| **Categorías de interesados** | Pacientes de la clínica (como receptores de servicios facturados). |
| **Categorías de datos personales** | **Datos identificativos:** nombre, apellidos, DNI/NIE/CIF. **Datos de contacto:** dirección fiscal, correo electrónico. **Datos económicos:** importes facturados, forma de pago, estado del pago, número de factura, concepto de los servicios, IVA aplicable, descuentos, presupuestos aceptados/rechazados. **Datos de seguro:** compañía aseguradora y número de póliza (para facturación a aseguradoras). |
| **Destinatarios (cesiones)** | Personal administrativo de la clínica (gestión de facturación). Administración Tributaria (AEAT) en cumplimiento de obligaciones fiscales. Compañías aseguradoras (cuando la prestación está cubierta por un seguro médico, con autorización del paciente). |
| **Transferencias internacionales** | No se realizan. |
| **Plazos de conservación y supresión** | Facturas y documentación contable: 6 años desde el cierre del ejercicio fiscal (Art. 30 Código de Comercio). Presupuestos no aceptados: 1 año desde su emisión. Presupuestos aceptados: vinculados a la facturación correspondiente (6 años). |
| **Medidas técnicas de seguridad** | RBAC con permisos específicos de facturación (BILLING_VIEW, BILLING_CREATE, BILLING_EDIT). Cifrado TLS en tránsito. Copias de seguridad cifradas. Registro de auditoría de operaciones de facturación. |
| **Medidas organizativas de seguridad** | Acceso a facturación restringido a roles administrativos y de dirección. Segregación de funciones entre gestión clínica y gestión económica. |

---

### 4. Gestión de consentimientos informados

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-004 |
| **Denominación** | Gestión y archivo de consentimientos informados |
| **Finalidad** | Recogida, almacenamiento y gestión de los consentimientos informados de los pacientes previos a intervenciones, tratamientos o procedimientos médicos. Garantizar el derecho de información y autonomía del paciente conforme a la Ley 41/2002. |
| **Base jurídica** | Art. 6.1.c) RGPD — Cumplimiento de obligación legal (Ley 41/2002 de autonomía del paciente, Art. 8 y 9). Art. 9.2.a) RGPD — Consentimiento explícito del interesado para el tratamiento de datos de salud en el contexto de la intervención específica. |
| **Categorías de interesados** | Pacientes de la clínica. Representantes legales (en caso de menores o personas incapacitadas). |
| **Categorías de datos personales** | **Datos identificativos:** nombre, apellidos, DNI/NIE del paciente (y del representante legal, si aplica). **Datos del consentimiento:** tipo de procedimiento o tratamiento, fecha de firma, contenido del consentimiento, estado (firmado, pendiente, revocado), profesional sanitario informante. **Datos de salud:** descripción del procedimiento, riesgos informados, alternativas presentadas. |
| **Destinatarios (cesiones)** | Profesional sanitario responsable del tratamiento o intervención. Personal administrativo (verificación del estado del consentimiento, sin acceso al contenido clínico detallado). Autoridades judiciales o sanitarias (en caso de reclamación o inspección). |
| **Transferencias internacionales** | No se realizan. |
| **Plazos de conservación y supresión** | Consentimientos firmados: duración del tratamiento + 5 años desde la finalización del mismo (plazo de prescripción de responsabilidad sanitaria conforme a la Ley 41/2002 y jurisprudencia). Consentimientos revocados: se conservan con marca de revocación durante el mismo plazo. |
| **Medidas técnicas de seguridad** | RBAC con permisos específicos (CONSENTS_VIEW, CONSENTS_CREATE, CONSENTS_SIGN). Registro de auditoría de firma y revocación. Integridad del documento asegurada en base de datos. Cifrado TLS en tránsito. |
| **Medidas organizativas de seguridad** | Protocolo de información al paciente previo a la firma. Verificación de identidad del firmante. Archivo digital vinculado al historial del paciente. |

---

### 5. Gestión de prescripciones médicas

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-005 |
| **Denominación** | Gestión y emisión de prescripciones médicas |
| **Finalidad** | Emisión, registro y seguimiento de prescripciones médicas (recetas) asociadas a los tratamientos de los pacientes. Control de la medicación prescrita. |
| **Base jurídica** | Art. 6.1.b) RGPD — Ejecución de contrato (prestación del servicio sanitario). Art. 6.1.c) RGPD — Cumplimiento de obligación legal (Real Decreto Legislativo 1/2015 de garantías y uso racional de medicamentos y productos sanitarios). Art. 9.2.h) RGPD — Tratamiento necesario para fines de diagnóstico médico y prestación de asistencia sanitaria. |
| **Categorías de interesados** | Pacientes de la clínica. |
| **Categorías de datos personales** | **Datos identificativos del paciente:** nombre, apellidos, DNI/NIE, fecha de nacimiento. **Datos de la prescripción:** medicamento prescrito (principio activo, nombre comercial), posología, duración del tratamiento, fecha de prescripción, profesional prescriptor (nombre y número de colegiado). **Datos de salud:** diagnóstico asociado, alergias relevantes, interacciones conocidas. |
| **Destinatarios (cesiones)** | Profesional sanitario prescriptor. Paciente (entrega de la receta). Farmacias (presentación de la receta por el paciente). No se realizan cesiones electrónicas directas a terceros. |
| **Transferencias internacionales** | No se realizan. |
| **Plazos de conservación y supresión** | Prescripciones: 5 años desde la fecha de emisión (como parte de la documentación clínica). Prescripciones vinculadas al historial: se conservan junto con el historial clínico (15 años). |
| **Medidas técnicas de seguridad** | RBAC: solo roles con permiso PRESCRIPTIONS_CREATE pueden emitir prescripciones (médicos). Registro de auditoría de emisión y modificación. Cifrado TLS. Aislamiento multi-tenant. |
| **Medidas organizativas de seguridad** | Solo profesionales sanitarios habilitados pueden prescribir. Verificación de alergias e interacciones antes de la emisión. |

---

### 6. Control de acceso y auditoría del sistema

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-006 |
| **Denominación** | Registro de accesos, auditoría de seguridad y control de acceso al sistema |
| **Finalidad** | Garantizar la seguridad del sistema de información. Registro de accesos y acciones realizadas por los usuarios para la detección de accesos no autorizados, investigación de incidentes de seguridad y cumplimiento normativo. Trazabilidad de las operaciones sobre datos personales. |
| **Base jurídica** | Art. 6.1.c) RGPD — Cumplimiento de obligación legal (Art. 32 RGPD — seguridad del tratamiento; Art. 22 LOPDGDD — registro de accesos a datos de categorías especiales). Art. 6.1.f) RGPD — Interés legítimo del responsable (seguridad de los sistemas de información y protección de los datos tratados). |
| **Categorías de interesados** | Usuarios del sistema (médicos, enfermeros, secretarios, administradores). |
| **Categorías de datos personales** | **Datos del usuario:** identificador de usuario, nombre, rol asignado, permisos. **Datos de acceso:** fecha y hora de inicio/cierre de sesión, dirección IP de origen, user-agent del navegador. **Datos de auditoría:** tipo de acción realizada (lectura, creación, modificación, eliminación), recurso afectado (tabla, registro), identificador del registro afectado, resultado de la acción (éxito/fallo), detalle del cambio. **Datos de seguridad:** intentos de acceso fallidos, bloqueos de cuenta, alertas de fail2ban, registros de auditd del sistema operativo. |
| **Destinatarios (cesiones)** | Administrador del sistema (para gestión de seguridad). DPO (para auditorías y supervisión). Autoridades competentes (AEPD, fuerzas de seguridad) en caso de investigación de incidentes de seguridad o requerimiento judicial. |
| **Transferencias internacionales** | No se realizan. |
| **Plazos de conservación y supresión** | Logs de auditoría de la aplicación: 5 años. Logs de acceso al sistema (auditd, fail2ban): 2 años. Logs de acceso a datos de categorías especiales (Art. 22 LOPDGDD): mínimo 2 años (se aplica 5 años como medida de seguridad adicional). |
| **Medidas técnicas de seguridad** | Registros de auditoría almacenados con protección de integridad [PENDIENTE: REVOKE DELETE/UPDATE en audit_logs]. Separación lógica de logs por tenant. Monitorización automatizada con alertas Telegram (health checks cada 5 minutos). auditd con 27 reglas y configuración inmutable. fail2ban con 7 jails activos. logwatch con informes diarios. |
| **Medidas organizativas de seguridad** | Acceso a logs restringido al administrador del sistema y DPO. Revisión periódica de los registros de auditoría. Procedimiento documentado de gestión de incidentes. |

---

### 7. Comunicaciones con pacientes

| Campo | Descripción |
|---|---|
| **Identificador** | TRAT-007 |
| **Denominación** | Comunicaciones electrónicas con pacientes |
| **Finalidad** | Envío de recordatorios de citas, solicitudes de firma de consentimientos informados, y comunicaciones administrativas relacionadas con la prestación del servicio sanitario. No se realizan comunicaciones comerciales ni de marketing. |
| **Base jurídica** | Art. 6.1.b) RGPD — Ejecución de contrato (comunicaciones necesarias para la prestación del servicio sanitario contratado). Art. 6.1.f) RGPD — Interés legítimo (recordatorios de citas para reducir la inasistencia y mejorar la atención al paciente). |
| **Categorías de interesados** | Pacientes de la clínica que han facilitado datos de contacto electrónico. |
| **Categorías de datos personales** | **Datos de contacto:** nombre, apellidos, correo electrónico, teléfono móvil (si se implementan SMS). **Datos de la comunicación:** fecha y hora de envío, tipo de comunicación (recordatorio de cita, solicitud de consentimiento), estado de entrega, contenido del mensaje (sin datos clínicos detallados). |
| **Destinatarios (cesiones)** | Proveedor de servicios de correo electrónico (SMTP): [NOMBRE PROVEEDOR SMTP], con DPA firmado [PENDIENTE]. El contenido de los correos se limita a información administrativa (fecha, hora, nombre del profesional) sin incluir datos clínicos. |
| **Transferencias internacionales** | Dependiente del proveedor SMTP. [VERIFICAR: si el proveedor procesa datos fuera del EEE, se requieren Cláusulas Contractuales Tipo o decisión de adecuación]. |
| **Plazos de conservación y supresión** | Registros de envío: 1 año desde la fecha de envío. Contenido de los mensajes: no se almacena en la plataforma tras el envío (se registra únicamente el evento de envío en los logs). |
| **Medidas técnicas de seguridad** | Cifrado TLS en la conexión SMTP. No inclusión de datos de salud en el contenido de los correos. Registro de auditoría del envío de comunicaciones. |
| **Medidas organizativas de seguridad** | Plantillas de correo revisadas para evitar la inclusión de datos clínicos. Limitación del volumen de envíos. Posibilidad de opt-out para comunicaciones no esenciales (si aplica). |

---

## Revisión y Actualización

Este registro se revisará y actualizará:

- **Periódicamente:** al menos una vez al año.
- **Ante cambios:** cuando se incorporen nuevos tratamientos de datos, se modifiquen los existentes, cambien los encargados del tratamiento o se produzcan cambios normativos relevantes.
- **Responsable de la actualización:** DPO en coordinación con el responsable del tratamiento.

## Historial de Versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 2026-03-27 | [NOMBRE] | Creación inicial del registro |

---

*Documento elaborado conforme al Artículo 30 del Reglamento (UE) 2016/679 (RGPD) y al Artículo 31 de la Ley Orgánica 3/2018 (LOPDGDD). Pendiente de revisión y validación por el Delegado de Protección de Datos.*
