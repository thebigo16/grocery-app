# Groceries

A shared grocery list, pantry-staples tracker and recipe box for our household.
It's an installable web app (PWA): open it in the phone browser and "Add to Home Screen".

## Features

- **Shared list** that syncs instantly between phones and works offline in the store.
- Items are **grouped automatically** (produce, dairy, meat…). Change an item's group once and it's remembered.
- Checked items move to **In the cart** at the bottom; clear checked items or the whole list.
- **Pantry staples** marked Have / Low / Out. Low or Out adds the item to the list; checking it off marks it Have again.
- **Recipes**: save them, scale servings, tick several and add their ingredients in one go.
  Quantities are combined across recipes and staples you already have are left off.
- **Import** recipes from a photo, a link, or pasted text (uses Claude; needs the API function below).

## Stack

- React + Vite, `vite-plugin-pwa`
- Firebase Auth (Google + email) and Cloud Firestore (offline cache, realtime)
- Firebase project: `grocery-app-e849a`. Security rules: `firestore.rules`
  (publish changes in the Firebase console under Firestore → Rules).

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
  items/{id}                grocery list rows
  pantry/{id}               staples with status have|low|out
  recipes/{id}              title, servings, ingredientsText, ingredients[], instructions
  settings/categoryOverrides  map of item name -> chosen group
```

A partner joins with the invite link from Settings (`/?join=<hid>`).
