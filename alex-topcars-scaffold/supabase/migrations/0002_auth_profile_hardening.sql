-- Security hardening: create customer profiles automatically and prevent self-escalation.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone, role)
  values (new.id, new.phone, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.prevent_role_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and public.current_app_role() is distinct from 'admin'::public.app_role then
    raise exception 'Only an administrator can change application roles';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update on public.profiles
for each row execute procedure public.prevent_role_self_change();

-- Role assignment for the first administrator must be performed out-of-band
-- by the project owner using the Supabase SQL editor after verifying the auth user ID.
