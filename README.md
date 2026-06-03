<div align="center">

# 🎁 WhatsApp Secret Santa

### *Sorteio de amigo secreto, agora com superpoderes.* ✨

Participantes registam-se, montam a sua **wishlist**, e o organizador corre um
sorteio que respeita **exclusões**, define **orçamento**, evita **repetir pares
de anos anteriores**, e entrega o resultado por **página de revelação** ou
**WhatsApp**.

Reescrito de raiz: do protótipo Express → **Next.js 15 · React 19 · Better Auth · SQLite/Drizzle**.

<br>

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Better Auth](https://img.shields.io/badge/Better_Auth-1a1a1a?style=for-the-badge&logo=auth0&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite_+_Drizzle-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp_API-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

</div>

---

## ✨ Features

| | Feature | O que faz |
|:--:|:--|:--|
| 🔐 | **Contas** | Login email/password (Better Auth). 1.º utilizador (ou `ADMIN_EMAIL`) vira admin automaticamente. |
| 📝 | **Wishlists** | Cada participante lista o que gostava de receber — o seu santa vê tudo. |
| 🚫 | **Exclusões** | Pares proibidos (casais, irmãos) nunca se tiram um ao outro. |
| 💰 | **Orçamento** | Limite opcional por sorteio, mostrado na página de revelação. |
| 🕰️ | **Histórico** | Sorteios passados evitam repetir o par do ano anterior. |
| 🎲 | **Algoritmo robusto** | Derangement com backtracking — sem auto-sorteio, respeita restrições, ou falha com erro claro. |
| 📬 | **Entrega à escolha** | Por sorteio: página de revelação, WhatsApp+link, ou WhatsApp direto. |

<br>

### 📬 Modos de entrega

<table>
<tr>
<td align="center">🔗<br><b>Reveal</b></td>
<td>Links privados de revelação, com <b>limite de visualizações</b> por link.</td>
</tr>
<tr>
<td align="center">💬<br><b>WA + Link</b></td>
<td>Mensagem WhatsApp com o link de revelação.</td>
</tr>
<tr>
<td align="center">🎅<br><b>WA Direto</b></td>
<td>Mensagem WhatsApp com o nome do par no template.</td>
</tr>
</table>

---

## 🧱 Stack

| Camada | Escolha |
|:--|:--|
| 🖼️ **Framework** | Next.js 15 (App Router) · React 19 |
| 🔐 **Auth** | Better Auth (+ admin plugin) |
| 🗄️ **Base de dados** | SQLite via Drizzle ORM (`better-sqlite3`) |
| 🎨 **UI** | Tailwind CSS v4 · shadcn/ui |
| 📲 **Mensagens** | Meta WhatsApp Cloud API (Graph API) |

---

## 🚀 Começar

```bash
# 1️⃣  Instalar
npm install

# 2️⃣  Configurar
cp .env.example .env
#   • BETTER_AUTH_SECRET  →  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
#   • ADMIN_EMAIL         →  o email com que vais registar (vira admin)
#   • WA_*                →  (opcional) só para entrega via WhatsApp

# 3️⃣  Criar a base de dados
npm run db:migrate

# 4️⃣  (opcional) importar participantes de um data/users.json antigo
npm run migrate:legacy

# 5️⃣  Arrancar
npm run dev      # 👉  http://localhost:3000
```

> 💡 Regista-te com o `ADMIN_EMAIL` para ganhares o papel de admin, depois abre
> **/admin** para adicionar participantes, definir exclusões, escolher a entrega
> e correr o sorteio.

---

## 📲 Configurar WhatsApp

Para `wa_link` / `wa_direct` precisas de uma conta Meta WhatsApp Business e de um
**template** aprovado com dois parâmetros no corpo:

| Param | Conteúdo |
|:--:|:--|
| `{{1}}` | Nome de quem oferece |
| `{{2}}` | Nome do par (`wa_direct`) **ou** URL de revelação (`wa_link`) |

Define `WA_API_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_TEMPLATE_NAME`,
`WA_TEMPLATE_LANGUAGE` no `.env`. A entrega por página de revelação não precisa
de nada disto. ✅

---

## 🛠️ Scripts

| Script | Faz |
|:--|:--|
| `npm run dev` | 🔥 Servidor de desenvolvimento |
| `npm run build` | 📦 Build de produção |
| `npm test` | 🧪 Testes do algoritmo de sorteio |
| `npm run db:generate` | 🧬 Gerar migração Drizzle |
| `npm run db:migrate` | ⬆️ Aplicar migrações |
| `npm run db:studio` | 🔍 Abrir Drizzle Studio |
| `npm run migrate:legacy` | 📥 Importar `data/users.json` antigo |

---

## 🗂️ Estrutura

```
app/          🧭  rotas (auth, dashboard, admin, reveal, api)
components/   🧩  UI (shadcn + componentes)
lib/          ⚙️  auth · db/schema · draw · whatsapp · session
drizzle/      🗃️  migrações SQL
scripts/      📜  migração de dados antigos
```

---

## 📜 Versões

| Branch | O que é |
|:--:|:--|
| 🟢 **v2** | Esta reescrita (Next.js · Better Auth · Drizzle) — branch atual |
| 🟡 **v1** | Protótipo Express original (HTML estático + JSON) |

---

## 🤝 Contribuir

Pull requests são bem-vindos! Se quiseres enriquecer o projeto, abre uma issue
ou um PR. 🎄

## 📄 Licença

MIT — ver [LICENSE](LICENSE).

<div align="center">

### 🎄 Feliz Natal! 🎁

</div>
