-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (linked to Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  role text not null default 'pending' check (role in ('buyer', 'seller', 'both', 'admin', 'pending')),
  company_name text,
  telegram_handle text,
  website text,
  bio text,
  verified boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles: users can only read/update their own
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Deals
create table public.deals (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('buy', 'sell')),
  vertical text not null check (vertical in ('crypto', 'forex', 'casino', 'gambling', 'finance')),
  geos text[] not null default '{}',
  budget_usd numeric(12,2),
  model text not null check (model in ('cpa', 'cpl', 'crg', 'revshare')),
  volume_daily integer,
  status text not null default 'pending' check (status in ('pending', 'active', 'matched', 'paused', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.deals enable row level security;

create policy "Users can view own deals" on public.deals
  for select using (auth.uid() = requester_id);
create policy "Users can insert own deals" on public.deals
  for insert with check (auth.uid() = requester_id);
create policy "Users can update own deals" on public.deals
  for update using (auth.uid() = requester_id);

-- Tracking: postback events
create table public.postback_events (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  click_id text,
  event_type text not null check (event_type in ('click', 'lead', 'conversion', 'rejection')),
  sub_id text,
  geo text,
  ip_address text,
  revenue numeric(10,2),
  payout numeric(10,2),
  raw_params jsonb,
  received_at timestamptz default now()
);

alter table public.postback_events enable row level security;

-- Only deal owner can see their postback events
create policy "Deal owner can view postbacks" on public.postback_events
  for select using (
    exists (
      select 1 from public.deals
      where deals.id = postback_events.deal_id
      and deals.requester_id = auth.uid()
    )
  );

-- Deal partners (seller linked to a deal -- internal only, admin-managed)
create table public.deal_partners (
  id uuid default uuid_generate_v4() primary key,
  deal_id uuid references public.deals(id) on delete cascade,
  partner_id uuid references public.profiles(id) on delete set null,
  role text not null check (role in ('seller', 'buyer')),
  buyer_link text,    -- link given to buyer (YOUR system endpoint)
  seller_link text,   -- link given to seller (forwards to buyer endpoint)
  agreed_rate numeric(10,2),
  model text check (model in ('cpa', 'cpl', 'crg', 'revshare')),
  status text default 'active' check (status in ('active', 'paused', 'terminated')),
  created_at timestamptz default now()
);

alter table public.deal_partners enable row level security;

-- Only admin can see deal partners (broker-only table)
create policy "Admin only" on public.deal_partners
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Inquiries (from contact form -- public insert, admin read)
create table public.inquiries (
  id uuid default uuid_generate_v4() primary key,
  name text,
  email text not null,
  company text,
  type text check (type in ('buyer', 'seller', 'network', 'other')),
  vertical text,
  message text,
  source_page text,
  utm_source text,
  status text default 'new' check (status in ('new', 'contacted', 'converted', 'closed')),
  created_at timestamptz default now()
);

alter table public.inquiries enable row level security;

create policy "Anyone can submit inquiry" on public.inquiries
  for insert with check (true);
create policy "Admin can view inquiries" on public.inquiries
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Posts (blog)
create table public.posts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  slug text unique not null,
  content_mdx text,
  category text,
  tags text[] default '{}',
  author_id uuid references public.profiles(id),
  published boolean default false,
  seo_title text,
  seo_desc text,
  cover_image text,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Published posts are public" on public.posts
  for select using (published = true);
create policy "Authors can manage own posts" on public.posts
  for all using (auth.uid() = author_id);

-- Updated_at trigger for deals
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_deals_updated_at
  before update on public.deals
  for each row execute procedure public.set_updated_at();
