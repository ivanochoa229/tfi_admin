CREATE SCHEMA IF NOT EXISTS db_tfi AUTHORIZATION test;
SET search_path TO db_tfi, public;

-- =========================
-- Tabla: estado_tarea
-- =========================
CREATE TABLE IF NOT EXISTS estado_tarea (
  id_estado UUID PRIMARY KEY,
  descripcion_estado VARCHAR(20)
);

-- =========================
-- Tabla: prioridad
-- =========================
CREATE TABLE IF NOT EXISTS prioridad (
  id_prioridad UUID PRIMARY KEY,
  descripcion_prioridad VARCHAR(20)
);

-- =========================
-- Tabla: tarea
-- =========================
CREATE TABLE IF NOT EXISTS tarea (
  id_tarea UUID PRIMARY KEY,
  descripcion_tarea VARCHAR(50),
  id_estado UUID,
  id_prioridad UUID,
  fecha_inicio DATE,
  fecha_estimada DATE,
  fecha_fin DATE,
  CONSTRAINT fk_tarea_estado
    FOREIGN KEY (id_estado) REFERENCES estado_tarea (id_estado),
  CONSTRAINT fk_tarea_prioridad
    FOREIGN KEY (id_prioridad) REFERENCES prioridad (id_prioridad)
);

CREATE INDEX IF NOT EXISTS idx_tarea_id_estado    ON tarea (id_estado);
CREATE INDEX IF NOT EXISTS idx_tarea_id_prioridad ON tarea (id_prioridad);

-- =========================
-- Tabla: documento
-- =========================
CREATE TABLE IF NOT EXISTS documento (
  id_documento   UUID PRIMARY KEY,
  id_tarea       UUID NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  mime_type      VARCHAR(100) NOT NULL,
  extension      VARCHAR(10)  NOT NULL,
  tamanio_bytes  BIGINT CHECK (tamanio_bytes IS NULL OR tamanio_bytes >= 0),
  contenido      BYTEA NOT NULL,
  checksum_md5   CHAR(32),
  subido_por     UUID,
  subido_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_documento_tarea
    FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documento_tarea  ON documento (id_tarea);
CREATE INDEX IF NOT EXISTS idx_documento_nombre ON documento (nombre_archivo);

-- =========================
-- Tabla: rol
-- =========================
CREATE TABLE IF NOT EXISTS rol (
  id_rol INTEGER PRIMARY KEY,
  nombre_rol VARCHAR(45) NOT NULL
);

-- =========================
-- Tabla: empleado
-- =========================
CREATE TABLE IF NOT EXISTS empleado (
  id_empleado UUID PRIMARY KEY,
  nombre_empleado   VARCHAR(80),
  apellido_empleado VARCHAR(80),
  usuario VARCHAR(50),
  password VARCHAR(250),
  correo_electronico VARCHAR(100),
  telefono VARCHAR(30),
  id_rol INTEGER NOT NULL,
  CONSTRAINT fk_empleado_rol
    FOREIGN KEY (id_rol) REFERENCES rol (id_rol)
);

CREATE INDEX IF NOT EXISTS idx_empleado_id_rol ON empleado (id_rol);

-- =========================
-- Tabla: evolucion_tarea
-- =========================
CREATE TABLE IF NOT EXISTS evolucion_tarea (
  id_cambio UUID PRIMARY KEY,
  id_empleado UUID,
  id_tarea UUID,
  id_estado_tarea UUID,
  descripcion_cambio VARCHAR(255),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  CONSTRAINT fk_evolucion_empleado
    FOREIGN KEY (id_empleado) REFERENCES empleado (id_empleado),
  CONSTRAINT fk_evolucion_tarea
    FOREIGN KEY (id_tarea) REFERENCES tarea (id_tarea),
  CONSTRAINT fk_evolucion_estado
    FOREIGN KEY (id_estado_tarea) REFERENCES estado_tarea (id_estado)
);

CREATE INDEX IF NOT EXISTS idx_evo_id_empleado     ON evolucion_tarea (id_empleado);
CREATE INDEX IF NOT EXISTS idx_evo_id_tarea        ON evolucion_tarea (id_tarea);
CREATE INDEX IF NOT EXISTS idx_evo_id_estado_tarea ON evolucion_tarea (id_estado_tarea);

-- =========================
-- Tabla: proyecto
-- =========================
CREATE TABLE IF NOT EXISTS proyecto (
  id_proyecto UUID PRIMARY KEY,
  fecha_inicio   DATE NOT NULL,
  fecha_estimada DATE NOT NULL,
  fecha_fin      DATE,
  nombre_proyecto      VARCHAR(80) NOT NULL,
  descripcion_proyecto VARCHAR(80),
  presupuesto_total    NUMERIC(12,2) NOT NULL,
  id_prioridad UUID NOT NULL,
  CONSTRAINT fk_proyecto_prioridad
    FOREIGN KEY (id_prioridad) REFERENCES prioridad (id_prioridad)
);

CREATE INDEX IF NOT EXISTS idx_proyecto_id_prioridad ON proyecto (id_prioridad);

-- =========================
-- Tabla: recurso
-- =========================
CREATE TABLE IF NOT EXISTS recurso (
  id_recurso UUID PRIMARY KEY,
  descripcion_recurso VARCHAR(30) NOT NULL,
  costo_unitario NUMERIC(12,2) NOT NULL
);

-- =========================
-- Tabla: tarea_proyecto
-- =========================
CREATE TABLE IF NOT EXISTS tarea_proyecto (
  id_tarea_proyecto UUID PRIMARY KEY,
  id_proyecto UUID,
  id_tarea    UUID,
  id_empleado UUID,
  id_recurso  UUID,
  CONSTRAINT fk_tp_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto),
  CONSTRAINT fk_tp_tarea    FOREIGN KEY (id_tarea)    REFERENCES tarea    (id_tarea),
  CONSTRAINT fk_tp_empleado FOREIGN KEY (id_empleado) REFERENCES empleado (id_empleado),
  CONSTRAINT fk_tp_recurso  FOREIGN KEY (id_recurso)  REFERENCES recurso  (id_recurso)
);

CREATE INDEX IF NOT EXISTS idx_tp_id_proyecto ON tarea_proyecto (id_proyecto);
CREATE INDEX IF NOT EXISTS idx_tp_id_tarea    ON tarea_proyecto (id_tarea);
CREATE INDEX IF NOT EXISTS idx_tp_id_empleado ON tarea_proyecto (id_empleado);
CREATE INDEX IF NOT EXISTS idx_tp_id_recurso  ON tarea_proyecto (id_recurso);

-- =========================
-- Tabla: tarea_proyecto_recurso
-- =========================
CREATE TABLE IF NOT EXISTS tarea_proyecto_recurso (
  id_tarea_proyecto_recurso UUID PRIMARY KEY,
  id_tarea   UUID,
  id_recurso UUID,
  id_proyecto UUID,
  cantidad INTEGER NOT NULL,
  CONSTRAINT fk_tpr_tarea    FOREIGN KEY (id_tarea)    REFERENCES tarea    (id_tarea),
  CONSTRAINT fk_tpr_recurso  FOREIGN KEY (id_recurso)  REFERENCES recurso  (id_recurso),
  CONSTRAINT fk_tpr_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto)
);

CREATE INDEX IF NOT EXISTS idx_tpr_id_tarea    ON tarea_proyecto_recurso (id_tarea);
CREATE INDEX IF NOT EXISTS idx_tpr_id_recurso  ON tarea_proyecto_recurso (id_recurso);
CREATE INDEX IF NOT EXISTS idx_tpr_id_proyecto ON tarea_proyecto_recurso (id_proyecto);

-- =========================
-- Tabla: proyecto_empleado
-- =========================
CREATE TABLE IF NOT EXISTS proyecto_empleado (
  id_proyecto_empleado INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_empleado UUID NOT NULL,
  id_proyecto UUID NOT NULL,
  CONSTRAINT fk_pe_empleado FOREIGN KEY (id_empleado) REFERENCES empleado (id_empleado),
  CONSTRAINT fk_pe_proyecto FOREIGN KEY (id_proyecto) REFERENCES proyecto (id_proyecto)
);

CREATE INDEX IF NOT EXISTS idx_pe_id_empleado ON proyecto_empleado (id_empleado);
CREATE INDEX IF NOT EXISTS idx_pe_id_proyecto ON proyecto_empleado (id_proyecto);

SET search_path TO db_tfi, public;
-- Estado
ALTER TABLE estado_tarea
  ALTER COLUMN id_estado SET DEFAULT gen_random_uuid();

-- Prioridad
ALTER TABLE prioridad
  ALTER COLUMN id_prioridad SET DEFAULT gen_random_uuid();

-- Tarea
ALTER TABLE tarea
  ALTER COLUMN id_tarea SET DEFAULT gen_random_uuid();

-- Documento
ALTER TABLE documento
  ALTER COLUMN id_documento SET DEFAULT gen_random_uuid();

-- Empleado
ALTER TABLE empleado
  ALTER COLUMN id_empleado SET DEFAULT gen_random_uuid();

-- Evolución
ALTER TABLE evolucion_tarea
  ALTER COLUMN id_cambio SET DEFAULT gen_random_uuid();

-- Proyecto
ALTER TABLE proyecto
  ALTER COLUMN id_proyecto SET DEFAULT gen_random_uuid();

-- Recurso
ALTER TABLE recurso
  ALTER COLUMN id_recurso SET DEFAULT gen_random_uuid();

-- Tarea_Proyecto
ALTER TABLE tarea_proyecto
  ALTER COLUMN id_tarea_proyecto SET DEFAULT gen_random_uuid();

-- Tarea_Proyecto_Recurso
ALTER TABLE tarea_proyecto_recurso
  ALTER COLUMN id_tarea_proyecto_recurso SET DEFAULT gen_random_uuid();



SET search_path TO db_tfi, public;

WITH
rol_data AS (
    INSERT INTO rol (id_rol, nombre_rol) VALUES
    (1, 'GESTOR'),
    (2, 'COLABORADOR')
    RETURNING id_rol
),
estado_tarea_data AS (
    INSERT INTO estado_tarea (id_estado, descripcion_estado) VALUES
    (gen_random_uuid(), 'CREADA'),
    (gen_random_uuid(), 'PENDIENTE'),
    (gen_random_uuid(), 'EN CURSO'),
    (gen_random_uuid(), 'EN REVISION'),
    (gen_random_uuid(), 'COMPLETADA')
    RETURNING id_estado, descripcion_estado
),
prioridad_data AS (
    INSERT INTO prioridad (id_prioridad, descripcion_prioridad) VALUES
    (gen_random_uuid(), 'ALTA'),
    (gen_random_uuid(), 'MEDIA'),
    (gen_random_uuid(), 'BAJA')
    RETURNING id_prioridad, descripcion_prioridad
)
SELECT 'Tablas de catálogo pobladas' AS status;

-- 2. Definición de UUIDs para las entidades principales (Empleados, Proyectos, Tareas, Recursos)
WITH 
    -- Obtener IDs de catálogo
    prioridades AS (SELECT id_prioridad, descripcion_prioridad FROM prioridad),
    estados AS (SELECT id_estado, descripcion_estado FROM estado_tarea),

    -- Insertar Empleados
    empleados_ins AS (
        INSERT INTO empleado (id_empleado, nombre_empleado, apellido_empleado, usuario, password, correo_electronico , telefono ,id_rol) VALUES
        (gen_random_uuid(), 'Ana', 'García', 'gana123', '$2a$12$OnzFCD4yob.ZBifzd/bUTu0otwQHODPUcTT8OswqIaJ3xqHBUCvAO', 'anagarcia@mail.com', '3813245789',(SELECT id_rol FROM rol WHERE nombre_rol = 'GESTOR')),         -- Gestor
        (gen_random_uuid(), 'Luis', 'Martínez', 'mluis123', '$2a$12$OnzFCD4yob.ZBifzd/bUTu0otwQHODPUcTT8OswqIaJ3xqHBUCvAO', 'luismartinez@mail.com', '3817845789',(SELECT id_rol FROM rol WHERE nombre_rol = 'COLABORADOR')), -- Colaborador
        (gen_random_uuid(), 'Sofía', 'Rodríguez', 'rsofia123', '$2a$12$OnzFCD4yob.ZBifzd/bUTu0otwQHODPUcTT8OswqIaJ3xqHBUCvAO', 'sofiarodriguez@mail.com', '3813245320',(SELECT id_rol FROM rol WHERE nombre_rol = 'COLABORADOR')), -- Colaborador
        (gen_random_uuid(), 'David', 'Sánchez', 'sdavid123', '$2a$12$OnzFCD4yob.ZBifzd/bUTu0otwQHODPUcTT8OswqIaJ3xqHBUCvAO', 'davidsanchez@mail.com', '3815005789',(SELECT id_rol FROM rol WHERE nombre_rol = 'COLABORADOR'))   -- Colaborador
        RETURNING id_empleado, nombre_empleado, id_rol
    ),
    empleados_cte AS (SELECT id_empleado, nombre_empleado, id_rol FROM empleados_ins),

    -- Insertar Proyectos
    proyectos_ins AS (
        INSERT INTO proyecto (id_proyecto, fecha_inicio, fecha_estimada, fecha_fin, nombre_proyecto, descripcion_proyecto, presupuesto_total, id_prioridad) VALUES
        (gen_random_uuid(), CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '3 months', NULL, 'Proyecto Alfa', 'Desarrollo de App Móvil', 50000.00, (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'ALTA')),
        (gen_random_uuid(), CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE + INTERVAL '1 month', NULL, 'Proyecto Beta', 'Migración de Base de Datos', 25000.50, (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'MEDIA')),
        (gen_random_uuid(), CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE - INTERVAL '1 month', CURRENT_DATE - INTERVAL '15 days', 'Proyecto Gamma', 'Implementación de ERP', 80000.00, (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'BAJA'))
        RETURNING id_proyecto, nombre_proyecto
    ),
    proyectos_cte AS (SELECT id_proyecto, nombre_proyecto FROM proyectos_ins),

    -- Insertar Tareas
    tareas_ins AS (
        INSERT INTO tarea (id_tarea, descripcion_tarea, id_estado, id_prioridad, fecha_inicio, fecha_estimada, fecha_fin) VALUES
        -- Tarea para Proyecto Alfa (ALTA)
        (gen_random_uuid(), 'Diseño UX/UI de la App', (SELECT id_estado FROM estados WHERE descripcion_estado = 'EN CURSO'), (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'ALTA'), CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '5 days', NULL),
        (gen_random_uuid(), 'Desarrollo del Backend', (SELECT id_estado FROM estados WHERE descripcion_estado = 'CREADA'), (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'ALTA'), NULL, CURRENT_DATE + INTERVAL '30 days', NULL),

        -- Tarea para Proyecto Beta (MEDIA)
        (gen_random_uuid(), 'Análisis de Requerimientos', (SELECT id_estado FROM estados WHERE descripcion_estado = 'COMPLETADA'), (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'MEDIA'), CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '25 days'),
        (gen_random_uuid(), 'Ejecución de Migración', (SELECT id_estado FROM estados WHERE descripcion_estado = 'EN REVISION'), (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'MEDIA'), CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '1 day', NULL),

        -- Tarea para Proyecto Gamma (BAJA)
        (gen_random_uuid(), 'Configuración Inicial ERP', (SELECT id_estado FROM estados WHERE descripcion_estado = 'COMPLETADA'), (SELECT id_prioridad FROM prioridades WHERE descripcion_prioridad = 'BAJA'), CURRENT_DATE - INTERVAL '5 months', CURRENT_DATE - INTERVAL '4 months', CURRENT_DATE - INTERVAL '4 months')
        RETURNING id_tarea, descripcion_tarea, id_estado
    ),
    tareas_cte AS (SELECT id_tarea, descripcion_tarea, id_estado FROM tareas_ins),

    -- Insertar Recursos
    recursos_ins AS (
        INSERT INTO recurso (id_recurso, descripcion_recurso, costo_unitario) VALUES
        (gen_random_uuid(), 'Licencia Software A', 1500.00),
        (gen_random_uuid(), 'Servidor Cloud', 450.75),
        (gen_random_uuid(), 'Material de Oficina', 10.00)
        RETURNING id_recurso, descripcion_recurso
    ),
    recursos_cte AS (SELECT id_recurso, descripcion_recurso FROM recursos_ins),

    -- 3. Inserciones de Tablas de Relación y Evolución

    -- Asignar Empleados a Proyectos (Proyecto_Empleado)
    proyecto_empleado_ins AS (
        INSERT INTO proyecto_empleado (id_empleado, id_proyecto) VALUES
        ((SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Ana'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa')),
        ((SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Luis'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa')),
        ((SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Sofía'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Beta')),
        ((SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'David'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Gamma'))
    ),

    -- Evolución de Tareas (Evolucion_Tarea)
    evolucion_tarea_ins AS (
        INSERT INTO evolucion_tarea (id_cambio, id_empleado, id_tarea, id_estado_tarea, descripcion_cambio, fecha_inicio, fecha_fin) VALUES
        -- Tarea: Diseño UX/UI de la App (EN CURSO)
        (gen_random_uuid(), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Luis'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Diseño UX/UI de la App'), (SELECT id_estado FROM estados WHERE descripcion_estado = 'CREADA'), 'Creación de la tarea', CURRENT_DATE - INTERVAL '16 days', CURRENT_DATE - INTERVAL '15 days'),
        (gen_random_uuid(), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Luis'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Diseño UX/UI de la App'), (SELECT id_estado FROM estados WHERE descripcion_estado = 'EN CURSO'), 'Tarea iniciada por el equipo de UX', CURRENT_DATE - INTERVAL '15 days', NULL),
        -- Tarea: Ejecución de Migración (EN REVISION)
        (gen_random_uuid(), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Sofía'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Ejecución de Migración'), (SELECT id_estado FROM estados WHERE descripcion_estado = 'EN CURSO'), 'Inicio de migración de datos', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE - INTERVAL '10 days'),
        (gen_random_uuid(), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Sofía'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Ejecución de Migración'), (SELECT id_estado FROM estados WHERE descripcion_estado = 'EN REVISION'), 'Migración lista para revisión', CURRENT_DATE - INTERVAL '10 days', NULL),
        -- Tarea: Configuración Inicial ERP (COMPLETADA)
        (gen_random_uuid(), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'David'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Configuración Inicial ERP'), (SELECT id_estado FROM estados WHERE descripcion_estado = 'COMPLETADA'), 'Configuración finalizada y validada', CURRENT_DATE - INTERVAL '4 months', NULL)
    ),

    -- Tarea_Proyecto (Asignación de Empleados y Recursos a Tareas en Proyectos)
    tarea_proyecto_ins AS (
        INSERT INTO tarea_proyecto (id_tarea_proyecto, id_proyecto, id_tarea, id_empleado, id_recurso) VALUES
        (gen_random_uuid(), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Diseño UX/UI de la App'), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Luis'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Licencia Software A')),
        (gen_random_uuid(), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Desarrollo del Backend'), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Ana'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Servidor Cloud')),
        (gen_random_uuid(), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Beta'), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Ejecución de Migración'), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Sofía'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Servidor Cloud'))
    ),

    -- Tarea_Proyecto_Recurso (Recursos con Cantidades)
    tpr_ins AS (
        INSERT INTO tarea_proyecto_recurso (id_tarea_proyecto_recurso, id_tarea, id_recurso, id_proyecto, cantidad) VALUES
        (gen_random_uuid(), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Diseño UX/UI de la App'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Licencia Software A'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa'), 1),
        (gen_random_uuid(), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Desarrollo del Backend'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Servidor Cloud'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Alfa'), 3),
        (gen_random_uuid(), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Configuración Inicial ERP'), (SELECT id_recurso FROM recursos_cte WHERE descripcion_recurso = 'Material de Oficina'), (SELECT id_proyecto FROM proyectos_cte WHERE nombre_proyecto = 'Proyecto Gamma'), 50)
    ),

    -- Documento (Usando un contenido BYTEA de ejemplo)
    documento_ins AS (
        INSERT INTO documento (id_documento, id_tarea, nombre_archivo, mime_type, extension, tamanio_bytes, contenido, checksum_md5, subido_por) VALUES
        (gen_random_uuid(), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Diseño UX/UI de la App'), 'Especificacion_UX.pdf', 'application/pdf', 'pdf', 512000, decode('486F6C61206D756E646F2E', 'hex'), md5('Especificaciones UX'), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Ana')),
        (gen_random_uuid(), (SELECT id_tarea FROM tareas_cte WHERE descripcion_tarea = 'Análisis de Requerimientos'), 'Requisitos_v1.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx', 102400, decode('4172636869766F206465207072756562612E', 'hex'), md5('Requisitos v1'), (SELECT id_empleado FROM empleados_cte WHERE nombre_empleado = 'Sofía'))
    )

SELECT 'Datos de empleados, proyectos, tareas y relaciones poblados' AS status;

