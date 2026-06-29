'use client';

import { useEffect } from 'react';

/** Intervalle entre deux heartbeats (ms). */
const HEARTBEAT_MS = 120_000; // 120 s

/**
 * PresenceHeartbeat — sonde de présence silencieuse (aucun rendu visuel).
 *
 * Monté dans le layout authentifié (app)/layout.tsx. Poste sur /api/presence
 * au montage, puis toutes les 120 s UNIQUEMENT si l'onglet est visible
 * (document.visibilityState === 'visible') — évite de gonfler la durée de
 * session sur un onglet laissé ouvert en arrière-plan. La route serveur
 * « sessionise » par trou de 30 min (voir /api/presence).
 */
export default function PresenceHeartbeat() {
  useEffect(() => {
    let cancelled = false;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      // Fire-and-forget : on n'attend pas la réponse, on avale les erreurs
      // réseau (un heartbeat raté n'a aucune conséquence côté UX).
      fetch('/api/presence', { method: 'POST' }).catch(() => {});
    };

    // Ping immédiat au montage (couvre l'arrivée sur l'app).
    if (!cancelled) ping();

    const id = setInterval(ping, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
