# Procedimiento de Gestión de Incidentes de Seguridad y Notificación a la AEPD

**Documento:** PROC-INC-MEDIMAESTRO-001
**Versión:** 1.0
**Fecha de creación:** 2026-03-27
**Última revisión:** 2026-03-27
**Estado:** Pendiente de validación por DPO
**Normativa aplicable:** Reglamento (UE) 2016/679 (RGPD) Art. 33 y 34, Ley Orgánica 3/2018 (LOPDGDD)
**Clasificación:** Confidencial — Uso interno

---

## 1. Objeto

El presente documento establece el procedimiento para la detección, evaluación, gestión, registro y notificación de brechas de seguridad que afecten a datos personales tratados en la plataforma MediMaestro, conforme a los artículos 33 y 34 del Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).

El objetivo es garantizar una respuesta rápida, coordinada y documentada ante cualquier incidente de seguridad que pueda comprometer la confidencialidad, integridad o disponibilidad de los datos personales, con especial atención a los datos de salud (categorías especiales, Art. 9 RGPD).

---

## 2. Alcance

Este procedimiento aplica a:

- Todos los datos personales tratados en la plataforma MediMaestro, incluyendo datos de pacientes, profesionales sanitarios y usuarios del sistema.
- Todos los entornos: producción, copias de seguridad y cualquier sistema auxiliar que procese datos personales.
- Todos los empleados, colaboradores y encargados del tratamiento que tengan acceso al sistema.
- Incidentes de cualquier naturaleza: técnicos (ciberataques, fallos de sistema), humanos (errores, negligencia) o físicos (pérdida de dispositivos).

---

## 3. Definiciones

| Término | Definición |
|---|---|
| **Brecha de seguridad / violación de datos personales** | Toda violación de la seguridad que ocasione la destrucción, pérdida o alteración accidental o ilícita de datos personales transmitidos, conservados o tratados de otra forma, o la comunicación o acceso no autorizados a dichos datos (Art. 4.12 RGPD). |
| **Brecha de confidencialidad** | Acceso no autorizado o divulgación no autorizada de datos personales. |
| **Brecha de integridad** | Alteración no autorizada o no detectada de datos personales. |
| **Brecha de disponibilidad** | Pérdida de acceso o destrucción no autorizada de datos personales (temporal o permanente). |
| **Responsable del tratamiento** | La persona física o jurídica que determina los fines y medios del tratamiento ([NOMBRE SOCIEDAD]). |
| **Encargado del tratamiento** | Quien trata datos personales por cuenta del responsable (ej.: Hostinger, proveedor SMTP). |
| **DPO (Delegado de Protección de Datos)** | Persona designada para asesorar y supervisar el cumplimiento de la normativa de protección de datos ([NOMBRE DPO], externo). |
| **AEPD** | Agencia Española de Protección de Datos, autoridad de control competente. |
| **Interesado** | Persona física cuyos datos personales son objeto de tratamiento (pacientes, usuarios). |

---

## 4. Detección de Incidentes

### 4.1 Fuentes de detección

La plataforma MediMaestro dispone de los siguientes mecanismos de detección:

#### Detección automatizada

| Mecanismo | Descripción | Frecuencia |
|---|---|---|
| **Health checks** | Script `/opt/scripts/health-check.sh` que verifica API, base de datos, disco y memoria. Envía alertas Telegram si algún componente falla. | Cada 5 minutos (cron) |
| **fail2ban** | 7 jails activos (sshd, nginx-bad-request, nginx-botsearch, nginx-http-auth, nginx-exploit, nginx-badbots, recidive). Bloqueo automático de IPs sospechosas. | Tiempo real |
| **auditd** | 27 reglas de auditoría del sistema operativo que monitorizan accesos a archivos sensibles, escaladas de privilegios, modificaciones de configuración. Configuración inmutable. | Tiempo real |
| **Alertas Telegram** | Bot @medimaestro_alerts_bot que notifica al administrador del sistema ante fallos detectados por health checks o backups. | Tiempo real |
| **logwatch** | Informe diario de actividad del servidor enviado por Telegram. Cubre SSH, Nginx, PostgreSQL, fail2ban, auditd. | Diario (07:00 UTC) |
| **Logs de auditoría de la aplicación** | Registro de más de 30 tipos de eventos en la base de datos (inicios de sesión, accesos a historiales, modificaciones, exportaciones). | Tiempo real |

#### Detección manual

| Fuente | Descripción |
|---|---|
| **Personal de la clínica** | Cualquier empleado que detecte un comportamiento anómalo del sistema, accesos sospechosos o pérdida de datos. |
| **Pacientes** | Comunicación de un paciente que detecte acceso no autorizado a sus datos o reciba comunicaciones no solicitadas. |
| **Terceros** | Comunicación de proveedores, investigadores de seguridad o autoridades sobre vulnerabilidades o incidentes. |
| **Encargados del tratamiento** | Notificación del proveedor de alojamiento (Hostinger) o del proveedor SMTP sobre incidentes que afecten al servicio. |

### 4.2 Clasificación de incidentes

Todo incidente detectado se clasificará según su gravedad:

| Nivel | Denominación | Descripción | Ejemplos | Tiempo máx. evaluación |
|---|---|---|---|---|
| **1** | **Bajo** | Intento de acceso no autorizado bloqueado. No se ha producido acceso efectivo a datos personales. | IP bloqueada por fail2ban, intento de login fallido, escaneo de puertos bloqueado. | 24 horas |
| **2** | **Medio** | Acceso no autorizado a datos personales no sensibles, o pérdida temporal de disponibilidad. | Acceso a datos de contacto por usuario sin permisos, caída del servicio superior a 1 hora. | 12 horas |
| **3** | **Alto** | Acceso no autorizado a datos de salud (categorías especiales Art. 9). Alteración de datos clínicos. | Acceso a historiales por usuario no autorizado, modificación no autorizada de diagnósticos, fallo de backup con pérdida parcial de datos. | 4 horas |
| **4** | **Crítico** | Exfiltración confirmada de datos de salud. Ransomware. Compromiso de credenciales de administrador. Pérdida total de datos. | Descarga masiva de historiales, cifrado malicioso de la base de datos, acceso root comprometido, publicación de datos de pacientes. | 1 hora |

---

## 5. Evaluación de la Brecha

Ante cualquier incidente clasificado como Nivel 2 o superior, se realizará una evaluación estructurada que contemple:

### 5.1 Criterios de evaluación

| Criterio | Preguntas clave |
|---|---|
| **Naturaleza de la violación** | Tipo de brecha (confidencialidad, integridad, disponibilidad). Fue intencionada o accidental. Está contenida o continúa activa. |
| **Categorías de datos afectados** | Datos identificativos, de contacto, de salud (categoría especial), económicos, de acceso. |
| **Número de interesados afectados** | Número exacto o estimado de pacientes/usuarios cuyos datos se han visto comprometidos. |
| **Número de registros afectados** | Volumen de registros de datos personales comprometidos. |
| **Consecuencias probables** | Riesgo de suplantación de identidad, daño reputacional, discriminación, pérdida económica, daño psicológico (especialmente relevante para datos de salud). |
| **Reversibilidad** | Es posible restaurar los datos a su estado original. Existen copias de seguridad íntegras. |
| **Medidas previas** | Existían medidas de protección (cifrado, seudonimización) que reduzcan el impacto. |
| **Medidas adoptadas** | Qué acciones se han tomado ya para contener y mitigar el incidente. |

### 5.2 Valoración del riesgo

Se aplicará la siguiente matriz para determinar el nivel de riesgo:

| Probabilidad de daño \ Gravedad | Baja | Media | Alta | Muy alta |
|---|---|---|---|---|
| **Improbable** | Bajo | Bajo | Medio | Alto |
| **Posible** | Bajo | Medio | Alto | Muy alto |
| **Probable** | Medio | Alto | Muy alto | Muy alto |
| **Muy probable** | Alto | Muy alto | Muy alto | Muy alto |

**Nota importante:** Dado que MediMaestro trata datos de salud (categorías especiales Art. 9 RGPD), la gravedad de cualquier brecha que afecte a estos datos se considerará automáticamente como **Alta** o **Muy alta**, lo que implica la obligación de notificar a la AEPD en la mayoría de los escenarios.

---

## 6. Registro Interno de Incidentes

Conforme al Art. 33.5 del RGPD, se mantendrá un registro de **todos** los incidentes de seguridad, independientemente de su nivel de gravedad y de si requieren o no notificación a la AEPD.

### 6.1 Contenido del registro

Cada entrada del registro documentará, como mínimo:

1. **Identificador del incidente:** código único (ej.: INC-2026-001).
2. **Fecha y hora de detección.**
3. **Fecha y hora estimada de inicio del incidente.**
4. **Fuente de detección** (automatizada/manual, detalle).
5. **Clasificación de nivel** (1-4).
6. **Descripción del incidente.**
7. **Naturaleza de la violación** (confidencialidad, integridad, disponibilidad).
8. **Categorías de datos afectados.**
9. **Número de interesados afectados** (exacto o estimado).
10. **Número de registros afectados.**
11. **Consecuencias probables.**
12. **Evaluación del riesgo** (resultado de la matriz 5.2).
13. **Medidas de contención adoptadas.**
14. **Medidas correctivas implementadas.**
15. **Decisión sobre notificación a la AEPD** (sí/no, justificación).
16. **Fecha y hora de notificación a la AEPD** (si aplica).
17. **Decisión sobre comunicación a interesados** (sí/no, justificación).
18. **Fecha y hora de comunicación a interesados** (si aplica).
19. **Responsable de la gestión del incidente.**
20. **Estado** (abierto, en investigación, contenido, cerrado).
21. **Fecha de cierre.**
22. **Lecciones aprendidas.**

### 6.2 Almacenamiento del registro

- El registro se mantendrá en formato digital, protegido por las mismas medidas de seguridad que el resto de datos sensibles.
- Ubicación: [DEFINIR — archivo seguro accesible solo por el responsable del tratamiento y el DPO].
- Plazo de conservación: mínimo 5 años desde el cierre del incidente.
- El registro estará disponible para la AEPD en caso de inspección.

---

## 7. Notificación a la AEPD (72 horas)

### 7.1 Cuándo notificar

Conforme al Art. 33 del RGPD, toda violación de la seguridad de los datos personales que constituya un **riesgo para los derechos y libertades de las personas físicas** debe notificarse a la autoridad de control.

**Criterios para la decisión:**

| Escenario | Notificación obligatoria |
|---|---|
| Brecha que afecta a datos de salud (categorías especiales Art. 9) | **SÍ** — salvo que se demuestre que es improbable que entrañe riesgo (ej.: datos cifrados con clave no comprometida). |
| Acceso no autorizado confirmado a datos personales de cualquier categoría | **SÍ** — si existe riesgo para derechos y libertades. |
| Pérdida temporal de disponibilidad (caída del servicio) | **NO** — si se restaura rápidamente y no afecta a la atención del paciente. **SÍ** — si la indisponibilidad puede tener consecuencias para la salud del paciente. |
| Intento bloqueado sin acceso efectivo | **NO** — se registra internamente (Art. 33.5). |
| Exfiltración confirmada de cualquier dato personal | **SÍ** — siempre. |

**Regla general para MediMaestro:** Dado que el sistema trata fundamentalmente datos de salud, se adoptará un enfoque conservador: **se notificará a la AEPD ante cualquier incidente de Nivel 3 o superior**, y se evaluará caso por caso para Nivel 2.

### 7.2 Plazo de notificación

- **72 horas** desde que el responsable del tratamiento tenga conocimiento de la brecha.
- El cómputo comienza en el momento en que se tiene certeza razonable de que se ha producido una violación de datos personales (no cuando se detecta una anomalía genérica).
- Si no es posible facilitar toda la información en 72 horas, se realizará una **notificación inicial parcial** dentro del plazo, seguida de una **notificación complementaria** sin dilación indebida.
- Si la notificación se realiza transcurridas las 72 horas, se acompañará de una **justificación del retraso**.

### 7.3 Contenido de la notificación

Conforme al Art. 33.3 RGPD, la notificación contendrá como mínimo:

1. **Naturaleza de la violación de datos personales:**
   - Tipo de brecha (confidencialidad, integridad, disponibilidad).
   - Categorías de datos afectados.
   - Categorías de interesados afectados.
   - Número aproximado de interesados afectados.
   - Número aproximado de registros de datos personales afectados.

2. **Datos de contacto del DPO:**
   - Nombre: [NOMBRE DPO]
   - Correo: [EMAIL DPO]
   - Teléfono: [TELÉFONO DPO]

3. **Consecuencias probables de la violación:**
   - Descripción de los posibles efectos sobre los interesados.
   - Evaluación del riesgo para los derechos y libertades.

4. **Medidas adoptadas o propuestas:**
   - Medidas de contención aplicadas.
   - Medidas para mitigar los posibles efectos adversos.
   - Plan de acciones correctivas.

### 7.4 Canal de notificación

| Método | Detalle |
|---|---|
| **Sede Electrónica AEPD** | [https://sedeagpd.gob.es](https://sedeagpd.gob.es) — Procedimiento: "Notificación de brechas de datos personales" |
| **Formulario** | Formulario de notificación disponible en la sede electrónica. Requiere certificado digital o Cl@ve. |
| **Herramienta AEPD** | La AEPD ofrece la herramienta "Comunica-Brecha RGPD" para evaluar la necesidad de notificación y comunicación a los interesados: [https://www.aepd.es/herramientas/comunica-brecha-rgpd](https://www.aepd.es/herramientas/comunica-brecha-rgpd) |
| **Teléfono AEPD (urgencias)** | 900 293 183 (línea de atención al ciudadano) |

### 7.5 Responsable de la notificación

- La decisión de notificar recae en el **responsable del tratamiento** ([NOMBRE SOCIEDAD]), asesorado por el DPO.
- El administrador del sistema proporcionará la información técnica necesaria.
- El DPO supervisará que la notificación sea completa y conforme a los requisitos legales.

---

## 8. Comunicación a los Interesados (Art. 34 RGPD)

### 8.1 Cuándo comunicar

Conforme al Art. 34 del RGPD, cuando la violación de datos personales entrañe un **alto riesgo para los derechos y libertades de las personas físicas**, el responsable del tratamiento comunicará la violación al interesado sin dilación indebida.

**Criterios para la decisión:**

| Escenario | Comunicación obligatoria |
|---|---|
| Exfiltración de datos de salud sin cifrar | **SÍ** |
| Acceso no autorizado a historiales clínicos | **SÍ** |
| Datos comprometidos estaban cifrados y la clave no se ha comprometido | **NO** (Art. 34.3.a) |
| Se han adoptado medidas que garantizan que ya no existe alto riesgo | **NO** (Art. 34.3.b) |
| La comunicación supondría un esfuerzo desproporcionado (se optará por comunicación pública) | Comunicación pública (Art. 34.3.c) |

### 8.2 Contenido de la comunicación

La comunicación a los interesados se realizará en un lenguaje **claro y sencillo** e incluirá:

1. Descripción de la naturaleza de la violación.
2. Datos de contacto del DPO.
3. Descripción de las consecuencias probables.
4. Descripción de las medidas adoptadas o propuestas para poner remedio, incluyendo las medidas para mitigar los posibles efectos negativos.
5. **Recomendaciones al interesado** sobre medidas que puede adoptar (ej.: cambiar contraseñas, vigilar movimientos bancarios, contactar con su aseguradora).

### 8.3 Canales de comunicación

- **Comunicación individual:** correo electrónico al paciente afectado y/o llamada telefónica.
- **Comunicación colectiva** (si el esfuerzo individual es desproporcionado): aviso en la web de la clínica + comunicado en medios si fuera necesario.

### 8.4 Plazo

- Sin dilación indebida tras confirmar que existe alto riesgo.
- Preferiblemente dentro de las **72 horas** siguientes a la confirmación del alto riesgo.
- No existe un plazo legal máximo específico, pero la demora injustificada puede ser objeto de sanción.

---

## 9. Protocolo de Respuesta — Pasos Operativos

### Fase 1: Detección y Alerta (0 — 1 hora)

| Paso | Acción | Responsable |
|---|---|---|
| 1.1 | Detectar la anomalía o recibir la alerta (Telegram, logwatch, comunicación manual). | Administrador del sistema / cualquier empleado |
| 1.2 | Evaluar si se trata de un incidente de seguridad que afecta a datos personales. | Administrador del sistema |
| 1.3 | Clasificar el incidente según el nivel de gravedad (1-4). | Administrador del sistema |
| 1.4 | Notificar inmediatamente al responsable del tratamiento y al DPO si es Nivel 2 o superior. | Administrador del sistema |
| 1.5 | Registrar el incidente en el registro interno con la información disponible. | Administrador del sistema |

### Fase 2: Contención (1 — 4 horas)

| Paso | Acción | Responsable |
|---|---|---|
| 2.1 | **Contención inmediata:** aislar el sistema o componente afectado para detener la propagación. | Administrador del sistema |
| 2.2 | Si se sospecha compromiso de credenciales: revocar tokens JWT, forzar cierre de sesiones, cambiar contraseñas comprometidas. | Administrador del sistema |
| 2.3 | Si se detecta acceso externo: bloquear IPs sospechosas en fail2ban/iptables, verificar reglas de firewall. | Administrador del sistema |
| 2.4 | Preservar evidencias: copiar logs relevantes (auditd, fail2ban, nginx, PostgreSQL, aplicación) antes de cualquier restauración. | Administrador del sistema |
| 2.5 | Verificar la integridad de las copias de seguridad. | Administrador del sistema |
| 2.6 | Documentar todas las acciones de contención en el registro del incidente. | Administrador del sistema |

### Fase 3: Evaluación y Decisión (4 — 24 horas)

| Paso | Acción | Responsable |
|---|---|---|
| 3.1 | Realizar la evaluación completa de la brecha (Sección 5). | Administrador del sistema + DPO |
| 3.2 | Determinar el número de interesados y registros afectados. | Administrador del sistema |
| 3.3 | Evaluar el riesgo para los derechos y libertades (matriz 5.2). | DPO |
| 3.4 | Decidir si procede la notificación a la AEPD (Sección 7.1). | Responsable del tratamiento, asesorado por DPO |
| 3.5 | Decidir si procede la comunicación a los interesados (Sección 8.1). | Responsable del tratamiento, asesorado por DPO |
| 3.6 | Preparar la notificación a la AEPD si procede. | DPO |

### Fase 4: Notificación (dentro de 72 horas)

| Paso | Acción | Responsable |
|---|---|---|
| 4.1 | Enviar la notificación a la AEPD a través de la sede electrónica (si procede). | Responsable del tratamiento / DPO |
| 4.2 | Comunicar a los interesados afectados (si procede). | Responsable del tratamiento |
| 4.3 | Si el encargado del tratamiento (Hostinger, SMTP) está implicado, notificarle formalmente. | Responsable del tratamiento |
| 4.4 | Documentar todas las notificaciones realizadas en el registro del incidente. | DPO |

### Fase 5: Recuperación y Corrección (post-incidente)

| Paso | Acción | Responsable |
|---|---|---|
| 5.1 | Restaurar los sistemas afectados a su estado normal de operación. | Administrador del sistema |
| 5.2 | Si se ha producido pérdida de datos, restaurar desde copias de seguridad verificadas. | Administrador del sistema |
| 5.3 | Implementar las medidas correctivas identificadas en la evaluación. | Administrador del sistema |
| 5.4 | Verificar que las medidas correctivas son efectivas. | Administrador del sistema + DPO |
| 5.5 | Actualizar el registro del incidente con las medidas implementadas. | Administrador del sistema |

### Fase 6: Análisis Post-Incidente (7 — 30 días)

| Paso | Acción | Responsable |
|---|---|---|
| 6.1 | Realizar un análisis de causa raíz (root cause analysis). | Administrador del sistema |
| 6.2 | Identificar lecciones aprendidas y oportunidades de mejora. | Administrador del sistema + DPO |
| 6.3 | Actualizar las medidas de seguridad, procedimientos o configuraciones según sea necesario. | Administrador del sistema |
| 6.4 | Si se notificó a la AEPD, enviar la notificación complementaria con la información adicional obtenida (si aplica). | DPO |
| 6.5 | Cerrar el incidente en el registro interno. | Responsable del tratamiento |
| 6.6 | Actualizar el presente procedimiento si se identifican carencias. | DPO |

---

## 10. Responsabilidades

| Rol | Responsabilidades |
|---|---|
| **Responsable del tratamiento** ([NOMBRE SOCIEDAD]) | Toma de decisiones sobre notificación a la AEPD y comunicación a los interesados. Aprobación de medidas correctivas. Responsable legal ante la AEPD. |
| **Administrador del sistema** | Detección y clasificación de incidentes. Contención técnica inmediata. Preservación de evidencias. Análisis técnico y restauración. Implementación de medidas correctivas. |
| **DPO** ([NOMBRE DPO]) | Asesoramiento sobre la obligación de notificar. Supervisión del cumplimiento del procedimiento. Preparación de la notificación a la AEPD. Coordinación con la autoridad de control. Revisión periódica del procedimiento. |
| **Personal de la clínica** (médicos, enfermeros, secretarios) | Comunicar inmediatamente cualquier anomalía o sospecha de incidente al administrador del sistema o al responsable del tratamiento. No intentar resolver el incidente de forma autónoma. |
| **Encargados del tratamiento** (Hostinger, proveedor SMTP) | Notificar al responsable del tratamiento sin dilación indebida cualquier brecha de seguridad de la que tengan conocimiento (Art. 33.2 RGPD). Colaborar en la investigación y resolución del incidente. |

---

## 11. Contactos de Emergencia

| Contacto | Nombre | Teléfono | Email |
|---|---|---|---|
| Responsable del tratamiento | [NOMBRE] | [TELÉFONO] | [EMAIL] |
| Administrador del sistema | [NOMBRE] | [TELÉFONO] | [EMAIL] |
| DPO | [NOMBRE DPO] | [TELÉFONO DPO] | [EMAIL DPO] |
| AEPD (Sede Electrónica) | — | 900 293 183 | [sedeagpd.gob.es](https://sedeagpd.gob.es) |
| Hostinger (soporte) | — | [TELÉFONO SOPORTE] | [EMAIL SOPORTE] |

---

## 12. Formación y Concienciación

- Todo el personal con acceso a la plataforma MediMaestro recibirá formación sobre este procedimiento al incorporarse y de forma periódica (al menos anual).
- Se realizarán simulacros de incidentes al menos una vez al año para verificar la eficacia del procedimiento.
- El DPO supervisará la formación y mantendrá un registro de las sesiones realizadas.

---

## 13. Revisión del Procedimiento

Este procedimiento se revisará y actualizará:

- **Periódicamente:** al menos una vez al año.
- **Tras cada incidente de Nivel 2 o superior:** incorporando las lecciones aprendidas.
- **Ante cambios normativos:** que afecten a las obligaciones de notificación.
- **Ante cambios técnicos significativos:** en la infraestructura o arquitectura del sistema.

---

## Anexo A: Plantilla de Registro de Incidentes

```
============================================================
REGISTRO DE INCIDENTE DE SEGURIDAD
============================================================

IDENTIFICADOR:          INC-[AÑO]-[NNN]
FECHA DE DETECCIÓN:     [DD/MM/AAAA HH:MM]
FECHA ESTIMADA INICIO:  [DD/MM/AAAA HH:MM]
FUENTE DE DETECCIÓN:    [ ] Health check  [ ] fail2ban  [ ] auditd
                        [ ] logwatch  [ ] Telegram  [ ] Personal
                        [ ] Tercero  [ ] Encargado del tratamiento
                        [ ] Otro: _______________

NIVEL DE GRAVEDAD:      [ ] 1-Bajo  [ ] 2-Medio  [ ] 3-Alto  [ ] 4-Crítico

------------------------------------------------------------
DESCRIPCIÓN DEL INCIDENTE
------------------------------------------------------------
[Descripción detallada de lo ocurrido]

------------------------------------------------------------
NATURALEZA DE LA VIOLACIÓN
------------------------------------------------------------
[ ] Confidencialidad (acceso o divulgación no autorizada)
[ ] Integridad (alteración no autorizada)
[ ] Disponibilidad (pérdida de acceso o destrucción)

------------------------------------------------------------
DATOS AFECTADOS
------------------------------------------------------------
Categorías de datos:    [ ] Identificativos  [ ] Contacto  [ ] Salud
                        [ ] Económicos  [ ] Acceso/Credenciales
                        [ ] Otro: _______________

Categorías especiales (Art. 9): [ ] Sí  [ ] No

N.º de interesados afectados:   [___] (exacto / estimado)
N.º de registros afectados:     [___] (exacto / estimado)

Clínicas afectadas (tenant):    [_______________]

------------------------------------------------------------
CONSECUENCIAS PROBABLES
------------------------------------------------------------
[ ] Suplantación de identidad
[ ] Daño reputacional para los interesados
[ ] Discriminación
[ ] Pérdida económica
[ ] Daño psicológico
[ ] Riesgo para la salud (por pérdida de datos clínicos)
[ ] Otro: _______________

Descripción: [_______________]

------------------------------------------------------------
MEDIDAS DE CONTENCIÓN ADOPTADAS
------------------------------------------------------------
[ ] Bloqueo de IP
[ ] Revocación de tokens/sesiones
[ ] Cambio de credenciales
[ ] Aislamiento del sistema
[ ] Restauración desde backup
[ ] Otro: _______________

Detalle: [_______________]
Fecha/hora de contención: [DD/MM/AAAA HH:MM]

------------------------------------------------------------
EVALUACIÓN DEL RIESGO
------------------------------------------------------------
Probabilidad de daño:   [ ] Improbable  [ ] Posible  [ ] Probable  [ ] Muy probable
Gravedad:               [ ] Baja  [ ] Media  [ ] Alta  [ ] Muy alta
Nivel de riesgo:        [ ] Bajo  [ ] Medio  [ ] Alto  [ ] Muy alto

------------------------------------------------------------
DECISIÓN SOBRE NOTIFICACIÓN A LA AEPD
------------------------------------------------------------
Notificación a la AEPD: [ ] Sí  [ ] No
Justificación: [_______________]
Fecha de notificación:  [DD/MM/AAAA HH:MM]
N.º de expediente AEPD: [_______________]

------------------------------------------------------------
DECISIÓN SOBRE COMUNICACIÓN A INTERESADOS
------------------------------------------------------------
Comunicación a interesados: [ ] Sí  [ ] No
Justificación: [_______________]
Fecha de comunicación:  [DD/MM/AAAA HH:MM]
Medio utilizado:        [ ] Email  [ ] Teléfono  [ ] Carta  [ ] Web

------------------------------------------------------------
MEDIDAS CORRECTIVAS
------------------------------------------------------------
[Descripción de las medidas correctivas implementadas]

Fecha de implementación: [DD/MM/AAAA]
Verificación de eficacia: [ ] Sí  [ ] No  Fecha: [DD/MM/AAAA]

------------------------------------------------------------
ANÁLISIS DE CAUSA RAÍZ
------------------------------------------------------------
[Descripción de la causa raíz identificada]

------------------------------------------------------------
LECCIONES APRENDIDAS
------------------------------------------------------------
[Descripción de las lecciones aprendidas y mejoras propuestas]

------------------------------------------------------------
CIERRE
------------------------------------------------------------
ESTADO:                 [ ] Abierto  [ ] En investigación  [ ] Contenido  [ ] Cerrado
RESPONSABLE GESTIÓN:    [_______________]
FECHA DE CIERRE:        [DD/MM/AAAA]
CERRADO POR:            [_______________]

============================================================
```

---

## Anexo B: Plantilla de Notificación a la AEPD

> **Nota:** Esta plantilla es orientativa. La notificación oficial se realiza a través del formulario electrónico de la Sede de la AEPD ([https://sedeagpd.gob.es](https://sedeagpd.gob.es)). Se recomienda utilizar también la herramienta "Comunica-Brecha RGPD" de la AEPD para la evaluación previa.

---

**NOTIFICACIÓN DE VIOLACIÓN DE SEGURIDAD DE DATOS PERSONALES**
**Art. 33 del Reglamento (UE) 2016/679**

**1. Datos del responsable del tratamiento**

- Razón social: [NOMBRE SOCIEDAD]
- CIF: [CIF]
- Dirección: [DIRECCIÓN]
- Contacto: [EMAIL / TELÉFONO]

**2. Datos del DPO**

- Nombre: [NOMBRE DPO]
- Correo electrónico: [EMAIL DPO]
- Teléfono: [TELÉFONO DPO]

**3. Fecha y hora del conocimiento de la brecha**

- Fecha de detección: [DD/MM/AAAA HH:MM]
- Fecha estimada de inicio de la brecha: [DD/MM/AAAA HH:MM]
- Fecha de la presente notificación: [DD/MM/AAAA HH:MM]
- Si han transcurrido más de 72 horas, justificación: [_______________]

**4. Naturaleza de la violación**

- Tipo: [ ] Confidencialidad  [ ] Integridad  [ ] Disponibilidad
- Descripción de los hechos: [_______________]
- Causa de la brecha (si se conoce): [_______________]
- La brecha está contenida: [ ] Sí  [ ] No  [ ] En proceso

**5. Categorías de datos afectados**

- [ ] Datos identificativos (nombre, DNI, fecha de nacimiento)
- [ ] Datos de contacto (teléfono, email, dirección)
- [ ] Datos de salud (historiales clínicos, diagnósticos, tratamientos)
- [ ] Datos económicos (facturación, seguros)
- [ ] Datos de acceso (credenciales, logs)
- [ ] Otros: [_______________]

**6. Categorías e interesados afectados**

- Categorías: [ ] Pacientes  [ ] Personal sanitario  [ ] Personal administrativo
- Número aproximado de interesados: [___]
- Número aproximado de registros: [___]
- Colectivos vulnerables afectados: [ ] Menores  [ ] Personas con discapacidad  [ ] Otros

**7. Consecuencias probables**

[Descripción de las posibles consecuencias para los derechos y libertades de los interesados]

**8. Medidas adoptadas antes de la brecha**

- [ ] Cifrado de datos en tránsito (TLS)
- [ ] Cifrado de copias de seguridad (GPG)
- [ ] Control de acceso basado en roles (RBAC)
- [ ] Autenticación multifactor (TOTP)
- [ ] Aislamiento multi-tenant
- [ ] Auditoría de accesos
- [ ] Monitorización automatizada
- [ ] Otras: [_______________]

**9. Medidas adoptadas tras la brecha**

- Medidas de contención: [_______________]
- Medidas correctivas: [_______________]
- Medidas para mitigar efectos adversos: [_______________]

**10. Comunicación a los interesados**

- Se ha comunicado o se va a comunicar a los interesados: [ ] Sí  [ ] No
- Si no, justificación: [_______________]
- Medio de comunicación: [_______________]
- Fecha de comunicación: [DD/MM/AAAA]

**11. Observaciones adicionales**

[_______________]

**12. Notificación complementaria** (si aplica)

- Esta notificación complementa la notificación inicial de fecha [DD/MM/AAAA].
- Información adicional: [_______________]

---

*Firma del responsable del tratamiento o persona autorizada*

Nombre: [_______________]
Cargo: [_______________]
Fecha: [DD/MM/AAAA]

---

## Anexo C: Diagrama de Flujo — Cronología de Respuesta

```
DETECCIÓN (T=0)
    │
    ├─ Nivel 1 → Registrar internamente → Cerrar
    │
    ├─ Nivel 2+ → Notificar Responsable + DPO (máx. 1h)
    │                │
    │                ▼
    │           CONTENCIÓN (T+1h a T+4h)
    │                │
    │                ▼
    │           EVALUACIÓN (T+4h a T+24h)
    │                │
    │                ├─ Sin riesgo → Registrar + Cerrar
    │                │
    │                ├─ Riesgo → NOTIFICAR AEPD (máx. T+72h)
    │                │              │
    │                │              ├─ Alto riesgo → COMUNICAR INTERESADOS
    │                │              │
    │                │              └─ Riesgo no alto → No comunicar
    │                │
    │                └─ Duda → Consultar DPO → Enfoque conservador
    │
    ▼
RECUPERACIÓN + ANÁLISIS POST-INCIDENTE (T+7d a T+30d)
    │
    ▼
CIERRE + LECCIONES APRENDIDAS
```

---

## Historial de Versiones

| Versión | Fecha | Autor | Descripción del cambio |
|---|---|---|---|
| 1.0 | 2026-03-27 | [NOMBRE] | Creación inicial del procedimiento |

---

*Documento elaborado conforme a los artículos 33 y 34 del Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD). Pendiente de revisión y validación por el Delegado de Protección de Datos.*
