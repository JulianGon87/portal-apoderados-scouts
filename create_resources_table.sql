-- Crear tabla de recursos educativos
create table if not exists recursos_educativos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  titulo text not null,
  descripcion text,
  tipo text not null check (tipo in ('ficha', 'cancion', 'video', 'otro')),
  url_archivo text,
  unidad text not null check (unidad in ('manada', 'tropa', 'compañia', 'avanzada', 'clan', 'general')),
  created_by uuid references auth.users(id)
);

-- Habilitar RLS (Row Level Security)
alter table recursos_educativos enable row level security;

-- Política: Todos los usuarios autenticados pueden VER los recursos
create policy "Todos pueden ver recursos"
  on recursos_educativos for select
  using (auth.role() = 'authenticated');

-- Política: Solo los administradores pueden INSERTAR recursos
-- (Asumimos que los tutores tendrán rol de admin o permiso especial, por ahora restringido a quienes pueden crear items)
create policy "Admins pueden crear recursos"
  on recursos_educativos for insert
  with check (
    exists (
      select 1 from users
      where users.auth_user_id = auth.uid()
      and users.rol in ('admin', 'superadmin', 'tutor') -- Agregamos 'tutor' pensando a futuro
    )
  );

-- Política: Solo Admins pueden ELIMINAR recursos
create policy "Admins pueden eliminar recursos"
  on recursos_educativos for delete
  using (
    exists (
      select 1 from users
      where users.auth_user_id = auth.uid()
      and users.rol in ('admin', 'superadmin', 'tutor')
    )
  );

-- Crear bucket de storage para los archivos si no existe
insert into storage.buckets (id, name, public)
values ('recursos', 'recursos', true)
on conflict (id) do nothing;

-- Política de Storage: Cualquiera autenticado puede ver/descargar
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'recursos' and auth.role() = 'authenticated' );

-- Política de Storage: Solo admins pueden subir
create policy "Admin Upload"
  on storage.objects for insert
  with check (
    bucket_id = 'recursos' 
    and exists (
      select 1 from users
      where users.auth_user_id = auth.uid()
      and users.rol in ('admin', 'superadmin', 'tutor')
    )
  );
