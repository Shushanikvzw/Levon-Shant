# Լևոն Շանթ շաբաթօրյա դպրոց — website (Supabase edition, trilingual)

A trilingual (Armenian / Dutch / English) website for the school: history timeline,
Hamazkayin background, teaching staff directory, full course list, a weekly lesson
schedule synchronized with an events calendar, a yearly academic calendar (month
raster, trilingual, editable, switchable by school year), a photo/video gallery with
clickable post/event detail views, child and adult registration forms (with an
organized email sent to the school on every submission), and a **separate admin area**
for staff.

**Backend: [Supabase](https://supabase.com)** — Postgres database with Row Level
Security, Auth, and Storage. Free tier is enough for a school site.

**Two pages:**
- **`index.html`** — the public website. No login, no editing tools — just the school's
  content, in three languages.
- **`admin.html`** — a separate, dedicated page for staff. Reached via the "🔐
  Անձնակազմի մուտք" link in the public site's header, which opens it in a new browser
  tab. Has its own sign-in/sign-up screen and a sidebar-organized dashboard (grouped
  into "Բովանդակություն" for day-to-day publishing and "Կառավարում" for
  registrations/accounts/site text/settings), so admin/SMM never see editing tools
  mixed into the public pages.

Two roles:
- **Admin** — full access: publish/edit/delete anything, view registrations, approve
  new staff accounts and assign roles, edit all site text, manage the logo and contact/
  social links.
- **SMM** — publish news/events/images/videos, manage the weekly schedule, the yearly
  calendar, and the staff directory; edit/delete their own posts.

## Files

```
index.html                     the public website (no editing tools)
admin.html                      the separate admin area: sign-in/sign-up + sidebar dashboard
style.css                       shared design system for both pages
app.js                          public-site logic: i18n, calendar, registration forms, EmailJS
admin.js                        admin-only logic: auth, all publishing/editing/CRUD actions
supabase/migrations/0001_init.sql        database schema + Row Level Security + storage buckets
supabase/migrations/0002_add_english.sql adds English columns for trilingual support
supabase/migrations/0003_trilingual_staff_schedule_posts.sql adds Dutch/English columns for
                                          staff roles, schedule course names, and post titles/bodies
supabase/migrations/0004_teacher_name_transliteration.sql adds Latin-script name columns for
                                          staff and schedule teacher names
supabase/migrations/0005_seed_content.sql   fills the staff, schedule, and yearly calendar
                                          tables with the school's real content (only if empty)
preview.html                    single self-contained file (CSS+JS inlined) of the PUBLIC site only,
                                 for quick viewing — admin.html is a separate file and isn't included
                                 in this preview, since it needs admin.js alongside it to work
README.md                       this file
```

## 1. Push this to GitHub

If you haven't already:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Since you already have GitHub connected to Supabase (Supabase dashboard → your
project → **Project Settings → Integrations → GitHub**), pushing
`supabase/migrations/0001_init.sql` to your linked branch is enough for Supabase to
detect and apply it automatically. If you'd rather control it manually, or the
integration isn't picking it up, use the manual method in step 2 instead — both work.

## 2. Set up the database (2 minutes)

**If your GitHub↔Supabase integration runs migrations automatically:** just pushing
the repo (step 1) is enough — skip to step 3 once all five migrations have run (check
**Database → Migrations** in the Supabase dashboard to confirm `0001_init`,
`0002_add_english`, `0003_trilingual_staff_schedule_posts`,
`0004_teacher_name_transliteration`, and `0005_seed_content` all succeeded).

**Manual method (always works):**
1. Open your Supabase project → **SQL Editor → New query**.
2. Paste the entire contents of `supabase/migrations/0001_init.sql` → **Run**. It
   creates all tables, security policies, and the three storage buckets (`posts`,
   `staff`, `site-assets`) in one go.
3. New query again → paste `supabase/migrations/0002_add_english.sql` → **Run**. It
   adds the English columns needed for the third language.
4. New query again → paste `supabase/migrations/0003_trilingual_staff_schedule_posts.sql`
   → **Run**. It adds Dutch/English columns for staff roles, schedule course names, and
   post titles/bodies.
5. New query again → paste `supabase/migrations/0004_teacher_name_transliteration.sql`
   → **Run**. It adds Latin-script name columns for staff and schedule teacher names.
6. New query again → paste `supabase/migrations/0005_seed_content.sql` → **Run**. **This
   one matters a lot**: connecting the site to a real Supabase project (step 4 below)
   means it now reads the staff directory, weekly schedule, and yearly calendar from
   your actual database — which starts out completely empty. Migrations 0001–0004 only
   create empty tables; this one fills them with the school's real teacher photos,
   weekly class times, and the full 2025–2026 calendar, so the site isn't blank the
   moment you connect it. It only inserts if a table is currently empty, so it's safe
   to re-run and will never overwrite anything you've since added or edited yourself.

All five files are safe to re-run if needed.

## 3. Configure email/password sign-in

Supabase project → **Authentication → Providers → Email**:
- Make sure **Email** is enabled (it is by default).
- **"Confirm email"**: for a small school site, turning this **off** is simplest — new
  staff accounts become usable immediately after admin approval, without an extra
  email-confirmation click. Leave it **on** if you'd rather require email verification
  too (staff will need to click a confirmation link Supabase sends them before they can
  sign in, in addition to admin approval).

## 4. Connect the site to your project

Supabase project → **Project Settings → API** → copy the **Project URL** and the
**anon public** key (never use the `service_role` key here — it must never appear in
browser code).

Open `app.js` and paste them near the top:

```js
const supabaseConfig = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "eyJhbG..."
};
```

## 5. Generate Admin and SMM logins (this replaces "create user" forms)

Supabase doesn't allow creating other users' passwords from browser code — only a
secret server-side key can do that, and that key must never be shipped to a website.
So instead, the site uses a **self-signup + admin-approval** flow, which is both secure
and needs no extra backend:

1. **Create the first admin (you):**
   - Open the live site → **"Անձնակազմի մուտք"** → tab **"Գրանցվել որպես անձնակազմ"**
     → enter your name, email, and choose a password → submit.
   - This creates your login *and* a matching row in the `profiles` table with no role
     yet ("pending") — you can't access the dashboard until a role is set, and right
     now nobody can set one from the site (no admin exists yet).
   - Go to Supabase → **Table Editor → profiles** → find your row → set its `role`
     column to `admin` → save.
   - Back on the site, sign in with the email/password you just chose. You're now
     admin, with a **"👤 Հաշիվներ"** tab in the dashboard.

2. **Every account after that — no more manual database editing:**
   - Each new staff member goes to the site themselves → **"Գրանցվել որպես
     անձնակազմ"** → picks their own name, email, and password → submits. They see a
     "waiting for approval" message and can't sign in yet.
   - You (admin) open the dashboard → **"👤 Հաշիվներ"** → their name appears with
     "Սպասում է" (pending) → pick **SMM** or **Admin** from the dropdown next to their
     row → **"Պահպանել"**.
   - They can now sign in immediately with the password they chose. You can change or
     revoke anyone's role the same way, any time (set back to "—" to remove access).

This means passwords are always chosen by the account holder themselves, never
generated or handled by you — you're only approving access and assigning the role.

## 6. Get registration emails sent to levon.shant.dproc@gmail.com (5 minutes, free)

Every registration is always saved to the database and visible in the dashboard's
"Գրանցումներ" tab regardless of this step — this just adds an automatic, clearly
organized email to the school's inbox the moment someone submits either form.

1. Go to https://www.emailjs.com → sign up (free tier: 200 emails/month).
2. **Email Services → Add New Service → Gmail** → connect
   `levon.shant.dproc@gmail.com` → note the **Service ID**.
3. **Email Templates → Create New Template**:
   - **To email**: `levon.shant.dproc@gmail.com` (typed directly — this is what makes
     every registration always land in the school's inbox)
   - **Subject**: `{{subject}}`
   - **Content**: `{{message}}`
   - **Reply To**: `{{reply_to}}`

   Save it and note the **Template ID**.
4. **Account → General** → copy your **Public Key**.
5. Open `app.js` and fill in the `emailjsConfig` block right after the Supabase config:

   ```js
   const emailjsConfig = {
     publicKey: "your public key",
     serviceId: "service_abc1234",
     templateId: "template_xyz789"
   };
   ```

Until this is filled in, registrations still save normally — only the email
notification is skipped, silently.

## 7. Put the site online

Since it's already on GitHub, the simplest free option is **GitHub Pages**:
repo → **Settings → Pages → Source: Deploy from a branch → main → / (root)** → save.
Your site appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/` within a minute or
two. A custom domain (e.g. `levon-shant-dproc.com`) can be attached under the same
Pages settings.

Netlify or Vercel work just as well and both connect directly to your GitHub repo with
auto-deploys on every push, if you'd prefer either of those instead.

## Notes & next steps

- **The admin area is now a separate page** (`admin.html`), opened in a new tab from
  the public site's "🔐 Անձնակազմի մուտք" link. Signing in or signing up happens there
  directly (no modal), and once approved, the dashboard uses a proper sidebar — grouped
  into "Բովանդակություն" (Publish, Schedule, Staff, Yearly Calendar, My posts) and
  "Կառավարում" (Registrations, Accounts, Site Content, and a new **Settings** tab) —
  instead of the old top row of tabs, so it's much faster to find the right section.
  Public visitors never see any editing UI at all now; `app.js` (the public site) no
  longer contains any auth or write code.
- **Social media links are now editable**: Facebook, Instagram, and Blog links each
  have their own field in the admin's new **"⚙️ Կարգավորումներ" (Settings)** tab,
  alongside the address/email/phone that were already editable. Changing a link updates
  it everywhere it appears on the public site (the Contact section and the footer) the
  next time that page loads.
- **Posts and events are now clickable.** Every card in the Activities feed and Gallery
  opens a detail view with the full image, title, date, and complete (untruncated)
  description — card text is now clipped to 3 lines with a "More info ↗" hint so there's
  a clear reason to click through. Clicking an event on the calendar (in either the
  monthly grid's day view or the yearly overview) does the same, for any event that was
  published as a post — holiday/important-date entries (which don't have a full post
  behind them) stay as simple inline text, as before.
- **Site Content now covers every section shown in the nav**: Hero, Մեր դպրոցը (About),
  Համազգային ընկերակցություն (Hamazkayin), Ուսումնական բաժին (Department, including
  all four cards), Օրացույց (both the weekly schedule and yearly calendar headers),
  Միջոցառումներ (Activities), Լուսանկարներ/տեսանյութեր (Gallery), Գրանցում
  (Registration, including the "what you'll need" checklist), and Կապ (Contact) — 46
  fields total, each with ՀԱՅ/NL/EN inputs, grouped under section headings in the
  dashboard so the long form stays navigable. **The actual address, email, and phone
  number are now editable too** — previously hardcoded, now a small dedicated form
  right below the main content editor (same value shown in all three languages, since
  addresses/phone numbers aren't translated). Posts, staff, schedule entries, and
  yearly-calendar entries remain separately editable from their own dashboard tabs, as
  before — Site Content is specifically for each section's fixed header/intro text.
- **Why the staff photos, schedule, and yearly calendar went empty after connecting
  Supabase**: all of that content only ever lived in `app.js` as a fallback shown while
  Supabase wasn't configured. The moment real project credentials are added (step 4),
  the site switches to querying your actual database instead — which starts out
  completely empty, since migrations only create table structure, not data. Run
  `0005_seed_content.sql` (step 2.6 above) to fill it with the real content immediately;
  after that, everything you add or edit from the dashboard lives in the database
  permanently, same as before.
- **Teacher names now show in Latin script for Dutch/English visitors.** Armenian
  script isn't readable to most non-Armenian speakers, so both the staff directory and
  teacher names in the weekly schedule show a Latin transliteration (e.g. "Լիանա
  Մելքոնյան" → "Liana Melkonyan") when NL or EN is selected, and the original Armenian
  when ՀԱՅ is selected. Add it via the **"Name in Latin letters"** field in the
  **"🧑‍🏫 Անձնակազմ"** tab, or **"Teacher name in Latin letters"** in **"🗓️
  Դասացուցակ"**. Leaving it blank just falls back to showing the Armenian name in every
  language, same as before.
- **Staff roles, schedule classes, and published posts are now trilingual too.**
  Teacher/staff *names* and *teacher names in the schedule* stay as typed (they're
  proper nouns, not translated) — but each teacher's role/subject, each schedule
  entry's class name, and every post's title/description now have separate ՀԱՅ/NL/EN
  fields. The **"✍️ Հրապարակել"** (Publish), **"🗓️ Դասացուցակ"** (Schedule), and
  **"🧑‍🏫 Անձնակազմ"** (Staff) dashboard tabs each show three input fields per text
  field; leaving NL/EN blank just falls back to the Armenian text until you fill them
  in. This covers the Activities feed under "Culturele en jongerenevenementen &
  mededelingen" as well — its post cards now render in whichever language is selected.
- **Every visitor-facing piece of text is now translated** into Dutch and English —
  including things that were easy to miss on a first pass: accessibility labels (menu
  button, calendar prev/next arrows, close button, image alt text), the "School's
  Facebook group" link, and the entire staff sign-in/sign-up modal (title, tabs, field
  labels, the sign-up approval-notice paragraph, buttons). A quick script check
  confirms every `data-i18n*` tag in the page has both a Dutch and an English entry —
  zero gaps in either direction.
- **One deliberate exception**: the staff dashboard itself (the panels admin/SMM see
  after signing in — Publish, Schedule, Staff, Yearly Calendar, Registrations,
  Accounts, Site Content) stays in Armenian. It's an internal tool for the school's own
  team, not visitor-facing content, so it wasn't included in the translation pass. Say
  the word if you'd like that translated too.
- **The site is now trilingual** — Armenian / Dutch / English, switched with the
  3-way "ՀԱՅ / NL / EN" pill toggle in the header. Everything reacts: nav, hero, about,
  Hamazkayin, department, staff, classes, both calendars, registration forms, footer,
  and the sign-in button. The history timeline, class list, and yearly-calendar entries
  all have full English translations built in. Editable content (Site Content tab and
  the yearly-calendar entries) now has three input fields per field — ՀԱՅ / NL / EN —
  so admin can adjust wording in any of the three languages independently. Names,
  post/event text, and staff roles stay as typed (not machine-translated), same as
  before with Dutch — only the site's own interface and pre-written content are
  trilingual.
- **Why Supabase instead of Firebase**: same idea (auth + database + file storage
  without running your own server), built on Postgres. Row Level Security policies
  (in the migration file) enforce exactly the same rules as before — public read on
  everything except registrations and the account list, public write only on the
  registration forms, staff-only (admin+SMM) write on posts/schedule/staff/yearly
  events, admin-only on site text/logo/account roles/registration access.
- **Registration emails**: see section 6 above. Independent of Supabase — works the
  same regardless of backend.
- **The yearly calendar now covers every school year**, not just one — see the "‹ 2025–2026 ›"
  navigator above the month grid. It's computed automatically from each entry's date
  (September–August = one school year), so admin doesn't need to tag anything by year;
  just add dates normally in "📅 Տարեկան օրացույց" and they land in the right year
  on their own. Empty years just show empty month cards, ready for admin to fill in.
- **Both calendars are synchronized.** Whether admin/SMM adds an item as a published
  "Միջոցառում" (event) in **"✍️ Հրապարակել"**, or as a holiday/important date in
  **"📅 Տարեկան օրացույց"**, it shows up in both the monthly grid ("Օրացույց") and the
  yearly month-raster automatically. Deleting it from either tab removes it from both.
- **Weekly schedule entries are fully editable**: each row in **"🗓️ Դասացուցակ"** has
  a "Ցուցադրել" (show/hide) checkbox to hide a course without deleting it, plus
  "Խմբագրել" (edit) and delete.
- **The school logo** can be uploaded or removed from the Site Content tab — replaces
  the "ԼՇ" initials in the header for every visitor immediately.
- **Images always fit their frame**: staff photos scale to show the whole person
  (never cropped), the logo fits without distortion, post/gallery photos crop
  centered regardless of the original size.
- **The language toggle** is a sliding pill switch; every dynamic section (timeline,
  classes list, calendars, schedule, forms) re-renders in the new language instantly.
- **Media uploads**: post images/video → `posts` bucket (50MB soft limit, tune in the
  migration file); staff photos → `staff` bucket; logo & yearly-calendar image →
  `site-assets` bucket (admin-only writes). Large videos are better linked as a
  YouTube URL in the "...կամ նկարի/YouTube հղում" field than uploaded directly.
- **Registrations** land in the `registrations` table and are visible only to admins
  in the dashboard; export via Supabase → Table Editor → registrations → the export
  button, whenever needed.
