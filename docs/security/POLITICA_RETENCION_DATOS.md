# Politica de Retencion y Supresion de Datos

**Aplicable a:** MediMaestro (plataforma SaaS de gestion clinica)
**Version:** 1.0
**Fecha:** 27 de marzo de 2026
**Estado:** Pendiente de validacion por el DPO
**Referencia DPIA:** Accion A7

---

## 1. Objeto

El presente documento define los plazos de conservacion de los datos personales tratados a traves de la plataforma MediMaestro, asi como el procedimiento de supresion o anonimizacion aplicable al expirar dichos plazos, en cumplimiento del principio de limitacion del plazo de conservacion establecido en el Art. 5.1.e) del RGPD.

## 2. Marco legal

| Norma | Disposicion relevante |
|---|---|
| **RGPD (UE) 2016/679** | Art. 5.1.e) — Principio de limitacion del plazo de conservacion |
| **RGPD (UE) 2016/679** | Art. 17 — Derecho de supresion |
| **LOPDGDD (LO 3/2018)** | Disposiciones complementarias sobre conservacion |
| **Ley 41/2002** | Ley basica reguladora de la autonomia del paciente — conservacion de documentacion clinica |
| **Real Decreto 1718/2010** | Regulacion de la receta medica |
| **Codigo de Comercio** | Art. 30 — Conservacion de documentacion mercantil (6 anos) |
| **Ley General Tributaria** | Art. 66 y ss. — Plazos de prescripcion fiscal (4 anos) |
| **Ley 10/2014 (Comunitat Valenciana)** | Ley de Salud de la Comunitat Valenciana — disposiciones sobre historiales |

## 3. Principios generales

1. **Minimizacion temporal:** Los datos personales solo se conservaran durante el tiempo necesario para cumplir la finalidad para la que fueron recogidos o para cumplir las obligaciones legales aplicables.

2. **Base legal de conservacion:** Todo plazo de conservacion debe estar justificado por una base legal especifica (obligacion legal, interes legitimo o consentimiento).

3. **Proporcionalidad:** Al expirar el plazo de conservacion, se aplicara la medida menos invasiva posible: anonimizacion (datos de salud) o supresion definitiva (datos administrativos).

4. **Trazabilidad:** Toda operacion de supresion o anonimizacion quedara registrada en el log de auditoria del sistema.

## 4. Plazos de conservacion

### 4.1 Datos clinicos y de salud

| Tipo de dato | Plazo de conservacion | Base legal | Accion al expirar |
|---|---|---|---|
| Historiales medicos (episodios clinicos, evoluciones, diagnosticos) | **15 anos** desde la ultima atencion asistencial | Ley 41/2002, Art. 17 + legislacion autonomica Comunitat Valenciana | Anonimizacion |
| Prescripciones medicas | **5 anos** desde la fecha de emision | Ley 41/2002 + RD 1718/2010 | Anonimizacion |
| Consentimientos informados | Duracion del tratamiento + **5 anos** | Ley 41/2002, Art. 8 | Supresion |
| Informes clinicos y pruebas complementarias | **15 anos** desde la ultima atencion | Ley 41/2002, Art. 17 | Anonimizacion |
| Datos de pre-consulta | **15 anos** (vinculados al historial) | Ley 41/2002 | Anonimizacion |

### 4.2 Datos administrativos y de contacto

| Tipo de dato | Plazo de conservacion | Base legal | Accion al expirar |
|---|---|---|---|
| Datos de contacto del paciente (telefono, email, direccion) | Duracion de la relacion asistencial + **2 anos** | RGPD Art. 6.1.b) — ejecucion de contrato | Supresion |
| Datos de identificacion (nombre, DNI/NIE, fecha nacimiento) | Alineado con el plazo mas largo aplicable al paciente | Ley 41/2002 | Anonimizacion |
| Datos de citas / agenda | **5 anos** desde la fecha de la cita | RGPD Art. 6.1.b) | Supresion |
| Datos de facturacion | **6 anos** desde la fecha de emision | Codigo de Comercio, Art. 30 | Supresion |
| Datos fiscales (facturas con relevancia tributaria) | **4 anos** desde la finalizacion del periodo impositivo | Ley General Tributaria, Art. 66 | Supresion |

### 4.3 Datos tecnicos y de seguridad

| Tipo de dato | Plazo de conservacion | Base legal | Accion al expirar |
|---|---|---|---|
| Logs de auditoria (accesos, modificaciones, operaciones) | **5 anos** | RGPD Art. 5.1.f) — integridad y confidencialidad; LOPDGDD | Supresion |
| Logs de autenticacion (login, logout, intentos fallidos) | **2 anos** | RGPD Art. 5.1.f) | Supresion |
| Copias de seguridad cifradas (GPG) | Alineadas con el plazo mas largo de los datos contenidos | RGPD Art. 5.1.e) | Supresion / rotacion |

### 4.4 Datos de profesionales sanitarios

| Tipo de dato | Plazo de conservacion | Base legal | Accion al expirar |
|---|---|---|---|
| Datos de cuenta de usuario | Duracion de la relacion laboral/profesional + **2 anos** | RGPD Art. 6.1.b) | Supresion |
| Registros de actividad del profesional | **5 anos** | RGPD Art. 5.1.f) | Supresion |

## 5. Procedimiento de revision periodica

### 5.1 Frecuencia

Se realizara una revision **anual** de los datos almacenados para identificar aquellos cuyo plazo de conservacion haya expirado.

### 5.2 Calendario

| Actividad | Periodicidad | Responsable |
|---|---|---|
| Revision de datos con plazo expirado | Anual (enero) | Administrador del sistema + DPO |
| Ejecucion de supresiones / anonimizaciones | Anual (febrero), tras aprobacion | Administrador del sistema |
| Verificacion de backups alineados | Trimestral | Administrador del sistema |
| Informe de cumplimiento | Anual (marzo) | DPO |

### 5.3 Criterios de seleccion

Para cada registro, se verificara:

1. Fecha de ultima actividad asistencial del paciente
2. Fecha de emision del documento (factura, prescripcion, consentimiento)
3. Plazo aplicable segun la tabla del apartado 4
4. Existencia de excepciones (ver apartado 7)

## 6. Procedimiento de supresion y anonimizacion

### 6.1 Anonimizacion (datos clinicos y de salud)

La anonimizacion se aplica a los datos de salud que deben conservarse por su valor clinico o de investigacion, pero cuyo plazo de vinculacion con datos identificativos ha expirado.

**Procedimiento tecnico:**

1. **Identificacion:** Seleccionar los registros del paciente cuyo plazo ha expirado
2. **Anonimizacion de datos identificativos:**
   - Reemplazar nombre y apellidos por un codigo generico irreversible (formato: `ANON-XXXXXXXX`)
   - Eliminar DNI/NIE, numero de seguridad social
   - Eliminar datos de contacto (telefono, email, direccion)
   - Generalizar fecha de nacimiento (conservar solo el ano si es relevante epidemiologicamente)
3. **Conservacion de datos clinicos:** Los datos clinicos anonimizados se conservan sin plazo definido
4. **Verificacion de irreversibilidad:** Confirmar que no es posible re-identificar al paciente con los datos conservados, ni combinandolos con otros conjuntos de datos
5. **Registro:** Documentar la operacion en el log de auditoria (fecha, numero de registros anonimizados, operador)

**Importante:** La anonimizacion debe ser **irreversible**. Los datos anonimizados dejan de ser datos personales a efectos del RGPD.

### 6.2 Supresion definitiva (datos administrativos)

La supresion se aplica a los datos que no tienen valor clinico ni obligacion de conservacion residual.

**Procedimiento tecnico:**

1. **Base de datos activa:** Eliminacion de los registros mediante operaciones DELETE con verificacion previa
2. **Copias de seguridad:** Los datos suprimidos se eliminaran de las copias de seguridad en la siguiente rotacion completa. Hasta entonces, las copias se mantienen cifradas (GPG) con acceso restringido
3. **Indices y caches:** Verificar que los datos se eliminan tambien de indices de busqueda y caches del sistema
4. **Registro:** Documentar la operacion en el log de auditoria

### 6.3 Aprobacion

Toda operacion de supresion o anonimizacion debera ser:

1. **Propuesta** por el administrador del sistema
2. **Revisada** por el DPO (cuando sea designado)
3. **Aprobada** por el responsable del tratamiento
4. **Documentada** en un acta de supresion que incluya: fecha, registros afectados, accion aplicada, aprobacion

## 7. Excepciones a la supresion

No se procedera a la supresion o anonimizacion de datos cuando concurra alguna de las siguientes circunstancias:

| Excepcion | Base legal | Accion |
|---|---|---|
| Solicitud de ejercicio de derechos pendiente | RGPD Art. 12 | Suspender supresion hasta resolucion |
| Investigacion judicial o policial en curso | Ley de Enjuiciamiento Criminal | Conservar hasta fin del procedimiento |
| Obligacion legal de conservacion no expirada | Varias (ver apartado 4) | Conservar hasta el vencimiento |
| Litigio en curso o previsible | RGPD Art. 17.3.e) | Conservar hasta resolucion firme + plazo ejecucion |
| Interes publico en salud publica | RGPD Art. 17.3.c) | Evaluar caso por caso |
| Fines de investigacion cientifica | RGPD Art. 17.3.d) | Anonimizar en lugar de suprimir |

## 8. Copias de seguridad

### 8.1 Alineacion con los plazos de retencion

Las copias de seguridad deben alinearse con la politica de retencion de la siguiente manera:

- **Backups diarios:** Retencion de 30 dias con rotacion automatica
- **Backups semanales:** Retencion de 3 meses
- **Backups mensuales:** Retencion de 1 ano
- **Backup anual de archivo:** Alineado con el plazo mas largo (15 anos para datos clinicos)

### 8.2 Supresion en backups

Cuando se supriman datos de la base de datos activa:

1. Los datos permanecen en los backups existentes hasta su rotacion natural
2. Los backups se mantienen cifrados con GPG (clave asimetrica)
3. El acceso a backups esta restringido al administrador del sistema
4. En caso de restauracion de un backup, se reaplicaran las supresiones registradas

### 8.3 Backups hors site

Los backups replicados en ubicaciones externas (cuando se implementen) seguiran la misma politica de retencion y se cifraran con la misma clave GPG.

## 9. Responsabilidades

| Rol | Responsabilidad |
|---|---|
| **Responsable del tratamiento** | Aprobar la politica, autorizar supresiones, rendir cuentas |
| **DPO** (cuando sea designado) | Supervisar el cumplimiento de plazos, asesorar, elaborar informe anual |
| **Administrador del sistema** | Ejecutar supresiones y anonimizaciones, mantener el calendario, gestionar backups |
| **Personal de la clinica** | No conservar datos fuera del sistema (prohibido exportar a dispositivos personales) |

## 10. Implementacion tecnica futura

Para automatizar esta politica, se preveen las siguientes mejoras en MediMaestro:

1. **Indicador de retencion:** Campo en cada registro indicando la fecha de expiracion del plazo de conservacion
2. **Alerta automatica:** Notificacion al administrador cuando haya registros con plazo proximo a expirar (30 dias antes)
3. **Proceso de anonimizacion automatizado:** Script o funcionalidad integrada para anonimizar registros expirados
4. **Panel de cumplimiento:** Dashboard con metricas de retencion (registros por plazo, proximos a expirar, suprimidos en el periodo)

## 11. Difusion y formacion

- Esta politica sera comunicada a todo el personal de la clinica con acceso a MediMaestro
- Se incluira en el programa de formacion RGPD del personal
- Se revisara anualmente o cuando se produzcan cambios legislativos relevantes

---

## Historial de revisiones

| Version | Fecha | Autor | Descripcion |
|---|---|---|---|
| 1.0 | 2026-03-27 | [RESPONSABLE] | Version inicial |
