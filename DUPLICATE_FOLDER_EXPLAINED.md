# Why You Had "Root" Issues — And How It's Fixed

## What was going on

Your repo had **two copies** of the app:

1. **Root (what actually runs)**  
   `app/`, `lib/`, `api/`, etc. at the project root.  
   Next.js, `npm run dev`, and Vercel use **only** these.

2. **Nested duplicate**  
   A folder literally named `primate-research-main/` **inside** the project, containing another full copy:  
   `primate-research-main/app/`, `primate-research-main/lib/`, etc.

That happened when we did the first push: the initial commit had everything under `primate-research-main/`, and the merge with GitHub's repo brought in the root tree. The merge left **both** trees in the repo.

So:

- The **running** app and deploy use the **root** files.
- Edits sometimes went to the **nested** copy (e.g. when paths or the workspace pointed at `primate-research-main/...`).
- Result: "we fixed it but nothing changed" — we were editing the duplicate, not the one that runs.

## What we did

We removed the nested duplicate from the repo:

- All files under `primate-research-main/` were removed from git and from the project.
- The only source of truth is now the **root** tree: `app/`, `lib/`, etc.

So:

- There is **one** place for code: the root.
- Run Setup, API routes, and the app all use the same `lib/db.ts`, same `app/`, etc.
- No more "root vs nested" confusion.

## Going forward

- Edit and run from the **root** of the repo only.
- If your editor or scripts use a path like `primate-research-main/...`, switch them to the root (e.g. `app/...`, `lib/...`).

You can delete this file after reading if you don't want to keep it.
