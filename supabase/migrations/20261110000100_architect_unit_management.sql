-- Active staff can manage unit owners and reopen completed customizations.
-- The combined manage_unit RPC and deadline RPCs retain their Admin checks.

create or replace function public.set_unit_active(p_unit_id uuid, p_active boolean) returns public.units
language plpgsql security definer set search_path = '' as $$
declare v_unit public.units;
begin
  if (select public.current_staff_role()) not in ('architect','admin') or public.current_staff_role() is null
    then raise exception 'Staff access required' using errcode = '42501'; end if;
  if p_active is null then raise exception 'Invalid unit status' using errcode = '22023'; end if;
  select * into v_unit from public.units where id = p_unit_id for update;
  if not found then raise exception 'Unit not found' using errcode = '22023'; end if;
  if v_unit.active is distinct from p_active then
    update public.units set active = p_active,
      customization_status = case when p_active then 'pending' else customization_status end
      where id = p_unit_id returning * into v_unit;
    insert into public.unit_activity_events(unit_id, actor_user_id, actor_role, action, details)
    values(p_unit_id, (select auth.uid()), public.current_staff_role(), 'unit_status_changed',
      jsonb_build_object('active', p_active, 'customization_status', v_unit.customization_status));
  end if;
  return v_unit;
end; $$;

create or replace function public.set_unit_customer(p_unit_id uuid, p_customer_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_previous uuid;
  v_role text := public.current_staff_role();
begin
  if coalesce(v_role, '') not in ('admin', 'architect')
    then raise exception 'Staff access required' using errcode = '42501'; end if;
  perform 1 from public.units where id = p_unit_id for update;
  if not found or (p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id))
    then raise exception 'Unit or customer not found' using errcode = '22023'; end if;
  select customer_id into v_previous from public.customer_units where unit_id = p_unit_id and active;
  update public.customer_units set active = false where unit_id = p_unit_id and active;
  if p_customer_id is not null then
    insert into public.customer_units(customer_id, unit_id, ownership_role, active)
    values(p_customer_id, p_unit_id, 'owner', true) on conflict(customer_id, unit_id)
    do update set ownership_role = 'owner', active = true;
  end if;
  if v_previous is distinct from p_customer_id then
    insert into public.unit_activity_events(unit_id, actor_user_id, actor_role, action, details)
    values(p_unit_id, (select auth.uid()), v_role, 'unit_customer_changed',
      jsonb_build_object('previous_customer_id', v_previous, 'customer_id', p_customer_id));
  end if;
end; $$;

create or replace function public.list_commercial_owner_reviews()
returns table(unit_id uuid, revision timestamptz)
language sql stable security definer set search_path='' as $$
  select review.unit_id, review.revision
  from commercial_sync.owner_reviews review
  join public.units u on u.id = review.unit_id
  cross join commercial_sync.settings settings
  join commercial_sync.snapshot snapshot using (singleton)
  where public.current_staff_role() in ('admin', 'architect') and settings.enabled
    and snapshot.units->u.code->'eligible' = 'true'::jsonb;
$$;

create or replace function public.confirm_commercial_owner(p_unit_id uuid, p_customer_id uuid, p_revision timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare
  unit_code text;
  v_role text := public.current_staff_role();
begin
  if coalesce(v_role, '') not in ('admin', 'architect') then
    raise exception 'Staff access required' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(671101, 1);
  select code into unit_code from public.units where id = p_unit_id for update;
  if not exists (
    select 1 from commercial_sync.snapshot snapshot
    join commercial_sync.settings settings using (singleton)
    where settings.enabled and snapshot.units->unit_code->'eligible' = 'true'::jsonb
  ) or not exists (
    select 1 from public.customer_units cu join public.customers c on c.id = cu.customer_id
    where cu.unit_id = p_unit_id and cu.customer_id = p_customer_id
      and cu.active and cu.ownership_role = 'owner' and c.active
  ) then
    raise exception 'Confira a venda e o cliente atualmente vinculado.' using errcode='22023';
  end if;

  delete from commercial_sync.owner_reviews where unit_id = p_unit_id and revision = p_revision;
  if not found then
    raise exception 'A situação comercial mudou. Atualize a página e confira novamente.' using errcode='22023';
  end if;
  insert into public.unit_activity_events(unit_id, actor_user_id, actor_role, action, details)
  values (p_unit_id, auth.uid(), v_role, 'commercial_owner_confirmed', jsonb_build_object('customer_id', p_customer_id));
end;
$$;
