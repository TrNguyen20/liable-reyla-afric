## 2026-11-06T01:57:57Z
From: 934eddce-648a-4237-a754-5951df6a9240 (parent)
Priority: MESSAGE_PRIORITY_HIGH

You are teamwork_explorer for Shell, Navigation, Login, and Common Components in the Trilingual [VI] [EN] [JA] standardization project.
Your working directory: .agents/teamwork/explorer_shell/

Objective:
Investigate all UI components related to the application shell, navigation header, language switcher, authentication (/login), modals/dialogs, notifications/toasts, and common shared UI elements.

Key tasks:
1. Read `.agents/teamwork/ORIGINAL_REQUEST.md`.
2. Inspect:
   - Root layout / Dynamo Shell (`src/App.tsx`, `src/components/layout/`, `src/routes/` or equivalent router files).
   - Navigation Header (`src/components/header/`, language switcher buttons [VI] [EN] [JA], status bars, user badges).
   - Authentication page (`src/pages/login.tsx` or `src/routes/login.tsx`, ULID auth dialogs, error messages).
   - Dialogs, Modals, Toasts, Drawers, Tooltips, Confirmation alerts across the shell.
3. Identify all hardcoded Vietnamese (or English) strings that need to be extracted into i18n keys.
4. Document how `useTranslation` or current i18n hook is used in these components, and what translation keys currently exist vs. what keys need to be added.
5. Note any styling or design system constraints (e.g. keeping `rounded-xs`, `font-mono tabular-nums`, no pill buttons except LED dots).
6. Write your comprehensive findings to `.agents/teamwork/explorer_shell/survey.md`.
7. Write `.agents/teamwork/explorer_shell/handoff.md` and send a message back.

Do NOT modify any source code. This is a read-only investigation.
