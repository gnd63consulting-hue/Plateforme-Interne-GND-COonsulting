/**
 * Seuil de validation d'un module : un quiz est validé si percentage >= 70.
 * Utilisé à la fois côté serveur (route /api/quiz/submit) et côté client
 * (composant Quiz, affichage du seuil dans l'UI).
 *
 * Source de vérité unique. Ne jamais hardcoder 70 ailleurs.
 */
export const QUIZ_PASS_THRESHOLD = 70;
