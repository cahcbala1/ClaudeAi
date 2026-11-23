-- ============================================================
-- SIGO - Creación del usuario y la base de datos en PostgreSQL
-- Ejecutar UNA sola vez, conectado como superusuario "postgres".
--
-- IMPORTANTE: cambia la contraseña antes de ejecutarlo y usa la
-- misma en DATABASE_URL de backend/.env. Evita acentos y la ñ en la
-- contraseña.
-- ============================================================

-- Usuario propio de la aplicación (no usamos "postgres" desde Flask).
CREATE ROLE sigo_user WITH LOGIN PASSWORD 'CambiaEstaClave123';

-- Base de datos cuyo dueño es sigo_user, así puede crear tablas en
-- el esquema "public" (desde PostgreSQL 15 un usuario que no es dueño
-- ya no tiene ese permiso por defecto).
CREATE DATABASE sigo_db OWNER sigo_user;
