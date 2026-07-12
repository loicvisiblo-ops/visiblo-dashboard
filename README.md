# Visiblo Dashboard — Guide de déploiement

## Ce que fait ce projet
- Récupère les clics par lien Bitly (badge par badge)
- Récupère la note Google + nombre d'avis en temps réel
- Détecte automatiquement les nouveaux avis et les stocke
- Se synchronise toutes les heures, sans intervention manuelle

---

## Déploiement en 4 étapes

### Étape 1 — GitHub
1. Va sur github.com → "New repository"
2. Nom : `visiblo-dashboard` → Private → Create
3. Upload tous les fichiers de ce dossier (glisser-déposer)

### Étape 2 — Vercel
1. Va sur vercel.com → "Add new project"
2. Connecte ton GitHub → sélectionne `visiblo-dashboard`
3. Clique "Deploy" (les paramètres par défaut suffisent)

### Étape 3 — Variables d'environnement (dans Vercel)
Paramètres → Environment Variables → ajoute ces 3 variables :

| Nom | Valeur |
|-----|--------|
| `BITLY_TOKEN` | Ton token Bitly |
| `GOOGLE_API_KEY` | Clé Google Places API |
| `CRON_SECRET` | Un mot de passe inventé (ex: visiblo2025) |

### Étape 4 — Vercel KV (base de données)
1. Dans Vercel → onglet "Storage" → "Create Database" → KV
2. Nomme-la `visiblo-kv`
3. Clique "Connect to Project" → les variables s'ajoutent automatiquement

---

## Ajouter un nouveau client

Ouvre `data/clients.json` et ajoute un bloc :

```json
{
  "id": "nom-court-sans-accent",
  "nom": "Nom du Commerce",
  "type": "Restaurant",
  "adresse": "Adresse complète",
  "plan": "Pro",
  "google_place_id": "PLACE_ID_GOOGLE",
  "note_depart": 3.8,
  "date_debut": "2025-06-01",
  "liens_bitly": [
    { "id": "client-prenom", "nom": "Prénom S.", "type": "badge" },
    { "id": "client-vitrine", "nom": "Plaque vitrine", "type": "plaque" }
  ]
}
```

**Comment trouver le Place ID Google :**
→ https://developers.google.com/maps/documentation/places/web-service/place-id
→ Cherche le commerce → copie l'ID (commence par ChIJ...)

---

## Comment trouver ta clé Google Places API

1. Va sur console.cloud.google.com
2. Crée un projet "Visiblo"
3. Active "Places API"
4. Identifiants → Créer des identifiants → Clé API
5. Copie la clé dans Vercel (variable GOOGLE_API_KEY)

**Coût :** Les 28 000 premières requêtes/mois sont gratuites.
Avec 10 clients × 24 syncs/jour = 7 200 req/mois → gratuit.
