-- Creates the missing `cart` table for the marketplace.
-- Run this in Supabase SQL Editor (Database → SQL).

create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null default 1 check (quantity >= 1 and quantity <= 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

-- Helpful indexes
create index if not exists cart_user_id_idx on public.cart(user_id);
create index if not exists cart_variant_id_idx on public.cart(variant_id);
create index if not exists cart_product_id_idx on public.cart(product_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cart_set_updated_at on public.cart;
create trigger trg_cart_set_updated_at
before update on public.cart
for each row
execute function public.set_updated_at();

-- RLS (required for client/server Supabase with user sessions)
alter table public.cart enable row level security;

-- Users can only see their own cart
drop policy if exists "cart_select_own" on public.cart;
create policy "cart_select_own"
on public.cart
for select
to authenticated
using (auth.uid() = user_id);

-- Users can insert only into their own cart
drop policy if exists "cart_insert_own" on public.cart;
create policy "cart_insert_own"
on public.cart
for insert
to authenticated
with check (auth.uid() = user_id);

-- Users can update only their own cart
drop policy if exists "cart_update_own" on public.cart;
create policy "cart_update_own"
on public.cart
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Users can delete only their own cart
drop policy if exists "cart_delete_own" on public.cart;
create policy "cart_delete_own"
on public.cart
for delete
to authenticated
using (auth.uid() = user_id);

