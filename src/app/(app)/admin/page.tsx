// L'admin GND est désormais la V2 redessinée (DA cockpit warm, cards par
// commercial avec speedometer + rocket palier, pipeline filtrable, panneau
// sync Notion intégré).
//
// Le code source de l'écran V2 vit dans ./v2/page.tsx + ./v2/AdminV2Client.tsx.
// Cette page est un simple re-export afin que l'URL canonique /admin pointe
// directement vers le dashboard V2 sans aucun risque de friction de
// navigation (autocomplete browser, etc.).
//
// L'ancienne admin (Vue globale, Funnel, Distribution, Suivi formation, etc.)
// est toujours consultable via l'historique git — voir le commit avant cette
// PR. Pour la remettre en service il suffit d'un revert sur ce fichier.

import AdminV2Page from './v2/page';

export const dynamic = 'force-dynamic';

export default AdminV2Page;
