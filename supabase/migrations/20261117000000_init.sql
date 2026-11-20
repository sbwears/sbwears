-- SB Wears schema (migrated from the MongoDB/Mongoose models).
--
-- All tables have RLS enabled and NO policies: the browser never talks to the
-- database directly. Every read/write goes through the Next.js API routes, which use
-- the service-role key on the server.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- storefront content

create table public.banners (
  id          uuid primary key default gen_random_uuid(),
  image       text not null,
  image_link  text not null,
  coupon_code text not null,
  created_at  timestamptz not null default now()
);

create table public.contact_info (
  id         uuid primary key default gen_random_uuid(),
  address    text not null,
  mobile     text not null,
  email      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text not null,
  message    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admins (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  phone        text,
  address      text,
  social_media jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- occasions

create table public.occasion_titles (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  subtitle   text not null,
  created_at timestamptz not null default now()
);

create table public.occasion_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  image       text,
  occasion_id uuid references public.occasion_titles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.occasion_categories (occasion_id);

create table public.occasion_products (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  mrp                  numeric(12,2) not null,
  discount             numeric(5,2) not null default 0,
  offer_price          numeric(12,2),
  category             text not null,
  size_chart           text,
  images               text[] not null default '{}',
  tag                  text,
  colors               text[] not null default '{}',
  fabric               text,
  sizes                text[] not null default '{}',
  description          text,
  additional_info      text,
  status               boolean not null default false,
  stocks               integer not null default 0,
  min_stocks           integer not null default 0,
  occasion_category_id uuid references public.occasion_categories(id) on delete set null,
  stock_history        jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now()
);
create index on public.occasion_products (occasion_category_id);

-- ---------------------------------------------------------------- catalogue

create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  image       text not null,
  created_at  timestamptz not null default now()
);

create table public.product_subcategories (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  image              text,
  parent_category_id uuid references public.product_categories(id) on delete set null,
  created_at         timestamptz not null default now()
);
create index on public.product_subcategories (parent_category_id);

create table public.category_products (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  mrp                 numeric(12,2) not null,
  discount            numeric(5,2) not null default 0,
  offer_price         numeric(12,2) not null,
  category            text not null,
  size_chart          text,
  images              text[] not null default '{}',
  tag                 text,
  colors              text[] not null default '{}',
  fabric              text,
  available_sizes     text[] not null default '{}',
  description         text,
  additional_info     text,
  min_stocks          integer not null default 0,
  status              boolean not null default false,
  product_category_id uuid references public.product_categories(id) on delete set null,
  subcategory_id      uuid references public.product_subcategories(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.category_products (product_category_id);
create index on public.category_products (subcategory_id);
create trigger category_products_updated_at before update on public.category_products
  for each row execute function public.set_updated_at();

create table public.product_size_stock (
  product_id   uuid not null references public.category_products(id) on delete cascade,
  size         text not null,
  quantity     integer not null default 0 check (quantity >= 0),
  min_quantity integer not null default 0,
  primary key (product_id, size)
);

create table public.product_stock_history (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.category_products(id) on delete cascade,
  size           text not null,
  stock_name     text not null,
  added_stock    integer not null,
  previous_stock integer not null,
  added_at       timestamptz not null default now()
);
create index on public.product_stock_history (product_id, added_at desc);

-- Lookup lists managed in the admin "Product Management" screens.
create table public.product_sizes   (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.product_colors  (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.product_fabrics (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());
create table public.product_tags    (id uuid primary key default gen_random_uuid(), name text not null unique, created_at timestamptz not null default now());

-- ---------------------------------------------------------------- customers

create table public.users (
  id               uuid primary key default gen_random_uuid(),
  phone_number     text not null unique check (phone_number ~ '^\+?[1-9][0-9]{1,14}$'),
  otp_hash         text,
  otp_expires_at   timestamptz,
  otp_attempts     integer not null default 0,
  first_name       text,
  last_name        text,
  email            text,
  dob              date,
  gender           text check (gender in ('Male', 'Female', 'Other')),
  address          text,
  shipping_details jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.category_products(id) on delete cascade,
  size       text not null,
  quantity   integer not null default 1 check (quantity > 0),
  added_at   timestamptz not null default now(),
  unique (user_id, product_id, size)
);

-- ---------------------------------------------------------------- orders & payments

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete set null,
  items            jsonb not null,           -- snapshot: [{productId,size,quantity,price,name,image}]
  shipping_address jsonb,
  payment_method   text not null default 'UPI'
                   check (payment_method in ('UPI', 'Card', 'NetBanking', 'COD', 'Online')),
  coupon_code      text,
  subtotal         numeric(12,2) not null,
  tax              numeric(12,2) not null default 0,
  shipping_charge  numeric(12,2) not null default 0,
  discount         numeric(12,2) not null default 0,
  total            numeric(12,2) not null,
  status           text not null default 'pending'
                   check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_status   text not null default 'pending'
                   check (payment_status in ('pending', 'completed', 'failed', 'refunded')),
  tracking_number  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index on public.orders (user_id, created_at desc);
create index on public.orders (created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.payment_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.users(id) on delete set null,
  username           text,
  mobile             text,
  order_ref          text,                   -- client-side reference, e.g. ORDER_<timestamp>
  amount             numeric(12,2) not null default 0,
  transaction_id     text,                   -- PhonePe order id
  transaction_status text not null default 'CR',
  success_url        text,
  failed_url         text,
  pending_order      jsonb,                  -- order to create once payment completes
  order_id           uuid references public.orders(id) on delete set null,
  order_error        text,                   -- set if paid but the order could not be created
  status             text not null default 'InProgress',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger payment_transactions_updated_at before update on public.payment_transactions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- functions

-- Validates every line, reserves stock and inserts the order in ONE transaction, so a
-- failure on line 3 never leaves lines 1-2 decremented. Pricing rules are carried over
-- unchanged from the old orderController.
create or replace function public.place_order(
  p_user_id        uuid,
  p_items          jsonb,
  p_address        jsonb,
  p_payment_method text,
  p_coupon_code    text
) returns public.orders
language plpgsql
set search_path = public
as $$
declare
  v_item     jsonb;
  v_product  public.category_products%rowtype;
  v_qty      integer;
  v_size     text;
  v_stock    integer;
  v_subtotal numeric := 0;
  v_lines    jsonb := '[]'::jsonb;
  v_tax      numeric;
  v_ship     numeric;
  v_discount numeric;
  v_order    public.orders;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Missing required fields: userId, items, or address' using errcode = 'SB400';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty  := nullif(v_item->>'quantity', '')::integer;
    v_size := v_item->>'size';
    if v_qty is null or v_qty < 1 or v_size is null then
      raise exception 'Each item needs a size and a quantity of at least 1' using errcode = 'SB400';
    end if;

    select * into v_product from public.category_products where id = (v_item->>'productId')::uuid;
    if not found then
      raise exception 'Product % not found', v_item->>'productId' using errcode = 'SB404';
    end if;

    update public.product_size_stock
       set quantity = quantity - v_qty
     where product_id = v_product.id and size = v_size and quantity >= v_qty;

    if not found then
      select quantity into v_stock from public.product_size_stock
       where product_id = v_product.id and size = v_size;
      if not found then
        raise exception 'Size % not available for product %', v_size, v_product.name using errcode = 'SB400';
      end if;
      raise exception 'Not enough stock for % (%). Available: %', v_product.name, v_size, v_stock
        using errcode = 'SB400';
    end if;

    v_subtotal := v_subtotal + v_product.offer_price * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'productId', v_product.id,
      'size',      v_size,
      'quantity',  v_qty,
      'price',     v_product.offer_price,
      'name',      v_product.name,
      'image',     coalesce(v_product.images[1], '')
    );
  end loop;

  v_tax      := round(v_subtotal * 0.18, 2);
  v_ship     := case when v_subtotal > 1000 then 0 else 50 end;
  v_discount := case when p_coupon_code = 'SALE15' then round(v_subtotal * 0.15, 2) else 0 end;

  insert into public.orders (user_id, items, shipping_address, payment_method, coupon_code,
                             subtotal, tax, shipping_charge, discount, total)
  values (p_user_id, v_lines, p_address, coalesce(nullif(p_payment_method, ''), 'UPI'),
          nullif(p_coupon_code, ''), v_subtotal, v_tax, v_ship, v_discount,
          v_subtotal + v_tax + v_ship - v_discount)
  returning * into v_order;

  return v_order;
end $$;

-- Turns a COMPLETED payment into an order exactly once, even if the status check and
-- the PhonePe callback arrive at the same moment (the row lock serialises them).
create or replace function public.finalize_payment(p_txn_id uuid)
returns public.payment_transactions
language plpgsql
set search_path = public
as $$
declare
  v_txn   public.payment_transactions;
  v_order public.orders;
  v_req   jsonb;
begin
  select * into v_txn from public.payment_transactions where id = p_txn_id for update;
  if not found then
    raise exception 'Payment Id not found!' using errcode = 'SB404';
  end if;

  if v_txn.order_id is not null or v_txn.pending_order is null then
    return v_txn;
  end if;

  v_req := v_txn.pending_order;
  begin
    v_order := public.place_order(
      (v_req->>'userId')::uuid,
      v_req->'items',
      v_req->'address',
      v_req->>'paymentMethod',
      v_req->>'couponCode'
    );
    update public.orders set payment_status = 'completed' where id = v_order.id;

    -- Purchased lines leave the cart.
    delete from public.cart_items c
     using jsonb_array_elements(v_req->'items') i
     where c.user_id = (v_req->>'userId')::uuid
       and c.product_id = (i->>'productId')::uuid
       and c.size = i->>'size';

    update public.payment_transactions
       set order_id = v_order.id, pending_order = null, order_error = null
     where id = p_txn_id
    returning * into v_txn;
  exception when others then
    -- Money was taken but the order could not be placed (e.g. stock ran out meanwhile).
    -- Keep the request so an admin can see it and refund or fulfil manually.
    update public.payment_transactions set order_error = sqlerrm where id = p_txn_id
    returning * into v_txn;
  end;

  return v_txn;
end $$;

create or replace function public.add_product_stock(
  p_product_id uuid, p_size text, p_added integer, p_stock_name text
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_min  integer;
  v_prev integer;
  v_new  integer;
begin
  select min_stocks into v_min from public.category_products where id = p_product_id for update;
  if not found then
    raise exception 'Product not found' using errcode = 'SB404';
  end if;

  select quantity into v_prev from public.product_size_stock
   where product_id = p_product_id and size = p_size for update;
  v_prev := coalesce(v_prev, 0);
  v_new  := v_prev + p_added;
  if v_new < 0 then
    raise exception 'Stock cannot go below zero (current: %)', v_prev using errcode = 'SB400';
  end if;

  insert into public.product_size_stock (product_id, size, quantity, min_quantity)
  values (p_product_id, p_size, v_new, coalesce(v_min, 0))
  on conflict (product_id, size) do update set quantity = excluded.quantity;

  insert into public.product_stock_history (product_id, size, stock_name, added_stock, previous_stock)
  values (p_product_id, p_size, p_stock_name, p_added, v_prev);

  return v_new;
end $$;

create or replace function public.add_to_cart(
  p_user_id uuid, p_product_id uuid, p_size text, p_quantity integer
) returns void
language sql
set search_path = public
as $$
  insert into public.cart_items (user_id, product_id, size, quantity)
  values (p_user_id, p_product_id, p_size, p_quantity)
  on conflict (user_id, product_id, size)
  do update set quantity = public.cart_items.quantity + excluded.quantity;
$$;

-- Returns false when the line is not in the cart.
create or replace function public.remove_from_cart(
  p_user_id uuid, p_product_id uuid, p_size text, p_remove_all boolean
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_qty integer;
begin
  select quantity into v_qty from public.cart_items
   where user_id = p_user_id and product_id = p_product_id and size = p_size for update;
  if not found then
    return false;
  end if;

  if p_remove_all or v_qty <= 1 then
    delete from public.cart_items where user_id = p_user_id and product_id = p_product_id and size = p_size;
  else
    update public.cart_items set quantity = quantity - 1
     where user_id = p_user_id and product_id = p_product_id and size = p_size;
  end if;
  return true;
end $$;

-- Only the server (service role) may call these.
revoke execute on function public.place_order(uuid, jsonb, jsonb, text, text)      from public, anon, authenticated;
revoke execute on function public.finalize_payment(uuid)                            from public, anon, authenticated;
revoke execute on function public.add_product_stock(uuid, text, integer, text)     from public, anon, authenticated;
revoke execute on function public.add_to_cart(uuid, uuid, text, integer)           from public, anon, authenticated;
revoke execute on function public.remove_from_cart(uuid, uuid, text, boolean)      from public, anon, authenticated;
grant  execute on function public.place_order(uuid, jsonb, jsonb, text, text)      to service_role;
grant  execute on function public.finalize_payment(uuid)                            to service_role;
grant  execute on function public.add_product_stock(uuid, text, integer, text)     to service_role;
grant  execute on function public.add_to_cart(uuid, uuid, text, integer)           to service_role;
grant  execute on function public.remove_from_cart(uuid, uuid, text, boolean)      to service_role;

-- ---------------------------------------------------------------- row level security

do $$
declare t text;
begin
  foreach t in array array[
    'banners', 'contact_info', 'contact_messages', 'admins',
    'occasion_titles', 'occasion_categories', 'occasion_products',
    'product_categories', 'product_subcategories', 'category_products',
    'product_size_stock', 'product_stock_history',
    'product_sizes', 'product_colors', 'product_fabrics', 'product_tags',
    'users', 'cart_items', 'orders', 'payment_transactions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- storage

-- Product, banner and category images. Public read; uploads only via the server.
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;
