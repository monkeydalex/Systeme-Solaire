export const planetData = {
    soleil: {
        nom: "Soleil",
        rayon: 5,
        distance: 0,
        vitesseRotation: 0.004,
        vitesseOrbite: 0,
        axialTilt: 7.25,
        texture: "./textures/sun.jpg",
        emissive: 0xffff00,
        lumiere: true,
        description: "Le Soleil est l'étoile au centre de notre système solaire. C'est une sphère presque parfaite de plasma chaud, chauffée par la fusion nucléaire dans son noyau.",
        facts: {
            type: "Étoile naine jaune",
            diametre: "1 392 700 km",
            distance: "Centre",
            periode: "N/A",
            temperature: "~5 500 °C",
            color: "#ffcc00"
        }
    },
    mercure: {
        nom: "Mercure",
        rayon: 0.8,
        distance: 10,
        vitesseRotation: 0.004,
        vitesseOrbite: 0.02,
        axialTilt: 0.03,
        texture: "./textures/mercury.jpg",
        description: "Mercure est la planète la plus proche du Soleil et la plus petite du système solaire. Sa surface est couverte de cratères similaires à ceux de la Lune.",
        facts: {
            type: "Planète tellurique",
            diametre: "4 879 km",
            distance: "57,9 millions km",
            periode: "88 jours",
            temperature: "-173 à 427 °C",
            color: "#a0a0a0"
        }
    },
    venus: {
        nom: "Vénus",
        rayon: 1.2,
        distance: 15,
        vitesseRotation: 0.002,
        vitesseOrbite: 0.015,
        axialTilt: 177.4,
        texture: "./textures/venus.jpg",
        description: "Vénus est la deuxième planète du système solaire. Elle est souvent appelée la jumelle de la Terre en raison de sa taille similaire, mais son atmosphère dense de dioxyde de carbone la rend extrêmement chaude.",
        facts: {
            type: "Planète tellurique",
            diametre: "12 104 km",
            distance: "108,2 millions km",
            periode: "224,7 jours",
            temperature: "462 °C",
            color: "#e6c8a0"
        }
    },
    terre: {
        nom: "Terre",
        rayon: 1.3,
        distance: 20,
        vitesseRotation: 0.01,
        vitesseOrbite: 0.01,
        axialTilt: 23.4,
        texture: "./textures/earth.jpg",
        description: "La Terre est notre planète d'origine, la seule connue pour abriter la vie. Elle est caractérisée par ses océans d'eau liquide, son atmosphère riche en oxygène et sa biodiversité.",
        moons: [
            {
                key: "lune", nom: "Lune", rayon: 0.3, distance: 2.4, vitesseOrbite: 0.05, color: "#b8b8b8",
                description: "La Lune est l'unique satellite naturel de la Terre. Sa surface criblée de cratères témoigne du bombardement météoritique du système solaire primitif.",
                facts: { type: "Lune de la Terre", diametre: "3 474 km", distance: "384 400 km de la Terre", periode: "27,3 jours", temperature: "-173 à 127 °C", color: "#b8b8b8" }
            }
        ],
        facts: {
            type: "Planète tellurique (Habitable)",
            diametre: "12 742 km",
            distance: "149,6 millions km",
            periode: "365,25 jours",
            temperature: "-89 à 58 °C",
            color: "#3366cc"
        }
    },
    mars: {
        nom: "Mars",
        rayon: 1.1,
        distance: 30,
        vitesseRotation: 0.008,
        vitesseOrbite: 0.008,
        axialTilt: 25.2,
        texture: "./textures/mars.jpg",
        description: "Mars est surnommée la planète rouge en raison de la présence d'oxyde de fer à sa surface. Elle possède des calottes polaires, des vallées, des déserts et des volcans éteints comme l'Olympus Mons.",
        facts: {
            type: "Planète tellurique",
            diametre: "6 779 km",
            distance: "227,9 millions km",
            periode: "687 jours",
            temperature: "-143 à 35 °C",
            color: "#cc6633"
        }
    },
    jupiter: {
        nom: "Jupiter",
        rayon: 2.5,
        distance: 40,
        vitesseRotation: 0.02,
        vitesseOrbite: 0.005,
        axialTilt: 3.1,
        texture: "./textures/jupiter.jpg",
        description: "Jupiter est la plus grande planète du système solaire. C'est une géante gazeuse avec une atmosphère composée principalement d'hydrogène et d'hélium, et sa caractéristique la plus connue est sa Grande Tache Rouge.",
        moons: [
            {
                key: "io", nom: "Io", rayon: 0.22, distance: 3.5, vitesseOrbite: 0.06, color: "#d8b84a",
                description: "Io est le corps le plus volcanique du système solaire : plus de 400 volcans actifs, alimentés par les forces de marée colossales de Jupiter.",
                facts: { type: "Lune de Jupiter", diametre: "3 643 km", distance: "421 800 km de Jupiter", periode: "1,77 jour", temperature: "-143 °C", color: "#d8b84a" }
            },
            {
                key: "europe", nom: "Europe", rayon: 0.2, distance: 4.2, vitesseOrbite: 0.045, color: "#d8cfc0",
                description: "Sous sa croûte de glace lisse, Europe cache un océan d'eau liquide — l'un des endroits les plus prometteurs pour chercher la vie extraterrestre.",
                facts: { type: "Lune de Jupiter", diametre: "3 122 km", distance: "671 100 km de Jupiter", periode: "3,55 jours", temperature: "-160 °C", color: "#d8cfc0" }
            },
            {
                key: "ganymede", nom: "Ganymède", rayon: 0.3, distance: 5.0, vitesseOrbite: 0.035, color: "#9a8d7a",
                description: "Ganymède est la plus grande lune du système solaire — plus grande que Mercure ! Elle possède son propre champ magnétique.",
                facts: { type: "Lune de Jupiter", diametre: "5 268 km", distance: "1,07 million km de Jupiter", periode: "7,15 jours", temperature: "-163 °C", color: "#9a8d7a" }
            },
            {
                key: "callisto", nom: "Callisto", rayon: 0.28, distance: 5.9, vitesseOrbite: 0.027, color: "#6f6657",
                description: "Callisto est le corps le plus cratérisé du système solaire, une relique géologiquement inerte vieille de 4 milliards d'années.",
                facts: { type: "Lune de Jupiter", diametre: "4 821 km", distance: "1,88 million km de Jupiter", periode: "16,7 jours", temperature: "-139 °C", color: "#6f6657" }
            }
        ],
        facts: {
            type: "Géante gazeuse",
            diametre: "139 820 km",
            distance: "778,5 millions km",
            periode: "11,86 ans",
            temperature: "-108 °C",
            color: "#e0c8a0"
        }
    },
    saturne: {
        nom: "Saturne",
        rayon: 2.2,
        distance: 55,
        vitesseRotation: 0.018,
        vitesseOrbite: 0.004,
        axialTilt: 26.7,
        texture: "./textures/saturn.jpg",
        description: "Saturne est célèbre pour ses anneaux spectaculaires composés de glace et de poussière. C'est une géante gazeuse similaire à Jupiter mais moins massive.",
        moons: [
            {
                key: "titan", nom: "Titan", rayon: 0.3, distance: 5.9, vitesseOrbite: 0.03, color: "#d9a440",
                description: "Titan est la seule lune dotée d'une atmosphère dense. Ses lacs de méthane liquide en font un monde étrangement similaire à la Terre primitive.",
                facts: { type: "Lune de Saturne", diametre: "5 150 km", distance: "1,22 million km de Saturne", periode: "15,9 jours", temperature: "-179 °C", color: "#d9a440" }
            }
        ],
        facts: {
            type: "Géante gazeuse",
            diametre: "116 460 km",
            distance: "1,43 milliard km",
            periode: "29,45 ans",
            temperature: "-139 °C",
            color: "#e6d9a3"
        }
    },
    uranus: {
        nom: "Uranus",
        rayon: 1.8,
        distance: 70,
        vitesseRotation: 0.012,
        vitesseOrbite: 0.003,
        axialTilt: 97.8,
        texture: "./textures/uranus.jpg",
        description: "Uranus est une géante de glace qui a la particularité de tourner sur un axe presque parallèle au plan de son orbite, comme si elle était couchée sur le côté.",
        facts: {
            type: "Géante de glace",
            diametre: "50 724 km",
            distance: "2,87 milliards km",
            periode: "84 ans",
            temperature: "-197 °C",
            color: "#99ccff"
        }
    },
    neptune: {
        nom: "Neptune",
        rayon: 1.7,
        distance: 85,
        vitesseRotation: 0.014,
        vitesseOrbite: 0.002,
        axialTilt: 28.3,
        texture: "./textures/neptune.jpg",
        description: "Neptune est la planète la plus éloignée du Soleil. C'est une géante de glace caractérisée par sa couleur bleue intense due à la présence de méthane dans son atmosphère.",
        facts: {
            type: "Géante de glace",
            diametre: "49 244 km",
            distance: "4,50 milliards km",
            periode: "164,8 ans",
            temperature: "-201 °C",
            color: "#3333cc"
        }
    }
};

export const fallbackColors = {
    soleil: "#ffcc00",
    mercure: "#a0a0a0",
    venus: "#e6c8a0",
    terre: "#3366cc",
    mars: "#cc6633",
    jupiter: "#e0c8a0",
    saturne: "#e6d9a3",
    uranus: "#99ccff",
    neptune: "#3333cc"
};
