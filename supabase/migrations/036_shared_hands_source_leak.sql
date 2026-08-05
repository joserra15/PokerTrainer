-- Permitir source 'leak' en manos compartidas (P1 share leak semanal).
alter table public.pt_shared_hands
  drop constraint if exists pt_shared_hands_source_check;

alter table public.pt_shared_hands
  add constraint pt_shared_hands_source_check
  check (source in ('trainer', 'analysis', 'session', 'leak'));
