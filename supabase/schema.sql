-- REIMPACTA · base de datos en Supabase (región UE)
-- Pegar entero en Supabase > SQL Editor > New query > Run.
-- Se puede volver a ejecutar: no borra datos.
--
-- Reglas de seguridad (RLS):
--   · Jone (tabla staff) ve y cambia todo.
--   · Cada paciente solo ve su ficha y su diario, y solo puede escribir su diario
--     (sesiones, cuestionarios, vídeos, ajustes).
--   · Si no tiene acceso (pago vencido más de 3 días, acceso caducado o pausado),
--     el servidor no le deja leer la biblioteca ni escribir: el bloqueo no se puede saltar.
--   · Las notas de Jone están en otra tabla que los pacientes no pueden leer.

-- ---------- quién es Jone ----------
create table if not exists public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.staff enable row level security;

create or replace function public.is_jone() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
$$;

drop policy if exists staff_self on public.staff;
create policy staff_self on public.staff for select using (user_id = auth.uid());

-- ---------- biblioteca (vídeos, rutinas, programas, método) ----------
create table if not exists public.library (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.library enable row level security;

-- ---------- pacientes: ficha (la escribe Jone) ----------
create table if not exists public.patients (
  id text primary key,
  email text unique,
  user_id uuid unique references auth.users (id) on delete set null,
  admin jsonb not null default '{}'::jsonb, -- nombre, programa, pagos, acceso, fases, hitos, tests…
  updated_at timestamptz not null default now()
);
alter table public.patients enable row level security;

-- ---------- pacientes: diario (lo escribe el paciente) ----------
create table if not exists public.patient_logs (
  patient_id text primary key references public.patients (id) on delete cascade,
  data jsonb not null default '{}'::jsonb, -- sesiones, viernes, grabaciones, ajustes
  updated_at timestamptz not null default now()
);
alter table public.patient_logs enable row level security;

-- ---------- notas de Jone (privadas) ----------
create table if not exists public.notes (
  id text primary key,
  patient_id text not null references public.patients (id) on delete cascade,
  date date not null,
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.notes enable row level security;

-- ---------- datos de Jone (tareas, checklist, ajustes) ----------
create table if not exists public.jone_data (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.jone_data enable row level security;

-- ---------- llamadas (Cal.com) ----------
create table if not exists public.bookings (
  id text primary key,
  patient_id text references public.patients (id) on delete cascade,
  at timestamptz not null,
  meet_url text
);
alter table public.bookings enable row level security;

-- ---------- ¿tiene acceso? (misma regla que la app) ----------
create or replace function public.access_ok(admin jsonb, today date default current_date)
returns boolean language plpgsql immutable as $$
declare
  st date := (admin->>'start')::date;
  n int := coalesce((admin->'pay'->>'n')::int, 0);
  i int;
  until date;
begin
  if coalesce((admin->'access'->>'paused')::boolean, false) then return false; end if;
  -- plazos: uno cada 30 días desde el inicio, 3 días de margen
  for i in 0 .. n - 1 loop
    if not coalesce((admin->'pay'->'paid'->>i)::boolean, false)
       and st + i * 30 + 3 < today then
      return false;
    end if;
  end loop;
  until := coalesce(
    (admin->'access'->>'until')::date,
    (admin->>'end')::date,
    case when admin->'pay'->>'plan' = 'seguimiento' then null else st + 91 end
  );
  if until is not null and today > until then return false; end if;
  return true;
end $$;

create or replace function public.my_patient_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.patients where user_id = auth.uid()
$$;

create or replace function public.i_have_access() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.access_ok(admin) from public.patients where user_id = auth.uid()), false)
$$;

-- Al entrar por primera vez con su email, se une a su ficha
create or replace function public.link_me() returns text
language sql security definer set search_path = public as $$
  update public.patients set user_id = auth.uid()
   where user_id is null and lower(email) = lower(auth.jwt()->>'email')
  returning id
$$;

-- ---------- reglas ----------
drop policy if exists library_read on public.library;
create policy library_read on public.library for select using (public.is_jone() or public.i_have_access());
drop policy if exists library_write on public.library;
create policy library_write on public.library for all using (public.is_jone()) with check (public.is_jone());

drop policy if exists patients_read on public.patients;
create policy patients_read on public.patients for select using (public.is_jone() or user_id = auth.uid());
drop policy if exists patients_write on public.patients;
create policy patients_write on public.patients for all using (public.is_jone()) with check (public.is_jone());

drop policy if exists logs_read on public.patient_logs;
create policy logs_read on public.patient_logs for select
  using (public.is_jone() or (patient_id = public.my_patient_id() and public.i_have_access()));
drop policy if exists logs_insert on public.patient_logs;
create policy logs_insert on public.patient_logs for insert
  with check (public.is_jone() or (patient_id = public.my_patient_id() and public.i_have_access()));
drop policy if exists logs_update on public.patient_logs;
create policy logs_update on public.patient_logs for update
  using (public.is_jone() or (patient_id = public.my_patient_id() and public.i_have_access()))
  with check (public.is_jone() or (patient_id = public.my_patient_id() and public.i_have_access()));

drop policy if exists notes_jone on public.notes;
create policy notes_jone on public.notes for all using (public.is_jone()) with check (public.is_jone());
drop policy if exists jone_only on public.jone_data;
create policy jone_only on public.jone_data for all using (public.is_jone()) with check (public.is_jone());

drop policy if exists bookings_read on public.bookings;
create policy bookings_read on public.bookings for select using (public.is_jone() or patient_id = public.my_patient_id());
drop policy if exists bookings_write on public.bookings;
create policy bookings_write on public.bookings for all using (public.is_jone()) with check (public.is_jone());

-- ---------- vídeos de los pacientes (privados) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('pacientes', 'pacientes', false, 157286400) -- 150 MB por vídeo
on conflict (id) do nothing;

drop policy if exists videos_paciente_subir on storage.objects;
create policy videos_paciente_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'pacientes' and (storage.foldername(name))[1] = public.my_patient_id() and public.i_have_access());
drop policy if exists videos_paciente_ver on storage.objects;
create policy videos_paciente_ver on storage.objects for select to authenticated
  using (bucket_id = 'pacientes' and ((storage.foldername(name))[1] = public.my_patient_id() or public.is_jone()));
drop policy if exists videos_jone on storage.objects;
create policy videos_jone on storage.objects for all to authenticated
  using (bucket_id = 'pacientes' and public.is_jone()) with check (bucket_id = 'pacientes' and public.is_jone());

-- filas únicas de partida
insert into public.library (id) values (1) on conflict do nothing;
insert into public.jone_data (id) values (1) on conflict do nothing;

-- ---------- ÚLTIMO PASO (solo una vez) ----------
-- 1) Entra una vez en la app con tu email (te llega un enlace).
-- 2) Cambia TU_EMAIL por tu email y ejecuta SOLO esta línea:
-- insert into public.staff (user_id) select id from auth.users where email = 'TU_EMAIL' on conflict do nothing;

-- ---------- permisos de la app (las reglas RLS de arriba siguen decidiendo qué ve cada uno) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
