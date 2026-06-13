// Constellations cinématiques affichées dans le ciel de fond.
// Chaque entrée : étoiles nommées (positions 3D, taille), tracés reliant les
// étoiles, plus des métadonnées pour la fiche détaillée. Les 12 signes du
// zodiaque portent `zodiaque: true` et leurs `dates`.
export const CINEMATIC_CONSTELLATIONS = [
    {
        key: 'orion',
        nom: 'Orion',
        color: '#8fd8ff',
        labelOffset: [0, 15, 0],
        etoilePrincipale: 'Rigel',
        zodiaque: false,
        description: "Le Chasseur, l'une des constellations les plus reconnaissables, dominée par les supergéantes Bételgeuse et Rigel et marquée par les trois étoiles alignées de sa Ceinture.",
        stars: [
            { name: 'Betelgeuse', position: [-92, 92, -235], size: 1.55 },
            { name: 'Bellatrix', position: [-50, 102, -246], size: 1.2 },
            { name: 'Alnitak', position: [-77, 62, -250], size: 1.05 },
            { name: 'Alnilam', position: [-60, 58, -255], size: 1.25 },
            { name: 'Mintaka', position: [-43, 54, -250], size: 1.0 },
            { name: 'Saiph', position: [-86, 19, -235], size: 1.1 },
            { name: 'Rigel', position: [-35, 10, -242], size: 1.45 }
        ],
        lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [5, 6]]
    },
    {
        key: 'grande_ourse',
        nom: 'Grande Ourse',
        color: '#d7f3ff',
        labelOffset: [0, 12, 0],
        etoilePrincipale: 'Alioth',
        zodiaque: false,
        description: "Astérisme de la Casserole, partie de la Grande Ourse ; ses deux étoiles avant pointent vers l'étoile Polaire.",
        stars: [
            { name: 'Dubhe', position: [120, 118, -208], size: 1.35 },
            { name: 'Merak', position: [98, 95, -226], size: 1.1 },
            { name: 'Phecda', position: [62, 96, -238], size: 1.0 },
            { name: 'Megrez', position: [48, 121, -228], size: 0.9 },
            { name: 'Alioth', position: [13, 130, -236], size: 1.25 },
            { name: 'Mizar', position: [-22, 134, -230], size: 1.2 },
            { name: 'Alkaid', position: [-58, 128, -220], size: 1.1 }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]
    },
    {
        key: 'cassiopee',
        nom: 'Cassiopée',
        color: '#ffd6f0',
        labelOffset: [0, 13, 0],
        etoilePrincipale: 'Schedar',
        zodiaque: false,
        description: "La Reine, reconnaissable à sa forme en W, située à l'opposé de la Grande Ourse par rapport au pôle nord céleste.",
        stars: [
            { name: 'Schedar', position: [-154, 146, -165], size: 1.25 },
            { name: 'Caph', position: [-119, 170, -174], size: 1.05 },
            { name: 'Gamma', position: [-84, 142, -204], size: 1.35 },
            { name: 'Ruchbah', position: [-48, 168, -200], size: 1.0 },
            { name: 'Segin', position: [-13, 145, -220], size: 0.95 }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    {
        key: 'cygne',
        nom: 'Cygne',
        color: '#b8ffe8',
        labelOffset: [0, 14, 0],
        etoilePrincipale: 'Deneb',
        zodiaque: false,
        description: "Le Cygne, qui s'étend le long de la Voie lactée ; son étoile Deneb forme un sommet du Triangle d'été.",
        stars: [
            { name: 'Deneb', position: [78, 178, 168], size: 1.45 },
            { name: 'Sadr', position: [55, 139, 198], size: 1.15 },
            { name: 'Gienah', position: [18, 132, 210], size: 1.0 },
            { name: 'Delta', position: [91, 127, 190], size: 0.95 },
            { name: 'Albireo', position: [40, 88, 230], size: 1.2 }
        ],
        lines: [[0, 1], [1, 4], [2, 1], [1, 3]]
    },
    {
        key: 'lyre',
        nom: 'Lyre',
        color: '#fff0a8',
        labelOffset: [0, 11, 0],
        etoilePrincipale: 'Véga',
        zodiaque: false,
        description: "Petite constellation dominée par Véga, l'une des étoiles les plus brillantes du ciel boréal.",
        stars: [
            { name: 'Véga', position: [-142, 62, 220], size: 1.6 },
            { name: 'Sheliak', position: [-112, 36, 235], size: 0.9 },
            { name: 'Sulafat', position: [-83, 44, 242], size: 1.0 },
            { name: 'Delta', position: [-91, 76, 230], size: 0.85 },
            { name: 'Zeta', position: [-122, 84, 218], size: 0.85 }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]]
    },
    {
        key: 'belier',
        nom: 'Bélier',
        color: '#ffce8a',
        labelOffset: [0, 14, 0],
        etoilePrincipale: 'Hamal',
        zodiaque: true,
        dates: '21 mars – 19 avril',
        description: "Premier signe du zodiaque, modeste arc d'étoiles associé au bélier à la toison d'or de la mythologie grecque.",
        stars: [
            { name: 'Hamal', position: [0, 48, -288], size: 1.4 },
            { name: 'Sheratan', position: [-22, 40, -291], size: 1.0 },
            { name: 'Mesarthim', position: [-30, 34, -292], size: 0.85 },
            { name: 'Bharani', position: [24, 30, -289], size: 0.9 }
        ],
        lines: [[0, 1], [1, 2], [0, 3]]
    },
    {
        key: 'taureau',
        nom: 'Taureau',
        color: '#ffb27a',
        labelOffset: [0, 16, 0],
        etoilePrincipale: 'Aldébaran',
        zodiaque: true,
        dates: '20 avril – 20 mai',
        description: "Le Taureau, marqué par l'œil rougeoyant d'Aldébaran et l'amas des Pléiades ; il représente Zeus métamorphosé.",
        stars: [
            { name: 'Aldébaran', position: [150, 28, -249], size: 1.5 },
            { name: 'Hyades Nord', position: [132, 36, -255], size: 0.9 },
            { name: 'Elnath', position: [120, 55, -262], size: 1.1 },
            { name: 'Tianguan', position: [165, 50, -255], size: 1.0 },
            { name: 'Hyades Sud', position: [138, 20, -253], size: 0.85 },
            { name: 'Ain', position: [160, 40, -250], size: 0.85 }
        ],
        lines: [[1, 0], [0, 5], [5, 3], [1, 2], [0, 4]]
    },
    {
        key: 'gemeaux',
        nom: 'Gémeaux',
        color: '#e7d27a',
        labelOffset: [0, 16, 0],
        etoilePrincipale: 'Pollux',
        zodiaque: true,
        dates: '21 mai – 20 juin',
        description: "Les Jumeaux Castor et Pollux, deux files d'étoiles parallèles figurant les frères de la mythologie.",
        stars: [
            { name: 'Pollux', position: [258, 58, -140], size: 1.4 },
            { name: 'Castor', position: [250, 66, -148], size: 1.3 },
            { name: 'Wasat', position: [255, 40, -138], size: 0.9 },
            { name: 'Alhena', position: [252, 24, -135], size: 1.0 },
            { name: 'Mebsuta', position: [246, 48, -150], size: 0.9 },
            { name: 'Tejat', position: [242, 30, -152], size: 0.95 }
        ],
        lines: [[0, 2], [2, 3], [1, 4], [4, 5], [0, 1], [2, 4]]
    },
    {
        key: 'cancer',
        nom: 'Cancer',
        color: '#9fe7c8',
        labelOffset: [0, 14, 0],
        etoilePrincipale: 'Tarf',
        zodiaque: true,
        dates: '21 juin – 22 juillet',
        description: "Le Crabe, constellation discrète du zodiaque abritant l'amas ouvert de la Crèche (M44).",
        stars: [
            { name: 'Tarf', position: [292, 18, 4], size: 1.1 },
            { name: 'Asellus Borealis', position: [288, 40, -2], size: 0.85 },
            { name: 'Asellus Australis', position: [291, 34, 6], size: 0.95 },
            { name: 'Acubens', position: [296, 24, -4], size: 0.9 },
            { name: 'Iota Cancri', position: [286, 48, 0], size: 0.8 }
        ],
        lines: [[2, 1], [2, 0], [2, 3], [1, 4]]
    },
    {
        key: 'lion',
        nom: 'Lion',
        color: '#ffd27a',
        labelOffset: [0, 16, 0],
        etoilePrincipale: 'Régulus',
        zodiaque: true,
        dates: '23 juillet – 22 août',
        description: "Le Lion, dont la Faucille dessine la crinière autour de Régulus, le « petit roi ».",
        stars: [
            { name: 'Régulus', position: [255, 30, 148], size: 1.45 },
            { name: 'Algieba', position: [250, 44, 150], size: 1.2 },
            { name: 'Adhafera', position: [246, 50, 152], size: 0.85 },
            { name: 'Rasalas', position: [244, 54, 150], size: 0.85 },
            { name: 'Denebola', position: [270, 38, 138], size: 1.2 },
            { name: 'Zosma', position: [262, 46, 142], size: 1.0 },
            { name: 'Chort', position: [260, 40, 144], size: 0.9 }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [1, 5], [5, 4], [0, 6], [6, 5]]
    },
    {
        key: 'vierge',
        nom: 'Vierge',
        color: '#bfe7a0',
        labelOffset: [0, 16, 0],
        etoilePrincipale: 'Spica',
        zodiaque: true,
        dates: '23 août – 22 septembre',
        description: "La Vierge, deuxième plus grande constellation, marquée par Spica, l'Épi de blé.",
        stars: [
            { name: 'Spica', position: [148, 10, 250], size: 1.45 },
            { name: 'Porrima', position: [140, 22, 254], size: 1.0 },
            { name: 'Vindemiatrix', position: [132, 32, 256], size: 0.95 },
            { name: 'Zavijava', position: [152, 28, 252], size: 0.85 },
            { name: 'Heze', position: [150, 18, 253], size: 0.8 },
            { name: 'Auva', position: [138, 26, 255], size: 0.8 }
        ],
        lines: [[0, 4], [4, 1], [1, 5], [5, 2], [1, 3]]
    },
    {
        key: 'balance',
        nom: 'Balance',
        color: '#a8e3ff',
        labelOffset: [0, 13, 0],
        etoilePrincipale: 'Zubeneschamali',
        zodiaque: true,
        dates: '23 septembre – 22 octobre',
        description: "La Balance, seul signe du zodiaque représentant un objet ; ses étoiles portaient jadis les pinces du Scorpion voisin.",
        stars: [
            { name: 'Zubeneschamali', position: [8, -4, 289], size: 1.2 },
            { name: 'Zubenelgenubi', position: [-10, -14, 291], size: 1.1 },
            { name: 'Brachium', position: [4, -22, 290], size: 0.9 },
            { name: 'Gamma Librae', position: [14, -12, 289], size: 0.85 }
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 0]]
    },
    {
        key: 'scorpion',
        nom: 'Scorpion',
        color: '#ffb36b',
        labelOffset: [0, 13, 0],
        etoilePrincipale: 'Antarès',
        zodiaque: true,
        dates: '23 octobre – 21 novembre',
        description: "Le Scorpion, vaste constellation estivale dont le cœur rouge Antarès rivalise avec Mars.",
        stars: [
            { name: 'Antarès', position: [165, -52, 198], size: 1.55 },
            { name: 'Dschubba', position: [134, -29, 210], size: 1.05 },
            { name: 'Shaula', position: [95, -79, 226], size: 1.2 },
            { name: 'Lesath', position: [72, -102, 218], size: 1.0 },
            { name: 'Sargas', position: [40, -117, 210], size: 0.95 },
            { name: 'Girtab', position: [17, -101, 230], size: 0.9 }
        ],
        lines: [[1, 0], [0, 2], [2, 3], [3, 4], [4, 5]]
    },
    {
        key: 'sagittaire',
        nom: 'Sagittaire',
        color: '#ffc98a',
        labelOffset: [0, 16, 0],
        etoilePrincipale: 'Kaus Australis',
        zodiaque: true,
        dates: '22 novembre – 21 décembre',
        description: "L'Archer, dont l'astérisme de la Théière pointe vers le centre de la Voie lactée.",
        stars: [
            { name: 'Kaus Australis', position: [-255, -40, 148], size: 1.4 },
            { name: 'Kaus Media', position: [-250, -32, 150], size: 1.0 },
            { name: 'Kaus Borealis', position: [-247, -24, 150], size: 0.95 },
            { name: 'Nunki', position: [-258, -26, 140], size: 1.1 },
            { name: 'Ascella', position: [-260, -36, 142], size: 0.95 },
            { name: 'Phi Sagittarii', position: [-253, -30, 144], size: 0.85 },
            { name: 'Alnasl', position: [-244, -36, 151], size: 0.9 }
        ],
        lines: [[2, 1], [1, 0], [1, 6], [2, 5], [5, 3], [3, 4], [4, 0]]
    },
    {
        key: 'capricorne',
        nom: 'Capricorne',
        color: '#cbd99a',
        labelOffset: [0, 15, 0],
        etoilePrincipale: 'Deneb Algedi',
        zodiaque: true,
        dates: '22 décembre – 19 janvier',
        description: "La Chèvre-Poisson, figure marine de la mythologie, dessinant un large triangle d'étoiles ténues.",
        stars: [
            { name: 'Deneb Algedi', position: [-288, -14, 4], size: 1.2 },
            { name: 'Dabih', position: [-294, -12, -4], size: 1.0 },
            { name: 'Algedi', position: [-296, -10, -6], size: 0.95 },
            { name: 'Nashira', position: [-289, -16, 3], size: 0.85 },
            { name: 'Omega Capricorni', position: [-292, -30, -2], size: 0.8 },
            { name: 'Psi Capricorni', position: [-286, -28, 2], size: 0.8 }
        ],
        lines: [[2, 1], [1, 4], [4, 5], [5, 0], [0, 3], [3, 1]]
    },
    {
        key: 'verseau',
        nom: 'Verseau',
        color: '#9ad2ff',
        labelOffset: [0, 15, 0],
        etoilePrincipale: 'Sadalsuud',
        zodiaque: true,
        dates: '20 janvier – 18 février',
        description: "Le Porteur d'eau, ancienne constellation du zodiaque versant un flot d'étoiles vers le sud.",
        stars: [
            { name: 'Sadalsuud', position: [-255, 6, -142], size: 1.2 },
            { name: 'Sadalmelik', position: [-250, 10, -148], size: 1.1 },
            { name: 'Sadachbia', position: [-246, 4, -150], size: 0.85 },
            { name: 'Skat', position: [-258, -8, -140], size: 0.95 },
            { name: 'Zeta Aquarii', position: [-248, 2, -149], size: 0.85 },
            { name: 'Eta Aquarii', position: [-244, 6, -151], size: 0.8 }
        ],
        lines: [[0, 1], [1, 4], [4, 2], [2, 5], [4, 3]]
    },
    {
        key: 'poissons',
        nom: 'Poissons',
        color: '#a8c8ff',
        labelOffset: [0, 15, 0],
        etoilePrincipale: 'Alpherg',
        zodiaque: true,
        dates: '19 février – 20 mars',
        description: "Les Poissons, deux poissons reliés par un cordon noué à l'étoile Alrescha.",
        stars: [
            { name: 'Alpherg', position: [-148, 34, -249], size: 1.0 },
            { name: 'Alrescha', position: [-138, 20, -253], size: 1.0 },
            { name: 'Delta Piscium', position: [-150, 40, -248], size: 0.85 },
            { name: 'Circlet', position: [-152, 46, -247], size: 0.8 },
            { name: 'Omega Piscium', position: [-140, 26, -252], size: 0.85 },
            { name: 'Iota Piscium', position: [-134, 16, -254], size: 0.8 },
            { name: 'Gamma Piscium', position: [-130, 24, -255], size: 0.8 }
        ],
        lines: [[3, 2], [2, 0], [0, 1], [1, 4], [4, 5], [5, 6]]
    }
];
