-- Remplir les dates de statut manquantes pour les rapports existants,
-- afin que les statistiques "délai moyen NEW → DONE" s'affichent en Manager.

-- Rapports déjà IN_PROGRESS : mettre status_in_progress_at si absent
update reports
set status_in_progress_at = coalesce(status_in_progress_at, status_new_at, created_at)
where status = 'IN_PROGRESS' and status_in_progress_at is null;

-- Rapports déjà DONE : mettre status_done_at et status_in_progress_at si absents
update reports
set status_in_progress_at = coalesce(status_in_progress_at, status_new_at, created_at),
    status_done_at = coalesce(status_done_at, status_new_at, created_at)
where status = 'DONE' and (status_done_at is null or status_in_progress_at is null);
