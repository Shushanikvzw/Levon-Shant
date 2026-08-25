/* =========================================================
   Լևոն Շանթի անվան շաբաթօրյա դպրոց — admin.js
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
  try { supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }); }
  catch (err) { console.warn("Could not initialize the Supabase client.", err); }
} else {
  console.warn("Supabase is not configured yet — see README.md.");
}
const SUPABASE_READY = !!supabase;

let currentUser = null;
let currentRole = null;

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// Sign-up stores the name as "[Ուսուցիչ] Actual Name" / "[Ծնող] Actual Name" so
// the raw name is easy to recognize in the Accounts list — strip that bracketed
// prefix when showing the name elsewhere (e.g. this roster preview).
function cleanAccountName(name){
  return (name || "").replace(/^\[.*?\]\s*/, "").trim();
}

// A pasted link without "http(s)://" (e.g. "www.facebook.com/...") becomes a
// broken *relative* link when used as an href/src. Always normalize before saving.
function normalizeUrl(v){
  v = (v || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) return "https://" + v;
  return v;
}

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
  const { data: profile, error: profileErr } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
  if (profileErr){
    currentUser = null; currentRole = null;
    await supabase.auth.signOut();
    showAuthScreen("Սխալ՝ " + profileErr.message);
    return;
  }
  currentRole = profile ? profile.role : null;
  if (!currentRole){
    currentUser = null;
    await supabase.auth.signOut();
    showAuthScreen("Ձեր հաշիվը դեռ սպասում է ադմինիստրատորի հաստատմանը։");
    return;
  }
  if (currentRole !== "admin" && currentRole !== "smm"){
    // Teacher and parent accounts belong on the separate parent/teacher
    // portal, never here — this page's tools (publishing, schedule,
    // registrations, etc.) are not meant for them, and the database
    // already refuses any write from these roles regardless, but they
    // should never even see the page at all.
    currentUser = null;
    await supabase.auth.signOut();
    showAuthScreen("Այս հաշիվը ուսուցչի կամ ծնողի հաշիվ է։ Խնդրում ենք մուտք գործել կայքի գլխավոր էջից՝ «👨‍👩‍👧 Ծնող/Ուսուցիչ» կոճակով։");
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
  loadAlbumsAdmin();
  loadScheduleAdmin();
  loadCancellationsAdmin();
  loadCancellationScheduleOptions();
  loadStaffAdmin();
  loadYearCalAdmin();
  if (currentRole === "admin"){ loadRegistrations(); loadUsers(); renderContentForm(); loadContactInfoForm(); loadNewSectionsAdmin(); loadClassRosterTab(); loadTeacherParentLinks(); }
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
    // On mobile the tab list collapses after picking one, so the chosen
    // panel is immediately visible instead of sitting below a long,
    // still-open row of every other tab.
    if (window.matchMedia("(max-width: 860px)").matches){
      document.getElementById("sidebarNavGroups")?.classList.remove("open");
    }
  });
});

document.getElementById("mobileSidebarToggle")?.addEventListener("click", ()=>{
  document.getElementById("sidebarNavGroups")?.classList.toggle("open");
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

function updatePostRegRowVisibility(){
  const isEvent = document.getElementById("postType").value === "event";
  const row = document.getElementById("postRegRow");
  if (row) row.style.display = isEvent ? "" : "none";
  const limitRow = document.getElementById("postRegLimitRow");
  if (limitRow) limitRow.style.display = (isEvent && document.getElementById("postRequiresReg").checked) ? "" : "none";
}
document.getElementById("postType")?.addEventListener("change", updatePostRegRowVisibility);
document.getElementById("postRequiresReg")?.addEventListener("change", updatePostRegRowVisibility);
updatePostRegRowVisibility();

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
  let mediaUrl = normalizeUrl(document.getElementById("postMediaUrl").value);
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
    const requiresReg = type === "event" && document.getElementById("postRequiresReg").checked;
    const limitVal = document.getElementById("postRegLimit").value;
    const payload = {
      type, title, title_nl: titleNl || null, title_en: titleEn || null,
      body, body_nl: bodyNl || null, body_en: bodyEn || null,
      date, media_url: mediaUrl || null, media_type: mediaType,
      requires_registration: requiresReg,
      registration_limit: (requiresReg && limitVal) ? parseInt(limitVal, 10) : null
    };
    if (editingPostId){
      const { error } = await supabase.from("posts").update(payload).eq("id", editingPostId);
      if (error) throw error;
      msg.textContent = "Թարմացվեց ✔ (տեսանելի է հանրային կայքում)";
      editingPostId = null;
      setPostFormMode(false);
    } else {
      const { error } = await supabase.from("posts").insert({
        ...payload, author_id: currentUser.id, author_name: currentUser.email
      });
      if (error) throw error;
      msg.textContent = "Հրապարակվեց ✔ (տեսանելի է հանրային կայքում)";
    }
    msg.classList.add("show","ok");
    e.target.reset();
    updatePostRegRowVisibility();
    loadManagePosts();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message;
    msg.classList.add("show","err");
  }
});

let editingPostId = null;
function setPostFormMode(editing){
  const btn = document.querySelector('#postForm button[type="submit"]');
  const cancelBtn = document.getElementById("postCancelEdit");
  btn.textContent = editing ? "Պահպանել փոփոխությունը" : "Հրապարակել";
  cancelBtn.style.display = editing ? "" : "none";
}
document.getElementById("postCancelEdit")?.addEventListener("click", ()=>{
  editingPostId = null;
  document.getElementById("postForm").reset();
  updatePostRegRowVisibility();
  setPostFormMode(false);
});

// ---------------------------------------------------------
// Event photo/video albums
// ---------------------------------------------------------
async function fetchAlbums(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("gallery_albums").select("*").order("event_date", { ascending:false });
  if (error){ console.warn(error.message); return []; }
  return data || [];
}

// Turns a textarea of pasted YouTube links (one per line) into media entries.
// Accepts full watch URLs, youtu.be short links, or already-normalized embed URLs.
function parseYoutubeLinks(text){
  return (text || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .map(link => ({ url: normalizeUrl(link), type: "youtube" }));
}

async function uploadAlbumFiles(files){
  const media = [];
  for (const file of files){
    const path = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.name}`;
    const { error } = await supabase.storage.from("gallery").upload(path, file);
    if (error) throw error;
    const { data: pub } = supabase.storage.from("gallery").getPublicUrl(path);
    media.push({ url: pub.publicUrl, type: file.type.startsWith("video") ? "video" : "image" });
  }
  return media;
}

document.getElementById("albumForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("albumMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  const files = Array.from(document.getElementById("al_files").files || []);
  const youtubeLinks = parseYoutubeLinks(document.getElementById("al_youtube").value);
  if (!files.length && !youtubeLinks.length){
    msg.textContent = "Ընտրեք առնվազն մեկ լուսանկար/տեսանյութ կամ լրացրեք YouTube հղում։";
    msg.classList.add("show","err"); return;
  }
  msg.textContent = files.length ? `Վերբեռնվում է ${files.length} ֆայլ...` : "Ստեղծվում է ալբոմը...";
  msg.classList.add("show");
  try{
    const uploaded = files.length ? await uploadAlbumFiles(files) : [];
    const media = [...uploaded, ...youtubeLinks];
    const { error } = await supabase.from("gallery_albums").insert({
      title: document.getElementById("al_title_hy").value.trim(),
      title_nl: document.getElementById("al_title_nl").value.trim() || null,
      title_en: document.getElementById("al_title_en").value.trim() || null,
      event_date: document.getElementById("al_date").value || null,
      description: document.getElementById("al_desc_hy").value.trim() || null,
      description_nl: document.getElementById("al_desc_nl").value.trim() || null,
      description_en: document.getElementById("al_desc_en").value.trim() || null,
      media,
      author_id: currentUser.id, author_name: currentUser.email
    });
    if (error) throw error;
    msg.textContent = "Ալբոմը ստեղծվեց ✔ (տեսանելի է հանրային կայքում)";
    msg.className = "form-msg show ok";
    e.target.reset();
    loadAlbumsAdmin();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message;
    msg.className = "form-msg show err";
  }
});

async function loadAlbumsAdmin(){
  const wrap = document.getElementById("albumsAdminList");
  if (!wrap) return;
  try{
    const albums = await fetchAlbums();
    const mine = currentRole === "admin" ? albums : albums.filter(a=>a.author_id === currentUser.id);
    wrap.innerHTML = mine.length ? mine.map(a=>{
      const media = Array.isArray(a.media) ? a.media : [];
      return `
      <div class="album-admin-card" data-album="${a.id}">
        <div class="album-admin-head">
          <h4>${escapeHtml(a.title||"")} <span class="helper">— ${a.event_date||""} — ${media.length} ֆայլ</span></h4>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ghost small" data-editalbum="${a.id}">Խմբագրել</button>
            <button class="btn danger small" data-delalbum="${a.id}">Ջնջել ալբոմը</button>
          </div>
        </div>
        <div class="album-edit-form" data-editformfor="${a.id}" style="display:none; margin-bottom:16px; padding:16px; background:var(--paper-dim); border-radius:12px;">
          <div class="field-row">
            <div class="field"><label>Միջոցառման ամսաթիվ</label><input type="date" data-ef="date" value="${a.event_date||""}"></div>
          </div>
          <div class="field-row-3">
            <div class="field"><label>Անվանում — ՀԱՅ</label><input data-ef="title_hy" value="${escapeHtml(a.title||"")}"></div>
            <div class="field"><label>Titel — NL</label><input data-ef="title_nl" value="${escapeHtml(a.title_nl||"")}"></div>
            <div class="field"><label>Title — EN</label><input data-ef="title_en" value="${escapeHtml(a.title_en||"")}"></div>
          </div>
          <div class="field-row-3">
            <div class="field"><label>Նկարագրություն — ՀԱՅ</label><textarea rows="2" data-ef="desc_hy">${escapeHtml(a.description||"")}</textarea></div>
            <div class="field"><label>Omschrijving — NL</label><textarea rows="2" data-ef="desc_nl">${escapeHtml(a.description_nl||"")}</textarea></div>
            <div class="field"><label>Description — EN</label><textarea rows="2" data-ef="desc_en">${escapeHtml(a.description_en||"")}</textarea></div>
          </div>
          <button class="btn blue small" data-savealbum="${a.id}">Պահպանել</button>
          <div class="form-msg" data-editalbummsg="${a.id}"></div>
        </div>
        <div class="album-admin-thumbs">
          ${media.map((m,i)=> m.type==="video"
            ? `<div class="thumb-wrap"><div class="vid-thumb">▶</div><button class="thumb-del" data-delmedia="${a.id}:${i}" title="Ջնջել">✕</button></div>`
            : m.type==="youtube"
              ? `<div class="thumb-wrap"><div class="vid-thumb yt-thumb">▶ YouTube</div><button class="thumb-del" data-delmedia="${a.id}:${i}" title="Ջնջել">✕</button></div>`
              : `<div class="thumb-wrap"><img src="${m.url}"><button class="thumb-del" data-delmedia="${a.id}:${i}" title="Ջնջել">✕</button></div>`
          ).join("")}
        </div>
        <div class="album-add-row">
          <input type="file" accept="image/*,video/*" multiple data-addfiles="${a.id}" style="max-width:220px;">
          <input type="text" placeholder="...կամ YouTube հղում" data-addyoutube="${a.id}" style="max-width:220px; border:1.5px solid var(--line); border-radius:10px; padding:9px 12px;">
          <button class="btn ghost small" data-addmedia="${a.id}">➕ Ավելացնել այս ալբոմում</button>
        </div>
      </div>`;
    }).join("") : `<p class="helper">Դեռ ալբոմներ չկան։</p>`;

    wrap.querySelectorAll("[data-editalbum]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const form = wrap.querySelector(`[data-editformfor="${b.dataset.editalbum}"]`);
        if (form) form.style.display = form.style.display === "none" ? "" : "none";
      });
    });
    wrap.querySelectorAll("[data-savealbum]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const albumId = b.dataset.savealbum;
        const form = wrap.querySelector(`[data-editformfor="${albumId}"]`);
        const msg = wrap.querySelector(`[data-editalbummsg="${albumId}"]`);
        msg.className = "form-msg"; msg.textContent = "";
        try{
          const { error } = await supabase.from("gallery_albums").update({
            event_date: form.querySelector('[data-ef="date"]').value || null,
            title: form.querySelector('[data-ef="title_hy"]').value.trim(),
            title_nl: form.querySelector('[data-ef="title_nl"]').value.trim() || null,
            title_en: form.querySelector('[data-ef="title_en"]').value.trim() || null,
            description: form.querySelector('[data-ef="desc_hy"]').value.trim() || null,
            description_nl: form.querySelector('[data-ef="desc_nl"]').value.trim() || null,
            description_en: form.querySelector('[data-ef="desc_en"]').value.trim() || null
          }).eq("id", albumId);
          if (error) throw error;
          msg.textContent = "Պահպանվեց ✔"; msg.classList.add("show","ok");
          loadAlbumsAdmin();
        }catch(err){
          msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
        }
      });
    });
    wrap.querySelectorAll("[data-delalbum]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս ամբողջ ալբոմը։")) return;
        await supabase.from("gallery_albums").delete().eq("id", b.dataset.delalbum);
        loadAlbumsAdmin();
      });
    });
    wrap.querySelectorAll("[data-delmedia]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const [albumId, idx] = b.dataset.delmedia.split(":");
        const albums = await fetchAlbums();
        const album = albums.find(a=>String(a.id) === albumId);
        if (!album) return;
        const media = (album.media || []).filter((_, i)=> String(i) !== idx);
        const { error } = await supabase.from("gallery_albums").update({ media }).eq("id", albumId);
        if (error) alert("Սխալ՝ " + error.message);
        loadAlbumsAdmin();
      });
    });
    wrap.querySelectorAll("[data-addmedia]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const albumId = b.dataset.addmedia;
        const fileInput = wrap.querySelector(`[data-addfiles="${albumId}"]`);
        const youtubeInput = wrap.querySelector(`[data-addyoutube="${albumId}"]`);
        const files = Array.from(fileInput?.files || []);
        const youtubeLinks = parseYoutubeLinks(youtubeInput?.value || "");
        if (!files.length && !youtubeLinks.length){ alert("Ընտրեք ֆայլ(եր) կամ լրացրեք YouTube հղում։"); return; }
        b.textContent = "Ավելացվում է...";
        b.disabled = true;
        try{
          const uploaded = files.length ? await uploadAlbumFiles(files) : [];
          const newMedia = [...uploaded, ...youtubeLinks];
          const albums = await fetchAlbums();
          const album = albums.find(a=>String(a.id) === albumId);
          const media = [...(album?.media || []), ...newMedia];
          const { error } = await supabase.from("gallery_albums").update({ media }).eq("id", albumId);
          if (error) throw error;
          loadAlbumsAdmin();
        }catch(err){
          alert("Սխալ՝ " + err.message);
          b.textContent = "➕ Ավելացնել այս ալբոմում";
          b.disabled = false;
        }
      });
    });
  }catch(err){
    wrap.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
}

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
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn ghost small" data-editpost="${p.id}">Խմբագրել</button>
          <button class="btn danger small" data-del="${p.id}">Ջնջել</button>
          ${(currentRole === "admin" && p.requires_registration) ? `<button class="btn blue small" data-viewreg="${p.id}" data-regtitle="${escapeHtml(p.title||"")}" data-reglimit="${p.registration_limit||""}">👥 Գրանցվածներ</button>` : ""}
        </td>
      </tr>`).join("") : `<tr><td colspan="5">Հրապարակումներ չկան։</td></tr>`;
    body.querySelectorAll("[data-del]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս հրապարակումը։")) return;
        await supabase.from("posts").delete().eq("id", b.dataset.del);
        loadManagePosts();
      });
    });
    body.querySelectorAll("[data-viewreg]").forEach(b=>{
      b.addEventListener("click", ()=> viewEventRegistrants(b.dataset.viewreg, b.dataset.regtitle, b.dataset.reglimit));
    });
    body.querySelectorAll("[data-editpost]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const posts2 = await fetchPosts();
        const p = posts2.find(x=>String(x.id) === b.dataset.editpost);
        if (!p) return;
        document.getElementById("postType").value = p.type || "news";
        document.getElementById("postDate").value = p.date || "";
        document.getElementById("postTitle").value = p.title || "";
        document.getElementById("postTitle_nl").value = p.title_nl || "";
        document.getElementById("postTitle_en").value = p.title_en || "";
        document.getElementById("postBody").value = p.body || "";
        document.getElementById("postBody_nl").value = p.body_nl || "";
        document.getElementById("postBody_en").value = p.body_en || "";
        document.getElementById("postMediaUrl").value = p.media_url || "";
        document.getElementById("postRequiresReg").checked = !!p.requires_registration;
        document.getElementById("postRegLimit").value = p.registration_limit || "";
        updatePostRegRowVisibility();
        editingPostId = p.id;
        setPostFormMode(true);
        document.querySelector('[data-panel="panel-publish"]')?.click();
        document.getElementById("postForm").scrollIntoView({ behavior:"smooth", block:"start" });
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Event attendance registrations — view + export per event
// ---------------------------------------------------------
let currentEventRegCache = [];

async function viewEventRegistrants(postId, postTitle, regLimit){
  const panel = document.getElementById("eventRegistrantsPanel");
  const titleEl = document.getElementById("eventRegistrantsTitle");
  const body = document.getElementById("eventRegistrantsBody");
  if (!panel) return;
  panel.style.display = "";
  titleEl.textContent = `👥 Գրանցվածներ՝ «${postTitle}»`;
  body.innerHTML = `<tr><td colspan="5">Բեռնվում է…</td></tr>`;
  panel.scrollIntoView({ behavior:"smooth", block:"start" });
  try{
    const { data, error } = await supabase.from("event_registrations").select("*").eq("post_id", postId).order("submitted_at", { ascending:false });
    if (error) throw error;
    currentEventRegCache = data || [];
    const count = currentEventRegCache.length;
    titleEl.textContent = regLimit
      ? `👥 Գրանցվածներ՝ «${postTitle}» — ${count} / ${regLimit}${count >= regLimit ? " (լրացել է)" : ""}`
      : `👥 Գրանցվածներ՝ «${postTitle}» — ${count}`;
    body.innerHTML = currentEventRegCache.length ? currentEventRegCache.map(r=>`
      <tr>
        <td>${escapeHtml(r.full_name||"")}</td>
        <td>${escapeHtml(r.phone||"")}</td>
        <td>${escapeHtml(r.address||"")}</td>
        <td>${escapeHtml(r.email||"")}</td>
        <td>${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""}</td>
      </tr>`).join("") : `<tr><td colspan="5">Դեռ գրանցումներ չկան այս միջոցառման համար։</td></tr>`;
    document.getElementById("exportEventRegBtn").dataset.title = postTitle;
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

document.getElementById("closeEventRegPanel")?.addEventListener("click", ()=>{
  document.getElementById("eventRegistrantsPanel").style.display = "none";
});

document.getElementById("exportEventRegBtn")?.addEventListener("click", (e)=>{
  if (typeof XLSX === "undefined" || !currentEventRegCache.length) return;
  const rows = currentEventRegCache.map(r=>({
    "Անուն, ազգանուն": r.full_name||"",
    "Հեռախոս": r.phone||"",
    "Հասցե": r.address||"",
    "Էլ. փոստ": r.email||"",
    "Գրանցվել է": r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0]).map(k=>({ wch: Math.max(16, k.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Գրանցվածներ");
  const today = new Date().toISOString().slice(0,10);
  const safeTitle = (e.target.dataset.title || "miochanacum").replace(/[^a-zA-Zա-ֆԱ-Ֆ0-9]+/g, "_").slice(0, 40);
  XLSX.writeFile(wb, `granxvacner_${safeTitle}_${today}.xlsx`);
});

// ---------------------------------------------------------
// Registrations (admin only, read + delete)
// ---------------------------------------------------------
// Every course offered across both the child and adult registration forms.
const ALL_COURSES = [
  "Նախադպրոցական", "Այբբենարան", "Մայրենի", "Գրականություն", "Ես և շրջակա միջավայրը",
  "Հայրենագիտություն", "Պատմություն", "Հայերեն՝ օտարախոս երեխաների և մեծահասակների համար",
  "Ժողովրդական պար", "Ավանդական երգ ու պար", "Դաշնամուր", "Շախմատ",
  "Տառաուսուցում", "Հայերենը որպես երկրորդ լեզու"
];

let registrationsCache = [];

async function loadRegistrations(){
  const body = document.getElementById("regBody");
  if (!body) return;
  try{
    const { data, error } = await supabase.from("registrations").select("*").order("submitted_at", { ascending:false });
    if (error) throw error;
    const rows = data || [];
    registrationsCache = rows;
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
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn ghost small" data-editreg="${r.id}">Խմբագրել</button>
          <button class="btn danger small" data-delreg="${r.id}">Ջնջել</button>
        </td>
      </tr>`;
    }).join("") : `<tr><td colspan="7">Դեռ գրանցումներ չկան։</td></tr>`;
    renderRegistrationSummary();

    body.querySelectorAll("[data-delreg]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս գրանցումը։ Այս գործողությունը հնարավոր չէ հետարկել։")) return;
        try{
          const { error } = await supabase.from("registrations").delete().eq("id", b.dataset.delreg);
          if (error) throw error;
          loadRegistrations();
        }catch(err){
          alert("Սխալ՝ " + err.message);
        }
      });
    });
    body.querySelectorAll("[data-editreg]").forEach(b=>{
      b.addEventListener("click", ()=>{
        const reg = registrationsCache.find(r=>r.id === b.dataset.editreg);
        if (reg) openEditRegistration(reg);
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="7">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Edit a registration — type-aware (child vs adult show/hide
// their own fields), everything else shared.
// ---------------------------------------------------------
function openEditRegistration(reg){
  const isChild = reg.type === "child";
  document.getElementById("editRegTitle").textContent = `Խմբագրել գրանցումը՝ ${isChild ? (reg.child_name||"") : (reg.name||"")}`;
  document.getElementById("er_id").value = reg.id;
  document.getElementById("er_childFields").style.display = isChild ? "" : "none";
  document.getElementById("er_adultFields").style.display = isChild ? "none" : "";

  if (isChild){
    document.getElementById("er_childName").value = reg.child_name || "";
    document.getElementById("er_childDob").value = reg.child_dob || "";
    document.querySelectorAll('input[name="er_gender_c"]').forEach(r=>{ r.checked = r.value === reg.gender; });
    document.getElementById("er_mother").value = reg.mother || "";
    document.getElementById("er_father").value = reg.father || "";
  } else {
    document.getElementById("er_name").value = reg.name || "";
    document.getElementById("er_dob").value = reg.dob || "";
    document.querySelectorAll('input[name="er_gender_a"]').forEach(r=>{ r.checked = r.value === reg.gender; });
    document.getElementById("er_phone").value = reg.phone || "";
    document.getElementById("er_level").value = reg.level || "";
  }
  document.getElementById("er_address").value = reg.address || "";
  document.getElementById("er_nationality").value = reg.nationality || "";
  document.getElementById("er_nativeLang").value = reg.native_lang || "";
  document.getElementById("er_email").value = reg.email || "";
  const courseSet = new Set(reg.courses || []);
  document.querySelectorAll("#er_courses input[type=checkbox]").forEach(cb=>{ cb.checked = courseSet.has(cb.value); });
  document.querySelectorAll('input[name="er_consent"]').forEach(r=>{ r.checked = r.value === reg.photo_consent; });

  document.getElementById("editRegMsg").className = "form-msg";
  document.getElementById("editRegMsg").textContent = "";
  document.getElementById("editRegBackdrop").classList.add("open");
}

document.getElementById("closeEditReg")?.addEventListener("click", ()=>{
  document.getElementById("editRegBackdrop").classList.remove("open");
});
document.getElementById("editRegBackdrop")?.addEventListener("click", (e)=>{
  if (e.target.id === "editRegBackdrop") e.target.classList.remove("open");
});

document.getElementById("editRegForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("editRegMsg");
  msg.className = "form-msg"; msg.textContent = "";
  const id = document.getElementById("er_id").value;
  const reg = registrationsCache.find(r=>r.id === id);
  if (!reg) return;
  const isChild = reg.type === "child";
  const courses = Array.from(document.querySelectorAll("#er_courses input:checked")).map(i=>i.value);
  const photoConsent = document.querySelector('input[name="er_consent"]:checked')?.value || reg.photo_consent;

  const payload = isChild ? {
    child_name: document.getElementById("er_childName").value.trim(),
    child_dob: document.getElementById("er_childDob").value || null,
    gender: document.querySelector('input[name="er_gender_c"]:checked')?.value || reg.gender,
    mother: document.getElementById("er_mother").value.trim(),
    father: document.getElementById("er_father").value.trim(),
    address: document.getElementById("er_address").value.trim(),
    nationality: document.getElementById("er_nationality").value.trim(),
    native_lang: document.getElementById("er_nativeLang").value.trim(),
    email: document.getElementById("er_email").value.trim(),
    courses, photo_consent: photoConsent
  } : {
    name: document.getElementById("er_name").value.trim(),
    dob: document.getElementById("er_dob").value || null,
    gender: document.querySelector('input[name="er_gender_a"]:checked')?.value || reg.gender,
    phone: document.getElementById("er_phone").value.trim(),
    level: document.getElementById("er_level").value.trim(),
    address: document.getElementById("er_address").value.trim(),
    nationality: document.getElementById("er_nationality").value.trim(),
    native_lang: document.getElementById("er_nativeLang").value.trim(),
    email: document.getElementById("er_email").value.trim(),
    courses, photo_consent: photoConsent
  };

  try{
    const { error } = await supabase.from("registrations").update(payload).eq("id", id);
    if (error) throw error;
    msg.textContent = "Պահպանվեց ✔"; msg.classList.add("show","ok");
    loadRegistrations();
    setTimeout(()=>{ document.getElementById("editRegBackdrop").classList.remove("open"); }, 700);
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

function registrantDisplayName(r){
  return r.type === "child" ? (r.child_name || "") : (r.name || "");
}
function registrantContact(r){
  return r.type === "child"
    ? [r.mother, r.father].filter(Boolean).join(" / ")
    : [r.phone, r.email].filter(Boolean).join(" / ");
}

function renderRegistrationSummary(){
  const totalsWrap = document.getElementById("regSummaryTotals");
  const coursesWrap = document.getElementById("regSummaryCourses");
  if (!totalsWrap || !coursesWrap) return;

  const children = registrationsCache.filter(r=>r.type === "child");
  const adults = registrationsCache.filter(r=>r.type === "adult");

  totalsWrap.innerHTML = `
    <div class="reg-summary-card"><div class="num">${registrationsCache.length}</div><div class="label">Ընդհանուր գրանցում</div></div>
    <div class="reg-summary-card"><div class="num">${children.length}</div><div class="label">Երեխա</div></div>
    <div class="reg-summary-card"><div class="num">${adults.length}</div><div class="label">Մեծահասակ</div></div>
  `;

  coursesWrap.innerHTML = ALL_COURSES.map((course, i)=>{
    const registrants = registrationsCache.filter(r => (r.courses||[]).includes(course));
    const listHtml = registrants.length ? registrants.map(r=>`
      <div style="display:flex; justify-content:space-between; gap:14px; padding:6px 0; border-bottom:1px dashed var(--line);">
        <span><strong>${escapeHtml(registrantDisplayName(r))}</strong> <span class="helper">(${r.type === "child" ? "երեխա" : "մեծահասակ"})</span></span>
        <span class="helper">${escapeHtml(registrantContact(r))}</span>
      </div>`).join("") : `<p class="helper">Դեռ ոչ ոք չի գրանցվել այս դասընթացի համար։</p>`;
    return `
      <div class="course-summary-group">
        <div class="course-summary-row" data-coursetoggle="${i}">
          <span>${escapeHtml(course)}</span>
          <span class="count-badge">${registrants.length}</span>
        </div>
        <div class="course-summary-list" id="courseList${i}">${listHtml}</div>
      </div>`;
  }).join("");

  coursesWrap.querySelectorAll("[data-coursetoggle]").forEach(row=>{
    row.addEventListener("click", ()=>{
      row.classList.toggle("open");
      document.getElementById(`courseList${row.dataset.coursetoggle}`)?.classList.toggle("open");
    });
  });
}

function registrantDob(r){
  return r.type === "child" ? (r.child_dob || "") : (r.dob || "");
}

document.getElementById("exportRegSummaryBtn")?.addEventListener("click", ()=>{
  const msg = document.getElementById("exportRegSummaryMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (typeof XLSX === "undefined"){
    msg.textContent = "Excel գրադարանը չհաջողվեց բեռնել (ստուգեք ինտերնետ կապը)։";
    msg.classList.add("show","err"); return;
  }
  if (!registrationsCache.length){
    msg.textContent = "Դեռ գրանցումներ չկան արտահանելու համար։";
    msg.classList.add("show","err"); return;
  }
  try{
    const wb = XLSX.utils.book_new();

    // Overview sheet first: one row per course with its registered count,
    // so it's easy to see class sizes at a glance before diving into names.
    const overviewRows = ALL_COURSES.map(course=>({
      "Դասընթաց": course,
      "Գրանցվածների թիվ": registrationsCache.filter(r=>(r.courses||[]).includes(course)).length
    }));
    const overviewWs = XLSX.utils.json_to_sheet(overviewRows);
    overviewWs["!cols"] = [{ wch: 40 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, overviewWs, "Ամփոփում");

    // One sheet per course, listing everyone registered for it — ready to
    // work from directly while assigning students to their actual class.
    ALL_COURSES.forEach(course=>{
      const registrants = registrationsCache.filter(r=>(r.courses||[]).includes(course));
      const rows = registrants.length ? registrants.map(r=>({
        "Անուն, ազգանուն": registrantDisplayName(r),
        "Տեսակ": r.type === "child" ? "Երեխա" : "Մեծահասակ",
        "Ծննդյան տարեթիվ": registrantDob(r),
        "Կապ": registrantContact(r),
        "Հայերենի մակարդակ (մեծահասակ)": r.level || ""
      })) : [{ "Անուն, ազգանուն": "Դեռ ոչ ոք չի գրանցվել", "Տեսակ":"", "Ծննդյան տարեթիվ":"", "Կապ":"", "Հայերենի մակարդակ (մեծահասակ)":"" }];
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 22 }];
      // Sheet names can't exceed 31 chars or contain []:*?/\ — trim/sanitize.
      const safeName = course.replace(/[\[\]:*?/\\]/g, "").slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, safeName);
    });

    const today = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `grancumner_ast_dasyntaci_${today}.xlsx`);
    msg.textContent = "Ֆայլը ներբեռնվեց ✔"; msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("exportRegBtn")?.addEventListener("click", ()=>{
  const msg = document.getElementById("exportRegMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (typeof XLSX === "undefined"){
    msg.textContent = "Excel գրադարանը չհաջողվեց բեռնել (ստուգեք ինտերնետ կապը)։";
    msg.classList.add("show","err"); return;
  }
  if (!registrationsCache.length){
    msg.textContent = "Դեռ գրանցումներ չկան արտահանելու համար։";
    msg.classList.add("show","err"); return;
  }
  try{
    const rows = registrationsCache.map(r=>{
      const isChild = r.type === "child";
      const selected = new Set(r.courses || []);
      const base = {
        "Տեսակ": isChild ? "Երեխա" : "Մեծահասակ",
        "Անուն, ազգանուն": isChild ? (r.child_name||"") : (r.name||""),
        "Ծննդյան տարեթիվ": isChild ? (r.child_dob||"") : (r.dob||""),
        "Սեռ": r.gender||"",
        "Հասցե": r.address||"",
        "Ազգություն": r.nationality||"",
        "Մայրենի լեզու": r.native_lang||"",
        "Էլ. հասցե": r.email||"",
        "Հեռախոս": r.phone||"",
        "Մայր (անուն/հեռախոս)": r.mother||"",
        "Հայր (անուն/հեռախոս)": r.father||""
      };
      ALL_COURSES.forEach(course=>{ base[course] = selected.has(course) ? "✔" : ""; });
      base["Հայերենի մակարդակ"] = r.level||"";
      base["Համաձայնություն նկարներին"] = r.photo_consent||"";
      base["Ուղարկվել է"] = r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "";
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(k=>({ wch: ALL_COURSES.includes(k) ? 10 : Math.max(14, k.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Գրանցումներ");
    const today = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `grancumner_${today}.xlsx`);
    msg.textContent = "Ֆայլը ներբեռնվեց ✔";
    msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message;
    msg.classList.add("show","err");
  }
});

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
            <option value="teacher" ${u.role==='teacher' ? "selected" : ""}>🧑‍🏫 Ուսուցիչ</option>
            <option value="parent" ${u.role==='parent' ? "selected" : ""}>👨‍👩‍👧 Ծնող</option>
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
        else { msg.textContent = "Պահպանվեց ✔"; msg.classList.add("show","ok"); loadUsers(); loadTeacherParentLinks(); }
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="5">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Teacher/parent linking — connects a teacher account to the
// class(es) they teach, and a parent account to their child's
// registration. Without this link, a teacher/parent account can
// sign in but sees nothing (by design — RLS only grants access
// once linked).
// ---------------------------------------------------------
async function loadTeacherParentLinks(){
  const teacherSelect = document.getElementById("teacherLinkSelect");
  const parentSelect = document.getElementById("parentLinkSelect");
  if (!teacherSelect || !parentSelect) return;
  try{
    const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending:false });
    if (error) throw error;
    const teachers = (profiles || []).filter(p=>p.role === "teacher");
    const parents = (profiles || []).filter(p=>p.role === "parent");
    teacherSelect.innerHTML = `<option value="">— ընտրեք —</option>` + teachers.map(t=>
      `<option value="${t.id}">${escapeHtml(t.name||t.email||"")}</option>`
    ).join("");
    parentSelect.innerHTML = `<option value="">— ընտրեք —</option>` + parents.map(p=>
      `<option value="${p.id}">${escapeHtml(p.name||p.email||"")}</option>`
    ).join("");
  }catch(err){
    console.warn("Could not load teacher/parent accounts:", err.message);
  }
}

document.getElementById("teacherLinkSelect")?.addEventListener("change", async (e)=>{
  const teacherId = e.target.value;
  const wrap = document.getElementById("teacherLinkClasses");
  const checklist = document.getElementById("teacherLinkChecklist");
  if (!teacherId){ wrap.style.display = "none"; return; }
  wrap.style.display = "";
  checklist.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  try{
    const [scheduleRows, { data: existing, error }] = await Promise.all([
      fetchSchedule(),
      supabase.from("teacher_assignments").select("*").eq("teacher_user_id", teacherId)
    ]);
    if (error) throw error;
    const assignedIds = new Set((existing || []).map(a=>a.schedule_id));
    checklist.innerHTML = scheduleRows.length ? scheduleRows.map(r=>`
      <label style="display:flex; align-items:center; gap:6px; background:var(--paper-dim); padding:8px 12px; border-radius:10px; cursor:pointer;">
        <input type="checkbox" value="${r.id}" ${assignedIds.has(r.id) ? "checked" : ""} style="width:auto;">
        <span style="font-size:.85rem;">${timeLabel(r.start)}–${timeLabel(r.end)} — ${escapeHtml(r.course||"")}</span>
      </label>`).join("") : `<p class="helper">Դասացուցակը դատարկ է։</p>`;
    await refreshTeacherLinkRoster(teacherId, [...assignedIds]);
  }catch(err){
    checklist.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
});

async function refreshTeacherLinkRoster(teacherId, scheduleIds){
  const previewEl = document.getElementById("teacherLinkRosterPreview");
  if (!previewEl) return;
  if (!scheduleIds.length){
    previewEl.innerHTML = `<p class="helper">Այս ուսուցիչը դեռ որևէ դասի կապակցված չէ։</p>`;
    return;
  }
  previewEl.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  try{
    const scheduleRows = await fetchSchedule();
    const scheduleById = {};
    scheduleRows.forEach(r=>{ scheduleById[r.id] = r; });

    const { data: rosters, error: rosterErr } = await supabase
      .from("class_assignments")
      .select("*, registrations(*)")
      .in("schedule_id", scheduleIds);
    if (rosterErr) throw rosterErr;

    // parent_links.parent_user_id references auth.users, not public.profiles
    // directly, so PostgREST can't auto-embed profiles here — fetch the two
    // separately and join them in the browser instead.
    const childRegIds = [...new Set((rosters || []).filter(r=>r.registrations?.type === "child").map(r=>r.registration_id))];
    let parentsByReg = {};
    if (childRegIds.length){
      const { data: links, error: linksErr } = await supabase.from("parent_links").select("*").in("registration_id", childRegIds);
      if (linksErr) throw linksErr;
      const parentUserIds = [...new Set((links || []).map(l=>l.parent_user_id))];
      let profilesById = {};
      if (parentUserIds.length){
        const { data: profs } = await supabase.from("profiles").select("*").in("id", parentUserIds);
        (profs || []).forEach(p=>{ profilesById[p.id] = p; });
      }
      (links || []).forEach(l=>{
        const p = profilesById[l.parent_user_id];
        if (p) (parentsByReg[l.registration_id] ||= []).push(p);
      });
    }

    // All parent accounts, for the inline "find a parent for this student"
    // search — sorted so whichever one's login email matches the student's
    // own registration email is starred and shown first, same idea as the
    // parent-side linking search.
    const { data: allParents } = await supabase.from("profiles").select("*").eq("role", "parent");
    teacherLinkAllParents = allParents || [];

    const bySchedule = {};
    (rosters || []).forEach(r=>{ (bySchedule[r.schedule_id] ||= []).push(r); });

    previewEl.innerHTML = scheduleIds.map(sid=>{
      const sched = scheduleById[sid];
      const rows = bySchedule[sid] || [];
      const rowsHtml = rows.length ? rows.map(r=>{
        const student = r.registrations;
        if (!student) return "";
        const isAdult = student.type === "adult";
        const hasParent = (parentsByReg[r.registration_id] || []).length;
        const contactHtml = isAdult
          ? `<span class="helper">${escapeHtml(registrantContact(student)) || "—"}</span>`
          : (hasParent
              ? escapeHtml(parentsByReg[r.registration_id].map(p=>cleanAccountName(p.name) || p.email).join(", "))
              : `<span class="helper" style="color:var(--pomegranate);">⚠️ Ծնող կապակցված չէ</span>`);
        const pickerHtml = (!isAdult && !hasParent) ? `
          <div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--line); grid-column:1 / -1;">
            <input type="search" class="teacher-parent-search" data-forreg="${r.registration_id}" data-forchildemail="${escapeHtml(student.email||"")}" placeholder="🔍 Փնտրել և կապակցել ծնողի հաշիվ..." style="width:100%; box-sizing:border-box; padding:12px 14px; border-radius:10px; border:1.5px solid var(--line); font-family:inherit; font-size:.95rem; background:#fff; color:var(--ink);">
            <div class="teacher-parent-results" data-resultsfor="${r.registration_id}" style="margin-top:6px; display:flex; flex-direction:column; gap:4px;"></div>
          </div>` : "";
        return `<div class="roster-row-grid">
          <span>${escapeHtml(registrantDisplayName(student))}${isAdult ? ' <span class="status-pill">Մեծահասակ</span>' : ""}</span>
          <span style="text-align:right;">${contactHtml}</span>
          ${pickerHtml}
        </div>`;
      }).join("") : `<p class="helper">Դեռ ուսանողներ նշանակված չեն այս դասին։</p>`;
      return `<div style="margin-bottom:18px;">
        <strong>📚 ${escapeHtml(sched?.course||"")}</strong>
        <div style="margin-top:6px;">${rowsHtml}</div>
      </div>`;
    }).join("");

    previewEl.querySelectorAll(".teacher-parent-search").forEach(input=>{
      renderTeacherParentResults(input.dataset.forreg, input.dataset.forchildemail, "");
      input.addEventListener("input", ()=> renderTeacherParentResults(input.dataset.forreg, input.dataset.forchildemail, input.value));
    });
  }catch(err){
    previewEl.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
}

let teacherLinkAllParents = [];

function renderTeacherParentResults(registrationId, childEmail, searchTerm){
  const resultsEl = document.querySelector(`.teacher-parent-results[data-resultsfor="${registrationId}"]`);
  if (!resultsEl) return;
  const term = (searchTerm || "").trim().toLowerCase();
  const childEmailNorm = (childEmail || "").trim().toLowerCase();
  const isEmailMatch = p => childEmailNorm && (p.email||"").trim().toLowerCase() === childEmailNorm;

  if (!teacherLinkAllParents.length){
    resultsEl.innerHTML = `<p class="helper">Դեռ ոչ մի ծնողի հաշիվ չկա համակարգում։</p>`;
    return;
  }
  const matches = (term
    ? teacherLinkAllParents.filter(p=>(cleanAccountName(p.name) || p.email || "").toLowerCase().includes(term))
    : teacherLinkAllParents
  ).slice().sort((a, b) => isEmailMatch(b) - isEmailMatch(a)).slice(0, 8);

  resultsEl.innerHTML = matches.length ? matches.map(p=>{
    const match = isEmailMatch(p);
    return `<div class="roster-student-card" style="padding:8px 12px;" data-pickparent="${p.id}" data-forreg="${registrationId}">
      <div>
        <div class="rs-name" style="font-size:.88rem;">${match ? '<span class="rs-star">⭐</span> ' : ""}${escapeHtml(cleanAccountName(p.name) || p.email || "")}</div>
        ${p.email ? `<div class="rs-meta">${escapeHtml(p.email)}</div>` : ""}
      </div>
      <span class="rs-add-icon" style="width:24px; height:24px; font-size:.85rem;">➕</span>
    </div>`;
  }).join("") : `<p class="helper">Ոչինչ չի գտնվել։</p>`;

  resultsEl.querySelectorAll("[data-pickparent]").forEach(card=>{
    card.addEventListener("click", async ()=>{
      try{
        const { error } = await supabase.from("parent_links").insert({ parent_user_id: card.dataset.pickparent, registration_id: card.dataset.forreg });
        if (error) throw error;
        const teacherId = document.getElementById("teacherLinkSelect").value;
        const checked = [...document.querySelectorAll("#teacherLinkChecklist input:checked")].map(cb=>cb.value);
        refreshTeacherLinkRoster(teacherId, checked);
      }catch(err){
        alert("Սխալ՝ " + err.message);
      }
    });
  });
}

document.getElementById("teacherLinkSaveBtn")?.addEventListener("click", async ()=>{
  const teacherId = document.getElementById("teacherLinkSelect").value;
  const msg = document.getElementById("teacherLinkMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!teacherId) return;
  try{
    const checked = [...document.querySelectorAll("#teacherLinkChecklist input:checked")].map(cb=>cb.value);
    const { data: existing } = await supabase.from("teacher_assignments").select("*").eq("teacher_user_id", teacherId);
    const existingIds = new Set((existing || []).map(a=>a.schedule_id));
    const toAdd = checked.filter(id=>!existingIds.has(id));
    const toRemove = (existing || []).filter(a=>!checked.includes(a.schedule_id));
    if (toAdd.length){
      const { error } = await supabase.from("teacher_assignments").insert(toAdd.map(schedule_id=>({ teacher_user_id: teacherId, schedule_id })));
      if (error) throw error;
    }
    for (const a of toRemove){
      await supabase.from("teacher_assignments").delete().eq("id", a.id);
    }
    msg.textContent = "Պահպանվեց ✔"; msg.classList.add("show","ok");
    await refreshTeacherLinkRoster(teacherId, checked);
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("parentLinkSelect")?.addEventListener("change", ()=> refreshParentLinks());

let parentLinkCandidates = [];
let parentLinkCurrentParentEmail = "";

async function refreshParentLinks(){
  const parentId = document.getElementById("parentLinkSelect").value;
  const content = document.getElementById("parentLinkContent");
  const listEl = document.getElementById("parentLinkedList");
  const suggestionEl = document.getElementById("parentLinkSuggestion");
  const searchInput = document.getElementById("parentLinkSearch");
  if (!parentId){ content.style.display = "none"; return; }
  content.style.display = "";
  listEl.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  suggestionEl.style.display = "none";
  if (searchInput) searchInput.value = "";
  try{
    const { data: links, error } = await supabase.from("parent_links").select("*, registrations(*)").eq("parent_user_id", parentId);
    if (error) throw error;

    // Linking a parent to a child (above) is only half the picture — the
    // child also needs to actually be placed in a class via "👥 Դասարանների
    // ուսանողներ" before the parent will see anything. Check that here so
    // it's obvious immediately, instead of the parent discovering it's
    // missing after logging in and seeing nothing.
    const registrationIds = (links || []).map(l=>l.registration_id);
    let assignedRegIds = new Set();
    if (registrationIds.length){
      const { data: assigns } = await supabase.from("class_assignments").select("registration_id").in("registration_id", registrationIds);
      assignedRegIds = new Set((assigns || []).map(a=>a.registration_id));
    }

    listEl.innerHTML = (links && links.length) ? links.map(l=>{
      const r = l.registrations;
      const isAssigned = r && assignedRegIds.has(l.registration_id);
      const statusHtml = !r
        ? ""
        : isAssigned
          ? `<span class="status-pill" style="margin-left:8px;">✅ Դասին նշանակված է</span>`
          : `<span class="status-pill" style="margin-left:8px; background:var(--pomegranate); color:#fff;">⚠️ Դեռ դասի նշանակված չէ</span>`;
      return `<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:var(--paper-dim); padding:8px 12px; border-radius:10px; margin-bottom:6px;">
        <span>${r ? escapeHtml(registrantDisplayName(r)) : "(գրանցումը ջնջված է)"}${statusHtml}</span>
        <button class="btn danger small" data-removelink="${l.id}">Հեռացնել</button>
      </div>`;
    }).join("") : `<p class="helper">Դեռ կապակցված երեխա չկա։</p>`;

    if (links && links.some(l=>l.registrations && !assignedRegIds.has(l.registration_id))){
      listEl.insertAdjacentHTML("afterbegin", `<div class="banner warn" style="margin-bottom:10px;">⚠️ Ստորև նշված «Դեռ դասի նշանակված չէ» երեխա(ներ)ը դեռ տեղաբաշխված չեն որևէ դասի, ուստի ծնողը դեռ ոչինչ չի տեսնի։ Անցեք «👥 Դասարանների ուսանողներ» բաժին և նշանակեք այս երեխային իր դասին։</div>`);
    }

    listEl.querySelectorAll("[data-removelink]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        await supabase.from("parent_links").delete().eq("id", b.dataset.removelink);
        refreshParentLinks();
      });
    });

    if (!registrationsCache.length){
      const { data } = await supabase.from("registrations").select("*").order("submitted_at", { ascending:false });
      registrationsCache = data || [];
    }
    const linkedRegIds = new Set((links || []).map(l=>l.registration_id));
    parentLinkCandidates = registrationsCache.filter(r=>!linkedRegIds.has(r.id));

    // Auto-match: any unlinked registration whose own contact email matches
    // this parent account's login email is very likely the same family —
    // suggest linking all of them with one click, rather than making admin
    // hunt for them manually. Still fully optional either way.
    const { data: parentProfile } = await supabase.from("profiles").select("email").eq("id", parentId).single();
    parentLinkCurrentParentEmail = (parentProfile?.email || "").trim().toLowerCase();
    const emailMatches = parentLinkCurrentParentEmail
      ? parentLinkCandidates.filter(r=>(r.email||"").trim().toLowerCase() === parentLinkCurrentParentEmail)
      : [];
    if (emailMatches.length){
      suggestionEl.style.display = "";
      suggestionEl.innerHTML = `
        <div class="banner warn">
          🔎 Այս ծնողի էլ. փոստին (${escapeHtml(parentLinkCurrentParentEmail)}) համապատասխանող ${emailMatches.length} գրանցում գտնվեց՝
          <strong>${emailMatches.map(r=>escapeHtml(registrantDisplayName(r))).join(", ")}</strong>։
          Հավանաբար նույն ընտանիքից են։
          <button class="btn blue small" id="parentLinkAutoMatchBtn" style="margin-top:8px;">✔ Կապակցել բոլորը (${emailMatches.length})</button>
        </div>`;
      document.getElementById("parentLinkAutoMatchBtn")?.addEventListener("click", async ()=>{
        const msg = document.getElementById("parentLinkMsg");
        msg.className = "form-msg"; msg.textContent = "";
        try{
          const { error } = await supabase.from("parent_links").insert(emailMatches.map(r=>({ parent_user_id: parentId, registration_id: r.id })));
          if (error) throw error;
          msg.textContent = "Կապակցվեց ✔"; msg.classList.add("show","ok");
          refreshParentLinks();
        }catch(err){
          msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
        }
      });
    }

    renderParentLinkResults("");
  }catch(err){
    listEl.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
}

function renderParentLinkResults(searchTerm){
  const resultsEl = document.getElementById("parentLinkSearchResults");
  if (!resultsEl) return;
  const term = (searchTerm || "").trim().toLowerCase();
  const isEmailMatch = r => parentLinkCurrentParentEmail && (r.email||"").trim().toLowerCase() === parentLinkCurrentParentEmail;
  const matches = (term
    ? parentLinkCandidates.filter(r=>registrantDisplayName(r).toLowerCase().includes(term))
    : parentLinkCandidates
  ).slice().sort((a, b) => isEmailMatch(b) - isEmailMatch(a));

  if (!parentLinkCandidates.length){
    resultsEl.innerHTML = `<p class="helper">Բոլոր գրանցումներն արդեն կապակցված են։</p>`;
    return;
  }
  if (!matches.length){
    resultsEl.innerHTML = `<p class="helper">Ոչինչ չի գտնվել։</p>`;
    return;
  }
  resultsEl.innerHTML = matches.slice(0, 30).map(r=>{
    const emailMatch = isEmailMatch(r);
    return `
    <div class="roster-student-card" data-linkreg="${r.id}">
      <div>
        <div class="rs-name">${emailMatch ? '<span class="rs-star">⭐</span> ' : ""}${escapeHtml(registrantDisplayName(r))}</div>
        <div class="rs-meta">${r.type === "child" ? "Երեխա" : "Մեծահասակ"}${r.email ? " · " + escapeHtml(r.email) : ""}</div>
      </div>
      <span class="rs-add-icon">➕</span>
    </div>`;
  }).join("") + (matches.length > 30 ? `<p class="helper" style="margin-top:6px;">Ցուցադրված է առաջին 30-ը։ Կիրառեք որոնումը՝ ավելի ճշգրիտ արդյունքի համար։</p>` : "");

  resultsEl.querySelectorAll("[data-linkreg]").forEach(card=>{
    card.addEventListener("click", async ()=>{
      const parentId = document.getElementById("parentLinkSelect").value;
      const msg = document.getElementById("parentLinkMsg");
      msg.className = "form-msg"; msg.textContent = "";
      try{
        const { error } = await supabase.from("parent_links").insert({ parent_user_id: parentId, registration_id: card.dataset.linkreg });
        if (error) throw error;
        msg.textContent = "Կապակցվեց ✔"; msg.classList.add("show","ok");
        refreshParentLinks();
      }catch(err){
        msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
      }
    });
  });
}

document.getElementById("parentLinkSearch")?.addEventListener("input", (e)=> renderParentLinkResults(e.target.value));

// ---------------------------------------------------------
// Custom sections — admin can add whole new content blocks
// to the public site (title/body in 3 languages + image).
// ---------------------------------------------------------
const POSITION_LABELS = {
  hero: "Hero-ից հետո", about: "«Մեր դպրոցը»-ից հետո", hamazkayin: "«Համազգային»-ից հետո",
  department: "«Ուսումնական բաժին»-ից հետո", staff: "«Անձնակազմ»-ից հետո", classes: "«Դասարաններ»-ից հետո",
  calendar: "«Օրացույց»-ից հետո", yearcalendar: "«Տարեկան օրացույց»-ից հետո", activities: "«Միջոցառումներ»-ից հետո",
  gallery: "«Լուսանկարներ»-ից հետո", register: "«Գրանցում»-ից հետո", contact: "«Կապ»-ից հետո"
};

async function fetchCustomSections(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("custom_sections").select("*").order("sort_order");
  if (error){ console.warn(error.message); return []; }
  return data || [];
}

let editingSectionId = null;
function setSectionFormMode(editing){
  const btn = document.querySelector('#newSectionForm button[type="submit"]');
  const cancelBtn = document.getElementById("newSectionCancelEdit");
  if (!btn) return;
  btn.textContent = editing ? "Պահպանել փոփոխությունը" : "Ավելացնել բաժինը";
  cancelBtn.style.display = editing ? "" : "none";
}

document.getElementById("ns_shownav")?.addEventListener("change", (e)=>{
  document.getElementById("ns_navlabel_row").style.display = e.target.checked ? "" : "none";
});

document.getElementById("newSectionForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("newSectionMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  try{
    const file = document.getElementById("ns_image_file").files[0];
    let imageUrl = normalizeUrl(document.getElementById("ns_image_url").value);
    if (file){
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("site-assets").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-assets").getPublicUrl(path);
      imageUrl = pub.publicUrl;
    }
    const showInNav = document.getElementById("ns_shownav").checked;
    const payload = {
      title_hy: document.getElementById("ns_title_hy").value.trim(),
      title_nl: document.getElementById("ns_title_nl").value.trim() || null,
      title_en: document.getElementById("ns_title_en").value.trim() || null,
      body_hy: document.getElementById("ns_body_hy").value.trim() || null,
      body_nl: document.getElementById("ns_body_nl").value.trim() || null,
      body_en: document.getElementById("ns_body_en").value.trim() || null,
      image_url: imageUrl || null,
      sort_order: parseInt(document.getElementById("ns_order").value, 10) || 0,
      position_after: document.getElementById("ns_position").value,
      show_in_nav: showInNav,
      nav_label_hy: showInNav ? (document.getElementById("ns_navlabel_hy").value.trim() || document.getElementById("ns_title_hy").value.trim()) : null,
      nav_label_nl: showInNav ? (document.getElementById("ns_navlabel_nl").value.trim() || null) : null,
      nav_label_en: showInNav ? (document.getElementById("ns_navlabel_en").value.trim() || null) : null
    };
    if (editingSectionId){
      const { error } = await supabase.from("custom_sections").update(payload).eq("id", editingSectionId);
      if (error) throw error;
      msg.textContent = "Թարմացվեց ✔"; editingSectionId = null; setSectionFormMode(false);
    } else {
      payload.created_by = currentUser.id;
      const { error } = await supabase.from("custom_sections").insert(payload);
      if (error) throw error;
      msg.textContent = "Ավելացվեց ✔ (տեսանելի է հանրային կայքում)";
    }
    msg.classList.add("show","ok");
    e.target.reset();
    document.getElementById("ns_order").value = "0";
    document.getElementById("ns_navlabel_row").style.display = "none";
    loadNewSectionsAdmin();
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("newSectionCancelEdit")?.addEventListener("click", ()=>{
  editingSectionId = null;
  document.getElementById("newSectionForm").reset();
  document.getElementById("ns_order").value = "0";
  setSectionFormMode(false);
});

async function loadNewSectionsAdmin(){
  const wrap = document.getElementById("newSectionsAdminList");
  if (!wrap) return;
  try{
    const rows = await fetchCustomSections();
    wrap.innerHTML = rows.length ? rows.map(s=>`
      <div class="album-admin-card">
        <div class="album-admin-head">
          <h4>${escapeHtml(s.title_hy||"")} <span class="helper">— ${POSITION_LABELS[s.position_after] || s.position_after}${s.sort_order ? ", հերթ. " + s.sort_order : ""}${s.is_visible === false ? " — թաքցված" : ""}${s.show_in_nav ? " — 📍 ցանկում" : ""}</span></h4>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ghost small" data-togglevis="${s.id}">${s.is_visible === false ? "Ցուցադրել" : "Թաքցնել"}</button>
            <button class="btn ghost small" data-editsection="${s.id}">Խմբագրել</button>
            <button class="btn danger small" data-delsection="${s.id}">Ջնջել</button>
          </div>
        </div>
        ${s.image_url ? `<img src="${s.image_url}" style="max-width:220px; border-radius:10px; margin-top:8px;">` : ""}
      </div>`).join("") : `<p class="helper">Դեռ նոր բաժիններ չկան։</p>`;

    wrap.querySelectorAll("[data-delsection]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս բաժինը։")) return;
        await supabase.from("custom_sections").delete().eq("id", b.dataset.delsection);
        loadNewSectionsAdmin();
      });
    });
    wrap.querySelectorAll("[data-togglevis]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const rows2 = await fetchCustomSections();
        const row = rows2.find(r=>r.id === b.dataset.togglevis);
        if (!row) return;
        await supabase.from("custom_sections").update({ is_visible: row.is_visible === false }).eq("id", row.id);
        loadNewSectionsAdmin();
      });
    });
    wrap.querySelectorAll("[data-editsection]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const rows2 = await fetchCustomSections();
        const row = rows2.find(r=>r.id === b.dataset.editsection);
        if (!row) return;
        document.getElementById("ns_title_hy").value = row.title_hy || "";
        document.getElementById("ns_title_nl").value = row.title_nl || "";
        document.getElementById("ns_title_en").value = row.title_en || "";
        document.getElementById("ns_body_hy").value = row.body_hy || "";
        document.getElementById("ns_body_nl").value = row.body_nl || "";
        document.getElementById("ns_body_en").value = row.body_en || "";
        document.getElementById("ns_image_url").value = row.image_url || "";
        document.getElementById("ns_order").value = row.sort_order || 0;
        document.getElementById("ns_position").value = row.position_after || "activities";
        document.getElementById("ns_shownav").checked = !!row.show_in_nav;
        document.getElementById("ns_navlabel_hy").value = row.nav_label_hy || "";
        document.getElementById("ns_navlabel_nl").value = row.nav_label_nl || "";
        document.getElementById("ns_navlabel_en").value = row.nav_label_en || "";
        document.getElementById("ns_navlabel_row").style.display = row.show_in_nav ? "" : "none";
        editingSectionId = row.id;
        setSectionFormMode(true);
        document.getElementById("newSectionForm").scrollIntoView({ behavior:"smooth", block:"start" });
      });
    });
  }catch(err){
    wrap.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
}

// ---------------------------------------------------------
// Site content editor (trilingual, grouped by section)
// ---------------------------------------------------------
const DEFAULT_CONTENT = {
  "hero.title": { hy:"Բարի գալուստ Համազգայինի Լևոն Շանթի անվան շաբաթօրյա դպրոց", nl:"Welkom bij de Hamazkayin Levon Shant Zaterdagschool", en:"Welcome to the Hamazkayin Levon Shant Saturday School" },
  "hero.lede": { hy:"Համազգայինի Լևոն Շանթի անվան շաբաթօրյա դպրոցում հայ երեխաներն ու ընտանիքները սովորում են հայոց լեզու, պատմություն և մշակույթ, և մասնակցում մշակութային ու երիտասարդական միջոցառումների՝ ամեն շաբաթ, Մեխելեն քաղաքում։", nl:"Op de Hamazkayin Levon Shant Zaterdagschool leren Armeense kinderen en gezinnen de Armeense taal, geschiedenis en cultuur, en nemen ze elke week deel aan culturele en jongerenevenementen in Mechelen.", en:"At the Hamazkayin Levon Shant Saturday School, Armenian children and families learn the Armenian language, history, and culture, and take part every week in cultural and youth activities in Mechelen." },
  "hero.factNum1": { hy:"1999", nl:"1999", en:"1999" },
  "hero.fact1": { hy:"հիմնադրման տարեթիվ", nl:"oprichtingsjaar", en:"founding year" },
  "hero.factNum2": { hy:"Mechelen", nl:"Mechelen", en:"Mechelen" },
  "hero.fact2": { hy:"Nijverheidsstraat 45", nl:"Nijverheidsstraat 45", en:"Nijverheidsstraat 45" },
  "hero.factNum3": { hy:"Hamazkayin", nl:"Hamazkayin", en:"Hamazkayin" },
  "hero.fact3": { hy:"հայկական կրթական ցանց", nl:"Armeens onderwijsnetwerk", en:"Armenian education network" },
  "about.eyebrow": { hy:"Մեր դպրոցը", nl:"Onze school", en:"Our school" },
  "about.title": { hy:"Պատմություն և հիմնադրում", nl:"Geschiedenis en oprichting", en:"History and founding" },
  "about.p1": { hy:"1999–2000 ուսումնական տարում, Բելգիայի ՀՅԴ կուսակցության նախաձեռնությամբ, Մեխելենում հիմնադրվեց Լևոն Շանթի անվան շաբաթօրյա դպրոցը։", nl:"In het schooljaar 1999–2000 werd, op initiatief van de Belgische ARF-partij, de Levon Shant Zaterdagschool opgericht in Mechelen.", en:"In the 1999–2000 school year, on the initiative of the Belgian ARF party, the Levon Shant Saturday School was founded in Mechelen." },
  "about.p2": { hy:"Դպրոցի հիմնադիրներն են եղել Էդիկ Քոթանջյանը և Գրիգոր Ոսկանյանը, որոնցից Գրիգոր Ոսկանյանը այդ տարիներին ստանձնել է նաև դպրոցի տնօրենի պաշտոնը։", nl:"De school werd opgericht door Edik Kotanjian en Grigor Voskanian; Voskanian was in die beginjaren ook directeur van de school.", en:"The school was founded by Edik Kotanjian and Grigor Voskanian; Voskanian was also director of the school in those early years." },
  "about.p3": { hy:"Նրանց ջանքերով դրվեց այն հիմքը, որի վրա դպրոցը տարիների ընթացքում զարգացավ, ընդլայնվեց և հասավ այն ամենին, ինչ ունենք այսօր՝ մի կենդանի հայկական համայնք Մեխելենի սրտում։", nl:"Dankzij hun inzet werd de basis gelegd waarop de school door de jaren heen groeide, uitbreidde en werd wat ze vandaag is: een levendige Armeense gemeenschap in het hart van Mechelen.", en:"Thanks to their efforts, the foundation was laid on which the school grew, expanded, and became what it is today: a vibrant Armenian community in the heart of Mechelen." },
  "about.card1title": { hy:"Ինչ ենք առաջարկում", nl:"Wat wij aanbieden", en:"What we offer" },
  "about.card1text": { hy:"Հայերենի (խոսակցական և գրական), հայոց պատմության, երգի ու պարի դասընթացներ, ինչպես նաև մշակութային-երիտասարդական միջոցառումներ ողջ ուսումնական տարվա ընթացքում։", nl:"Lessen Armeens (spreek- en schrijftaal), Armeense geschiedenis, zang en dans, en culturele en jongerenevenementen gedurende het hele schooljaar.", en:"Armenian language lessons (spoken and written), Armenian history, singing and dance, and cultural and youth activities throughout the school year." },
  "hz.eyebrow": { hy:"Մեր ցանցը", nl:"Ons netwerk", en:"Our network" },
  "hz.title": { hy:"Համազգային Հայ Կրթական և Մշակութային Միություն", nl:"Hamazkayin Armeense Educatieve en Culturele Vereniging", en:"Hamazkayin Armenian Educational and Cultural Society" },
  "hz.p1": { hy:"1928 թ. մայիսի 28-ին ինը հայ մտավորականներ՝ գրող և մանկավարժ Լևոն Շանթը, պատմաբան Նիկոլ Աղբալյանը, Հայաստանի Առաջին Հանրապետության վարչապետ Համո Օհանջանյանը, բեմադրիչ Գասպար Իփեկյանը և ուրիշներ, Կահիրեում հիմնադրեցին «Համազգային Հայ Կրթական և Մշակութային Ընկերակցությունը»։", nl:"Op 28 mei 1928 richtte een groep van negen Armeense intellectuelen — onder wie schrijver en pedagoog Levon Shant, historicus Nikol Aghbalian, oud-premier Hamo Ohanjanian en regisseur Gaspar Ipekian — in Caïro de “Hamazkayin Armeense Educatieve en Culturele Vereniging” op.", en:"On May 28, 1928, a group of nine Armenian intellectuals — including writer and educator Levon Shant, historian Nikol Aghbalian, former prime minister Hamo Ohanjanian, and director Gaspar Ipekian — founded the “Hamazkayin Armenian Educational and Cultural Society” in Cairo." },
  "hz.p2": { hy:"«Համազգայինի» նպատակն էր հայրենիքից դուրս մեծացող նոր սերնդին տալ ոչ միայն ընդհանուր կրթություն, այլև հայեցի դաստիարակություն՝ պահպանելու ազգային ինքնագիտակցությունն ու մշակութային ավանդույթները։ Այսօր «Համազգայինը» գործում է որպես ոչ-առևտրային կազմակերպություն՝ մասնաճյուղերով Մերձավոր Արևելքում, Եվրոպայում, ԱՄՆ-ում, Կանադայում, Հարավային Ամերիկայում և Ավստրալիայում. Մեխելենի դպրոցը այս ցանցի մի մասնիկն է։", nl:"Hamazkayin wilde nieuwe generaties buiten Armenië niet alleen algemene vorming, maar ook een Armeense opvoeding geven, om de nationale identiteit en culturele tradities levend te houden. Vandaag is Hamazkayin een vzw met afdelingen in het Midden-Oosten, Europa, de VS, Canada, Zuid-Amerika en Australië — en de school in Mechelen maakt deel uit van dat netwerk.", en:"Hamazkayin wanted to give new generations outside Armenia not just a general education, but an Armenian upbringing as well, to keep national identity and cultural traditions alive. Today Hamazkayin is a non-profit with branches across the Middle East, Europe, the US, Canada, South America, and Australia — and the school in Mechelen is part of that network." },
  "dept.eyebrow": { hy:"Կառուցվածք", nl:"Structuur", en:"Structure" },
  "dept.title": { hy:"Ուսումնական բաժին", nl:"Onderwijsafdeling", en:"Education department" },
  "dept.lede": { hy:"Դասընթացները կազմակերպված են տարիքային խմբերով և անցկացվում են ամեն շաբաթ առավոտյան։ Ուսուցչական կազմի, ժամանակացույցի և տոնական օրերի մասին մանրամասների համար կապվեք դպրոցի հետ։", nl:"De lessen zijn georganiseerd per leeftijdsgroep en vinden elke zaterdagochtend plaats. Neem contact op met de school voor het lerarenteam, het rooster en de feestdagen.", en:"Classes are organized by age group and take place every Saturday morning. Contact the school for the teaching staff, schedule, and holidays." },
  "dept.c1t": { hy:"Ուսուցչական կազմ", nl:"Lerarenteam", en:"Teaching staff" },
  "dept.c1d": { hy:"Ծանոթացեք ուսուցիչներին ↓", nl:"Maak kennis met de leerkrachten ↓", en:"Meet the teachers ↓" },
  "dept.c2t": { hy:"Դասարաններ և խմբակներ", nl:"Klassen en groepen", en:"Classes and groups" },
  "dept.c2d": { hy:"Տես ամբողջական ցանկը ↓", nl:"Bekijk de volledige lijst ↓", en:"See the full list ↓" },
  "dept.c3t": { hy:"Դասաժամեր", nl:"Lesuren", en:"Class hours" },
  "dept.c3d": { hy:"Տես ամբողջական ժամանակացույցը ստորև ↓", nl:"Bekijk het volledige rooster hieronder ↓", en:"See the full schedule below ↓" },
  "dept.c4t": { hy:"Օրացույց", nl:"Kalender", en:"Calendar" },
  "dept.c4d": { hy:"Ուսումնական տարվա օրացույցը մեկ հայացքով ↓", nl:"De jaarkalender in één overzicht ↓", en:"The school year calendar at a glance ↓" },
  "cal.eyebrow": { hy:"Ժամանակացույց", nl:"Rooster", en:"Schedule" },
  "cal.title": { hy:"Դասացուցակ և միջոցառումների օրացույց", nl:"Lesrooster en activiteitenkalender", en:"Class schedule and activities calendar" },
  "cal.lede": { hy:"Տեսեք, թե երբ է անցկացվում յուրաքանչյուր դասընթաց, և հետևեք առաջիկա միջոցառումներին ամսացույցի տեսքով։", nl:"Bekijk wanneer elke les plaatsvindt, en volg aankomende activiteiten in kalendervorm.", en:"See when each class takes place, and follow upcoming activities in calendar form." },
  "yearcal.eyebrow": { hy:"Ուսումնական տարի", nl:"Schooljaar", en:"School year" },
  "yearcal.title": { hy:"Ուսումնական տարվա օրացույցը մեկ հայացքով", nl:"De jaarkalender in één overzicht", en:"The school year calendar at a glance" },
  "yearcal.lede": { hy:"Արձակուրդներ, տոնական օրեր և կարևոր ամսաթվեր ողջ ուսումնական տարվա ընթացքում։", nl:"Vakanties, feestdagen en belangrijke data doorheen het hele schooljaar.", en:"Holidays, celebrations, and important dates throughout the school year." },
  "feed.eyebrow": { hy:"Թարմ լուրեր", nl:"Laatste nieuws", en:"Latest news" },
  "feed.title": { hy:"Մշակութային-երիտասարդական միջոցառումներ և հայտարարություններ", nl:"Culturele en jongerenevenementen & mededelingen", en:"Cultural and youth activities & announcements" },
  "feed.lede": { hy:"Այս բաժինը թարմացվում է դպրոցի անձնակազմի կողմից՝ ուղղակիորեն կայքից։", nl:"Dit onderdeel wordt rechtstreeks bijgewerkt door het schoolteam.", en:"This section is updated directly by the school team." },
  "gal.eyebrow": { hy:"Խաղ և գիտելիք", nl:"Spel en kennis", en:"Play and knowledge" },
  "gal.title": { hy:"Լուսանկարներ և տեսանյութեր", nl:"Foto's en video's", en:"Photos and videos" },
  "gal.lede": { hy:"Դասադասընթացների և միջոցառումների պատկերներ, որոնք հրապարակվում են դպրոցի անձնակազմի կողմից։", nl:"Beelden van lessen en evenementen, gepubliceerd door het schoolteam.", en:"Images from classes and activities, published by the school team." },
  "reg.eyebrow": { hy:"ԳՐԱՆՑՈՒՄՆԵՐ", nl:"INSCHRIJVINGEN", en:"REGISTRATION" },
  "reg.title": { hy:"Գրանցվեք դպրոց", nl:"Schrijf u in bij de school", en:"Register with the school" },
  "reg.lede": { hy:"Լրացրեք ձևը, և դպրոցի պատասխանատուն կապ կհաստատի Ձեզ հետ գրանցումը հաստատելու համար։ Ձեր տվյալները տեսանելի են միայն դպրոցի ադմինիստրատորին։", nl:"Vul het formulier in en de schoolverantwoordelijke neemt contact met u op om de inschrijving te bevestigen. Uw gegevens zijn alleen zichtbaar voor de beheerder.", en:"Fill in the form and the school coordinator will contact you to confirm the registration. Your details are only visible to the administrator." },
  "reg.needt": { hy:"Ի՞նչ է անհրաժեշտ", nl:"Wat heb je nodig", en:"What you'll need" },
  "reg.need1": { hy:"Անձնական տվյալներ (անուն, ծննդյան տարեթիվ, հասցե)", nl:"Persoonlijke gegevens (naam, geboortedatum, adres)", en:"Personal details (name, date of birth, address)" },
  "reg.need2": { hy:"Ծնողների կոնտակտային տվյալները (երեխաների գրանցման համար)", nl:"Contactgegevens van de ouders (voor inschrijving van kinderen)", en:"Parents' contact details (for registering children)" },
  "reg.need3": { hy:"Նախընտրելի դասընթաց(ներ)ը", nl:"Gewenste vak(ken)", en:"Preferred class(es)" },
  "contact.eyebrow": { hy:"Կոնտակտային տվյալներ", nl:"Contactgegevens", en:"Contact details" },
  "contact.title": { hy:"Կապվեք մեզ հետ", nl:"Neem contact met ons op", en:"Get in touch" },
};
const DEFAULT_CLASSES = {
  hy: [
    "Նախադպրոցական խումբ","Այբբենարանի դասարան","Մայրենի 1-ին դասարան","Մայրենի 2-րդ դասարան",
    "Մայրենի 3-րդ դասարան","Մայրենի 4-րդ դասարան","Գրականության դասարան","Ես և շրջակա աշխարհը",
    "Հայրենագիտության դասարան","Պատմության դասարան","Օտարախոս երեխաների և մեծահասակների հայերենի դասարան",
    "Ավանդական երգ ու պարի խումբ","Ժողովրդական պարի խումբ","Դաշնամուրի անհատական դասեր","Շախմատի խմբակ"
  ].join("\n"),
  nl: [
    "Kleutergroep","Alfabetklas","Moedertaal 1","Moedertaal 2","Moedertaal 3","Moedertaal 4",
    "Literatuurklas","Ik en de wereld om mij heen","Vaderlandkunde","Geschiedenis",
    "Armeens voor anderstalige kinderen en volwassenen","Traditionele zang- en dansgroep",
    "Volksdansgroep","Individuele pianolessen","Schaakclub"
  ].join("\n"),
  en: [
    "Preschool group","Alphabet class","Native language 1","Native language 2",
    "Native language 3","Native language 4","Literature class","Me and my surroundings",
    "Homeland studies class","History class","Armenian for non-Armenian-speaking children and adults",
    "Traditional song and dance group","Folk dance group","Individual piano lessons","Chess club"
  ].join("\n")
};

const CONTENT_FIELDS = [
  { section:"Hero", key:"hero.title", label:"Վերնագիր" },
  { section:"Hero", key:"hero.lede",  label:"Նկարագրություն", area:true },
  { section:"Hero", key:"hero.factNum1", label:"Փաստ 1 — մեծ թիվ/բառ (օր.՝ 1999)" },
  { section:"Hero", key:"hero.fact1", label:"Փաստ 1 — փոքր տեքստ" },
  { section:"Hero", key:"hero.factNum2", label:"Փաստ 2 — մեծ թիվ/բառ (օր.՝ Mechelen)" },
  { section:"Hero", key:"hero.fact2", label:"Փաստ 2 — փոքր տեքստ" },
  { section:"Hero", key:"hero.factNum3", label:"Փաստ 3 — մեծ թիվ/բառ (օր.՝ Hamazkayin)" },
  { section:"Hero", key:"hero.fact3", label:"Փաստ 3 — փոքր տեքստ" },

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
  if (key === "classes.list"){
    return {
      hy: override?.hy || DEFAULT_CLASSES.hy,
      nl: override?.nl || DEFAULT_CLASSES.nl,
      en: override?.en || DEFAULT_CLASSES.en
    };
  }
  const def = DEFAULT_CONTENT[key] || { hy:"", nl:"", en:"" };
  return {
    hy: override?.hy || def.hy || "",
    nl: override?.nl || def.nl || "",
    en: override?.en || def.en || ""
  };
}

async function renderContentForm(){
  contentOverrides = await fetchSiteContent();
  const wrap = document.getElementById("contentFields");
  const nav = document.getElementById("contentNav");
  if (!wrap) return;
  const sections = [...new Set(CONTENT_FIELDS.map(f=>f.section))];
  if (nav){
    nav.innerHTML = sections.map(s=>`<a href="#cf-${slugify(s)}" class="content-nav-link">${escapeHtml(s)}</a>`).join("");
  }
  let currentSection = null;
  let html = "";
  CONTENT_FIELDS.forEach((f, i)=>{
    if (f.section !== currentSection){
      currentSection = f.section;
      html += `<h3 class="content-section-head" id="cf-${slugify(currentSection)}"${i>0 ? ' style="margin-top:34px;"' : ''}>${escapeHtml(currentSection)}</h3>`;
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
function slugify(s){ return s.replace(/[^a-zA-Zա-ֆԱ-Ֆ0-9]+/g, "-"); }

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
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
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
  // Always fetch fresh — reusing a cached contentOverrides here (even if
  // recently populated) risked showing a value from before the last save,
  // since nothing else was refreshing that cache after a successful save.
  contentOverrides = await fetchSiteContent();
  const setVal = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.value = contentOverrides[key]?.hy || "";
  };
  setVal("cf_address", "contactAddress");
  setVal("cf_parking", "contactParkingAddress");
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
    contactParkingAddress: document.getElementById("cf_parking").value.trim(),
    contactEmail: document.getElementById("cf_email").value.trim(),
    contactPhone: document.getElementById("cf_phone").value.trim(),
    contactFacebook: normalizeUrl(document.getElementById("cf_facebook").value),
    contactInstagram: normalizeUrl(document.getElementById("cf_instagram").value),
    contactBlog: normalizeUrl(document.getElementById("cf_blog").value)
  };
  const rows = Object.entries(fields)
    .filter(([,v])=>v)
    .map(([key,v])=>({ key, value_hy:v, value_nl:v, value_en:v }));
  if (!rows.length){ msg.textContent = "Լրացրեք գոնե մեկ դաշտ։"; msg.classList.add("show","err"); return; }
  try{
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    if (error) throw error;
    contentOverrides = await fetchSiteContent(); // keep the cache in sync immediately, not just after the next page load
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

const DAY_LABELS_HY = { 0: "Կիրակի", 1: "Երկուշաբթի", 2: "Երեքշաբթի", 3: "Չորեքշաբթի", 4: "Հինգշաբթի", 5: "Ուրբաթ", 6: "Շաբաթ" };

async function fetchSchedule(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("schedule").select("*").order("day_of_week").order("start_time");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(r=>({ id:r.id, dayOfWeek: r.day_of_week ?? 6, start:r.start_time, end:r.end_time, course:r.course, courseNl:r.course_nl, courseEn:r.course_en, teacher:r.teacher, teacherLatin:r.teacher_latin, active:r.active }));
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
    day_of_week: parseInt(document.getElementById("s_day").value, 10),
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
    loadScheduleAdmin(); loadClassRosterTab(); loadCancellationScheduleOptions();
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
        <td><span class="status-pill">${DAY_LABELS_HY[r.dayOfWeek] ?? "Շաբաթ"}</span></td>
        <td>${timeLabel(r.start)}–${timeLabel(r.end)}</td>
        <td>${escapeHtml(r.course||"")}${(r.courseNl || r.courseEn) ? ` <span class="helper" title="NL: ${escapeHtml(r.courseNl||"—")} · EN: ${escapeHtml(r.courseEn||"—")}">🌐</span>` : ""}</td>
        <td>${escapeHtml(r.teacher||"")}${r.teacherLatin ? ` <span class="helper" title="${escapeHtml(r.teacherLatin)}">🔤</span>` : ""}</td>
        <td style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn ghost small" data-editsched="${r.id}">Խմբագրել</button>
          <button class="btn danger small" data-delsched="${r.id}">Ջնջել</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="6">Դասացուցակը դատարկ է։</td></tr>`;
    body.querySelectorAll("[data-toggleactive]").forEach(cb=>{
      cb.addEventListener("change", async ()=>{
        await supabase.from("schedule").update({ active: cb.checked }).eq("id", cb.dataset.toggleactive);
        loadScheduleAdmin(); loadClassRosterTab(); loadCancellationScheduleOptions();
      });
    });
    body.querySelectorAll("[data-delsched]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս գիծը դասացուցակից։")) return;
        await supabase.from("schedule").delete().eq("id", b.dataset.delsched);
        loadScheduleAdmin(); loadClassRosterTab(); loadCancellationScheduleOptions();
      });
    });
    body.querySelectorAll("[data-editsched]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const rows2 = await fetchSchedule();
        const row = rows2.find(r=>r.id === b.dataset.editsched);
        if (!row) return;
        document.getElementById("s_day").value = String(row.dayOfWeek ?? 6);
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
    body.innerHTML = `<tr><td colspan="6">Սխալ՝ ${err.message}</td></tr>`;
  }
}

// ---------------------------------------------------------
// Schedule overview export — Excel and PDF, including which
// students are actually assigned to each class.
// ---------------------------------------------------------
async function fetchScheduleWithRoster(){
  const [scheduleRows, { data: allAssignments, error }] = await Promise.all([
    fetchSchedule(),
    supabase.from("class_assignments").select("*, registrations(*)")
  ]);
  if (error) throw error;
  const bySchedule = {};
  (allAssignments || []).forEach(a=>{ (bySchedule[a.schedule_id] ||= []).push(a); });
  return scheduleRows.map(r=>({
    ...r,
    students: (bySchedule[r.id] || [])
      .map(a=>a.registrations ? registrantDisplayName(a.registrations) : null)
      .filter(Boolean)
  }));
}

document.getElementById("exportScheduleExcelBtn")?.addEventListener("click", async ()=>{
  const msg = document.getElementById("exportScheduleMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (typeof XLSX === "undefined"){
    msg.textContent = "Excel գրադարանը չհաջողվեց բեռնել (ստուգեք ինտերնետ կապը)։";
    msg.classList.add("show","err"); return;
  }
  try{
    const rows = await fetchScheduleWithRoster();
    if (!rows.length){
      msg.textContent = "Դասացուցակը դեռ դատարկ է։"; msg.classList.add("show","err"); return;
    }
    const sheetRows = rows.map(r=>({
      "Ժամ": `${timeLabel(r.start)}–${timeLabel(r.end)}`,
      "Դասընթաց": r.course || "",
      "Ուսուցիչ": r.teacher || "",
      "Ուսանողների թիվ": r.students.length,
      "Ուսանողներ": r.students.join(", ")
    }));
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = [{ wch: 14 }, { wch: 26 }, { wch: 20 }, { wch: 12 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Դասացուցակ");
    const today = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, `dasacucak_${today}.xlsx`);
    msg.textContent = "Ֆայլը ներբեռնվեց ✔"; msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

document.getElementById("exportSchedulePdfBtn")?.addEventListener("click", async ()=>{
  const msg = document.getElementById("exportScheduleMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (typeof window.jspdf === "undefined" || typeof html2canvas === "undefined"){
    msg.textContent = "PDF գրադարանը չհաջողվեց բեռնել (ստուգեք ինտերնետ կապը)։";
    msg.classList.add("show","err"); return;
  }
  try{
    const rows = await fetchScheduleWithRoster();
    if (!rows.length){
      msg.textContent = "Դասացուցակը դեռ դատարկ է։"; msg.classList.add("show","err"); return;
    }

    // Build the table as real, correctly-rendered HTML first (using the
    // page's own Armenian-capable fonts), then rasterize that into the PDF —
    // jsPDF's built-in fonts only cover Latin script and would show Armenian
    // text as blank boxes if used directly.
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute; top:0; left:0; z-index:-9999; width:1000px; background:#fff; padding:28px; font-family:'Noto Serif Armenian', serif; color:#1a1a1a;";
    wrap.innerHTML = `
      <h1 style="font-size:22px; margin:0 0 4px;">Դասացուցակ</h1>
      <p style="font-size:12px; color:#666; margin:0 0 18px;">Համազգայինի Լևոն Շանթի անվան շաբաթօրյա դպրոց · ${new Date().toLocaleDateString("hy-AM")}</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#1F4B3F; color:#fff;">
            <th style="padding:9px 10px; text-align:left; border:1px solid #ccc;">Ժամ</th>
            <th style="padding:9px 10px; text-align:left; border:1px solid #ccc;">Դասընթաց</th>
            <th style="padding:9px 10px; text-align:left; border:1px solid #ccc;">Ուսուցիչ</th>
            <th style="padding:9px 10px; text-align:left; border:1px solid #ccc;">Ուսանողներ (թիվ)</th>
            <th style="padding:9px 10px; text-align:left; border:1px solid #ccc;">Ուսանողների անուններ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i)=>`
            <tr style="background:${i % 2 === 0 ? '#fff' : '#F8F4E6'};">
              <td style="padding:8px 10px; border:1px solid #ddd; white-space:nowrap; vertical-align:top;">${escapeHtml(timeLabel(r.start))}–${escapeHtml(timeLabel(r.end))}</td>
              <td style="padding:8px 10px; border:1px solid #ddd; font-weight:700; vertical-align:top;">${escapeHtml(r.course||"")}</td>
              <td style="padding:8px 10px; border:1px solid #ddd; vertical-align:top;">${escapeHtml(r.teacher||"")}</td>
              <td style="padding:8px 10px; border:1px solid #ddd; text-align:center; vertical-align:top;">${r.students.length}</td>
              <td style="padding:8px 10px; border:1px solid #ddd; line-height:1.6; vertical-align:top;">${r.students.length ? r.students.map(s=>escapeHtml(s)).join("<br>") : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>`;
    document.body.appendChild(wrap);

    const canvas = await html2canvas(wrap, {
      scale: 2,
      backgroundColor: "#ffffff",
      width: wrap.scrollWidth,
      height: wrap.scrollHeight,
      windowWidth: wrap.scrollWidth,
      windowHeight: wrap.scrollHeight
    });
    document.body.removeChild(wrap);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Slice the tall canvas across as many pages as needed instead of
    // squeezing a long schedule down to unreadable size on one page.
    let renderedHeight = 0;
    const usablePageHeight = pageHeight - 20;
    const pxPerMm = canvas.width / imgWidth;
    let first = true;
    while (renderedHeight < imgHeight){
      if (!first) pdf.addPage();
      first = false;
      const sliceHeightMm = Math.min(usablePageHeight, imgHeight - renderedHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightMm * pxPerMm;
      sliceCanvas.getContext("2d").drawImage(
        canvas, 0, renderedHeight * pxPerMm, canvas.width, sliceHeightMm * pxPerMm,
        0, 0, canvas.width, sliceHeightMm * pxPerMm
      );
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 10, 10, imgWidth, sliceHeightMm);
      renderedHeight += sliceHeightMm;
    }

    const today = new Date().toISOString().slice(0,10);
    pdf.save(`dasacucak_${today}.pdf`);
    msg.textContent = "Ֆայլը ներբեռնվեց ✔"; msg.classList.add("show","ok");
  }catch(err){
    msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
  }
});

// ---------------------------------------------------------
// Class roster — assign registered students to a schedule slot,
// so the class list can be built directly from registrations.
// ---------------------------------------------------------
// Simple bidirectional substring match: lets "Մայրենի 1" (a schedule
// entry) suggest registrants who picked "Մայրենի" (the registration
// form's broader course name), without needing an exact match.
function courseNamesLikelyMatch(scheduleCourse, regCourse){
  if (!scheduleCourse || !regCourse) return false;
  const a = scheduleCourse.trim().toLowerCase();
  const b = regCourse.trim().toLowerCase();
  return a.includes(b) || b.includes(a);
}

let selectedRosterScheduleId = null;
let selectedRosterCourseName = null;
let rosterScheduleRows = [];
let rosterAssignmentsBySchedule = {};

async function loadClassRosterTab(){
  const listEl = document.getElementById("rosterClassList");
  if (!listEl) return;
  listEl.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  try{
    const [scheduleRows, { data: allAssignments, error }] = await Promise.all([
      fetchSchedule(),
      supabase.from("class_assignments").select("*, registrations(*)")
    ]);
    if (error) throw error;

    rosterScheduleRows = scheduleRows;
    rosterAssignmentsBySchedule = {};
    (allAssignments || []).forEach(a=>{
      (rosterAssignmentsBySchedule[a.schedule_id] ||= []).push(a);
    });

    if (!scheduleRows.length){
      listEl.innerHTML = `<p class="helper">Դասացուցակը դեռ դատարկ է։ Նախ ավելացրեք դասեր «🗓️ Դասացուցակ» բաժնում։</p>`;
      return;
    }

    listEl.innerHTML = scheduleRows.map(r=>{
      const assigned = rosterAssignmentsBySchedule[r.id] || [];
      const chips = assigned.map(a=>{
        const reg = a.registrations;
        if (!reg) return "";
        return `<span class="roster-chip">${escapeHtml(registrantDisplayName(reg))}<button data-removechip="${a.id}" title="Հեռացնել">✕</button></span>`;
      }).join("");
      return `
        <div class="roster-class-card${r.id === selectedRosterScheduleId ? " selected" : ""}" data-classcard="${r.id}" data-course="${escapeHtml(r.course||"")}">
          <div class="rc-time">${timeLabel(r.start)}–${timeLabel(r.end)}</div>
          <div class="rc-course">${escapeHtml(r.course||"")}</div>
          ${r.teacher ? `<div class="rc-teacher">${escapeHtml(r.teacher)}</div>` : ""}
          <span class="rc-count">👥 ${assigned.length}</span>
          ${chips ? `<div class="roster-chip-row">${chips}</div>` : ""}
        </div>`;
    }).join("");

    listEl.querySelectorAll("[data-classcard]").forEach(card=>{
      card.addEventListener("click", (e)=>{
        if (e.target.closest("[data-removechip]")) return; // handled separately below
        if (card.dataset.classcard === selectedRosterScheduleId){
          deselectRosterClass();
        } else {
          selectRosterClass(card.dataset.classcard, card.dataset.course);
        }
      });
    });
    listEl.querySelectorAll("[data-removechip]").forEach(btn=>{
      btn.addEventListener("click", async (e)=>{
        e.stopPropagation();
        const classCard = btn.closest("[data-classcard]");
        const scheduleId = classCard?.dataset.classcard;
        if (scheduleId) await removeClassAssignment(btn.dataset.removechip, scheduleId);
      });
    });

    // Re-select the previously active class (if any) so removing/adding a
    // student doesn't lose your place in the board.
    if (selectedRosterScheduleId){
      const card = listEl.querySelector(`[data-classcard="${selectedRosterScheduleId}"]`);
      if (card) card.classList.add("selected");
    }
  }catch(err){
    listEl.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
  }
}

function selectRosterClass(scheduleId, courseName){
  selectedRosterScheduleId = scheduleId;
  selectedRosterCourseName = courseName;
  document.querySelectorAll("[data-classcard]").forEach(c=>{
    c.classList.toggle("selected", c.dataset.classcard === scheduleId);
  });
  const heading = document.getElementById("rosterStudentsHeading");
  const search = document.getElementById("rosterStudentSearch");
  const showAllRow = document.getElementById("rosterShowAllRow");
  const showAllToggle = document.getElementById("rosterShowAllToggle");
  if (heading) heading.textContent = `➕ Ավելացնել «${courseName}» դասին`;
  if (search){ search.style.display = ""; search.value = ""; }
  if (showAllRow) showAllRow.style.display = "flex";
  if (showAllToggle) showAllToggle.checked = false; // default to "only matching" for every newly selected class
  renderRosterStudentList();
  // On narrow screens the two columns stack vertically, so jump straight to
  // the student list instead of leaving admin to scroll past the class cards
  // every single time. On wide screens both columns are already visible
  // side by side, so no scroll is needed there.
  if (window.matchMedia("(max-width: 900px)").matches){
    document.querySelector(".roster-col-students")?.scrollIntoView({ behavior:"smooth", block:"start" });
  }
}

// Clicking an already-selected class card again closes its student list,
// so the other class cards are easy to see again without an open panel
// taking up attention — same behavior on desktop (side-by-side columns)
// and mobile (stacked columns), since it's the same click handler either way.
function deselectRosterClass(){
  selectedRosterScheduleId = null;
  selectedRosterCourseName = null;
  document.querySelectorAll("[data-classcard]").forEach(c=> c.classList.remove("selected"));
  const heading = document.getElementById("rosterStudentsHeading");
  const search = document.getElementById("rosterStudentSearch");
  const showAllRow = document.getElementById("rosterShowAllRow");
  const listEl = document.getElementById("rosterStudentList");
  if (heading) heading.textContent = "👈 Նախ ընտրեք դասը ձախից";
  if (search){ search.style.display = "none"; search.value = ""; }
  if (showAllRow) showAllRow.style.display = "none";
  if (listEl) listEl.innerHTML = "";
}

async function renderRosterStudentList(){
  const listEl = document.getElementById("rosterStudentList");
  const searchInput = document.getElementById("rosterStudentSearch");
  const showAllToggle = document.getElementById("rosterShowAllToggle");
  if (!listEl || !selectedRosterScheduleId) return;
  const searchTerm = (searchInput?.value || "").trim().toLowerCase();
  const showAll = !!showAllToggle?.checked;

  if (!registrationsCache.length){
    const { data } = await supabase.from("registrations").select("*").order("submitted_at", { ascending:false });
    registrationsCache = data || [];
  }

  const assignedIds = new Set((rosterAssignmentsBySchedule[selectedRosterScheduleId] || []).map(a=>a.registration_id));
  let candidates = registrationsCache.filter(r=>!assignedIds.has(r.id));
  const matchesCourse = r => (r.courses||[]).some(c=>courseNamesLikelyMatch(selectedRosterCourseName, c));

  // Default view: only registrants whose chosen course matches this class,
  // since that covers the common case with no extra scanning needed. The
  // "show all" toggle reveals everyone else too, for switching a student
  // into a different class than what they originally registered for.
  const matching = candidates.filter(matchesCourse);
  const others = candidates.filter(r=>!matchesCourse(r));
  candidates = showAll ? [...matching, ...others] : matching;

  if (searchTerm){
    candidates = candidates.filter(r=>registrantDisplayName(r).toLowerCase().includes(searchTerm));
  }

  const emptyMsg = searchTerm
    ? "Ոչինչ չի գտնվել։"
    : (showAll ? "Բոլորը արդեն նշանակված են այս դասին։" : "Այս դասընթացին գրանցված ոչ ոք չկա։ Փորձեք միացնել «Ցուցադրել բոլորին»։");

  listEl.innerHTML = candidates.length ? candidates.map(r=>{
    const isMatch = matchesCourse(r);
    return `
      <div class="roster-student-card" data-addstudent="${r.id}">
        <div>
          <div class="rs-name">${isMatch ? '<span class="rs-star">⭐</span> ' : ""}${escapeHtml(registrantDisplayName(r))}</div>
          <div class="rs-meta">${r.type === "child" ? "Երեխա" : "Մեծահասակ"} · ${escapeHtml((r.courses||[]).join(", "))}</div>
        </div>
        <span class="rs-add-icon">➕</span>
      </div>`;
  }).join("") : `<p class="helper">${emptyMsg}</p>`;

  listEl.querySelectorAll("[data-addstudent]").forEach(card=>{
    card.addEventListener("click", async ()=>{
      const msg = document.getElementById("classRosterMsg");
      msg.className = "form-msg"; msg.textContent = "";
      const registrationId = card.dataset.addstudent;
      try{
        const { data: inserted, error } = await supabase.from("class_assignments").insert({
          registration_id: registrationId,
          schedule_id: selectedRosterScheduleId
        }).select().single();
        if (error) throw error;

        // Update in place instead of reloading the whole board — reloading
        // reset the scroll position of both columns and the "show all"
        // toggle, making it painful to add several students to the same
        // class in a row. This keeps everything exactly as it was, just
        // with the one student moved from "unassigned" to the class card.
        const student = registrationsCache.find(r=>r.id === registrationId);
        (rosterAssignmentsBySchedule[selectedRosterScheduleId] ||= []).push({ ...inserted, registrations: student });
        addChipToClassCard(selectedRosterScheduleId, inserted, student);
        card.remove();

        if (!listEl.querySelector("[data-addstudent]")){
          const searchInput = document.getElementById("rosterStudentSearch");
          const stillSearching = (searchInput?.value || "").trim();
          listEl.innerHTML = `<p class="helper">${stillSearching ? "Ոչինչ չի գտնվել։" : "Բոլորը արդեն նշանակված են այս դասին։"}</p>`;
        }
      }catch(err){
        msg.textContent = "Սխալ՝ " + err.message; msg.classList.add("show","err");
      }
    });
  });
}

// Updates one class card's count badge and chip row directly in the DOM,
// and wires the new chip's remove button — used so adding a student never
// needs to rebuild the whole board (see above).
function addChipToClassCard(scheduleId, assignment, student){
  const classCard = document.querySelector(`[data-classcard="${scheduleId}"]`);
  if (!classCard || !student) return;
  const countEl = classCard.querySelector(".rc-count");
  const assignedNow = rosterAssignmentsBySchedule[scheduleId] || [];
  if (countEl) countEl.textContent = `👥 ${assignedNow.length}`;
  let chipRow = classCard.querySelector(".roster-chip-row");
  if (!chipRow){
    chipRow = document.createElement("div");
    chipRow.className = "roster-chip-row";
    classCard.appendChild(chipRow);
  }
  chipRow.insertAdjacentHTML("beforeend",
    `<span class="roster-chip">${escapeHtml(registrantDisplayName(student))}<button data-removechip="${assignment.id}" title="Հեռացնել">✕</button></span>`
  );
  chipRow.querySelector(`[data-removechip="${assignment.id}"]`)?.addEventListener("click", async (e)=>{
    e.stopPropagation();
    await removeClassAssignment(assignment.id, scheduleId);
  });
}

// Removes one assignment and updates the board in place (used by both the
// chip's ✕ in the class-card list and the roster tab).
async function removeClassAssignment(assignmentId, scheduleId){
  await supabase.from("class_assignments").delete().eq("id", assignmentId);
  rosterAssignmentsBySchedule[scheduleId] = (rosterAssignmentsBySchedule[scheduleId] || []).filter(a=>a.id !== assignmentId);
  const classCard = document.querySelector(`[data-classcard="${scheduleId}"]`);
  if (classCard){
    const countEl = classCard.querySelector(".rc-count");
    if (countEl) countEl.textContent = `👥 ${(rosterAssignmentsBySchedule[scheduleId] || []).length}`;
    classCard.querySelector(`[data-removechip="${assignmentId}"]`)?.closest(".roster-chip")?.remove();
  }
  // If this is the class currently being viewed on the right, bring the
  // removed student back into the addable list.
  if (selectedRosterScheduleId === scheduleId) renderRosterStudentList();
}

document.getElementById("rosterStudentSearch")?.addEventListener("input", ()=> renderRosterStudentList());
document.getElementById("rosterShowAllToggle")?.addEventListener("change", ()=> renderRosterStudentList());

document.getElementById("rosterBackToClasses")?.addEventListener("click", (e)=>{
  e.preventDefault();
  document.querySelector(".roster-col-classes")?.scrollIntoView({ behavior:"smooth", block:"start" });
});

// ---------------------------------------------------------
// Cancel classes on a specific Saturday (holiday/break, etc.)
// ---------------------------------------------------------
async function fetchCancellations(){
  if (!SUPABASE_READY) return [];
  const { data, error } = await supabase.from("schedule_cancellations").select("*").order("cancel_date");
  if (error){ console.warn(error.message); return []; }
  return data || [];
}

async function loadCancellationScheduleOptions(){
  const select = document.getElementById("cs_schedule");
  if (!select) return;
  try{
    const rows = await fetchSchedule();
    select.innerHTML = `<option value="">Ողջ oրվա բոլոր դասերը</option>` + rows.map(r=>
      `<option value="${r.id}">${timeLabel(r.start)}–${timeLabel(r.end)} — ${escapeHtml(r.course||"")}</option>`
    ).join("");
  }catch(err){
    console.warn("Could not load schedule for cancellation dropdown:", err.message);
  }
}

document.getElementById("cancelSaturdayForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("cancelSaturdayMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY || !currentUser){
    msg.textContent = "Պետք է մուտք գործած լինեք և Supabase-ը կարգավորված լինի։";
    msg.classList.add("show","err"); return;
  }
  const cancelDate = document.getElementById("cs_date").value;
  const scheduleId = document.getElementById("cs_schedule").value || null;
  try{
    if (!scheduleId){
      // Prevent duplicate "cancel the whole day" entries for the same date —
      // a unique index can't catch this on its own since NULL values are
      // never considered equal to each other in a unique constraint.
      const existing = await fetchCancellations();
      if (existing.some(r=>r.cancel_date === cancelDate && !r.schedule_id)){
        msg.textContent = "Այս oրվա բոլոր դասերն արդեն նշված են որպես չեղարկված։";
        msg.classList.add("show","err"); return;
      }
    }
    const { error } = await supabase.from("schedule_cancellations").insert({
      cancel_date: cancelDate,
      schedule_id: scheduleId,
      reason_hy: document.getElementById("cs_reason_hy").value.trim() || null,
      reason_nl: document.getElementById("cs_reason_nl").value.trim() || null,
      reason_en: document.getElementById("cs_reason_en").value.trim() || null,
      created_by: currentUser.id
    });
    if (error) throw error;
    msg.textContent = "Չեղարկվեց ✔ (տեսանելի է հանրային կայքի օրացույցում)";
    msg.classList.add("show","ok");
    e.target.reset();
    loadCancellationsAdmin();
  }catch(err){
    msg.textContent = err.message.includes("duplicate") ? "Այս դասը այս oրով արդեն նշված է որպես չեղարկված։" : "Սխալ՝ " + err.message;
    msg.classList.add("show","err");
  }
});

async function loadCancellationsAdmin(){
  const body = document.getElementById("cancelSaturdayBody");
  if (!body) return;
  try{
    const [rows, scheduleRows] = await Promise.all([fetchCancellations(), fetchSchedule()]);
    const scheduleById = {};
    scheduleRows.forEach(r=>{ scheduleById[r.id] = r; });
    body.innerHTML = rows.length ? rows.map(r=>{
      const what = r.schedule_id
        ? (scheduleById[r.schedule_id] ? escapeHtml(scheduleById[r.schedule_id].course||"") : "(դասը ջնջված է)")
        : `<strong>Ողջ oրվա բոլոր դասերը</strong>`;
      return `<tr>
        <td>${r.cancel_date}</td>
        <td>${what}</td>
        <td>${escapeHtml(r.reason_hy||"—")}</td>
        <td><button class="btn ghost small" data-restoresat="${r.id}">Վերականգնել</button></td>
      </tr>`;
    }).join("") : `<tr><td colspan="4">Չկան չեղարկված օրեր/դասեր։</td></tr>`;
    body.querySelectorAll("[data-restoresat]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Վերականգնե՞լ այս դասը (հեռացնել չեղարկումը)։")) return;
        await supabase.from("schedule_cancellations").delete().eq("id", b.dataset.restoresat);
        loadCancellationsAdmin();
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="4">Սխալ՝ ${err.message}</td></tr>`;
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
        <td>${escapeHtml(t.name||"")}${t.nameLatin ? ` <span class="helper" title="${escapeHtml(t.nameLatin)}">🔤</span>` : ""}</td>
        <td>${escapeHtml(t.role||"")}${(t.roleNl || t.roleEn) ? ` <span class="helper" title="NL: ${escapeHtml(t.roleNl||"—")} · EN: ${escapeHtml(t.roleEn||"—")}">🌐</span>` : ""}</td>
        <td><button class="btn danger small" data-delstaff="${t.id}">Ջնջել</button></td>
      </tr>`).join("") : `<tr><td colspan="3">Անձնակազմի ցանկը դատարկ է։</td></tr>`;
    body.querySelectorAll("[data-delstaff]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս անձնակազմի անդամին։")) return;
        await supabase.from("staff").delete().eq("id", b.dataset.delstaff);
        loadStaffAdmin();
      });
    });
  }catch(err){
    body.innerHTML = `<tr><td colspan="3">Սխալ՝ ${err.message}</td></tr>`;
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
    if (!openYearGroups) openYearGroups = new Set([currentAcademicStartYear()]);
    openYearGroups.add(academicStartYearOf(startVal));
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

// Academic year runs September→August, computed purely from each entry's
// start date — matches the same logic used on the public site's year picker.
function academicStartYearOf(iso){
  const [y, m] = iso.split("-").map(Number);
  return m >= 9 ? y : y - 1;
}
function academicYearLabel(startYear){ return `${startYear}–${startYear + 1}`; }
function currentAcademicStartYear(){
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

// Remembers which academic-year sections the admin has open, so re-rendering
// the list (after adding/editing/deleting an entry) doesn't reset everything
// back to only the current year — it keeps whatever was actually open.
let openYearGroups = null;

async function loadYearCalAdmin(){
  const wrap = document.getElementById("yearCalAdminGroups");
  if (!wrap) return;
  try{
    const rows = await fetchYearCalEntries();
    if (!rows.length){
      wrap.innerHTML = `<p class="helper">Դեռ գծեր չկան։</p>`;
      return;
    }
    const byYear = {};
    rows.forEach(r=>{
      if (!r.start) return;
      const y = academicStartYearOf(r.start);
      (byYear[y] ||= []).push(r);
    });
    const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
    const thisYear = currentAcademicStartYear();
    if (!openYearGroups) openYearGroups = new Set([thisYear]);

    wrap.innerHTML = years.map(y=>{
      const list = byYear[y].sort((a,b)=> (a.start||"").localeCompare(b.start||""));
      const rowsHtml = list.map(r=>`
        <tr>
          <td>${formatDateRange(r.start, r.end)}</td>
          <td>${escapeHtml(r.labelHy||"")}${(r.labelNl || r.labelEn) ? ` <span class="helper" title="NL: ${escapeHtml(r.labelNl||"—")} · EN: ${escapeHtml(r.labelEn||"—")}">🌐</span>` : ""}</td>
          <td style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn ghost small" data-edityc="${r.id||''}">Խմբագրել</button>
            <button class="btn danger small" data-delyc="${r.id||''}">Ջնջել</button>
          </td>
        </tr>`).join("");
      return `
        <details class="year-group" data-year="${y}" ${openYearGroups.has(y) ? "open" : ""} style="margin-bottom:16px; border:1px solid var(--line); border-radius:12px; overflow:hidden;">
          <summary style="cursor:pointer; padding:14px 18px; font-weight:700; font-family:'Noto Serif Armenian',serif; background:var(--card); list-style:none; display:flex; align-items:center; gap:8px;">
            📅 Ուսումնական տարի ${academicYearLabel(y)} <span class="helper" style="font-weight:400;">(${list.length} գիծ)</span>${y === thisYear ? ' <span class="status-pill">ընթացիկ</span>' : ""}
          </summary>
          <div class="table-wrap" style="border:none; border-radius:0; border-top:1px solid var(--line);">
            <table>
              <thead><tr><th>Ամսաթիվ</th><th>Անվանում</th><th></th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </details>`;
    }).join("");

    wrap.querySelectorAll(".year-group").forEach(details=>{
      details.addEventListener("toggle", ()=>{
        const y = parseInt(details.dataset.year, 10);
        if (details.open) openYearGroups.add(y); else openYearGroups.delete(y);
      });
    });

    wrap.querySelectorAll("[data-delyc]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս գիծը տարեկան օրացույցից։")) return;
        await supabase.from("yearly_events").delete().eq("id", b.dataset.delyc);
        loadYearCalAdmin();
      });
    });
    wrap.querySelectorAll("[data-edityc]").forEach(b=>{
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
    wrap.innerHTML = `<p class="helper">Սխալ՝ ${err.message}</p>`;
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
    let url = normalizeUrl(document.getElementById("yc_url").value);
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
    let url = normalizeUrl(document.getElementById("logo_url").value);
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
