export const SCALE_MODE_INFO = {
    pedagogique: {
        label: 'Pédagogique',
        description: 'Distances actuelles, pensées pour explorer confortablement chaque planète.',
        distanceScale: 1,
        distanceOffset: 0,
        moonDistanceScale: 1,
        speedScale: 1
    },
    compact: {
        label: 'Vue compacte',
        description: 'Resserre les orbites pour comparer rapidement tout le système.',
        distanceScale: 0.56,
        distanceOffset: 2.4,
        moonDistanceScale: 0.8,
        speedScale: 1.15
    },
    distances: {
        label: 'Distances accentuées',
        description: 'Écarte les planètes externes pour mieux sentir le vide entre les orbites.',
        distanceScale: 1.3467,
        distanceOffset: 0.533,
        moonDistanceScale: 1.15,
        speedScale: 0.7
    }
};

function getMode(modeKey) {
    return SCALE_MODE_INFO[modeKey] || SCALE_MODE_INFO.pedagogique;
}

function scaleDistance(distance, mode) {
    if (distance === 0) return 0;
    return Math.round(distance * mode.distanceScale + mode.distanceOffset);
}

function scaleMoonDistance(distance, mode) {
    return Number((distance * mode.moonDistanceScale).toFixed(2));
}

function scaleOrbitSpeed(speed, mode) {
    return Number((speed * mode.speedScale).toFixed(4));
}

export function applyScaleMode(sourceData, modeKey) {
    const mode = getMode(modeKey);
    const scaled = {};

    for (const [key, body] of Object.entries(sourceData)) {
        scaled[key] = {
            ...body,
            distance: scaleDistance(body.distance, mode),
            vitesseOrbite: scaleOrbitSpeed(body.vitesseOrbite, mode)
        };

        if (body.moons) {
            scaled[key].moons = body.moons.map((moon) => ({
                ...moon,
                distance: scaleMoonDistance(moon.distance, mode),
                vitesseOrbite: scaleOrbitSpeed(moon.vitesseOrbite, mode)
            }));
        }
    }

    return scaled;
}
