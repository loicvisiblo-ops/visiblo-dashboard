import { Redis } from '@upstash/redis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const clients = require('../data/clients.json');

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { client_id } = req.query;

  if (!client_id) {
    const liste = await Promise.all(
      clients.map(async (c) => {
        const snap = await redis.get(`snapshot:${c.id}`);
        return {
          id: c.id,
          nom: c.nom,
          type: c.type,
          plan: c.plan,
          note: snap?.google?.note ?? null,
          nb_avis: snap?.google?.nb_avis ?? 0,
          note_depart: c.note_depart
        };
      })
    );
    return res.status(200).json(liste);
  }

  const client = clients.find((c) => c.id === client_id);
  if (!client) return res.status(404).json({ error: 'Client introuvable' });

  const [snapshot, historique, alertes] = await Promise.all([
    redis.get(`snapshot:${client_id}`),
    redis.get(`historique:${client_id}`),
    redis.get(`alertes:${client_id}`)
  ]);

  const hist = Array.isArray(historique) ? historique : [];
  const alert = Array.isArray(alertes) ? alertes : [];

  const totalClics = snapshot?.bitly?.total_clics_30j ?? 0;
  const nbAvis = snapshot?.google?.nb_avis ?? 0;
  const tauxConv = totalClics > 0 ? Math.round((nbAvis / totalClics) * 100) : 0;

  return res.status(200).json({
    meta: {
      id: client.id,
      nom: client.nom,
      type: client.type,
      adresse: client.adresse,
      plan: client.plan,
      note_depart: client.note_depart,
      date_debut: client.date_debut
    },
    google: snapshot?.google ?? { note: null, nb_avis: 0 },
    bitly: snapshot?.bitly ?? { total_clics_30j: 0, par_lien: {} },
    taux_conversion: tauxConv,
    historique: hist.slice(-168),
    alertes: alert.slice(0, 10),
    derniere_sync: snapshot?.timestamp ?? null
  });
}
