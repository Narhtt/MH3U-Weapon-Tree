# MH3U Weapon Tree

Un arbre des armes interactif et performant pour **Monster Hunter 3 Ultimate**, conçu pour les chasseurs qui recherchent une base de données claire, précise et professionnelle pour planifier leur progression d'équipement.

## Fonctionnalités

- **Mise en page interactive** : Naviguez à travers les généalogies complexes d'armes avec une interface fluide et réactive.
- **Calculs en temps réel** : Calcul automatique du **Raw Effectif (EFR)** et de l'**Élément Effectif (EFE)**, incluant le support des talents "Éveil" et "Tranchant +1".
- **Système de Collection** : Suivez votre progression en marquant les armes comme "Possédées". Les données sont persistées localement via le `LocalStorage`.
- **Design sans chevauchement** : Une mise en page stricte en Flexbox garantit que les statistiques et les badges ne se chevauchent jamais, maintenant une lisibilité parfaite.
- **Connexions SVG** : Courbes de Bézier dynamiques reliant les nœuds d'armes, avec mise en surbrillance interactive.
- **Architecture Vanilla JS** : Construit avec du JavaScript moderne et modulaire pour une performance maximale sans dépendances lourdes.

## Stack Technique

- **Frontend** : Vanilla JavaScript (ES Modules)
- **Style** : Tailwind CSS (Approche Utility-first)
- **Graphismes** : SVG (Scalable Vector Graphics) pour les icônes et les connexions
- **Données** : Base de données d'armes au format JSON
- **Stockage** : LocalStorage du navigateur pour les collections utilisateur

## Installation et Développement

Pour lancer ce projet localement :

1. Clonez le dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
4. Compilez pour la production :
   ```bash
   npm run build
   ```

## Crédits et Remerciements

### Source des Données
Les données utilisées dans cette application proviennent du travail d'agrégation colossal effectué par **Kiranico**.
Site officiel : [https://kiranico.com/en/mh3u](https://kiranico.com/en/mh3u)

**Note importante :** Le texte ci-dessous est une citation directe provenant du site de Kiranico et détaille leurs sources et remerciements originaux :

> **A database for Monster Hunter 3 Ultimate.**
>
> **Acknowledgements:**
> I compiled data from 6 sources to make sure things are as complete and correct as they can be. These include the MH4G game, Official MH4G Guidebook, http://wiki.mh4g.org/, http://www61.atwiki.jp/3dsmh4g/pages/1.html and http://mh4info.com/ for data. I also used Ping's Dex https://sites.google.com/site/pingsdex/pingsmh4gdex for comparison, error correction, missing data and quest names.
> I was able to receive help from the following people on /r/MonsterHunter: /u/kamegami for working on the database, /u/ShadyFigure for fixing Japanese translations and QA, /u/raithian25 for QA, /u/Nicola1975 for additional map data.
> Some old friends and anons from /mhg/ provided QA during early stages of development. But they were always screwing around and ended up not helping at all. Thanks anyways guys.
> IncognitoMan, dasding, Hairo and Aule for additional content.
> McL for stagger part names.
> /u/Bunnyapocalips and Janni for German localization.
> Ina and Red for French localization.
>
> **Release Notes:**
> Language switching is now possible for all pages. These pages are indicated by a icon next to them.
> Switching between pages for 4th and 3rd generation is also possible. For example Rathian exists in both 4th and 3rd gen shown by the indicator, clicking it will take you to the same page for the other game. This feature only works for individual monsters, items, weapons, armors and skills.
> Translations are becoming the main bottleneck of the development process since I have to translate a piece of text 6 times. This explains why most tables don't have headers so you'll have to guess what most fields mean for now.
> Anything containing the word "dummy" is MH4G exclusive. If you want to view them change your language to Japanese before before clicking the link.
> The search bar doesn't actually have search functionality. It will only provide auto-completion and then sends you to the matched page. The auto-completion list is stored in your browser for speed, browsers allow only up to 5MB storage (Chrome will allow 10MB) so if you visit multiple languages and games this will fill up quickly up to a point where it will no longer function. If this happens, clear your browser's localstorage.
> Avoid browsing on the 3DS browser since it has very little memory. Stick with the latest version of Chrome to be safe.
> I will leave the old MH3U section online, I plan to migrate (i.e. redirect URLs) everything to the new section later this year.
> I spent very little time on design so what you see might not be final.

### Ressources Visuelles
Les icônes d'armes sont basées sur le travail SVG du projet **MHW_Icons_SVG**.
Dépôt GitHub : [https://github.com/OthelloRhin/MHW_Icons_SVG](https://github.com/OthelloRhin/MHW_Icons_SVG)

---
*Développé avec un souci de précision et de savoir-faire pour la communauté Monster Hunter.*
