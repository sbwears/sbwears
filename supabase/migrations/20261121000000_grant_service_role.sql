-- Newer Supabase projects no longer grant the API roles access to new tables
-- automatically. The app only ever talks to the database through the server's
-- service-role key, so that is the only role granted access here. anon/authenticated
-- (the public browser keys) deliberately get nothing.
--
-- Safe to run more than once. Changes permissions only — no data is modified.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Tables created later get the same access automatically.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
