// Texte d'infobulle au survol : "Nom — fait clé".
export function formatTooltip(data) {
    if (!data || !data.nom) return '';
    const fact = data.facts && data.facts.type;
    return fact ? `${data.nom} — ${fact}` : data.nom;
}
