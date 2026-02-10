alter table reports
  add column if not exists level int null;

update reports
set level = coalesce(level, 1)
where level is null;
