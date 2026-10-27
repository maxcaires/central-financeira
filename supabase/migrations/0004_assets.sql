-- Central Financeira — 0004: assets (imóveis, carros e outros bens), só para acompanhamento.
-- Independente de contas a pagar/receber e fora do resumo diário. Não altera nenhuma tabela existente.

create table public.assets (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(trim(name)) > 0 and length(name) <= 120),
  kind             text not null check (kind in ('real_estate', 'vehicle', 'other')),
  country          text not null check (country in ('BR', 'US')),
  currency         text not null check (currency in ('BRL', 'USD')),
  estimated_value  numeric(14, 2) check (estimated_value is null or estimated_value >= 0),
  notes            text check (notes is null or length(notes) <= 2000),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index assets_owner_idx on public.assets (owner_id);

create trigger assets_set_updated_at before update on public.assets
  for each row execute function public.set_updated_at();

alter table public.assets enable row level security;

create policy assets_owner on public.assets
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.assets from anon;
