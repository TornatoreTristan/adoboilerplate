# Tech Debt

Suivi des dettes techniques connues et de leurs cibles de cleanup.

## ESLint — règles strictes (2026-05-20)

`@typescript-eslint/no-explicit-any` et `@typescript-eslint/no-non-null-assertion` sont configurés en **`error`** dans `eslint.config.js`. Un dépassement bloque le commit (et le CI).

Cas légitimes (frontières) : `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <justification concrète>` avec raison précise (ex : "JSONB column, shape varies per provider", "Bull generic T untyped by design"). 10 dérogations actuelles, toutes auditables via `grep -rn "eslint-disable" app/`.

## Backend controllers — service-locator vs constructor injection

Les 6 contrôleurs admin (`admin_dashboard`, `admin_users`, `admin_mails`, `admin_organizations`, `admin_roles`, `admin_integrations`) utilisent l'injection par constructeur via le bridge `providers/adonis_bridge_provider.ts`.

Les autres contrôleurs (~14) utilisent encore `getService<T>(TYPES.X)` (service-locator). Migration estimée à 2-3h en suivant le mode d'emploi documenté dans le bridge provider.

## Tests — migration automatique (2026-05-20)

`tests/bootstrap.ts` lance `testUtils.db().migrate()` au démarrage de la suite. Un clone fresh peut exécuter `npm run test` directement sans étape manuelle.

## Script i18n — angle mort

`scripts/check-no-hardcoded-french.sh` ne détecte que les chaînes contenant des caractères accentués. Du français sans accent (`Connexion`, `Retour`, `Suivant`) passe sans alerte. Acceptable pour un filet de sécurité, mais ne remplace pas la code review.

`inertia/emails/**` n'est plus exclu du script : les templates React Email utilisent désormais des props `translations` typées, construites côté backend via `i18nManager.locale(locale).t(...)`. Aucun texte accentué hardcodé ne subsiste dans ces fichiers.
