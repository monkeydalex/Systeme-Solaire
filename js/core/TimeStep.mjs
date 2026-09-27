// Les vitesses de la scène sont réglées « par image à 60 Hz ». Convertit le
// temps réel écoulé (s) en nombre d'images de référence, pour que la simulation
// avance à la même vitesse quel que soit le taux de rafraîchissement de l'écran.
// Plafonné à 0,1 s pour éviter un bond après un onglet caché ou un gros ralentissement.
export function frameScale(deltaSeconds) {
    return Math.min(deltaSeconds, 0.1) * 60;
}
