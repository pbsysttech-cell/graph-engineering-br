-- Rode no SQL Editor do Supabase (projeto novo). Idempotente.
-- Depois: Authentication > Providers > Email: DESLIGUE "Allow new users to sign up",
-- crie o usuário do Mateus em Authentication > Users e cadastre o e-mail em public.admins.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 2 and 120),
  whatsapp     text not null check (char_length(whatsapp) between 8 and 25),
  email        text check (email is null or char_length(email) <= 160),
  company      text check (company is null or char_length(company) <= 160),
  segment      text check (segment is null or char_length(segment) <= 80),
  city         text check (city is null or char_length(city) <= 80),
  revenue      text check (revenue is null or char_length(revenue) <= 20),
  ads_invest   text check (ads_invest is null or char_length(ads_invest) <= 20),
  team         text check (team is null or char_length(team) <= 20),
  crm          text check (crm is null or char_length(crm) <= 20),
  challenge    text[] default '{}',
  interest     text not null default 'gestao' check (interest in ('gestao','consultoria','parceria','mentoria')),
  message      text check (message is null or char_length(message) <= 1000),
  consent      boolean not null default false,
  status       text not null default 'novo'
               check (status in ('novo','contato','reuniao','proposta','ganho','perdido')),
  value        numeric(12,2),
  notes        jsonb not null default '[]'::jsonb,
  utm_source   text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer     text, page text, device text
);

-- Se a tabela já existia antes das opções atuais do formulário:
alter table public.leads drop constraint if exists leads_interest_check;
alter table public.leads add constraint leads_interest_check check (interest in ('gestao','consultoria','parceria','mentoria'));

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

create table if not exists public.admins (
  email text primary key
);
-- insert into public.admins (email) values ('email-do-mateus@exemplo.com');

alter table public.leads  enable row level security;
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins a where a.email = (auth.jwt() ->> 'email'));
$$;

-- Visitante (anon) só INSERE, sempre como "novo", com consentimento LGPD e sem notas/valor.
drop policy if exists "anon insere lead" on public.leads;
create policy "anon insere lead" on public.leads
  for insert to anon, authenticated
  with check (status = 'novo' and consent = true and value is null and notes = '[]'::jsonb);

-- Só e-mails cadastrados em public.admins leem/alteram/excluem.
drop policy if exists "admin le" on public.leads;
create policy "admin le" on public.leads for select to authenticated using (public.is_admin());
drop policy if exists "admin altera" on public.leads;
create policy "admin altera" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin exclui" on public.leads;
create policy "admin exclui" on public.leads for delete to authenticated using (public.is_admin());
