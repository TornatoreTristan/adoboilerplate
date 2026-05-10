#!/usr/bin/env bash
# Heuristic check for hardcoded French strings in JSX text content.
# Catches the common case: literal text between `>` and `<` containing French
# accented characters. Source of truth remains code review — this is a safety net.
#
# Pass file paths as arguments; with no args, scan the whole inertia/ tree.
#
# Excluded by design:
# - inertia/emails/**: React Email templates are a separate i18n track (TODO).
# - <option value="fr|en">…</option>: language picker labels are intentionally
#   in their own language.
#
# Known blind spots:
# - French strings without accented characters (e.g. "Connexion", "Retour",
#   "Suivant") are NOT detected. Code review remains the source of truth.

set -e

if [ "$#" -eq 0 ]; then
  files=$(git ls-files 'inertia/**/*.tsx' | grep -v '^inertia/emails/' || true)
else
  files=()
  for f in "$@"; do
    case "$f" in
      inertia/emails/*) ;;
      inertia/*.tsx | inertia/*/*.tsx | inertia/*/*/*.tsx | inertia/*/*/*/*.tsx)
        files+=("$f")
        ;;
    esac
  done
  files="${files[@]}"
fi

[ -z "$files" ] && exit 0

hits=$(grep -nE '>[^<]*[éèêëàâäîïôöùûüÿœæçÉÈÊËÀÂÄÎÏÔÖÙÛÜŸŒÆÇ][^<]*<' $files 2>/dev/null \
  | grep -vE "t\(['\"]|key=|className=|aria-|placeholder=|title=|alt=" \
  | grep -vE '<option value="(fr|en)"' || true)

if [ -n "$hits" ]; then
  echo "❌ Hardcoded French strings detected in JSX. Use useI18n() and t('...') keys."
  echo "$hits"
  echo ""
  echo "If a literal is intentional (e.g. brand name), inline it via t('common.brand_name') with that value as default."
  exit 1
fi

exit 0
