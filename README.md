# Groceries

A shared grocery list, pantry-staples tracker and recipe box for our household.
It's an installable web app (PWA): open it in the phone browser and "Add to Home Screen".

## Features

- **Shared list** that syncs instantly between phones and works offline in the store.
- Items are **grouped automatically** (produce, dairy, meat…). Change an item's group once and it's remembered.
- Checked items move to **In the cart** at the bottom; clear checked items or the whole list.
- Several lists at once (e.g. Groceries, Costco, Party): switch with the chips at the top, tap the current one to rename or delete it. Pantry low/out items go to Groceries; recipes go to whichever list you pick.
- Pantry: plain alphabetical list with search. Optional sections you make yourself (Spice rack, Baking shelf…); drag the ⠿ handle to move a staple, or tap it and pick a section. Sections live in `settings/pantrySections`, staples carry `section`.
- Recipe and pantry photos open the camera directly, with a Choose from photos option.
- **Pantry staples** marked Have / Low / Out. Low or Out adds the item to the list; checking it off marks it Have again.
- **Recipes**: save them, scale servings, tick several and add their ingredients in one go.
  Quantities are combined across recipes and staples you already have are left off.
- **Import** recipes from a photo, a link, or pasted text (uses Claude; needs the API function below).

## Stack

- React + Vite, `vite-plugin-pwa`
- Firebase Auth (Google + email) and Cloud Firestore (offline cache, realtime)
- Firebase project: `grocery-app-e849a`. Security rules: `firestore.rules`
  (publish changes in the Firebase console under Firestore → Rules).

## Hosting

- Live at https://grocery-app-tau-eosin.vercel.app (Vercel, deploys on every push to `main`).
- `api/` holds Vercel serverless functions. They need these environment variables in Vercel:
  - `ANTHROPIC_API_KEY` (secret) for recipe and pantry photo import
  - `ALLOWED_EMAILS` (optional, comma separated) to limit who can use the Claude features
- If you add a custom domain, also add it in Firebase → Authentication → Settings → Authorized domains.

## Develop

```sh
npm install
npm run dev     # local dev server
npm test        # unit tests for categories and ingredient parsing
npm run build
```

## Data model

```
households/{hid}            name, members[uid], memberNames{uid: name}
  items/{id}                grocery list rows (listId; missing = main list)
  lists/{id}                extra lists {name}; doc "main" only holds a renamed main list
  pantry/{id}               staples with status have|low|out
  recipes/{id}              title, servings, ingredientsText, ingredients[], instructions
  settings/categoryOverrides  map of item name -> chosen group
```

A partner joins with the invite link from Settings (`/?join=<hid>`).
