\set ON_ERROR_STOP on
-- Synthetic Auth claims and provider tables for isolated PostgreSQL contract CI.
-- This is deliberately NOT a Supabase project or real user data.
create role anon nologin;
create role authenticated nologin;
grant usage on schema public to anon, authenticated;
create schema auth;
create table auth.users(
 id uuid primary key,
 email text not null,
 email_confirmed_at timestamptz
);
create table auth.identities(
 user_id uuid not null references auth.users(id),
 provider text not null
);
create function auth.uid() returns uuid language sql stable as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid(),auth.jwt() to authenticated;
create publication supabase_realtime;
insert into auth.users(id,email,email_confirmed_at) values
 ('11111111-1111-4111-8111-111111111111','admin@example.test',now()),
 ('22222222-2222-4222-8222-222222222222','guest1@example.test',now()),
 ('33333333-3333-4333-8333-333333333333','guest2@example.test',now()),
 ('44444444-4444-4444-8444-444444444444','forged@example.test',now());
insert into auth.identities(user_id,provider) values
 ('11111111-1111-4111-8111-111111111111','google'),
 ('44444444-4444-4444-8444-444444444444','email');
