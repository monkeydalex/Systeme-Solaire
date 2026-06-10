# Système Solaire Interactif

Une simulation 3D interactive du système solaire créée avec Three.js à des fins éducatives.

## Fonctionnalités

- Visualisation 3D du système solaire avec le Soleil et les huit planètes
- Orbites et rotations réalistes des planètes
- Interaction utilisateur : cliquez sur une planète pour afficher des informations
- Contrôles de caméra intuitifs pour naviguer dans l'espace
- Fond étoilé pour une immersion complète

## Comment utiliser

1. Clonez ce dépôt ou téléchargez les fichiers
2. Ouvrez `index.html` dans un navigateur web moderne
   - Note : Pour un fonctionnement optimal, il est recommandé d'utiliser un serveur web local

## Contrôles

- **Rotation de la caméra** : Cliquez et faites glisser avec la souris
- **Zoom** : Utilisez la molette de la souris
- **Informations sur les planètes** : Cliquez sur une planète pour afficher ses informations

## Textures

Le projet utilise des textures temporaires depuis le CDN de Three.js. Pour utiliser vos propres textures :

1. Placez vos images de textures dans le dossier `textures/`
2. Assurez-vous que les noms des fichiers correspondent à ceux définis dans `planetData` dans le fichier `js/main.js`

## Technologies utilisées

- HTML5
- CSS3
- JavaScript
- [Three.js](https://threejs.org/) - Bibliothèque JavaScript 3D

## À propos des données

Les informations sur les planètes sont simplifiées à des fins éducatives. Les tailles, distances et vitesses ne sont pas à l'échelle exacte pour permettre une meilleure visualisation.

## Améliorations possibles

- Ajout de lunes pour les planètes
- Ajout d'informations plus détaillées
- Ajout de contrôles pour modifier la vitesse de simulation
- Ajout de modes d'affichage (réaliste, schématique, etc.)
- Ajout de quiz interactifs sur le système solaire 