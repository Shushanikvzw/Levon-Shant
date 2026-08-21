/* =========================================================
   Ծնողների / ուսուցիչների պորտալ — portal.js
   Separate from admin.js on purpose: parents and teachers get a
   much smaller, read-mostly view, never the full admin dashboard.
   ========================================================= */

let createClient = null;
try {
  ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
} catch (err) {
  console.warn("Could not load the Supabase library (network or CDN issue).", err);
}

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
function timeLabel(t){ return t || ""; }

// A login identifier can be a real email or a phone number. Phone numbers
// are turned into a validly-formatted (but never actually emailed) pseudo
// address, purely so Supabase's email/password auth can be reused without
// needing paid SMS infrastructure — the person only ever needs to remember
// their own phone number, never this technical detail.
function normalizeIdentifier(value, forcedMode){
  const trimmed = (value || "").trim();
  const isPhoneMode = forcedMode === "phone" || (!forcedMode && !trimmed.includes("@"));
  if (isPhoneMode){
    const digits = trimmed.replace(/[^0-9]/g, "");
    return digits ? `${digits}@parent.local` : trimmed.toLowerCase();
  }
  return trimmed.toLowerCase();
}

// ---------------------------------------------------------
// Auth screen vs main screen
// ---------------------------------------------------------
const authScreen = document.getElementById("authScreen");
const mainScreen = document.getElementById("mainScreen");

function showAuthScreen(message){
  authScreen.style.display = "";
  mainScreen.style.display = "none";
  if (message){
    const el = document.getElementById("authNotice");
    el.textContent = message;
    el.classList.add("show","err");
  }
}
function showMainScreen(){
  authScreen.style.display = "none";
  mainScreen.style.display = "";
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

let signupIdMode = "email";
document.querySelectorAll('.id-toggle button[data-idmode]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.id-toggle button[data-idmode]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    signupIdMode = btn.dataset.idmode;
    const input = document.getElementById('signupId');
    input.placeholder = signupIdMode === 'phone' ? '04XX XX XX XX' : 'you@example.com';
    input.type = signupIdMode === 'phone' ? 'tel' : 'email';
  });
});

document.getElementById("loginForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("loginMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Կայքը դեռ միացված չէ Supabase-ին։";
    msg.classList.add("show","err"); return;
  }
  const email = normalizeIdentifier(document.getElementById("loginId").value);
  const pass = document.getElementById("loginPass").value;
  const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (error){
    msg.textContent = "Մուտքը ձախողվեց՝ " + error.message;
    msg.classList.add("show","err"); return;
  }
  // onAuthStateChange picks this up and renders the right screen
});

document.getElementById("signupForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const msg = document.getElementById("signupMsg");
  msg.className = "form-msg"; msg.textContent = "";
  if (!SUPABASE_READY){
    msg.textContent = "Կայքը դեռ միացված չէ Supabase-ին։";
    msg.classList.add("show","err"); return;
  }
  const roleHint = document.querySelector('input[name="signupRole"]:checked').value;
  const roleLabel = roleHint === "teacher" ? "Ուսուցիչ" : "Ծնող";
  const name = document.getElementById("signupName").value.trim();
  const email = normalizeIdentifier(document.getElementById("signupId").value, signupIdMode);
  const pass = document.getElementById("signupPass").value;
  const { error } = await supabase.auth.signUp({
    email, password: pass,
    options: { data: { name: `[${roleLabel}] ${name}` } }
  });
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
  if (currentRole === "admin" || currentRole === "smm"){
    currentUser = null;
    await supabase.auth.signOut();
    showAuthScreen("Այս հաշիվն անձնակազմի հաշիվ է։ Խնդրում ենք օգտագործել admin.html էջը։");
    return;
  }
  showMainScreen();
  if (currentRole === "teacher") renderTeacherView();
  else renderParentView();
}

if (SUPABASE_READY){
  supabase.auth.onAuthStateChange((_event, session) => { handleAuthChange(session); });
} else {
  showAuthScreen();
}

// ---------------------------------------------------------
// Parent view: announcements grouped by course, newest first
// ---------------------------------------------------------
async function renderParentView(){
  document.getElementById("mainHeading").textContent = "👨‍👩‍👧 Հայտարարություններ";
  const content = document.getElementById("mainContent");
  content.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  try{
    const { data: links, error: linksErr } = await supabase.from("parent_links").select("*").eq("parent_user_id", currentUser.id);
    if (linksErr) throw linksErr;
    if (!links || !links.length){
      content.innerHTML = `<div class="empty-note">Ձեր հաշիվը դեռ կապակցված չէ երեխայի գրանցման հետ։ Դիմեք դպրոցի ադմինիստրատորին։</div>`;
      return;
    }
    const registrationIds = links.map(l=>l.registration_id);
    const { data: assignments, error: caErr } = await supabase
      .from("class_assignments")
      .select("*, schedule(*)")
      .in("registration_id", registrationIds);
    if (caErr) throw caErr;
    if (!assignments || !assignments.length){
      content.innerHTML = `<div class="empty-note">Ձեր երեխան դեռ նշանակված չէ որևէ դասի։ Դիմեք դպրոցի ադմինիստրատորին։</div>`;
      return;
    }

    const scheduleIds = [...new Set(assignments.map(a=>a.schedule_id))];
    const { data: announcements, error: annErr } = await supabase
      .from("course_announcements")
      .select("*")
      .in("schedule_id", scheduleIds)
      .order("created_at", { ascending:false });
    if (annErr) throw annErr;

    const scheduleById = {};
    assignments.forEach(a=>{ if (a.schedule) scheduleById[a.schedule_id] = a.schedule; });

    content.innerHTML = scheduleIds.map(sid=>{
      const sched = scheduleById[sid];
      if (!sched) return "";
      const items = (announcements || []).filter(a=>a.schedule_id === sid);
      const body = items.length
        ? items.map(a=>`
            <div class="announcement">
              <span class="a-date">${new Date(a.created_at).toLocaleDateString("hy-AM")}</span>
              <h3>${escapeHtml(a.title)}</h3>
              ${a.body ? `<p>${escapeHtml(a.body)}</p>` : ""}
              ${a.teacher_name ? `<div class="a-teacher">— ${escapeHtml(a.teacher_name)}</div>` : ""}
            </div>`).join("")
        : `<div class="announcement"><p class="helper">Դեռ հայտարարություններ չկան այս դասի համար։</p></div>`;
      return `
        <div class="course-group">
          <div class="course-group-head">📚 ${escapeHtml(sched.course||"")} <span style="font-weight:400; opacity:.85; font-size:.82rem;">(${timeLabel(sched.start_time)}–${timeLabel(sched.end_time)})</span></div>
          <div class="course-group-body">${body}</div>
        </div>`;
    }).join("") || `<div class="empty-note">Դեռ ոչինչ չկա ցուցադրելու համար։</div>`;
  }catch(err){
    content.innerHTML = `<div class="empty-note">Սխալ՝ ${err.message}</div>`;
  }
}

// ---------------------------------------------------------
// Teacher view: post/edit/delete announcements for own class(es)
// ---------------------------------------------------------
async function renderTeacherView(){
  document.getElementById("mainHeading").textContent = "🧑‍🏫 Իմ դասերի հայտարարությունները";
  const content = document.getElementById("mainContent");
  content.innerHTML = `<p class="helper">Բեռնվում է…</p>`;
  try{
    const { data: assigns, error: taErr } = await supabase
      .from("teacher_assignments")
      .select("*, schedule(*)")
      .eq("teacher_user_id", currentUser.id);
    if (taErr) throw taErr;
    if (!assigns || !assigns.length){
      content.innerHTML = `<div class="empty-note">Ձեր հաշիվը դեռ կապակցված չէ որևէ դասի հետ։ Դիմեք դպրոցի ադմինիստրատորին։</div>`;
      return;
    }

    const scheduleIds = assigns.map(a=>a.schedule_id);
    const { data: announcements, error: annErr } = await supabase
      .from("course_announcements")
      .select("*")
      .in("schedule_id", scheduleIds)
      .order("created_at", { ascending:false });
    if (annErr) throw annErr;

    content.innerHTML = assigns.map(a=>{
      const sched = a.schedule;
      if (!sched) return "";
      const items = (announcements || []).filter(x=>x.schedule_id === a.schedule_id);
      const list = items.length ? items.map(x=>`
        <div class="announcement">
          <span class="a-date">${new Date(x.created_at).toLocaleDateString("hy-AM")}</span>
          <h3>${escapeHtml(x.title)}</h3>
          ${x.body ? `<p>${escapeHtml(x.body)}</p>` : ""}
          <div class="a-actions">
            <button class="btn ghost small" data-editann="${x.id}">Խմբագրել</button>
            <button class="btn danger small" data-delann="${x.id}">Ջնջել</button>
          </div>
        </div>`).join("") : `<div class="announcement"><p class="helper">Դեռ հայտարարություններ չկան։</p></div>`;
      return `
        <div class="course-group">
          <div class="course-group-head">📚 ${escapeHtml(sched.course||"")} <span style="font-weight:400; opacity:.85; font-size:.82rem;">(${timeLabel(sched.start_time)}–${timeLabel(sched.end_time)})</span></div>
          <div class="course-group-body">
            <div class="announcement" style="background:var(--paper-dim);">
              <form data-postform="${a.schedule_id}">
                <div class="field"><label>Վերնագիր</label><input data-field="title" required></div>
                <div class="field" style="margin-top:10px;"><label>Տեքստ</label><textarea data-field="body" rows="3"></textarea></div>
                <button class="btn apricot small" type="submit" style="margin-top:10px;">Հրապարակել</button>
                <div class="form-msg" data-postmsg></div>
              </form>
            </div>
            ${list}
          </div>
        </div>`;
    }).join("");

    content.querySelectorAll("[data-postform]").forEach(form=>{
      form.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const scheduleId = form.dataset.postform;
        const msgEl = form.querySelector("[data-postmsg]");
        msgEl.className = "form-msg"; msgEl.textContent = "";
        const title = form.querySelector('[data-field="title"]').value.trim();
        const body = form.querySelector('[data-field="body"]').value.trim();
        try{
          const { error } = await supabase.from("course_announcements").insert({
            schedule_id: scheduleId, title, body: body || null,
            teacher_user_id: currentUser.id, teacher_name: currentUser.email
          });
          if (error) throw error;
          renderTeacherView();
        }catch(err){
          msgEl.textContent = "Սխալ՝ " + err.message; msgEl.classList.add("show","err");
        }
      });
    });
    content.querySelectorAll("[data-delann]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        if (!confirm("Ջնջե՞լ այս հայտարարությունը։")) return;
        await supabase.from("course_announcements").delete().eq("id", b.dataset.delann);
        renderTeacherView();
      });
    });
    content.querySelectorAll("[data-editann]").forEach(b=>{
      b.addEventListener("click", async ()=>{
        const newTitle = prompt("Նոր վերնագիր.");
        if (newTitle === null) return;
        const newBody = prompt("Նոր տեքստ.");
        if (newBody === null) return;
        await supabase.from("course_announcements").update({
          title: newTitle.trim(), body: newBody.trim() || null, updated_at: new Date().toISOString()
        }).eq("id", b.dataset.editann);
        renderTeacherView();
      });
    });
  }catch(err){
    content.innerHTML = `<div class="empty-note">Սխալ՝ ${err.message}</div>`;
  }
}
