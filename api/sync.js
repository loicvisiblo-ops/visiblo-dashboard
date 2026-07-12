import { Redis } from '@upstash/redis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const clients = require('../data/clients.json');

const redis = Redis.fromEnv();
const BITLY_TOKEN = process.env.BITLY_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function getBitlyClics(linkId) {
  try {
    const res = await fetch(
      `https://api-ssl.bitly.com/v4/bitlinks/bit.ly/${linkId}/clicks/summary?unit=day&units=30`,
      { headers: { Authorization: `Bearer ${BITLY_TOKEN}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { total_30j: data.total_clicks ?? 0 };
  } catch { return null; }
}

async function getGoogleNote(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const r = data.result ?? {};
    return { note: r.rating ?? null, nb_avis: r.user_ratings_total ?? 0 };
  } catch { return null; }
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
 const isVercelCron = req.headers['x-vercel-cron'] === '1';
const isManuell = req.query.secret === process.env.CRON_SECRET;
if (!isVercelCron && !isManuell) {
  return res.status(401).json({ error: 'Non autorisé' });
}

  const timestamp = new Date().toISOString();
  const resultats = [];

  for (const client of clients) {
    const clicsParLien = {};
    for (const lien of client.liens_bitly) {
      const data = await getBitlyClics(lien.id);
      clicsParLien[lien.id] = { nom: lien.nom, type: lien.type, clics_30j: data?.total_30j ?? 0 };
    }

    const google = await getGoogleNote(client.google_place_id);
    const totalClics = Object.values(clicsParLien).reduce((s, l) => s + l.clics_30j, 0);
    const snapshot = { client_id: client.id, timestamp, google: { note: google?.note ?? null, nb_avis: google?.nb_avis ?? 0 }, bitly: { total_clics_30j: totalClics, par_lien: clicsParLien } };

    await redis.set(`snapshot:${client.id}`, JSON.stringify(snapshot));

    const historiqueRaw = await redis.get(`historique:${client.id}`);
    const historique = historiqueRaw ? JSON.parse(historiqueRaw) : [];
    historique.push({ t: timestamp, note: google?.note, nb_avis: google?.nb_avis });
    if (historique.length > 720) historique.splice(0, historique.length - 720);
    await redis.set(`historique:${client.id}`, JSON.stringify(historique));

    const precedentRaw = await redis.get(`precedent:${client.id}`);
    const precedent = precedentRaw ? JSON.parse(precedentRaw) : null;
    if (precedent && google?.nb_avis > (precedent.nb_avis ?? 0)) {
      const diff = google.nb_avis - precedent.nb_avis;
      const alertesRaw = await redis.get(`alertes:${client.id}`);
      const alertes = alertesRaw ? JSON.parse(alertesRaw) : [];
      alertes.unshift({ t: timestamp, message: `${diff} nouvel${diff > 1 ? 's' : ''} avis détecté${diff > 1 ? 's' : ''}`, nb_avis_avant: precedent.nb_avis, nb_avis_apres: google.nb_avis });
      if (alertes.length > 50) alertes.splice(50);
      await redis.set(`alertes:${client.id}`, JSON.stringify(alertes));
    }

    await redis.set(`precedent:${client.id}`, JSON.stringify({ nb_avis: google?.nb_avis, note: google?.note }));
    resultats.push({ client: client.id, ok: true });
  }

  return res.status(200).json({ sync: 'ok', timestamp, resultats });
}
