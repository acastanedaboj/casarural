-- Tabla clave-valor para el estado de la app Equipo Gumeo.
-- Ejecutar en el SQL Editor del proyecto de Supabase.

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- App familiar sin login: cualquiera con la anon key puede leer y escribir.
-- (La "seguridad" es no compartir el enlace fuera de la familia.)
create policy "lectura publica" on public.app_state
  for select using (true);

create policy "insercion publica" on public.app_state
  for insert with check (true);

create policy "actualizacion publica" on public.app_state
  for update using (true);
