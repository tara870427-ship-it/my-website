-- ============================================================
-- 交屋一條龍網站:客戶需求、戶別進度、後台管理員
-- 權限原則:一般訪客只能「送出需求」和「用正確資料查自己那一戶」;
--          只有 admins 名單裡的 Email 登入後才能看/改全部資料。
-- ============================================================

-- 統一樓層寫法:「5樓」「5F」「 5 」都變成「5」
create function public.norm_floor(f text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(f, ''), '[\s樓Ff]', '', 'g')
$$;

-- ---------- 管理員名單 ----------
create table public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- 不開任何權限:名單只能在 Supabase 後台或 SQL 修改
revoke all on public.admins from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(auth.jwt() ->> 'email')
  )
$$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- 客戶需求 ----------
create table public.requests (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 50),
  phone text not null check (phone ~ '^09[0-9]{8}$'),
  building text check (char_length(building) <= 10),
  floor text check (char_length(floor) <= 10),
  services text[] not null default '{}' check (cardinality(services) <= 20),
  contact_time text check (char_length(contact_time) <= 20),
  memo text check (char_length(memo) <= 1000),
  created_at timestamptz not null default now(),
  status text not null default '未聯絡' check (status in ('未聯絡', '已聯絡', '已完成'))
);
alter table public.requests enable row level security;

revoke all on public.requests from anon, authenticated;
-- 訪客:只能新增,而且只能填這幾欄(送出時間、處理狀態由系統決定)
grant insert (name, phone, building, floor, services, contact_time, memo)
  on public.requests to anon, authenticated;
-- 管理員:可以看全部、改處理狀態、刪除垃圾資料
grant select, delete on public.requests to authenticated;
grant update (status) on public.requests to authenticated;

create policy "任何人都能送出需求" on public.requests
  for insert to anon, authenticated with check (true);
create policy "管理員可查看需求" on public.requests
  for select to authenticated using (public.is_admin());
create policy "管理員可更新狀態" on public.requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "管理員可刪除需求" on public.requests
  for delete to authenticated using (public.is_admin());

-- ---------- 每戶交屋進度 ----------
create table public.units (
  id bigint generated always as identity primary key,
  building text not null check (char_length(building) between 1 and 10),
  floor text not null check (char_length(floor) between 1 and 10),
  owner_name text not null check (char_length(owner_name) between 1 and 50),
  phone text not null check (phone ~ '^09[0-9]{8}$'),
  -- 1 簽約完成 2 建築施工 3 結構完成 4 取得使用執照 5 驗屋 6 交屋 7 入住
  stage smallint not null default 1 check (stage between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index units_building_floor on public.units (building, public.norm_floor(floor));
alter table public.units enable row level security;

create function public.units_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.floor := public.norm_floor(new.floor);
  new.updated_at := now();
  return new;
end $$;
create trigger units_before_write before insert or update on public.units
  for each row execute function public.units_before_write();

revoke all on public.units from anon, authenticated;
grant select, insert, update, delete on public.units to authenticated;
create policy "管理員可管理戶別" on public.units
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 訪客查詢自己那一戶 ----------
-- 棟別 + 樓層 + 手機末 3 碼全部吻合,才回傳「目前階段」;不回傳姓名或電話
create function public.lookup_unit(p_building text, p_floor text, p_last3 text)
returns table (stage smallint, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select u.stage, u.updated_at
  from public.units u
  where p_last3 ~ '^[0-9]{3}$'
    and u.building = p_building
    and u.floor = public.norm_floor(p_floor)
    and right(u.phone, 3) = p_last3
  limit 1
$$;
revoke execute on function public.lookup_unit(text, text, text) from public;
grant execute on function public.lookup_unit(text, text, text) to anon, authenticated;
