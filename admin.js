/* =========================================================
   Լևոն Շանթ շաբաթօրյա դպրոց — admin.js
   Everything that requires signing in: auth (sign-up + admin
   approval), publishing posts, managing the weekly schedule,
   staff directory, yearly calendar, accounts, site text,
   contact/social links, and the logo.

   Uses the same Supabase project as the public site (app.js).
   ========================================================= */

let createClient = null;
try {
  ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
} catch (err) {
  console.warn("Could not load the Supabase library (network or CDN issue).", err);
}

// ---------------------------------------------------------
// SUPABASE CONFIG — same project as app.js
// ---------------------------------------------------------
const supabaseConfig = {
  url: "https://bemfluogtfafsfnbvboo.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlbWZsdW9ndGZhZnNmbmJ2Ym9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODQxOTIsImV4cCI6MjEwMTg2MDE5Mn0.TA3dZQ8ov9oUu1-ibRpzyl-CC5AZylICw9kGdeDnPHE"
};
const supabaseConfigured = !!createClient && supabaseConfig.url !== "YOUR_SUPABASE_URL";
let supabase;
if (supabaseConfigured) {
  try { supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey); }
  catch (err) { console.warn("Could not initialize the Supabase client.", err); }
} else {
  console.warn("Supabase is not configured yet — see README.md.");
}
const SUPABASE_READY = !!supabase;

let currentUser = null;
let currentRole = null;

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// ---------------------------------------------------------
// Auth screen vs dashboard toggle
// ---------------------------------------------------------
const authScreen = document.getElementById("authScreen");
const dashScreen = document.getElementById("dashScreen");

function showAuthScreen(message){
  authScreen.style.display = "";
  dashScreen.style.display = "none";
  if (message){
    const el = document.getElementById("authNotice");
    el.textContent = message;
    el.classList.add("show","err");
  }
}
function showDashScreen(){
  authScreen.style.display = "none";
  dashScreen.style.display = "";
}

document.querySelectorAll('.tabs button[data-authtab]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs button[data-authtab]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.authtab;
    document.getElementById('loginForm').style.display = tab === 'signin' ? '' : 'none';
    document.getElementById('signupForm').style.display = tab === 'signup' ? '' : 'none';
  });
});

document.getElementById("loginForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Կայքը դեռ միացված չէ Supabase-ին. տես README.md ֆայլը կարգավորման համար։";
    msg.classList.add("show","err"); return;
  }
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error){
    msg.textContent = "Մուտքը ձախողվեց՝ " + error.message;
    msg.classList.add("show","err"); return;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
  if (!profile || !profile.role){
    await supabase.auth.signOut();
    msg.textContent = "Ձեր հաշիվը դեռ սպասում է ադմինիստրատորի հաստատմանը։";
    msg.classList.add("show","err"); return;
  }
  // onAuthStateChange will pick this up and show the dashboard
});

document.getElementById("signupForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("signupMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Կայքը դեռ միացված չէ Supabase-ին. տես README.md ֆայլը կարգավորման համար։";
    msg.classList.add("show","err"); return;
  }
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const pass = document.getElementById("signupPass").value;
  const { error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name } } });
  if (error){
    msg.textContent = "Սխալ՝ " + error.message;
    msg.classList.add("show","err"); return;
  }
  msg.textContent = "Հայտն ուղարկվեց ✔ Սպասեք ադմինիստրատորի հաստատմանը, ապա մուտք գործեք «Մուտք» ներդիրից։";
  msg.classList.add("show","ok");
  e.target.reset();
});

document.getElementById("signOutBtn")?.addEventListener("click", ()=> supabase.auth.signOut());

async function handleAuthChange(session){
  if (!session){
    currentUser = null; currentRole = null;
    showAuthScreen();
    return;
  }
  currentUser = session.user;
  try{
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    currentRole = profile ? profile.role : null;
  }catch(err){ currentRole = null; }
  if (!currentRole){
    currentUser = null;
    await supabase.auth.signOut();
    showAuthScreen("Ձեր հաշիվը դեռ սպասում է ադմինիստրատորի հաստատմանը։");
    return;
  }
  renderDashboard();
}

if (SUPABASE_READY){
  supabase.auth.onAuthStateChange((_event, session) => { handleAuthChange(session); });
} else {
  showAuthScreen();
}

function renderDashboard(){
  showDashScreen();
  document.getElementById("dashEmail").textContent = currentUser.email;
  const roleBadge = document.getElementById("dashRole");
  roleBadge.textContent = currentRole === "admin" ? "Admin" : "SMM";
  roleBadge.classList.toggle("admin", currentRole === "admin");
  document.querySelectorAll('[data-admin-only]').forEach(el=>{
    el.style.display = currentRole === "admin" ? "" : "none";
  });
  loadManagePosts();
  loadScheduleAdmin();
  loadStaffAdmin();
  loadYearCalAdmin();
  if (currentRole === "admin"){ loadRegistrations(); loadUsers(); renderContentForm(); loadContactInfoForm(); }
}

// ---------------------------------------------------------
// Sidebar navigation
// ---------------------------------------------------------
document.querySelectorAll(".sidebar-link").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".sidebar-link").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".dash-panel").forEach(p=>p.classList.remove("active"));
    document.getElementById(btn.dataset.panel)?.classList.add("active");
    document.getElementById("panelTitle").textContent = btn.dataset.title || btn.textContent.trim();
    document.querySelector(".admin-main")?.scrollTo({ top:0, behavior:"smooth" });
  });
});

// ---------------------------------------------------------
// Publish (posts: news / events / gallery)
// ---------------------------------------------------------
async function fetchPosts(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending:false });
  if (error){ console.warn(error.message); return []; }
  return data || [];
}

document.getElementById("postForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("postMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  const type = document.getElementById("postType").value;
  const title = document.getElementById("postTitle").value.trim();
  const titleNl = document.getElementById("postTitle_nl").value.trim();
  const titleEn = document.getElementById("postTitle_en").value.trim();
  const body = document.getElementById("postBody").value.trim();
  const bodyNl = document.getElementById("postBody_nl").value.trim();
  const bodyEn = document.getElementById("postBody_en").value.trim();
  const date = document.getElementById("postDate").value || new Date().toISOString().slice(0,10);
  const file = document.getElementById("postFile").files[0];
  let mediaUrl = document.getElementById("postMediaUrl").value.trim();
  let mediaType = mediaUrl ? (mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" : (mediaUrl.includes("youtube")||mediaUrl.includes("youtu.be") ? "youtube" : "image")) : null;
  try{
    if (file){
      const path = `${currentUser.id}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("posts").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("posts").getPublicUrl(path);
      mediaUrl = pub.publicUrl;
      mediaType = file.type.startsWith("video") ? "video" : "image";
    }
    const { error } = await supabase.from("posts").insert({
      type, title, title_nl: titleNl || null, title_en: titleEn || null,
      body, body_nl: bodyNl || null, body_en: bodyEn || null,
      date, media_url: mediaUrl || null, media_type: mediaType,
      author_id: currentUser.id, author_name: currentUser.email
    });
    if (error) throw error;
    msg.textContent = "Հրապարակվեց ✔ (տեսանելի է հանրային կայքում)";
    msg.classList.add("show","ok");
    e.target.reset();
    loadManagePosts();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message;
    msg.classList.add("show","err");
  }
});

async function loadManagePosts(){
  const body = document.getElementById("managePostsBody");
  if (!body) return;
  try{
    const posts = await fetchPosts();
    const mine = currentRole === "admin" ? posts : posts.filter(p=>p.author_id === currentUser.id);
    body.innerHTML = mine.length ? mine.map(p=>`
      <tr>
        <td>${escapeHtml(p.title||"")}</td>
        <td>${p.type}</td>
        <td>${p.date||""}</td>
        <td>${escapeHtml(p.author_name||"")}</td>
        <td><button class="btn danger small" data-del="${p.id}">Ջնջել</button></td>
      </tr>`).join("") : `<tr><td colspan="5">Հրապարակումներ չկան։</td></tr>`;
    body.querySelectorAll("[data-del]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս հրապարակումը։")) return;
        await supabase.from("posts").delete().eq("id", b.dataset.del);
        loadManagePosts();
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Registrations (admin only, read + delete)
// ---------------------------------------------------------
async function loadRegistrations(){
  const body = document.getElementById("regBody");
  if (!body) return;
  try{
    const { data, error } = await supabase.from("registrations").select("*").order("submitted_at", { ascending:false });
    if (error) throw error;
    const rows = data || [];
    body.innerHTML = rows.length ? rows.map(r=>{
      const isChild = r.type === "child";
      const name = isChild ? r.child_name : r.name;
      const dob = isChild ? r.child_dob : r.dob;
      const contact = isChild
        ? `Մայր՝ ${escapeHtml(r.mother||"")}<br>Հայր՝ ${escapeHtml(r.father||"")}`
        : `${escapeHtml(r.phone||"")}<br>${escapeHtml(r.email||"")}`;
      const courses = (r.courses||[]).join(", ");
      const submitted = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "";
      return `<tr>
        <td><span class="status-pill">${isChild ? "Երեխա" : "Մեծահասակ"}</span></td>
        <td>${escapeHtml(name||"")}</td>
        <td>${dob||""}</td>
        <td>${contact}</td>
        <td>${escapeHtml(courses)}</td>
        <td>${submitted}</td>
      </tr>`;
    }).join("") : `<tr><td colspan="6">Դեռ գրանցումներ չկան։</td></tr>`;
  }catch(err){
    body.innerHTML = `<tr><td colspan="6">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Accounts: approve pending sign-ups and assign roles
// ---------------------------------------------------------
async function loadUsers(){
  const body = document.getElementById("usersBody");
  if (!body) return;
  try{
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending:false });
    if (error) throw error;
    const rows = data || [];
    body.innerHTML = rows.length ? rows.map(u=>`
      <tr>
        <td>${escapeHtml(u.name||"")}</td>
        <td>${escapeHtml(u.email||"")}</td>
        <td>${u.role ? `<span class="status-pill">${u.role}</span>` : `<span class="helper">Սպասում է</span>`}</td>
        <td>
          <select data-roleselect="${u.id}">
            <option value="" ${!u.role ? "selected" : ""}>— (առանց հասանելիության)</option>
            <option value="smm" ${u.role==='smm' ? "selected" : ""}>SMM</option>
            <option value="admin" ${u.role==='admin' ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>${u.id !== currentUser.id ? `<button class="btn blue small" data-saverole="${u.id}">Պահպանել</button>` : `<span class="helper">Դուք</span>`}</td>
      </tr>`).join("") : `<tr><td colspan="5">Հաշիվներ չկան։</td></tr>`;
    body.querySelectorAll("[data-saverole]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const id = b.dataset.saverole;
        const select = body.querySelector(`select[data-roleselect="${id}"]`);
        const newRole = select.value || null;
        const msg = document.getElementById("userMsg");
        msg.className = "form-msg";
        const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", id);
        if (error){ msg.textContent = "Սխալ՝ " + error.message; msg.classList.add("show","err"); }
        else { msg.textContent = "Պահպանվեց ✔"; msg.classList.add("show","ok"); loadUsers(); }
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Site content editor (trilingual, grouped by section)
// ---------------------------------------------------------
const CONTENT_FIELDS = [
  { section:"Hero", key:"hero.title", label:"Վերնագիր" },
  { section:"Hero", key:"hero.lede",  label:"Նկարագրություն", area:true },

  { section:"Մեր դպրոցը", key:"about.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Մեր դպրոցը", key:"about.title", label:"Վերնագիր" },
  { section:"Մեր դպրոցը", key:"about.p1", label:"Պարբերություն 1", area:true },
  { section:"Մեր դպրոցը", key:"about.p2", label:"Պարբերություն 2", area:true },
  { section:"Մեր դպրոցը", key:"about.p3", label:"Պարբերություն 3", area:true },
  { section:"Մեր դպրոցը", key:"about.card1title", label:"«Ինչ ենք առաջարկում» քարտ — վերնագիր" },
  { section:"Մեր դպրոցը", key:"about.card1text", label:"«Ինչ ենք առաջարկում» քարտ — տեքստ", area:true },

  { section:"Համազգային ընկերակցություն", key:"hz.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Համազգային ընկերակցություն", key:"hz.title", label:"Վերնագիր" },
  { section:"Համազգային ընկերակցություն", key:"hz.p1", label:"Պարբերություն 1", area:true },
  { section:"Համազգային ընկերակցություն", key:"hz.p2", label:"Պարբերություն 2", area:true },

  { section:"Ուսումնական բաժին", key:"dept.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Ուսումնական բաժին", key:"dept.title", label:"Վերնագիր" },
  { section:"Ուսումնական բաժին", key:"dept.lede", label:"Նկարագրություն", area:true },
  { section:"Ուսումնական բաժին", key:"dept.c1t", label:"Քարտ 1 — վերնագիր" },
  { section:"Ուսումնական բաժին", key:"dept.c1d", label:"Քարտ 1 — նկարագրություն" },
  { section:"Ուսումնական բաժին", key:"dept.c2t", label:"Քարտ 2 — վերնագիր" },
  { section:"Ուսումնական բաժին", key:"dept.c2d", label:"Քարտ 2 — նկարագրություն" },
  { section:"Ուսումնական բաժին", key:"dept.c3t", label:"Քարտ 3 — վերնագիր" },
  { section:"Ուսումնական բաժին", key:"dept.c3d", label:"Քարտ 3 — նկարագրություն" },
  { section:"Ուսումնական բաժին", key:"dept.c4t", label:"Քարտ 4 — վերնագիր" },
  { section:"Ուսումնական բաժին", key:"dept.c4d", label:"Քարտ 4 — նկարագրություն" },
  { section:"Ուսումնական բաժին", key:"classes.list", label:"Դասարանների ցանկ (մեկ տողում մեկ դասարան)", area:true },

  { section:"Օրացույց", key:"cal.eyebrow", label:"Փոքր վերնագրիկ (դասացուցակ)" },
  { section:"Օրացույց", key:"cal.title", label:"Վերնագիր (դասացուցակ)" },
  { section:"Օրացույց", key:"cal.lede", label:"Նկարագրություն (դասացուցակ)", area:true },
  { section:"Օրացույց", key:"yearcal.eyebrow", label:"Փոքր վերնագրիկ (տարեկան օրացույց)" },
  { section:"Օրացույց", key:"yearcal.title", label:"Վերնագիր (տարեկան օրացույց)" },
  { section:"Օրացույց", key:"yearcal.lede", label:"Նկարագրություն (տարեկան օրացույց)", area:true },

  { section:"Միջոցառումներ", key:"feed.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Միջոցառումներ", key:"feed.title", label:"Վերնագիր" },
  { section:"Միջոցառումներ", key:"feed.lede", label:"Նկարագրություն", area:true },

  { section:"Լուսանկարներ/տեսանյութեր", key:"gal.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Լուսանկարներ/տեսանյութեր", key:"gal.title", label:"Վերնագիր" },
  { section:"Լուսանկարներ/տեսանյութեր", key:"gal.lede", label:"Նկարագրություն", area:true },

  { section:"Գրանցում", key:"reg.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Գրանցում", key:"reg.title", label:"Վերնագիր" },
  { section:"Գրանցում", key:"reg.lede", label:"Նկարագրություն", area:true },
  { section:"Գրանցում", key:"reg.needt", label:"«Ի՞նչ է անհրաժեշտ» — վերնագիր" },
  { section:"Գրանցում", key:"reg.need1", label:"Կետ 1" },
  { section:"Գրանցում", key:"reg.need2", label:"Կետ 2" },
  { section:"Գրանցում", key:"reg.need3", label:"Կետ 3" },

  { section:"Կապ", key:"contact.eyebrow", label:"Փոքր վերնագրիկ" },
  { section:"Կապ", key:"contact.title", label:"Վերնագիր" }
];

let contentOverrides = {};

async function fetchSiteContent(){
  if (!SUPABASE_READY) return {};
  const { data, error } = await supabase.from("site_content").select("*");
  if (error){ console.warn(error.message); return {}; }
  const map = {};
  (data || []).forEach(row=>{ map[row.key] = { hy: row.value_hy, nl: row.value_nl, en: row.value_en }; });
  return map;
}

function currentTextFor(key){
  const override = contentOverrides[key];
  return { hy: override?.hy || "", nl: override?.nl || "", en: override?.en || "" };
}

async function renderContentForm(){
  contentOverrides = await fetchSiteContent();
  const wrap = document.getElementById("contentFields");
  if (!wrap) return;
  let currentSection = null;
  let html = "";
  CONTENT_FIELDS.forEach((f, i)=>{
    if (f.section !== currentSection){
      currentSection = f.section;
      html += `<h3 class="content-section-head"${i>0 ? ' style="margin-top:30px;"' : ''}>${escapeHtml(currentSection)}</h3>`;
    }
    const cur = currentTextFor(f.key);
    const field = (lang, labelText, value) => `
        <div class="field">
          <label>${f.label} — ${labelText}</label>
          ${f.area
            ? `<textarea rows="3" data-field="${f.key}" data-lang="${lang}">${escapeHtml(value)}</textarea>`
            : `<input data-field="${f.key}" data-lang="${lang}" value="${escapeHtml(value)}">`}
        </div>`;
    html += `
      <div class="field-row-3" style="margin-bottom:14px; align-items:start;">
        ${field("hy", "ՀԱՅ", cur.hy)}
        ${field("nl", "NL", cur.nl)}
        ${field("en", "EN", cur.en)}
      </div>`;
  });
  wrap.innerHTML = html;
}

document.getElementById("contentForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("contentMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  const rows = CONTENT_FIELDS.map(f=>{
    const hyVal = document.querySelector(`[data-field="${f.key}"][data-lang="hy"]`).value.trim();
    const nlVal = document.querySelector(`[data-field="${f.key}"][data-lang="nl"]`).value.trim();
    const enVal = document.querySelector(`[data-field="${f.key}"][data-lang="en"]`).value.trim();
    const existing = currentTextFor(f.key);
    return { key: f.key, value_hy: hyVal || existing.hy, value_nl: nlVal || existing.nl, value_en: enVal || existing.en };
  });
  try{
    const { error } = await supabase.from("site_content").upsert(rows);
    if (error) throw error;
    msg.textContent = "Պահպանվեց ✔ (փոփոխությունները տեսանելի են հանրային կայքում)";
    msg.classList.add("show","ok");
    renderContentForm();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message;
    msg.classList.add("show","err");
  }
});

// ---------------------------------------------------------
// Contact details + social media links (single value each,
// same across all three languages)
// ---------------------------------------------------------
async function loadContactInfoForm(){
  const overrides = Object.keys(contentOverrides).length ? contentOverrides : await fetchSiteContent();
  contentOverrides = overrides;
  const setVal = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.value = overrides[key]?.hy || "";
  };
  setVal("cf_address", "contactAddress");
  setVal("cf_email", "contactEmail");
  setVal("cf_phone", "contactPhone");
  setVal("cf_facebook", "contactFacebook");
  setVal("cf_instagram", "contactInstagram");
  setVal("cf_blog", "contactBlog");
}

document.getElementById("contactInfoForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("contactInfoMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  const fields = {
    contactAddress: document.getElementById("cf_address").value.trim(),
    contactEmail: document.getElementById("cf_email").value.trim(),
    contactPhone: document.getElementById("cf_phone").value.trim(),
    contactFacebook: document.getElementById("cf_facebook").value.trim(),
    contactInstagram: document.getElementById("cf_instagram").value.trim(),
    contactBlog: document.getElementById("cf_blog").value.trim()
  };
  const rows = Object.entries(fields)
    .filter(([,v])=>v)
    .map(([key,v])=>({ key, value_hy:v, value_nl:v, value_en:v }));
  if (!rows.length){ msg.textContent = "Լրացրեք գոնե մեկ դաշտ։"; msg.classList.add("show","err"); return; }
  try{
    const { error } = await supabase.from("site_content").upsert(rows);
    if (error) throw error;
    msg.textContent = "Պահպանվեց ✔ (փոփոխությունները տեսանելի են հանրային կայքում)";
    msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

// ---------------------------------------------------------
// Weekly lesson schedule
// ---------------------------------------------------------
function timeLabel(t){ return t || ""; }

async function fetchSchedule(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("schedule").select("*").order("start_time");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(r=>({ id:r.id, start:r.start_time, end:r.end_time, course:r.course, courseNl:r.course_nl, courseEn:r.course_en, teacher:r.teacher, teacherLatin:r.teacher_latin, active:r.active }));
}

let editingScheduleId = null;
function setScheduleFormMode(editing){
  const btn = document.querySelector('#scheduleForm button[type="submit"]');
  const cancelBtn = document.getElementById("scheduleCancelEdit");
  btn.textContent = editing ? "Պահպանել փոփոխությունը" : "Ավելացնել դասացուցակում";
  cancelBtn.style.display = editing ? "" : "none";
}

document.getElementById("scheduleForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("scheduleMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  const payload = {
    start_time: document.getElementById("s_start").value,
    end_time: document.getElementById("s_end").value,
    course: document.getElementById("s_course_hy").value.trim(),
    course_nl: document.getElementById("s_course_nl").value.trim(),
    course_en: document.getElementById("s_course_en").value.trim(),
    teacher: document.getElementById("s_teacher").value.trim(),
    teacher_latin: document.getElementById("s_teacher_latin").value.trim() || null,
    added_by: currentUser.email
  };
  try{
    if (editingScheduleId){
      const { error } = await supabase.from("schedule").update(payload).eq("id", editingScheduleId);
      if (error) throw error;
      msg.textContent = "Թարմացվեց ✔";
      editingScheduleId = null;
      setScheduleFormMode(false);
    } else {
      const { error } = await supabase.from("schedule").insert(payload);
      if (error) throw error;
      msg.textContent = "Ավելացվեց ✔ (տեսանելի է հանրային կայքում)";
    }
    msg.classList.add("show","ok");
    e.target.reset();
    loadScheduleAdmin();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("scheduleCancelEdit")?.addEventListener("click", ()=>{
  editingScheduleId = null;
  document.getElementById("scheduleForm").reset();
  setScheduleFormMode(false);
});

async function loadScheduleAdmin(){
  const body = document.getElementById("scheduleAdminBody");
  if (!body) return;
  try{
    const rows = await fetchSchedule();
    body.innerHTML = rows.length ? rows.map(r=>`
      <tr>
        <td><label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" data-toggleactive="${r.id}" ${r.active !== false ? "checked" : ""}>
          <span class="helper">${r.active !== false ? "Ցուցադրվում է" : "Թաքցված է"}</span>
        </label></td>
        <td>${timeLabel(r.start)}–${timeLabel(r.end)}</td>
        <td>${escapeHtml(r.course||"")}</td>
        <td>${escapeHtml(r.courseNl||"")}</td>
        <td>${escapeHtml(r.courseEn||"")}</td>
        <td>${escapeHtml(r.teacher||"")}</td>
        <td>${escapeHtml(r.teacherLatin||"")}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn ghost small" data-editsched="${r.id}">Խմբագրել</button>
          <button class="btn danger small" data-delsched="${r.id}">Ջնջել</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="8">Դասացուցակը դատարկ է։</td></tr>`;
    body.querySelectorAll("[data-toggleactive]").forEach(cb=>{
      cb.addEventListener("change", async ()=>{
        await supabase.from("schedule").update({ active: cb.checked }).eq("id", cb.dataset.toggleactive);
        loadScheduleAdmin();
      });
    });
    body.querySelectorAll("[data-delsched]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս գիծը դասացուցակից։")) return;
        await supabase.from("schedule").delete().eq("id", b.dataset.delsched);
        loadScheduleAdmin();
      });
    });
    body.querySelectorAll("[data-editsched]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const rows2 = await fetchSchedule();
        const row = rows2.find(r=>r.id === b.dataset.editsched);
        if (!row) return;
        document.getElementById("s_start").value = row.start || "";
        document.getElementById("s_end").value = row.end || "";
        document.getElementById("s_course_hy").value = row.course || "";
        document.getElementById("s_course_nl").value = row.courseNl || "";
        document.getElementById("s_course_en").value = row.courseEn || "";
        document.getElementById("s_teacher").value = row.teacher || "";
        document.getElementById("s_teacher_latin").value = row.teacherLatin || "";
        editingScheduleId = row.id;
        setScheduleFormMode(true);
        document.getElementById("scheduleForm").scrollIntoView({ behavior:"smooth", block:"center" });
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="8">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Teaching staff
// ---------------------------------------------------------
async function fetchStaff(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("staff").select("*").order("created_at");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(t=>({ id:t.id, name:t.name, nameLatin:t.name_latin, role:t.role, roleNl:t.role_nl, roleEn:t.role_en, photoUrl:t.photo_url }));
}

document.getElementById("staffForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("staffMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  try{
    const file = document.getElementById("st_photoFile").files[0];
    let photoUrl = document.getElementById("st_photoUrl").value.trim();
    if (file){
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("staff").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("staff").getPublicUrl(path);
      photoUrl = pub.publicUrl;
    }
    const { error } = await supabase.from("staff").insert({
      name: document.getElementById("st_name").value.trim(),
      name_latin: document.getElementById("st_name_latin").value.trim() || null,
      role: document.getElementById("st_role_hy").value.trim(),
      role_nl: document.getElementById("st_role_nl").value.trim(),
      role_en: document.getElementById("st_role_en").value.trim(),
      photo_url: photoUrl || null,
      added_by: currentUser.email
    });
    if (error) throw error;
    msg.textContent = "Ավելացվեց ✔ (տեսանելի է հանրային կայքում)"; msg.classList.add("show","ok");
    e.target.reset();
    loadStaffAdmin();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

async function loadStaffAdmin(){
  const body = document.getElementById("staffAdminBody");
  if (!body) return;
  try{
    const rows = await fetchStaff();
    body.innerHTML = rows.length ? rows.map(t=>`
      <tr>
        <td>${escapeHtml(t.name||"")}</td>
        <td>${escapeHtml(t.nameLatin||"")}</td>
        <td>${escapeHtml(t.role||"")}</td>
        <td>${escapeHtml(t.roleNl||"")}</td>
        <td>${escapeHtml(t.roleEn||"")}</td>
        <td><button class="btn danger small" data-delstaff="${t.id}">Ջնջել</button></td>
      </tr>`).join("") : `<tr><td colspan="6">Անձնակազմի ցանկը դատարկ է։</td></tr>`;
    body.querySelectorAll("[data-delstaff]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս անձնակազմի անդամին։")) return;
        await supabase.from("staff").delete().eq("id", b.dataset.delstaff);
        loadStaffAdmin();
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="6">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Yearly academic calendar
// ---------------------------------------------------------
function formatDateRange(start, end){
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

async function fetchYearCalEntries(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("yearly_events").select("*").order("start_date");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(e=>({
    id:e.id, start:e.start_date, end:e.end_date || e.start_date,
    labelHy:e.label_hy, labelNl:e.label_nl, labelEn:e.label_en,
    notesHy:e.notes_hy, notesNl:e.notes_nl, notesEn:e.notes_en
  }));
}

let editingYearCalId = null;
function setYearCalFormMode(editing){
  const btn = document.querySelector('#yearCalEntryForm button[type="submit"]');
  const cancelBtn = document.getElementById("yearCalEntryCancelEdit");
  btn.textContent = editing ? "Պահպանել փոփոխությունը" : "Ավելացնել";
  cancelBtn.style.display = editing ? "" : "none";
}

document.getElementById("yearCalEntryForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("yearCalEntryMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  const startVal = document.getElementById("yce_start").value;
  const payload = {
    start_date: startVal,
    end_date: document.getElementById("yce_end").value || startVal,
    label_hy: document.getElementById("yce_label_hy").value.trim(),
    label_nl: document.getElementById("yce_label_nl").value.trim(),
    label_en: document.getElementById("yce_label_en").value.trim(),
    notes_hy: document.getElementById("yce_notes_hy").value.trim(),
    notes_nl: document.getElementById("yce_notes_nl").value.trim(),
    notes_en: document.getElementById("yce_notes_en").value.trim(),
    added_by: currentUser.email
  };
  try{
    if (editingYearCalId){
      const { error } = await supabase.from("yearly_events").update(payload).eq("id", editingYearCalId);
      if (error) throw error;
      msg.textContent = "Թարմացվեց ✔";
      editingYearCalId = null;
      setYearCalFormMode(false);
    } else {
      const { error } = await supabase.from("yearly_events").insert(payload);
      if (error) throw error;
      msg.textContent = "Ավելացվեց ✔ (տեսանելի է հանրային կայքում)";
    }
    msg.classList.add("show","ok");
    e.target.reset();
    loadYearCalAdmin();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("yearCalEntryCancelEdit")?.addEventListener("click", ()=>{
  editingYearCalId = null;
  document.getElementById("yearCalEntryForm").reset();
  setYearCalFormMode(false);
});

async function loadYearCalAdmin(){
  const body = document.getElementById("yearCalAdminBody");
  if (!body) return;
  try{
    const rows = await fetchYearCalEntries();
    body.innerHTML = rows.length ? rows.map(r=>`
      <tr>
        <td>${formatDateRange(r.start, r.end)}</td>
        <td>${escapeHtml(r.labelHy||"")}</td>
        <td>${escapeHtml(r.labelNl||"")}</td>
        <td>${escapeHtml(r.labelEn||"")}</td>
        <td style="display:flex; gap:6px;">
          <button class="btn ghost small" data-edityc="${r.id||''}">Խմբագրել</button>
          <button class="btn danger small" data-delyc="${r.id||''}">Ջնջել</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="5">Դեռ գծեր չկան։</td></tr>`;
    body.querySelectorAll("[data-delyc]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս գիծը տարեկան օրացույցից։")) return;
        await supabase.from("yearly_events").delete().eq("id", b.dataset.delyc);
        loadYearCalAdmin();
      });
    });
    body.querySelectorAll("[data-edityc]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const rows2 = await fetchYearCalEntries();
        const row = rows2.find(r=>r.id === b.dataset.edityc);
        if (!row) return;
        document.getElementById("yce_start").value = row.start || "";
        document.getElementById("yce_end").value = (row.end && row.end !== row.start) ? row.end : "";
        document.getElementById("yce_label_hy").value = row.labelHy || "";
        document.getElementById("yce_label_nl").value = row.labelNl || "";
        document.getElementById("yce_label_en").value = row.labelEn || "";
        document.getElementById("yce_notes_hy").value = row.notesHy || "";
        document.getElementById("yce_notes_nl").value = row.notesNl || "";
        document.getElementById("yce_notes_en").value = row.notesEn || "";
        editingYearCalId = row.id;
        setYearCalFormMode(true);
        document.getElementById("yearCalEntryForm").scrollIntoView({ behavior:"smooth", block:"center" });
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Yearly calendar overview image + school logo
// ---------------------------------------------------------
document.getElementById("yearCalForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("yearCalMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  try{
    const file = document.getElementById("yc_file").files[0];
    let url = document.getElementById("yc_url").value.trim();
    if (file){
      const path = `yearCalendar_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      url = pub.publicUrl;
    }
    if (!url){ msg.textContent = "Ընտրեք ֆայլ կամ լրացրեք հղումը։"; msg.classList.add("show","err"); return; }
    const { error } = await supabase.from("site_content").upsert({ key:"yearCalImage", value_hy:url, value_nl:url, value_en:url });
    if (error) throw error;
    msg.textContent = "Թարմացվեց ✔"; msg.classList.add("show","ok");
    e.target.reset();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("yearCalRemoveBtn")?.addEventListener("click", async ()=>{
  const msg = document.getElementById("yearCalMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  try{
    const { error } = await supabase.from("site_content").upsert({ key:"yearCalImage", value_hy:null, value_nl:null, value_en:null });
    if (error) throw error;
    msg.textContent = "Վերականգնվեց սկզբնական պատկերը ✔"; msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("logoForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("logoMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  try{
    const file = document.getElementById("logo_file").files[0];
    let url = document.getElementById("logo_url").value.trim();
    if (file){
      const path = `logo_${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      url = pub.publicUrl;
    }
    if (!url){ msg.textContent = "Ընտրեք ֆայլ կամ լրացրեք հղումը։"; msg.classList.add("show","err"); return; }
    const { error } = await supabase.from("site_content").upsert({ key:"logoUrl", value_hy:url, value_nl:url, value_en:url });
    if (error) throw error;
    msg.textContent = "Լոգոն պահպանվեց ✔"; msg.classList.add("show","ok");
    e.target.reset();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("logoRemoveBtn")?.addEventListener("click", async ()=>{
  const msg = document.getElementById("logoMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Supabase-ը դեռ կարգավորված չէ. տես README.md։";
    msg.classList.add("show","err"); return;
  }
  try{
    const { error } = await supabase.from("site_content").upsert({ key:"logoUrl", value_hy:null, value_nl:null, value_en:null });
    if (error) throw error;
    msg.textContent = "Լոգոն հեռացվեց ✔"; msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});
