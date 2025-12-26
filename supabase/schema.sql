create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  role text not null default 'STAFF',
  permissions jsonb not null default '[]'::jsonb
);

create extension if not exists pgcrypto;

create table if not exists staff_pins (
  id uuid primary key default gen_random_uuid(),
  name text,
  role text not null default 'STAFF',
  permissions jsonb not null default '[]'::jsonb,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists tables (
  id text primary key,
  name text not null,
  status text not null default 'AVAILABLE',
  capacity integer not null default 1,
  current_order_id uuid,
  qr_token text
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null,
  table_id text references tables(id),
  type text not null,
  status text not null,
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  created_at timestamptz not null default now(),
  payment_method text
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null default 1,
  price numeric not null default 0,
  status text not null default 'PENDING',
  notes text,
  selected_options jsonb not null default '[]'::jsonb
);

alter table profiles enable row level security;
alter table staff_pins enable row level security;
alter table tables enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Profiles read own" on profiles
  for select using (auth.uid() = id);

create policy "Profiles update own" on profiles
  for update using (auth.uid() = id);

create or replace function match_staff_pin(pin_input text)
returns table (
  id uuid,
  name text,
  role text,
  permissions jsonb
)
language sql
security definer
set search_path = public
as $$
  select staff_pins.id, staff_pins.name, staff_pins.role, staff_pins.permissions
  from staff_pins
  where staff_pins.active = true
    and staff_pins.pin_hash = crypt(pin_input, staff_pins.pin_hash)
  limit 1;
$$;

grant execute on function match_staff_pin(text) to anon, authenticated;

create policy "Tables read all" on tables
  for select using (true);

create policy "Orders read all" on orders
  for select using (true);

create policy "Orders insert anon" on orders
  for insert with check (true);

create policy "Orders update auth" on orders
  for update using (auth.role() = 'authenticated');

create policy "Order items read all" on order_items
  for select using (true);

create policy "Order items insert anon" on order_items
  for insert with check (true);

create policy "Order items update auth" on order_items
  for update using (auth.role() = 'authenticated');
