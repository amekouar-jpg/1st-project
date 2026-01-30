# Persistance des données sur Vercel

## Problème actuel

Sur Vercel, l'application utilise une **base de données en mémoire** (`globalMemoryData`). 

**Limitation:** Les données sont perdues entre les instances serverless différentes:
- Chaque requête peut être traitée par une instance différente
- Les instances "dorment" après inactivité et perdent leurs données
- Résultat: les étudiants ajoutés disparaissent au rafraîchissement

## Solutions possibles

### Option 1: Upstash Redis (Recommandé - Gratuit)
1. Va sur [Vercel Marketplace](https://vercel.com/marketplace?category=storage&search=redis)
2. Installe "Upstash Redis"
3. Configure les variables d'environnement automatiquement
4. Les données persisteront entre toutes les requêtes

### Option 2: MongoDB Atlas (Gratuit jusqu'à 512MB)
1. Crée un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crée un cluster gratuit
3. Ajoute `MONGODB_URI` dans les variables d'environnement Vercel
4. Décommente le code MongoDB dans `server.js`

### Option 3: Vercel Postgres
1. Active Vercel Postgres dans ton projet
2. Configure les variables d'environnement
3. Adapte le code pour utiliser Postgres

### Option 4: Utilisation locale uniquement
Si tu veux seulement utiliser en local avec SQLite:
- Garde le code actuel
- N'utilise pas Vercel pour la production
- Héberge sur un serveur VPS (DigitalOcean, Railway, etc.)

## État actuel
- ✅ Fonctionne en local avec SQLite
- ⚠️ Sur Vercel: données temporaires (durée de vie de l'instance ~5-15 min)
- 📊 Endpoint de debug: `/api/debug/memory` pour voir l'état

## Pour activer la persistance maintenant
Le plus simple et rapide: **Upstash Redis via Vercel Marketplace** (gratuit, 3 clics)
