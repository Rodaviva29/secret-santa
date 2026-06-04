<div align="center">

# 🎁 WhatsApp Secret Santa

### *Secret Santa, now with superpowers.* ✨

Participants sign up, build their **wishlist**, and the organiser runs a draw
that respects **exclusions**, sets a **budget**, avoids **repeating past
pairings**, and delivers results via a **reveal page** or **WhatsApp**.

Rewritten from the ground up: from an Express prototype → **Next.js 15 · React 19 · Better Auth · Postgres/Drizzle**. Dockerised, deploy-ready for **Coolify**. 🐳

<img width="1774" height="887" alt="f70372d1-e83c-4261-a849-4ac7585abdcd" src="https://github.com/user-attachments/assets/60d4588b-b22e-41b8-ad23-272ee3500aec" />


<br>

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Better Auth](https://img.shields.io/badge/Better_Auth-1a1a1a?style=for-the-badge&logo=auth0&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres_+_Drizzle-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

</div>

---

## ✨ Features

| | Feature | What it does |
|:--:|:--|:--|
| 🔐 | **Accounts** | Email/password login (Better Auth). The first user (or `ADMIN_EMAIL`) becomes admin automatically. |
| 📝 | **Wishlists** | Each participant lists what they'd like to receive — their santa sees it all. |
| 🚫 | **Exclusions** | Forbidden pairs (couples, siblings) never draw each other. |
| 💰 | **Budget** | Optional per-draw budget, shown on the reveal page. |
| 🕰️ | **History** | Past draws are used to avoid repeating last year's pairing. |
| 🎲 | **Robust algorithm** | Backtracking derangement — no self-draw, respects constraints, or fails with a clear error. |
| 📬 | **Pick your delivery** | Per draw: reveal page, WhatsApp + link, or WhatsApp direct. |

<br>

### 📬 Delivery modes

<table>
<tr>
<td align="center">🔗<br><b>Reveal</b></td>
<td>Private reveal links, with a per-link <b>view limit</b>.</td>
</tr>
<tr>
<td align="center">💬<br><b>WA + Link</b></td>
<td>WhatsApp message containing the reveal link.</td>
</tr>
<tr>
<td align="center">🎅<br><b>WA Direct</b></td>
<td>WhatsApp message with the match's name in the template.</td>
</tr>
</table>

---

## 🧱 Stack

| Layer | Choice |
|:--|:--|
| 🖼️ **Framework** | Next.js 15 (App Router) · React 19 |
| 🔐 **Auth** | Better Auth (+ admin plugin) |
| 🗄️ **Database** | Postgres via Drizzle ORM (`pg`) |
| 🎨 **UI** | Tailwind CSS v4 · shadcn/ui |
| 📲 **Messaging** | Meta WhatsApp Cloud API (Graph API) |
| 🐳 **Deploy** | Docker · docker-compose · Coolify-ready |

---

## 🚀 Getting started

### 🐳 Option A — Docker (recommended)

Brings up the app **and** Postgres together. Migrations run automatically on
start.

```bash
# 1️⃣  Configure
cp .env.example .env
#   • BETTER_AUTH_SECRET  →  openssl rand -base64 32
#   • ADMIN_EMAIL         →  the email you'll sign up with (becomes admin)
#   • POSTGRES_*          →  credentials for the bundled database
#   • WA_*                →  (optional) only for WhatsApp delivery

# 2️⃣  Build + run
docker compose up -d --build   # 👉  http://localhost:3000
```

### 💻 Option B — Local dev

```bash
# 1️⃣  Install
npm install

# 2️⃣  Configure (set DATABASE_URL to a running Postgres)
cp .env.example .env

# 3️⃣  Apply migrations
npm run db:migrate

# 4️⃣  Run
npm run dev      # 👉  http://localhost:3000
```

> 💡 Need a quick Postgres for local dev?
> `docker compose up -d db` starts just the database.

> 💡 Sign up with `ADMIN_EMAIL` to get the admin role, then open **/admin** to
> add participants, set exclusions, choose delivery, and run the draw.

---

## ☁️ Deploy on Coolify

This repo ships a `Dockerfile` + `docker-compose.yml`, so Coolify can deploy it
as a **Docker Compose** resource out of the box.

1. **New Resource → Docker Compose**, point it at this repo.
2. Set the environment variables (Coolify reads them into the compose file):
   - `BETTER_AUTH_SECRET` — a long random string
   - `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` — your public URL (e.g. `https://santa.example.com`)
   - `ADMIN_EMAIL` — the account to auto-promote to admin
   - `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
   - `WA_*` — optional, only for WhatsApp delivery
3. Deploy. 🎉 The bundled Postgres persists in the `pgdata` volume and
   **migrations run automatically** on every container start.

> ℹ️ `NEXT_PUBLIC_APP_URL` is baked into the client at **build time** — set it
> before the image is built so reveal links use the right domain.

> ℹ️ Prefer Coolify's **managed Postgres** instead of the bundled one? Remove
> the `db` service from the compose file and set `DATABASE_URL` to the managed
> instance's connection string.

---

## 📲 WhatsApp setup

For `wa_link` / `wa_direct` you need a Meta WhatsApp Business account and an
approved **template** with two body parameters:

| Param | Content |
|:--:|:--|
| `{{1}}` | The giver's name |
| `{{2}}` | The match's name (`wa_direct`) **or** the reveal URL (`wa_link`) |

Set `WA_API_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TEMPLATE_NAME`,
`WA_TEMPLATE_LANGUAGE` in `.env`. Reveal-page delivery needs none of this. ✅

---

## 🛠️ Scripts

| Script | What it does |
|:--|:--|
| `npm run dev` | 🔥 Development server |
| `npm run build` | 📦 Production build |
| `npm test` | 🧪 Draw-algorithm unit tests |
| `npm run db:generate` | 🧬 Generate a Drizzle migration |
| `npm run db:migrate` | ⬆️ Apply migrations |
| `npm run db:studio` | 🔍 Open Drizzle Studio |

---

## 🗂️ Structure

```
app/                  🧭  routes (auth, dashboard, admin, reveal, api)
components/           🧩  UI (shadcn + components)
lib/                  ⚙️  auth · db/schema · draw · whatsapp · session
drizzle/             🗃️  SQL migrations
scripts/             📜  database migration runner
Dockerfile           🐳  standalone production image
docker-compose.yml   🐳  app + Postgres (Coolify-ready)
```

---

## 📜 Versions

| Branch | What it is |
|:--:|:--|
| 🟢 **v2** | This rewrite (Next.js · Better Auth · Drizzle) — current branch |
| 🟡 **v1** | The original Express prototype (static HTML + JSON) |

---

## 🤝 Contributing

Pull requests welcome! If you'd like to enrich the project, open an issue or a
PR. 🎄

## 📄 License

MIT — see [LICENSE](LICENSE).

<div align="center">

### 🎄 Happy Xmas! 🎁

</div>
