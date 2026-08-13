create schema if not exists extensions;

alter extension vector set schema extensions;

grant usage on schema extensions to service_role;
grant execute on all functions in schema extensions to service_role;
