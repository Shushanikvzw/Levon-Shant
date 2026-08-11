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
  try { supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, { auth: { persistSession: false, autoRefreshToken: false } }); }
  catch (err) { console.warn("Could not initialize the Supabase client.", err); }
} else {
  console.warn("Supabase is not configured yet — see README.md.");
}
const SUPABASE_READY = !!supabase;

let currentUser = null;
let currentRole = null;

function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

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
  loadAlbumsAdmin();
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
    const payload = {
      type, title, title_nl: titleNl || null, title_en: titleEn || null,
      body, body_nl: bodyNl || null, body_en: bodyEn || null,
      date, media_url: mediaUrl || null, media_type: mediaType
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
  if (!files.length){
    msg.textContent = "Ընտրեք առնվազն մեկ լուսանկար կամ տեսանյութ։";
    msg.classList.add("show","err"); return;
  }
  msg.textContent = `Վերբեռնվում է ${files.length} ֆայլ...`;
  msg.classList.add("show");
  try{
    const media = await uploadAlbumFiles(files);
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
          <button class="btn danger small" data-delalbum="${a.id}">Ջնջել ալբոմը</button>
        </div>
        <div class="album-admin-thumbs">
          ${media.map((m,i)=> m.type==="video"
            ? `<div class="thumb-wrap"><div class="vid-thumb">▶</div><button class="thumb-del" data-delmedia="${a.id}:${i}" title="Ջնջել">✕</button></div>`
            : `<div class="thumb-wrap"><img src="${m.url}"><button class="thumb-del" data-delmedia="${a.id}:${i}" title="Ջնջել">✕</button></div>`
          ).join("")}
        </div>
        <div class="album-add-row">
          <input type="file" accept="image/*,video/*" multiple data-addfiles="${a.id}" style="max-width:280px;">
          <button class="btn ghost small" data-addmedia="${a.id}">➕ Ավելացնել այս ալբոմում</button>
        </div>
      </div>`;
    }).join("") : `<p class="helper">Դեռ ալբոմներ չկան։</p>`;

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
        const files = Array.from(fileInput?.files || []);
        if (!files.length){ alert("Ընտրեք ֆայլ(եր) նախ։"); return; }
        b.textContent = "Վերբեռնվում է...";
        b.disabled = true;
        try{
          const newMedia = await uploadAlbumFiles(files);
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
        <td style="display:flex; gap:6px;">
          <button class="btn ghost small" data-editpost="${p.id}">Խմբագրել</button>
          <button class="btn danger small" data-del="${p.id}">Ջնջել</button>
        </td>
      </tr>`).join("") : `<tr><td colspan="5">Հրապարակումներ չկան։</td></tr>`;
    body.querySelectorAll("[data-del]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս հրապարակումը։")) return;
        await supabase.from("posts").delete().eq("id", b.dataset.del);
        loadManagePosts();
      });
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
// Registrations (admin only, read + delete)
// ---------------------------------------------------------
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
      </tr>`;
    }).join("") : `<tr><td colspan="6">Դեռ գրանցումներ չկան։</td></tr>`;
  }catch(err){
    body.innerHTML = `<tr><td colspan="6">Սխալ՝ ${err.message}</td></tr>`;
  }
}

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
      return {
        "Տեսակ": isChild ? "Երեխա" : "Մեծահասակ",
        "Անուն, ազգանուն": isChild ? (r.child_name||"") : (r.name||""),
        "Ծննդյան տարեթիվ": isChild ? (r.child_dob||"") : (r.dob||""),
        "Սեռ": r.gender||"",
        "Հասցե": r.address||"",
        "Ազգություն": r.nationality||"",
        "Մայրենի լեզու": r.native_lang||"",
        "Էլ. հասցե": isChild ? (r.email||"") : (r.email||""),
        "Հեռախոս": r.phone||"",
        "Մայր (անուն/հեռախոս)": r.mother||"",
        "Հայր (անուն/հեռախոս)": r.father||"",
        "Դասընթացներ": (r.courses||[]).join(", "),
        "Հայերենի մակարդակ": r.level||"",
        "Համաձայնություն նկարներին": r.photo_consent||"",
        "Ուղարկվել է": r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map(k=>({ wch: Math.max(14, k.length + 2) }));
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
const DEFAULT_CONTENT = {
  "hero.title": { hy:"Բարի գալուստ Համազգայինի Լևոն Շանթի անվան շաբաթօրյա դպրոց", nl:"Welkom bij de Hamazkayin Levon Shant Zaterdagschool", en:"Welcome to the Hamazkayin Levon Shant Saturday School" },
  "hero.lede": { hy:"Համազգայինի Լևոն Շանթի անվան շաբաթօրյա դպրոցում հայ երեխաներն ու ընտանիքները սովորում են հայոց լեզու, պատմություն և մշակույթ, և մասնակցում մշակութային ու երիտասարդական միջոցառումների՝ ամեն շաբաթ, Մեխելեն քաղաքում։", nl:"Op de Hamazkayin Levon Shant Zaterdagschool leren Armeense kinderen en gezinnen de Armeense taal, geschiedenis en cultuur, en nemen ze elke week deel aan culturele en jongerenevenementen in Mechelen.", en:"At the Hamazkayin Levon Shant Saturday School, Armenian children and families learn the Armenian language, history, and culture, and take part every week in cultural and youth activities in Mechelen." },
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
    contactFacebook: normalizeUrl(document.getElementById("cf_facebook").value),
    contactInstagram: normalizeUrl(document.getElementById("cf_instagram").value),
    contactBlog: normalizeUrl(document.getElementById("cf_blog").value)
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
