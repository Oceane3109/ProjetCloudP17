alter table reports
  add column if not exists type varchar(32) not null default 'OTHER';

-- Backfill sécurité (au cas où la colonne a été ajoutée sans default dans un autre environnement)
update reports set type = 'OTHER' where type is null or type = '';

