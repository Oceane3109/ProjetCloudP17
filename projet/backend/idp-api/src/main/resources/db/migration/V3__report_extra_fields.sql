alter table reports
  add column if not exists company_name varchar(200) null;

alter table reports
  add column if not exists photo_urls text null;

alter table reports
  add column if not exists status_new_at timestamptz null;

alter table reports
  add column if not exists status_in_progress_at timestamptz null;

alter table reports
  add column if not exists status_done_at timestamptz null;

-- Backfill: au minimum on met NEW à la date de création (si absent)
update reports
set status_new_at = coalesce(status_new_at, created_at)
where status_new_at is null;

