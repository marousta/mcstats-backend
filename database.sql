DROP DATABASE 'mcstats';
CREATE DATABASE 'mcstats';
\c 'mcstats'

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
SET default_tablespace = '';
SET default_with_oids = false;

--
-- logtime_history
--

CREATE TABLE public.logtime_history (
    id integer NOT NULL,
    username text[] NOT NULL,
    logtime bigint[] NOT NULL,
    itime date NOT NULL
);
ALTER TABLE public.logtime_history OWNER TO postgres;

CREATE SEQUENCE public.logtime_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.logtime_history_id_seq OWNER TO postgres;
ALTER SEQUENCE public.logtime_history_id_seq OWNED BY public.logtime_history.id;

--
-- players_logtime
--

CREATE TABLE public.players_logtime (
    id integer NOT NULL,
    username text NOT NULL,
    logtime bigint NOT NULL
);
ALTER TABLE public.players_logtime OWNER TO postgres;

CREATE SEQUENCE public.players_logtime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.players_logtime_id_seq OWNER TO postgres;
ALTER SEQUENCE public.players_logtime_id_seq OWNED BY public.players_logtime.id;


--
-- players_online
--

CREATE TABLE public.players_online (
    id integer NOT NULL,
    itime bigint NOT NULL,
    value integer NOT NULL
);
ALTER TABLE public.players_online OWNER TO postgres;

CREATE SEQUENCE public.players_online_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.players_online_id_seq OWNER TO postgres;
ALTER SEQUENCE public.players_online_id_seq OWNED BY public.players_online.id;


--
-- players_sessions
--

CREATE TABLE public.players_sessions (
    id integer NOT NULL,
    username text NOT NULL,
    connection_time bigint NOT NULL
);
ALTER TABLE public.players_sessions OWNER TO postgres;

CREATE SEQUENCE public.players_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.players_sessions_id_seq OWNER TO postgres;
ALTER SEQUENCE public.players_sessions_id_seq OWNED BY public.players_sessions.id;

--
-- server_uptime
--

CREATE TABLE public.server_uptime (
    id integer NOT NULL,
    itime bigint NOT NULL,
    value boolean NOT NULL
);
ALTER TABLE public.server_uptime OWNER TO postgres;

CREATE SEQUENCE public.server_uptime_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.server_uptime_id_seq OWNER TO postgres;
ALTER SEQUENCE public.server_uptime_id_seq OWNED BY public.server_uptime.id;

--
--
--

ALTER TABLE ONLY public.logtime_history ALTER COLUMN id SET DEFAULT nextval('public.logtime_history_id_seq'::regclass);
ALTER TABLE ONLY public.players_logtime ALTER COLUMN id SET DEFAULT nextval('public.players_logtime_id_seq'::regclass);
ALTER TABLE ONLY public.players_online ALTER COLUMN id SET DEFAULT nextval('public.players_online_id_seq'::regclass);
ALTER TABLE ONLY public.players_sessions ALTER COLUMN id SET DEFAULT nextval('public.players_sessions_id_seq'::regclass);
ALTER TABLE ONLY public.server_uptime ALTER COLUMN id SET DEFAULT nextval('public.server_uptime_id_seq'::regclass);

SELECT pg_catalog.setval('public.logtime_history_id_seq', 1, false);
SELECT pg_catalog.setval('public.players_logtime_id_seq', 5, true);
SELECT pg_catalog.setval('public.players_online_id_seq', 18, true);
SELECT pg_catalog.setval('public.players_sessions_id_seq', 12, true);
SELECT pg_catalog.setval('public.server_uptime_id_seq', 57, true);

ALTER TABLE ONLY public.logtime_history ADD CONSTRAINT logtime_history_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.players_logtime ADD CONSTRAINT players_logtime_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.players_online ADD CONSTRAINT players_online_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.players_sessions ADD CONSTRAINT players_sessions_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.server_uptime ADD CONSTRAINT uptime_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.players_logtime ADD CONSTRAINT players_logtime_ukey UNIQUE (username);
ALTER TABLE ONLY public.players_sessions ADD CONSTRAINT players_sessions_ukey UNIQUE (username);
