# Deployment Entry

## Current Entry

The current Vite entry path is:

`index.html -> main.jsx -> App.jsx`

`index.html` loads `/main.jsx`, and `main.jsx` renders `App` directly.

## AuthGate Status

AuthGate and LoginGate are not enabled at the application entry.

The project keeps guest mode available by default so judges and visitors can enter the product quickly without a forced login step.

## Supabase Usage

Supabase login is used only as an optional cloud sync capability in the product library storage mode.

Users can choose local mode, automatic mode, or cloud sync mode in the product library. Cloud sync requires Supabase configuration and a signed-in user.

## Local Mode Fallback

When Supabase is not configured, the user is not signed in, or the network is unstable, the product can still be used in local browser storage mode.

This keeps image recognition, product analysis, report download, product library workflows, candidate comparison, and review flows available for demos.
