# Tech Debt

Suivi des dettes techniques connues et de leurs cibles de cleanup.

## ESLint warnings (303 au 2026-05-10)

Visibles via `npm run lint`. Réparties sur ~83 fichiers, sans hotspot unique.

| Règle                                      | Count | Cible                                    |
| ------------------------------------------ | ----- | ---------------------------------------- |
| `@typescript-eslint/no-explicit-any`       | ~225  | passer à `'error'` après cleanup complet |
| `@typescript-eslint/no-non-null-assertion` | ~76   | passer à `'error'` après cleanup complet |

**Action** : à chaque PR qui touche un fichier listé, profiter pour typer correctement et virer les `any`. Cible : 0 warnings d'ici fin Q2 → bascule des règles à `'error'` dans `eslint.config.js`.

## Backend controllers — service-locator vs constructor injection

Les 6 contrôleurs admin (`admin_dashboard`, `admin_users`, `admin_mails`, `admin_organizations`, `admin_roles`, `admin_integrations`) utilisent l'injection par constructeur via le bridge `providers/adonis_bridge_provider.ts`.

Les autres contrôleurs (~14) utilisent encore `getService<T>(TYPES.X)` (service-locator). Migration estimée à 2-3h en suivant le mode d'emploi documenté dans le bridge provider.

## React Email templates non i18n

`inertia/emails/**` contient des chaînes françaises hardcodées. Le pre-commit `check-no-hardcoded-french.sh` les ignore explicitement. À traiter dans une PR dédiée : passer le contenu des templates par `useI18n()` + clés FR/EN.

## Tests — migration manuelle requise

Aucun hook ne joue automatiquement les migrations avant la suite de tests. Un dev qui clone le repo doit exécuter manuellement `NODE_ENV=test node ace migration:run` une fois après l'installation. À documenter dans le README "Getting started" ou ajouter un hook dans `tests/bootstrap.ts`.

## Script i18n — angle mort

`scripts/check-no-hardcoded-french.sh` ne détecte que les chaînes contenant des caractères accentués. Du français sans accent (`Connexion`, `Retour`, `Suivant`) passe sans alerte. Acceptable pour un filet de sécurité, mais ne remplace pas la code review.
