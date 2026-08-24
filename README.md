# Լևոն Շանթի անվան շաբաթօրյա դպրոց — website (Supabase edition, trilingual)

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
index.html                     the public website (no editing tools) — also where parents
                                 and teachers sign in now, via an in-page modal
admin.html                      the separate admin area: sign-in/sign-up + sidebar dashboard
style.css                       shared design system for both pages
app.js                          public-site logic: i18n, calendar, registration forms, EmailJS,
                                 and the parent/teacher portal modal (auth + announcements)
admin.js                        admin-only logic: auth, all publishing/editing/CRUD actions
supabase/migrations/0001_init.sql        database schema + Row Level Security + storage buckets
supabase/migrations/0002_add_english.sql adds English columns for trilingual support
supabase/migrations/0003_trilingual_staff_schedule_posts.sql adds Dutch/English columns for
                                          staff roles, schedule course names, and post titles/bodies
supabase/migrations/0004_teacher_name_transliteration.sql adds Latin-script name columns for
                                          staff and schedule teacher names
supabase/migrations/0005_seed_content.sql   fills the staff, schedule, and yearly calendar
                                          tables with the school's real content (only if empty)
supabase/migrations/0006_gallery_albums.sql  adds event photo/video albums (multi-photo galleries)
supabase/migrations/0007_schedule_staff_admin_only.sql  restricts the weekly schedule and
                                          staff directory to admin-only editing (SMM loses write access)
supabase/migrations/0008_custom_sections.sql  adds admin-manageable custom sections — whole
                                          new content blocks addable to the public site
supabase/migrations/0009_custom_sections_nav.sql  adds the option to show a custom section's
                                          own link in the site's main navigation menu
supabase/migrations/0010_custom_sections_position.sql  adds the option to choose exactly
                                          where a custom section appears on the site
supabase/migrations/0011_schedule_cancellations.sql  adds the ability to cancel classes
                                          on a specific Saturday (holiday, break, etc.)
supabase/migrations/0012_event_registrations.sql  adds optional attendance registration
                                          for events (name, phone, address, email)
supabase/migrations/0013_event_registration_limit.sql  adds an optional capacity limit
                                          for event registration, enforced server-side
supabase/migrations/0014_class_assignments.sql  adds the ability to assign registered
                                          students to specific schedule slots
supabase/migrations/0015_cancel_specific_course.sql  adds the ability to cancel a single
                                          specific course on a Saturday, not just the whole day
supabase/migrations/0016_parent_teacher_roles.sql  adds parent and teacher roles, with
                                          per-class announcements and access control
supabase/migrations/0017_allow_teacher_parent_roles.sql  fixes a database constraint that
                                          was rejecting the teacher/parent roles outright
supabase/migrations/0018_parent_teacher_read_access.sql  grants parents/teachers the read
                                          access to their own child/class that was missing,
                                          which is why a parent's own view showed nothing
supabase/migrations/0019_fix_rls_recursion.sql  fixes an "infinite recursion" bug that
                                          0018 accidentally introduced — this broke logging
                                          in for everyone, not just parents/teachers, and
                                          is REQUIRED on top of 0018
supabase/migrations/0020_announcement_reads.sql  adds read-tracking so a teacher can see
                                          which connected parents have viewed each announcement
supabase/migrations/0021_announcement_votes.sql  adds optional yes/no voting on an
                                          announcement, teacher-controlled per announcement
supabase/migrations/0022_teacher_contact_sharing.sql  adds optional, teacher-controlled
                                          contact-sharing with connected parents
supabase/migrations/0023_parent_see_teacher.sql  fixes a missing permission that silently
                                          prevented parents from seeing the teacher's
                                          name at all — REQUIRED on top of 0022
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
the repo (step 1) is enough — skip to step 3 once all six migrations have run (check
**Database → Migrations** in the Supabase dashboard to confirm `0001_init`,
`0002_add_english`, `0003_trilingual_staff_schedule_posts`,
`0004_teacher_name_transliteration`, `0005_seed_content`, and `0006_gallery_albums`
all succeeded).

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
7. New query again → paste `supabase/migrations/0006_gallery_albums.sql` → **Run**. It
   creates the `gallery_albums` table and a new `gallery` storage bucket for the
   event-photo-album feature (see Notes below).
8. New query again → paste `supabase/migrations/0007_schedule_staff_admin_only.sql`
   → **Run**. Restricts the weekly schedule and staff directory to admin-only editing.
9. New query again → paste `supabase/migrations/0008_custom_sections.sql` → **Run**.
   Adds the `custom_sections` table for admin-created content blocks.
10. New query again → paste `supabase/migrations/0009_custom_sections_nav.sql`
    → **Run**. Adds the option to show a custom section in the main navigation menu.
11. New query again → paste `supabase/migrations/0010_custom_sections_position.sql`
    → **Run**. Adds the option to choose exactly where a custom section appears.
12. New query again → paste `supabase/migrations/0011_schedule_cancellations.sql`
    → **Run**. Adds the ability to cancel classes on a specific Saturday.
13. New query again → paste `supabase/migrations/0012_event_registrations.sql`
    → **Run**. Adds optional attendance registration for events.
14. New query again → paste `supabase/migrations/0013_event_registration_limit.sql`
    → **Run**. Adds an optional capacity limit for event registration.
15. New query again → paste `supabase/migrations/0014_class_assignments.sql` → **Run**.
    Adds the ability to assign registered students to specific schedule slots.
16. New query again → paste `supabase/migrations/0015_cancel_specific_course.sql`
    → **Run**. Adds the ability to cancel one specific course on a Saturday.
17. New query again → paste `supabase/migrations/0016_parent_teacher_roles.sql`
    → **Run**. Adds parent and teacher roles, per-class announcements, and access control.
18. New query again → paste `supabase/migrations/0017_allow_teacher_parent_roles.sql`
    → **Run**. Fixes a leftover database constraint that rejected the teacher/parent
    roles outright — **required** for approving any teacher/parent account to work.
19. New query again → paste `supabase/migrations/0018_parent_teacher_read_access.sql`
    → **Run**. **Required** for parents to actually see their child's class/announcements,
    and for teachers to see their students and connected parents.
20. New query again → paste `supabase/migrations/0019_fix_rls_recursion.sql` → **Run**.
    **Critical, run this immediately if you've already run 0018** — it fixes an
    "infinite recursion" bug in 0018 that broke logging in for *everyone* (admin
    included), not just parents/teachers.
21. New query again → paste `supabase/migrations/0020_announcement_reads.sql` → **Run**.
    Adds read-tracking so a teacher can see which connected parents have viewed
    each announcement.
22. New query again → paste `supabase/migrations/0021_announcement_votes.sql` → **Run**.
    Adds optional yes/no voting on an announcement, teacher-controlled per announcement.
23. New query again → paste `supabase/migrations/0022_teacher_contact_sharing.sql`
    → **Run**. Adds optional, teacher-controlled contact-sharing with connected parents.
24. New query again → paste `supabase/migrations/0023_parent_see_teacher.sql` → **Run**.
    **Critical, run this right after 0022** — without it, a parent has no permission
    to see the teacher's name at all, so nothing from 0022 appears for them.

All twenty-three files are safe to re-run if needed.

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
organized email to the school's inbox the moment someone submits either form, **and**
a confirmation email back to the family who registered, so they have something in
their inbox confirming it went through.

1. Go to https://www.emailjs.com → sign up (free tier: 200 emails/month, shared across
   both templates below).
2. **Email Services → Add New Service → Gmail** → connect
   `levon.shant.dproc@gmail.com` → note the **Service ID** (both templates below use
   this same service).
3. **Email Templates → Create New Template** (this one notifies the school):
   - **To email**: `levon.shant.dproc@gmail.com` (typed directly — this is what makes
     every registration always land in the school's inbox)
   - **Subject**: `{{subject}}`
   - **Content**: `{{message}}`
   - **Reply To**: `{{reply_to}}`

   Save it and note the **Template ID**.
4. **Email Templates → Create New Template** again (this second one confirms receipt
   to the family — note the **To email** is different this time):
   - **To email**: `{{to_email}}` (a variable, not typed directly — this is what lets
     it go to whichever family just registered, instead of always going to the school)
   - **Subject**: `{{subject}}`
   - **Content**: `{{message}}`

   Save it and note this **Template ID** too (a different one from step 3).
5. **Account → General** → copy your **Public Key**.
6. Open `app.js` and fill in the `emailjsConfig` block right after the Supabase config:

   ```js
   const emailjsConfig = {
     publicKey: "your public key",
     serviceId: "service_abc1234",
     templateId: "template_xyz789",              // from step 3, notifies the school
     confirmationTemplateId: "template_abc456"    // from step 4, confirms to the family
   };
   ```

Until this is filled in, registrations still save normally — only the email
notifications are skipped, silently. The two are independent: if you only set up the
first template (step 3) and leave `confirmationTemplateId` as-is, the school still
gets notified as before, the family just won't get a confirmation email yet.

## 7. Put the site online

Since it's already on GitHub, the simplest free option is **GitHub Pages**:
repo → **Settings → Pages → Source: Deploy from a branch → main → / (root)** → save.
Your site appears at `https://YOUR-USERNAME.github.io/YOUR-REPO/` within a minute or
two. A custom domain (e.g. `levon-shant-dproc.com`) can be attached under the same
Pages settings.

Netlify or Vercel work just as well and both connect directly to your GitHub repo with
auto-deploys on every push, if you'd prefer either of those instead.

## Notes & next steps

- **🚨 Fixed: the teacher's name (and contact details) never showed up for
  parents.** This wasn't a display bug — the database had simply never been given
  permission to let a parent read `teacher_assignments` (to know which teacher
  teaches their child's class) or that teacher's own profile (to get their name).
  Only the reverse direction — a teacher seeing a parent's profile — existed from an
  earlier migration. Without this, the parent's query for "who teaches this class"
  silently came back empty, so the whole "🧑‍🏫 [teacher name]" button never rendered
  at all, regardless of whether the teacher had filled in and shared their contact
  details. **Migration `0023_parent_see_teacher.sql` is required right after `0022`**
  for any of this to actually show up.

- **New: teachers can optionally share contact details with connected parents, and
  parents now see who the teacher is.** At the top of a teacher's own portal view,
  "📞 Իմ կոնտակտային տվյալները ծնողների համար" lets them switch sharing on/off and
  fill in a phone number and/or email — off by default, nothing shown to anyone
  until a teacher turns it on. Every class a parent sees now shows "🧑‍🏫 [teacher
  name]" right in the course header; clicking it reveals the phone/email only if
  that teacher has chosen to share, or a plain note that they haven't. This is
  enforced by the database itself, not just hidden in the interface — a parent can
  only ever see this for a teacher who actually teaches their own child's class, and
  the raw table is kept completely separate from the teacher's login profile, so a
  parent can never see the teacher's actual login email unless the teacher
  specifically chose to share that as their contact address.

- **New: teachers can click a parent's name to see contact details.** In a
  teacher's "👨‍👩‍👧 Ուսանողներ և ծնողներ" list, each parent's name is now a button —
  clicking it reveals the parent account's email plus the family's own mother/father
  contact info from the child's registration (which already includes phone numbers,
  since that's how the registration form was filled in) — useful if a teacher needs
  to actually call or message home about something. This uses data the teacher's
  view already had access to, just not shown before, so no new database migration
  was needed.

- **New: linking a parent works from the teacher's side too, not just the parent's
  side.** In "🧑‍🏫 Ուսուցիչի դասեր," any student showing "⚠️ Ծնող կապակցված չէ" now has
  its own search box right there — type a name (or leave it blank to browse) and
  matching parent accounts appear as clickable cards, with whichever one's login
  email matches that student's own registration email starred (⭐) and sorted to the
  top automatically, exactly like the parent-side search. Click one to link it
  instantly, no need to go find that specific parent account in the other section
  first. Both directions now work — start from a parent and search for their
  child, or start from a teacher's class and search for the right parent.

- **New: searching for a child to link, instead of scrolling a long dropdown.**
  In "🔑 Ուսուցիչ/ծնող կապեր," the "➕ Կապակցել նոր գրանցում" dropdown is now a search
  box — type a name and matching registrations appear as clickable cards below it,
  same as the class roster board's student picker. Clicking a card links it
  immediately, and you can keep linking as many additional children as needed, one
  click each, without the list closing or resetting.
- **New: automatic match suggestion by email.** Selecting a parent account now
  checks whether any unlinked registration's own contact email matches that parent's
  login email — if so, a banner suggests them by name with a single "✔ Կապակցել
  բոլորը" button to link them all at once. This is just a suggestion, not automatic
  linking on its own — admin still confirms it with one click, and can always search
  and link further children manually on top of it (e.g. if a sibling registered
  under a different email).

- **New: admin can edit and delete registrations.** The "📋 Գրանցումներ" table was
  previously read-only (view and export only) — each row now has "Խմբագրել" (Edit)
  and "Ջնջել" (Delete) buttons. Edit opens a form pre-filled with everything that
  registration currently has, correctly showing only the child-specific fields
  (name, birth date, parents) or the adult-specific ones (phone, level) depending on
  which type it is, plus the shared fields (address, native language, courses,
  photo consent) either way. Delete asks for confirmation first, since it can't be
  undone — useful for a duplicate or mistaken submission.

- **Fixed: images in the gallery lightbox showing with huge black bars.** The
  lightbox was forcing every photo into a fixed, very wide 16:10 (or 4:3 on mobile)
  box no matter the image's actual shape — a portrait photo or a slide screenshot
  (closer to square or 4:3) got squeezed into the middle with large black bars on
  both sides, exactly like the screenshot. It now sizes to each image's own real
  proportions instead of forcing one fixed shape, so there's no more letterboxing.
  Clicking the photo also now opens its original full-resolution file in a new tab,
  for examining fine detail (like small text in a slide) beyond what fits in the
  lightbox itself.

- **New: a full recap right after registering, not just "thank you."** Submitting
  either registration form now opens a confirmation showing everything just
  submitted — for children, the shared family info (address, parents, native
  language, consent) plus each child's own name, birth date, and chosen courses as
  clear tags; for an adult, all their own details the same way. This appears
  immediately on-screen (so it doesn't depend on email actually arriving), and the
  confirmation email sent to the family now includes the same full recap too,
  rather than just the name and course list it showed before.

- **New: optional yes/no voting on an announcement.** When posting, a teacher can
  check "🗳️ Այս հայտարարությունը պահանջում է Այո/Ոչ քվեարկություն ծնողներից" — it's
  entirely optional per announcement, left unchecked by default, exactly as asked.
  When checked, connected parents see "✅ Այո" / "❌ Ոչ" buttons right on that
  announcement (and only that one — a normal announcement never shows voting
  buttons), can change their answer any time by clicking the other option, and the
  teacher sees a live tally — "🗳️ Քվեարկություն՝ ✅ Այո 3 · ❌ Ոչ 1 · ⏳ դեռ 2" — plus
  exactly who voted which way and who hasn't answered yet, using the same connected-
  parents list already built for the "seen by" feature.

- **New: teachers can see who's seen their announcement.** Every announcement in a
  teacher's view now shows "👁️ Ովքեր են տեսել (2/4)" — a checklist of every parent
  connected to a student in that specific class, each marked ✅ (seen) or ⏳ (not yet).
  It works automatically: whenever a parent opens their announcements, viewing the
  page itself marks everything currently shown to them as read — there's nothing for
  the parent to click or do differently. Only that class's connected parents are
  counted; a class with no linked parent accounts yet shows a note explaining that,
  rather than an empty or misleading checklist.

- **New: the homepage's "1999 / Mechelen / Hamazkayin" stats strip is now editable.**
  These three items (and their small captions underneath — "հիմնադրման տարեթիվ",
  "Nijverheidsstraat 45", "հայկական կրթական ցանց") were previously hardcoded directly
  in the page and had no admin field at all — the small captions could already be
  translated between languages, but nothing about them was editable. All six pieces
  now appear in the "Hero" section of "📝 Բովանդակություն" (Site Content), pre-filled
  with the current live text, in all three languages.

- **Fixed: the address (and other Settings fields) reverting to the old value.** The
  save itself was actually working correctly — the bug was that the Settings form
  had a shortcut that reused an in-memory copy of the site's text instead of
  re-checking the database, and nothing ever refreshed that copy after a save. So the
  database had your new address, but the form kept showing whatever it had loaded at
  the very start of the session. It now always re-fetches fresh data whenever the
  form is shown, and also refreshes its own copy immediately after every successful
  save — so this can't happen again even within the same session, not just after a
  page reload.

- **New: registering multiple children in one submission.** The child registration
  form now has "➕ Ավելացնել ևս մեկ երեխա" — clicking it adds another name/birth
  date/gender/courses block for a second (or third, etc.) child, while the shared
  family fields (address, parents' contact, native language, photo consent) are only
  filled in once and apply to all of them. Each child still becomes its own separate
  row in the database (so admin's registration list, roster board, and everything
  else works exactly as before) — the family just gets one combined confirmation
  email listing every child, and the school gets one combined notification, instead
  of a separate email per child for what was really one submission.

- **Fixed: an announcement's "signed by" line showed the teacher's email instead of
  their name.** When posting, the code was literally storing the teacher's login
  email as their display name. It now uses their actual name from sign-up instead
  (with the internal "[Ուսուցիչ]" role tag automatically stripped off, since that was
  only ever meant to help admin recognize pending accounts, not to be shown to
  parents). **Announcements already posted before this fix will still show the old
  email** — a teacher can fix any of them immediately by clicking "Խմբագրել" and
  saving again (even without changing the text), since editing now also refreshes the
  name shown.

- **New: selecting a teacher now shows their students and connected parents right
  there.** Below the class checklist in "🔑 Ուսուցիչ/ծնող կապեր," a live preview lists
  every student in each of that teacher's classes — for children, the linked parent's
  name (or a clear "⚠️ Ծնող կապակցված չէ" if none yet); for adults, their own contact
  info directly, since an adult student doesn't need a parent account at all.
- **Clarified: adult students link directly, no parent step needed.** The
  "👨‍👩‍👧 Ծնողի երեխա(ներ)" section is renamed "👨‍👩‍👧 Հաշվի կապակցում գրանցման հետ" to
  make clear it's the same mechanism either way — for a child, link the *parent's*
  account to the child's registration; for an adult student, link *their own* account
  directly to their own registration. There was never a real requirement to "link to
  a parent first" for adults — the confusion was purely the old labeling implying a
  parent-child relationship that doesn't apply to adult students. The sign-up role
  option is now "Ես ծնող եմ (կամ մեծահասակ ուսանող)" so an adult doesn't have to
  awkwardly claim to be someone's parent to create an account for themselves.

- **Fixed: teacher's "students and parents" list showed "Could not find a
  relationship between 'parent_links' and 'profiles'."** This is a different bug
  from the recursion issue above, in the same new feature. The code tried to fetch a
  parent's name/email directly alongside `parent_links` in one request, but
  `parent_links.parent_user_id` points to `auth.users`, not directly to `profiles` —
  even though they share the same underlying ID, Supabase can't automatically
  combine two tables that aren't directly connected by a foreign key. Fixed by
  fetching the two pieces separately and joining them in the browser instead — no
  database migration needed for this one, it was purely how the request was built.

- **🚨 Critical fix — run `0019_fix_rls_recursion.sql` immediately if you've run `0018`.**
  Migration `0018` had a real bug: it added a rule on `class_assignments` that checks
  `parent_links`, and a rule on `parent_links` that checks `class_assignments` right
  back — the database ends up needing to check one to verify the other, forever,
  and gives up with an error: `"infinite recursion detected in policy for relation
  parent_links"`. The serious part isn't just that the parent/teacher portal broke —
  it's that this made the `profiles` table's own permission check fail for
  **everyone**, including admin, since the database has to consider every rule on a
  table for any query against it, and one broken rule fails the whole check. That's
  why even a normal admin login started incorrectly showing "still awaiting approval."
  `0019` fixes this by rewriting those rules to use a small helper function instead of
  querying the other table directly (the same technique already used successfully
  elsewhere in this project) — that breaks the loop entirely. If you've already run
  `0018`, run `0019` right after it and everything (including plain admin login)
  should go back to working immediately.

- **Also fixed: two places that could silently show "pending approval" for any
  failure, not just an actual pending account.** Both `admin.js` and the portal
  modal's code checked whether a role was found, but never checked whether the
  underlying database query itself had actually failed for some other reason —
  Supabase doesn't throw an exception for a failed query, it returns the failure
  quietly in a separate field that wasn't being read. A real error (like the
  recursion bug above) looked identical to "you haven't been approved yet." Both now
  show the real error message when there is one.

- **Fixed the real reason a parent's view showed nothing.** The `class_assignments`
  table (which records which child is in which class) could previously only be read
  by admin — meaning even after linking a parent to a child *and* placing that child
  in a class, the parent's own login still couldn't read that connection to display
  it. **Migration `0018_parent_teacher_read_access.sql` must be run** — it grants
  parents read access to their own linked child's class placement, and teachers read
  access to their own class's roster and the connected parent contacts, without
  opening anything wider than that.

- **New: parents now see their child by name, which course, and the hours.** Instead
  of jumping straight to announcement groups, the parent view now opens with a clear
  card per linked child — "👶 [name]" followed by their actual assigned course(s) with
  time (e.g. "📚 Մայրենի 2 · 09:00–10:00"), or a plain note if not yet assigned to
  anything. Announcements, grouped by course and newest-first, follow below that.

- **New: teachers see their students and connected parents per class.** Each of a
  teacher's class sections now opens with a "👨‍👩‍👧 Ուսանողներ և ծնողներ" list —
  every student placed in that class, and which parent account (if any) is linked to
  them — before the announcement form and history. If a student doesn't have a linked
  parent account yet, that's shown plainly too, so it's clear why that family isn't
  seeing the announcements.

- **Clarified: linking a parent to a child is not the same as placing that child in a
  class.** If a parent logs in and sees "your child isn't assigned to any class yet,"
  it means exactly that — the "🔑 Ուսուցիչ/ծնող կապեր" tab only connects *which child*
  belongs to a parent account; it's a separate step, in "👥 Դասարանների ուսանողներ,"
  to actually place that child into a specific scheduled class (the same step used to
  build the schedule from registrations in general). The parent-linking list now
  shows "✅ Դասին նշանակված է" or "⚠️ Դեռ դասի նշանակված չէ" next to each linked child
  so this is obvious immediately, instead of only being discovered after the parent
  logs in and sees nothing.

- **Mobile pass on the parent/teacher portal.** The header's two login buttons
  (admin and parent/teacher) now stack cleanly into their own full-width column on
  phones instead of competing for space alongside the language switch and menu icon.
  The sign-up form's "Ես ծնող եմ / Ես ուսուցիչ եմ" picker and the email/phone toggle
  switch from side-by-side to stacked, since two labels with an emoji and text each
  were too cramped at ~140px wide. The Edit/Delete buttons under each announcement
  become full-width and stack if needed, and course headers wrap the course name and
  time badge onto separate lines instead of forcing them to fit on one.

- **Parent/teacher login moved into the main site — no separate page anymore.** What
  was `portal.html` is now a "👨‍👩‍👧 Ծնող/Ուսուցիչ" button right in the header (next to
  the staff login button) and a matching link in the footer, both on `index.html`
  itself. Clicking either opens an in-page modal with sign-in/sign-up — after signing
  in, the same modal shows the announcement view directly, with nothing to navigate to
  and no separate URL to find or bookmark. `admin.html` stays a genuinely separate
  page on purpose (it's a much higher-privilege area), but parents and teachers now
  never leave the site they already know.

- **Fixed: teacher/parent accounts could log into `admin.html`.** They couldn't
  actually change anything there — every write action (publishing, schedule, staff,
  yearly calendar, everything) has always required the `admin` or `smm` role at the
  database level, and teacher/parent accounts were never granted that — but they
  could still authenticate into the admin page and see some of its non-admin-only
  tabs, which was never supposed to happen. `admin.html` now checks specifically for
  `admin`/`smm` and redirects anyone else back to the main site's own login instead.
  **To confirm the full picture**: a teacher's *only* capability, anywhere, is
  posting/editing/deleting announcements for their own assigned class — no events, no
  calendar, no schedule changes, nothing else, either in the interface or in what the
  database will actually allow them to do.

- **Fixed: approving a teacher/parent account showed an error.** The database had a
  leftover rule (a `CHECK` constraint on `profiles.role`) from before teacher/parent
  roles existed, that only allowed `'admin'` or `'smm'` — so trying to assign
  "🧑‍🏫 Ուսուցիչ" or "👨‍👩‍👧 Ծնող" to a pending account was being rejected by the
  database itself, not a bug in the page's own code. **Migration
  `0017_allow_teacher_parent_roles.sql` must be run** for role approval to work at
  all for these two roles — if you already ran `0016` before this fix, you still need
  to run `0017` on top of it.

- **New: parent and teacher roles, with per-class announcements.**

  **Important — how account creation actually works.** Admin *cannot* directly type in
  a password for someone and hand it to them — doing that client-side would require
  embedding a privileged admin key in the browser, which anyone could extract from the
  page and use to gain full control of the database. Instead: the parent or teacher
  creates their own login from the site's own "👨‍👩‍👧 Ծնող/Ուսուցիչ" button (choosing
  "Ես ծնող եմ" or "Ես ուսուցիչ եմ", their own email or phone number, and their own
  password) — the account sits pending until admin approves it in "👤 Հաշիվներ"
  (assigning it the role "🧑‍🏫 Ուսուցիչ" or "👨‍👩‍👧 Ծնող"). Admin still fully controls
  who gets in and what they can see — the only difference from what was asked is that
  the *password itself* is never admin's to set. If true admin-generated credentials
  (parent never creates their own account at all) turn out to matter enough to be
  worth it, that's possible too, but needs a small server-side function (a Supabase
  Edge Function) rather than something that can run safely in the browser — let me
  know if you'd like that built.

  **Login by phone number**: since real SMS-based login needs a paid SMS provider
  (Twilio or similar) and a phone-verification setup that wasn't part of this project,
  phone login instead works by quietly turning the phone number into a technical,
  never-actually-emailed address behind the scenes (e.g. `32487534061@parent.local`)
  — the parent only ever needs to remember and type their own phone number, they never
  see or need to know this detail.

  **Linking accounts (the crucial second step)**: approving the role alone isn't
  enough — a new "🔑 Ուսուցիչ/ծնող կապեր" tab is where admin connects a teacher
  account to the specific class(es) they teach, and a parent account to their child's
  registration. Without this link, signing in shows nothing at all (by design — the
  database itself won't hand over any announcement data until the link exists,
  regardless of what the page's own code tries to show).

  **What each role actually sees**: a **teacher** sees only their own assigned
  class(es), can post/edit/delete announcements there, and never sees another
  teacher's announcements for a different class. A **parent** sees every class their
  linked child is actually placed in (via the same class roster/assignment system
  admin already uses to build the schedule — there's no separate manual "assign a
  course to this parent" step, since a child's real class placement is already the
  single source of truth), grouped by course, newest announcement first within each
  group.

- **Fixed: the schedule PDF (with student names) showing blank on mobile.** The PDF
  export builds the table as real HTML first, hidden off-screen, then photographs it
  into the PDF — the previous "hide it 9999px off to the left" technique is unreliable
  on mobile browsers, which often skip properly rendering content positioned that far
  outside the viewport. It's now hidden with a negative stacking order at normal
  on-screen coordinates instead (invisible to you, but laid out normally so mobile
  browsers render it correctly), and the capture size is now specified explicitly so
  the table's actual width isn't affected by how narrow the phone's own screen is.

- **New: download a full schedule overview as Excel or PDF.** Two buttons at the top
  of the "🗓️ Դասացուցակ" tab — "⬇️ Excel դասացուցակ" and "⬇️ PDF դասացուցակ" — export
  every class time, course, and teacher, **plus the actual students assigned to each
  one** (from the class roster board), so it's a real, ready-to-use schedule rather
  than just times and course names. The PDF is landscape, styled to match the site,
  and splits across multiple pages automatically if the schedule is long rather than
  shrinking everything down to unreadable size. One technical note worth knowing: PDF
  generation in the browser can't use Armenian text with its normal built-in fonts —
  it only renders Armenian correctly because the export first builds the table as
  real webpage HTML (using the fonts already on the site) and then converts that into
  the PDF, rather than asking the PDF library to draw the text directly.

- **The student list now defaults to only who registered for that course.** Selecting
  a class used to show every unassigned registrant with matches merely starred at the
  top — now it shows *only* the matching ones by default, so there's nothing to scan
  past. A "Ցուցադրել բոլոր գրանցվածներին" (Show everyone) checkbox reveals the rest
  when needed — useful for switching a student into a different class than what they
  originally registered for. It resets back to "matching only" every time you select a
  different class, so it stays the quick default rather than something to remember to
  turn off.

- **The class roster board is now mobile-friendly.** On a phone, the two columns
  stack (classes on top, students below) — tapping a class now auto-scrolls straight
  down to the student list instead of leaving you to scroll past the class cards
  every time, and a "← Դասերին վերադառնալ" link at the top of the student list jumps
  back up when you're ready for the next class. Touch targets (the ✕ on each chip,
  the ➕ add icon) are bigger on small screens, both lists are shorter so one doesn't
  push the other far off-screen, and the search box uses a font size that stops iOS
  from auto-zooming in when you tap it.

- **New: cancel just one course on a Saturday, not the whole day.** The "🚫 Չեղարկել
  դասերը որոշակի շաբաթ օրով" form now has a dropdown — "Ողջ oրվա բոլոր դասերը" (default,
  same as before) or any specific class time/course. Pick a specific one, and only that
  class shows as cancelled (struck through, with your reason) on the public calendar
  for that Saturday — every other class that day stays normal. The gold "class day" dot
  on the calendar only disappears when the *entire* day is cancelled; cancelling one
  course out of several still shows the dot, since there are still classes happening.

- **New: Excel export from the Summary tab, organized for building class lists.** The
  "⬇️ Excel (ըստ դասընթացի)" button on "📊 Ամփոփում" downloads a workbook with a
  separate sheet for every course — each listing everyone registered for it (name,
  child/adult, birth date, contact info) — plus an overview sheet showing every
  course's registered count at a glance. This is meant specifically for working
  offline while deciding who goes into which actual class, separate from the full
  "one row per registrant, checkbox per course" export on the Registrations tab, which
  is better for a single master list of everyone.

- **Admin tables no longer need much horizontal scrolling.** The Schedule, Staff, and
  Yearly Calendar tables used to show Armenian/Dutch/English as three separate
  columns each, which pushed the tables far wider than most screens — you'd have to
  scroll right just to reach the Edit/Delete buttons. Those tables now show only the
  Armenian text directly, with a small 🌐 (or 🔤 for Latin names) icon next to it —
  hover over it to see the other language(s) without needing separate columns. Nothing
  was removed: for Schedule and Yearly Calendar, the full trilingual detail is still
  there and editable via the "Խմբագրել" (Edit) button, exactly as before; for Staff
  specifically (which has no edit form, only add/delete), the hover tooltip is the only
  way to see the Latin name and other-language roles, so that data stays visible even
  without a dedicated column.

- **New: registration summary, and building the schedule directly from
  registrations.** Two things landed together for this:
  - **"📊 Ամփոփում"** (a new tab next to Registrations) shows total registered, split
    into children/adults, plus every course with a live count — click any course to
    expand the full list of who's registered for it, with contact info.
  - **"👥 Դասարանների ուսանողներ"** is now a visual board instead of dropdowns: the
    left column lists every class as a card (time, course, teacher, currently
    assigned students as removable chips); click one to select it. The right column
    then fills with every registrant not yet assigned to that class — registrants
    whose chosen course roughly matches are starred (⭐) and sorted to the top, since
    the registration form's course names don't always match the schedule's more
    specific ones one-to-one (e.g. a "Մայրենի" registration could go into "Մայրենի 1",
    "2", "3", or "4" — admin decides which). **Just click a student to add them** —
    no dropdowns, no separate "add" button — and click the ✕ on their chip in the
    class card to remove them. A search box filters the right column by name for
    schools with a lot of registrants. This turns building the class list from new
    registrations into pure clicking instead of manually cross-referencing
    spreadsheets.

- **Basic SEO groundwork is now in place**: Open Graph/Twitter tags (so shared links
  show a proper title/description on Facebook, WhatsApp, etc.), a canonical URL,
  `robots.txt`, `sitemap.xml`, and structured data (`School` schema with the real
  address) so Google understands what the site is and can show it correctly in local
  search. If the live domain ends up being something other than
  `levonshantschool.be`, update that URL in `index.html`'s `<head>`, `robots.txt`, and
  `sitemap.xml` to match. Code alone doesn't make Google find the site, though — see
  the setup walkthrough for the remaining steps (Search Console, etc.).

- **The admin's yearly calendar list is now grouped by academic year.** Previously
  every entry across every year sat in one long flat table, making it hard to find
  anything as it grows. Now it's organized into collapsible sections — "📅 Ուսումնական
  տարի 2025–2026", "📅 Ուսումնական տարի 2026–2027", and so on — computed automatically
  from each entry's date, same as the year-picker on the public site. The current
  school year is expanded by default and marked "ընթացիկ"; other years start
  collapsed, click the header to open one.

- **New: "Get directions" buttons for the school and parking.** Below the Contact
  section's map, "🧭 Երթուղի դեպի դպրոց" always opens turn-by-turn directions to the
  school from wherever the visitor currently is (works the same on desktop and mobile,
  opening the Google Maps app if installed). A second "🅿️ Երթուղի դեպի կայանատեղի"
  button appears next to it only when a parking address is set, doing the same for
  parking specifically. This is separate from the map's own directions-mode route
  (parking → school) — these buttons instead route *from the visitor's own location*
  to whichever destination they pick.
- **New: events with registration can have a capacity limit.** When "Այս
  միջոցառումը պահանջում է գրանցում" is checked in the publish form, a new
  "Առավելագույն թիվ" field appears — leave it empty for unlimited, or set a number
  (e.g. 50) to cap it. Visitors see "X of Y spots left" on the registration form, and
  once full, the form is replaced with "Տեղերը լրացել են" (Registration full)
  automatically. This is enforced two ways: the public site only ever gets told the
  *count* of registrations (via a database function built specifically so it can't
  also read the registrant list — that stays admin-only), and — since a purely
  client-side check could in principle be bypassed — the database itself rejects any
  registration past the limit outright, so it can't be worked around by two people
  submitting at the exact same moment or by calling the API directly. Admin sees the
  running count next to each event's attendee list (e.g. "24 / 50").

- **New: a separate parking address, shown on the same map as the school.** In the
  admin's Settings tab, there's a "🅿️ Կայանման հասցե" field, separate from the school's
  main address — fill it in only if parking is somewhere different from the school
  itself. Google's free map embed can't show two independent pins on one map (that
  needs a paid API key), so instead, when a parking address is set, the map switches
  to **directions mode** — it plots both the parking spot (marker A) and the school
  (marker B) on the same map with a route line between them, and a small "A = Parking,
  B = School" badge is overlaid so it's unambiguous which is which. It also shows the
  Contact section's own labeled line for the parking address. Leave the field empty and
  the map and that line both stay exactly as they were before — just the school's location.

- **New: events can require attendance registration.** When publishing or editing a
  post of type "Միջոցառում" (Event) in the "✍️ Հրապարակել" tab, a checkbox —
  "Այս միջոցառումը պահանջում է գրանցում" — turns on a sign-up form (name, phone,
  address, email) that appears right in that event's detail view on the public site.
  The event card in the feed also shows a "📝 Պահանջվում է գրանցում" badge so visitors
  know before clicking through. Admin sees who's registered per event from the
  "🗂️ Իմ հրապարակումները" tab — a "👥 Գրանցվածներ" button appears next to any event
  that requires registration, opening the attendee list with its own
  "⬇️ Excel" export button, separate from the main school-registration export.

- **Excel export now has one column per course, checked with ✔.** Previously all
  selected classes were bunched into one "Դասընթացներ" cell as comma-separated text.
  Now every course offered across both forms (14 total, e.g. Այբբենարան, Մայրենի,
  Ժողովրդական պար, Դաշնամուր...) gets its own column, with a ✔ in the cell for
  whichever ones each registrant picked — much easier to scan down a column and see
  everyone signed up for a particular class, or filter/sort by it in Excel.

- **New: admin can cancel classes on a specific Saturday.** Previously the calendar
  assumed every Saturday has classes just because the weekly schedule exists — with no
  way to mark, say, a holiday weekend as an exception. In the **"🗓️ Դասացուցակ"** tab,
  a new **"🚫 Չեղարկել դասերը որոշակի շաբաթ օրով"** section lets admin pick a date and
  (optionally) a reason. That Saturday then loses its gold "class day" dot on the
  public calendar, and clicking it shows "Այս շաբաթ դասեր չեն անցկացվում" with the
  reason, instead of the normal schedule. Cancelled dates are listed below the form
  with a "Վերականգնել" button to undo one if needed.

- **New: choose exactly where a custom section appears.** Previously every custom
  section landed in one fixed spot (between "Միջոցառումներ" and "Գրանցում"). Now, when
  creating or editing one in "🧩 Նոր բաժիններ", a dropdown — "Որտե՞ղ պետք է հայտնվի այս
  բաժինը" — lets you place it right after any existing part of the site: Hero, Մեր
  դպրոցը, Համազգային, Ուսումնական բաժին, Անձնակազմ, Դասարանների ցանկ, Օրացույց,
  Տարեկան օրացույց, Միջոցառումներ, Լուսանկարներ, Գրանցում, or Կապ (at the very end). If
  two sections share the same spot, the "Հերթականություն" number (now just a
  tie-breaker) decides which comes first between them.

- **New: families now get a confirmation email too.** Previously only the school got
  notified when someone registered — the family just saw an on-page "submitted"
  message with nothing in their inbox. Now, right after a successful registration, a
  second, separate email goes to the family confirming their registration was
  received, listing the classes they selected, and letting them know the school will
  follow up. It's written in Armenian, Dutch, and English together, since there's no
  way to know which language the family prefers to read. Needs the second EmailJS
  template from step 4 in section 6 above — if you skip it, everything else keeps
  working exactly as before, the family just won't get that email yet.

- **Fixed the chaotic header layout.** The logo, school name, all 8 nav links, the
  language switch, and the login button were all competing for space in one row,
  which broke into an overlapping, wrapped mess on medium-width screens. The header
  is now a stable two-row layout — logo + name on top (name always shown in full,
  never truncated), the full nav menu on its own row below, centered — so it looks
  clean at every screen size instead of only at very wide or very narrow ones. Logo
  size is now 88×88px (up from the original 58px, a bit smaller than the 108px from
  last time to leave room for the always-visible name).
- **New: a custom section can now add itself to the main navigation menu.** When
  creating or editing a section in "🧩 Նոր բաժիններ", tick "Ցուցադրել այս բաժինը
  գլխավոր ցանկում" and give it a short nav label (the on-page title can be longer;
  the nav link should stay short) — it'll appear as a real link in the header
  navigation that jumps straight to that section.
- **New: admin can add whole new sections to the site.** The dashboard's new
  "🧩 Նոր բաժիններ" tab (admin-only) lets you create a title + text + optional image
  block that appears on the public site between "Միջոցառումներ" and "Գրանցում" — useful
  for things that don't fit the existing sections (a special announcement, a new
  program, anything). Set the "Հերթականություն" (order) number to control where each
  one appears relative to the others; use "Թաքցնել" to hide one temporarily without
  deleting it.
- **The logo is now much bigger** in the header (108×108px, roughly double the previous
  58px) so it's clearly visible, with a smaller version on phones so it doesn't crowd
  the header there.
- **The staff login button has its own polished look** now — a green pill with a
  circular icon badge and a hover lift — instead of sharing the plain generic button
  style with everything else.
- **Phone-friendliness pass.** Went through the site on iPhone/Samsung-width screens
  and fixed several cramped spots: the photo/video lightbox no longer squeezes the
  image to fit prev/next buttons (they float over the edges instead); modals use less
  padding and fit within the screen without needing to scroll sideways; the calendar
  grid keeps day cells at a comfortable tap size instead of shrinking too small; and
  the admin dashboard's sidebar — including the sign-out button, which was previously
  hidden entirely on phones — now stays fully usable as a wrapping row of chips.
- **New: event photo/video albums.** The Gallery section now has a proper album
  system, built for exactly this — one event, many photos. Admin/SMM create an album
  from the **"🖼️ Լուսանկարների ալբոմներ"** dashboard tab: a title, optional date and
  description, and a multi-file picker that uploads as many photos/videos at once as
  you select. Visitors see a grid of album cards (cover photo + photo count badge, e.g.
  "📷 14") — clicking one opens a full-screen lightbox with arrow navigation, a
  thumbnail strip, and keyboard support (arrow keys, Escape). More photos can be added
  to an existing album later without creating a new one, and individual photos can be
  removed from an album without deleting the whole thing. The older single-photo
  "gallery" post type still works too and shows below the albums as "Այլ նկարներ"
  (Other photos), for one-off images that don't belong to a specific event.
- **Fixed the real bug behind "changes don't show on the live site."** After the admin
  area was split into its own page, one leftover line in the public site's code
  (`app.js`) still tried to call a function that had been moved to `admin.js` — every
  time the site loaded or refreshed its content, that line silently threw an error and
  **cut off everything scheduled to run after it**: applying the logo, the yearly
  calendar image, and the contact/social links, specifically. Saving in the admin panel
  was always working correctly (which is why the admin form itself showed your saved
  Instagram link) — the public site just never got to the point of displaying it. This
  is now fixed, and each of those steps also runs independently of the others going
  forward, so a problem in one can never again silently block the rest.
- **The logo is now noticeably bigger** in the header (58×58px, up from 42×42px) so
  it's clearly visible once uploaded.
- **Fixed: auto-login.** Supabase remembers sessions in the browser by default, so once
  signed in, every future visit silently restored that session — no password ever
  asked again. Session persistence is now turned off for `admin.html`, so **every visit
  requires signing in with email and password**, and "Դուրս գալ" (sign out) fully ends
  the session. If you were signed in before this update, close and reopen the admin tab
  once — after that it'll always ask for credentials.
- **Fixed: Site Content editor now always shows the real current text.** Previously,
  fields appeared blank unless you'd already saved something there — even though the
  live site was showing real content (the built-in defaults). Every field is now
  pre-filled with what's actually visible on the site right now, in all three
  languages, so it's always clear what you're changing. Also added a jump-to-section
  bar at the top of the tab so you can find "Կապ" or "Ուսումնական բաժին" instantly
  instead of scrolling through all 45 fields.
- **Fixed: social media links and the logo not working.** The real cause: a pasted link
  like `www.facebook.com/...` (without `https://`) becomes a broken *relative* link
  when used as a URL — the browser tries to open it relative to your own site instead
  of Facebook. Every link/image-URL field in the admin (Facebook, Instagram, Blog, logo
  link, yearly-calendar image link, post media link) now automatically adds `https://`
  if it's missing, so pasted links always work correctly regardless of how they're typed.
- **Posts and events: clearer "read more."** The short preview text now has a proper
  pill-shaped "More info ↗" button (was small text before) that highlights on hover, so
  it's obvious there's more to read. Clicking anywhere on the card still opens the full
  detail view with the complete description.
- **New: export registrations to Excel.** The Registrations tab has an "⬇️ Excel ֆայլ
  (.xlsx)" button that downloads every registration (child and adult, all fields) as a
  spreadsheet — useful for printing, sharing, or record-keeping outside the site.
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
