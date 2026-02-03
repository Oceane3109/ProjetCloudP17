## PROJET CLOUD S5 – Fournisseur d’identité (IdP)

Ce dépôt contient l’architecture demandée:

- **API IdP**: Spring Boot (REST, JWT, rôles, sessions, blocage/déblocage)
- **Base locale**: PostgreSQL (Docker)
- **Serveur cartes offline**: OpenStreetMap tile server (Docker)

### Démarrage rapide (Docker)

1) Placer un extrait PBF d’Antananarivo ici: `maps/antananarivo.osm.pbf`

- Tu peux récupérer un extrait depuis Geofabrik / BBBike (selon disponibilité).  
- Important: l’import peut prendre du temps (premier démarrage).

2) Lancer:

```bash
docker compose up --build
```

> Le service de tuiles offline est sous profil **maps** (optionnel).
> - Sans cartes offline: `docker compose up --build`
> - Avec cartes offline: `docker compose --profile maps up --build`

### Accès

- **API**: `http://localhost:8084`
- **Swagger UI**: `http://localhost:8084/swagger-ui/index.html`
- **Tiles OSM offline**: `http://localhost:8081`

## Client Web (VueJS)

Dossier: `web/`

```bash
cd web
npm install
npm run dev
```

- App: `http://localhost:5173`
- API utilisée: `http://localhost:8084` (modifiable via `VITE_IDP_API_BASE_URL`)

### PostgreSQL (local docker)

- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `2024`
- **Database**: `idp_db`

### Comptes / rôles

- Rôles supportés: `VISITEUR`, `UTILISATEUR`, `MANAGER`
- Par défaut, un utilisateur inscrit via l’API obtient le rôle `UTILISATEUR`

## Client Mobile (Ionic + React)

Dossier: `mobile/`

1) Copier `mobile/.env.example` vers `mobile/.env` et remplir la config Firebase Web.

2) Lancer:

```bash
cd mobile
npm install
npm run dev
```

App: `http://localhost:8100`

## Synchronisation Firebase (optionnelle)

Par défaut la sync est **désactivée** pour ne pas bloquer l’exécution si la clé Firebase n’est pas fournie.

### Configuration

Dans `backend/idp-api/src/main/resources/application.yml`:

- `app.firebase.enabled`: `true|false`
- `app.firebase.serviceAccountPath`: chemin vers le JSON (ex: `file:C:/keys/firebase.json`)
- `app.firebase.projectId` (optionnel)

### Endpoints (Manager)

- **Backend → Firebase**: `POST /api/admin/sync/firebase/reports/push`
- **Firebase → Backend**: `POST /api/admin/sync/firebase/reports/pull`

Ces endpoints nécessitent un JWT avec rôle `MANAGER`.

