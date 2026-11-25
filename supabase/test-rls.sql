-- SOLO PARA PROBAR EN LOCAL (no pegar en Supabase): comprueba las reglas con 4 usuarios de prueba
grant all on all tables in schema public, storage to authenticated;
grant all on all sequences in schema storage to authenticated;
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a','jone@ejemplo.es'),
 ('00000000-0000-0000-0000-00000000000b','ana@ejemplo.es'),
 ('00000000-0000-0000-0000-00000000000c','bea@ejemplo.es'),
 ('00000000-0000-0000-0000-00000000000d','x@ejemplo.es');
insert into public.staff values ('00000000-0000-0000-0000-00000000000a');
insert into public.patients (id,email,admin) values
 ('p1','Ana@ejemplo.es', jsonb_build_object('name','Ana','start',(current_date-10)::text,'pay','{"plan":"reimpacta","n":1,"paid":[true]}'::jsonb)),
 ('p2','bea@ejemplo.es', jsonb_build_object('name','Bea','start',(current_date-40)::text,'pay','{"plan":"reimpacta","n":3,"paid":[true,false,false]}'::jsonb));
insert into public.notes values ('n1','p1',current_date,'nota privada');
update public.library set data='{"videos":[1]}';

create function t(who text, label text, q text) returns text language plpgsql as $$
declare r text;
begin
  perform set_config('request.jwt.claim.sub', who, true);
  perform set_config('request.jwt.claim.email', (select email from auth.users where id=who::uuid), true);
  set local role authenticated;
  begin execute q into r; exception when others then r := 'BLOQUEADO (' || sqlstate || ')'; end;
  reset role;
  return label || ': ' || coalesce(r,'(nada)');
end $$;

select t('00000000-0000-0000-0000-00000000000b','Ana se une a su ficha','select public.link_me()');
select t('00000000-0000-0000-0000-00000000000c','Bea se une a su ficha','select public.link_me()');
select t('00000000-0000-0000-0000-00000000000b','Ana ve biblioteca','select count(*)::text from public.library');
select t('00000000-0000-0000-0000-00000000000c','Bea (pago vencido) ve biblioteca','select count(*)::text from public.library');
select t('00000000-0000-0000-0000-00000000000c','Bea ve su ficha (para la pantalla de pausa)','select count(*)::text from public.patients');
select t('00000000-0000-0000-0000-00000000000b','Ana ve fichas','select string_agg(id,'','') from public.patients');
select t('00000000-0000-0000-0000-00000000000b','Ana guarda su diario','insert into public.patient_logs values (''p1'',''{"s":1}'') returning patient_id');
select t('00000000-0000-0000-0000-00000000000b','Ana escribe el diario de Bea','insert into public.patient_logs values (''p2'',''{}'') returning patient_id');
select t('00000000-0000-0000-0000-00000000000c','Bea guarda su diario','insert into public.patient_logs values (''p2'',''{}'') returning patient_id');
select t('00000000-0000-0000-0000-00000000000b','Ana se marca pagado','update public.patients set admin=admin||''{"x":1}'' where id=''p1'' returning id');
select t('00000000-0000-0000-0000-00000000000b','Ana lee notas de Jone','select count(*)::text from public.notes');
select t('00000000-0000-0000-0000-00000000000b','Ana sube vídeo a su carpeta','insert into storage.objects(bucket_id,name) values (''pacientes'',''p1/v.mp4'') returning name');
select t('00000000-0000-0000-0000-00000000000b','Ana sube vídeo a carpeta de Bea','insert into storage.objects(bucket_id,name) values (''pacientes'',''p2/v.mp4'') returning name');
select t('00000000-0000-0000-0000-00000000000d','Desconocido ve fichas','select count(*)::text from public.patients');
select t('00000000-0000-0000-0000-00000000000d','Desconocido ve biblioteca','select count(*)::text from public.library');
select t('00000000-0000-0000-0000-00000000000a','Jone ve fichas','select count(*)::text from public.patients');
select t('00000000-0000-0000-0000-00000000000a','Jone lee notas','select count(*)::text from public.notes');
select t('00000000-0000-0000-0000-00000000000a','Jone marca pagado a Bea','update public.patients set admin=jsonb_set(admin,''{pay,paid,1}'',''true'') where id=''p2'' returning id');
select t('00000000-0000-0000-0000-00000000000c','Bea tras pagar ve biblioteca','select count(*)::text from public.library');
select t('00000000-0000-0000-0000-00000000000a','Jone ve vídeos de pacientes','select count(*)::text from storage.objects');
