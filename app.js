/* =========================================================
   Լևոն Շանթ շաբաթօրյա դպրոց — app.js (Supabase edition)
   Handles: language toggle, Supabase auth (sign-up + admin
   approval → admin/smm roles), Postgres CRUD for posts/
   registrations/schedule/staff/site content/yearly events,
   Storage uploads, and the events calendar.

   >>> SETUP REQUIRED: paste your Supabase project URL + anon key
   below. See README.md for step-by-step instructions.
   ========================================================= */

let createClient = null;
try {
  ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2"));
} catch (err) {
  console.warn("Could not load the Supabase library (network or CDN issue) — running in demo mode.", err);
}

// ---------------------------------------------------------
// 1. SUPABASE CONFIG — replace with your own project's values
//    (Supabase dashboard → Project Settings → API)
// ---------------------------------------------------------
const supabaseConfig = {
  url: "https://bemfluogtfafsfnbvboo.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlbWZsdW9ndGZhZnNmbmJ2Ym9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODQxOTIsImV4cCI6MjEwMTg2MDE5Mn0.TA3dZQ8ov9oUu1-ibRpzyl-CC5AZylICw9kGdeDnPHE"
};

const supabaseConfigured = !!createClient && supabaseConfig.url !== "YOUR_SUPABASE_URL";

let supabase;
if (supabaseConfigured) {
  try {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
  } catch (err) {
    console.warn("Could not initialize the Supabase client — running in demo mode.", err);
  }
} else {
  console.warn("Supabase is not configured yet — the site is running in demo/preview mode. See README.md.");
}
const SUPABASE_READY = !!supabase;

// ---------------------------------------------------------
// 1b. EMAILJS CONFIG — sends the school an organized email every time
//     someone submits the child or adult registration form, in addition
//     to it being saved for the dashboard. Free, no backend needed.
//     See README.md for the 5-minute setup (emailjs.com).
// ---------------------------------------------------------
const emailjsConfig = {
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID"
};
const EMAILJS_READY = emailjsConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY" && typeof window.emailjs !== "undefined";
if (EMAILJS_READY) {
  window.emailjs.init({ publicKey: emailjsConfig.publicKey });
} else {
  console.warn("EmailJS is not configured yet — registration emails to the school won't be sent. See README.md.");
}

// ---------------------------------------------------------
// 2. i18n — Armenian (default) / Dutch
// ---------------------------------------------------------
const i18n = {
  hy: {}, // Armenian text already lives in the HTML as the default
  nl: {
    "brand.title": "Levon Shant Zaterdagschool",
    "brand.sub": "Hamazkayin-afdeling Mechelen",
    "nav.about": "Onze school",
    "nav.hamazkayin": "Hamazkayin",
    "nav.department": "Onderwijsafdeling",
    "nav.calendar": "Kalender",
    "nav.activities": "Activiteiten",
    "nav.gallery": "Foto's/video's",
    "nav.register": "Inschrijven",
    "nav.contact": "Contact",
    "hero.title": "Welkom bij de Hamazkayin Levon Shant Zaterdagschool",
    "hero.lede": "Op de Hamazkayin Levon Shant Zaterdagschool leren Armeense kinderen en gezinnen de Armeense taal, geschiedenis en cultuur, en nemen ze elke week deel aan culturele en jongerenevenementen in Mechelen.",
    "hero.cta1": "Inschrijven",
    "hero.cta2": "Bekijk activiteiten",
    "hero.fact1": "oprichtingsjaar",
    "hero.fact2": "Nijverheidsstraat 45",
    "hero.fact3": "Armeens onderwijsnetwerk",
    "about.eyebrow": "Onze school",
    "about.title": "Geschiedenis en oprichting",
    "about.p1": "In het schooljaar 1999–2000 werd, op initiatief van de Belgische ARF-partij, de Levon Shant Zaterdagschool opgericht in Mechelen.",
    "about.p2": "De school werd opgericht door Edik Kotanjian en Grigor Voskanian; Voskanian was in die beginjaren ook directeur van de school.",
    "about.p3": "Dankzij hun inzet werd de basis gelegd waarop de school door de jaren heen groeide, uitbreidde en werd wat ze vandaag is: een levendige Armeense gemeenschap in het hart van Mechelen.",
    "about.card1title": "Wat wij aanbieden",
    "about.card1text": "Lessen Armeens (spreek- en schrijftaal), Armeense geschiedenis, zang en dans, en culturele en jongerenevenementen gedurende het hele schooljaar.",
    "about.tlLink": "Bekijk de volledige tijdlijn ↓",
    "hist.eyebrow": "In jaartallen",
    "hist.title": "De geschiedenis van de school, jaar per jaar",
    "hist.lede": "Van de oprichting tot vandaag: de belangrijkste mijlpalen, mensen en verwezenlijkingen die de school hebben gevormd.",
    "hz.eyebrow": "Ons netwerk",
    "hz.title": "Hamazkayin Armeense Educatieve en Culturele Vereniging",
    "hz.p1": "Op 28 mei 1928 richtte een groep van negen Armeense intellectuelen — onder wie schrijver en pedagoog Levon Shant, historicus Nikol Aghbalian, oud-premier Hamo Ohanjanian en regisseur Gaspar Ipekian — in Caïro de \u201CHamazkayin Armeense Educatieve en Culturele Vereniging\u201D op.",
    "hz.p2": "Hamazkayin wilde nieuwe generaties buiten Armenië niet alleen algemene vorming, maar ook een Armeense opvoeding geven, om de nationale identiteit en culturele tradities levend te houden. Vandaag is Hamazkayin een vzw met afdelingen in het Midden-Oosten, Europa, de VS, Canada, Zuid-Amerika en Australië — en de school in Mechelen maakt deel uit van dat netwerk.",
    "hz.cta": "Meer info op hamazkayin.com ↗",
    "dept.eyebrow": "Structuur",
    "dept.title": "Onderwijsafdeling",
    "dept.lede": "De lessen zijn georganiseerd per leeftijdsgroep en vinden elke zaterdagochtend plaats. Neem contact op met de school voor het lerarenteam, het rooster en de feestdagen.",
    "dept.c1t": "Lerarenteam", "dept.c1d": "Maak kennis met de leerkrachten ↓",
    "dept.c2t": "Klassen en groepen", "dept.c2d": "Bekijk de volledige lijst ↓",
    "dept.c3t": "Lesuren", "dept.c3d": "Bekijk het volledige rooster hieronder ↓",
    "dept.c4t": "Kalender", "dept.c4d": "De jaarkalender in één overzicht ↓",
    "staff.eyebrow": "Lerarenteam",
    "staff.title": "Maak kennis met onze leerkrachten",
    "staff.lede": "Ervaren en toegewijde leerkrachten in taal, geschiedenis, kunst en dans.",
    "staff.loading": "Laden…",
    "classes.eyebrow": "Klassen en groepen",
    "classes.title": "Alle vakken in één lijst",
    "classes.lede": "De volledige lijst, per leeftijdsgroep en richting.",
    "cal.eyebrow": "Rooster",
    "cal.title": "Lesrooster en activiteitenkalender",
    "cal.lede": "Bekijk wanneer elke les plaatsvindt, en volg aankomende activiteiten in kalendervorm.",
    "cal.scheduleTitle": "📖 Lesrooster (zaterdag)",
    "cal.loading": "Laden…",
    "cal.legendClass": "Lessen",
    "cal.legendEvent": "Activiteit",
    "yearcal.eyebrow": "Schooljaar",
    "yearcal.title": "De jaarkalender in één overzicht",
    "yearcal.lede": "Vakanties, feestdagen en belangrijke data doorheen het hele schooljaar.",
    "feed.eyebrow": "Laatste nieuws",
    "feed.title": "Culturele en jongerenevenementen & mededelingen",
    "feed.lede": "Dit onderdeel wordt rechtstreeks bijgewerkt door het schoolteam.",
    "feed.all": "Alles", "feed.eventsf": "Evenementen", "feed.newsf": "Mededelingen", "feed.loading": "Laden…",
    "gal.eyebrow": "Spel en kennis",
    "gal.title": "Foto's en video's",
    "gal.lede": "Beelden van lessen en evenementen, gepubliceerd door het schoolteam.",
    "gal.loading": "Laden…",
    "reg.eyebrow": "INSCHRIJVINGEN",
    "reg.title": "Schrijf u in bij de school",
    "reg.lede": "Vul het formulier in en de schoolverantwoordelijke neemt contact met u op om de inschrijving te bevestigen. Uw gegevens zijn alleen zichtbaar voor de beheerder.",
    "reg.needt": "Wat heb je nodig",
    "reg.need1": "Persoonlijke gegevens (naam, geboortedatum, adres)",
    "reg.need2": "Contactgegevens van de ouders (voor inschrijving van kinderen)",
    "reg.need3": "Gewenste vak(ken)",
    "reg.tabChild": "👶 Inschrijving kind",
    "reg.tabAdult": "🧑 Inschrijving volwassene",
    "reg.submit": "Inschrijving versturen",
    "reg.male": "Man", "reg.female": "Vrouw",
    "reg.courses": "Selecteer de gewenste vak(ken)",
    "reg.consentQ": "Gaat u ermee akkoord dat foto's en video's van schoolactiviteiten en lessen waarop uw kind te zien is, worden geplaatst op de officiële website en sociale media (Facebook e.d.) van de school?",
    "reg.consentQAdult": "Gaat u ermee akkoord dat foto's en video's van schoolactiviteiten waarop u te zien bent, worden geplaatst op de officiële website en sociale media (Facebook e.d.) van de school?",
    "reg.consentYes": "Ja, ik ga akkoord",
    "reg.consentNo": "Nee, ik ga niet akkoord",
    "reg.levelQ": "Wat is uw huidige niveau Armeens?",
    "reg.c.childName": "Voor-, achter- en patroniemnaam van het kind",
    "reg.c.childDob": "Geboortedatum",
    "reg.c.gender": "Geslacht",
    "reg.c.address": "Adres (in Latijnse letters)",
    "reg.c.nationality": "Nationaliteit",
    "reg.c.nativeLang": "Moedertaal",
    "reg.c.email": "E-mailadres",
    "reg.c.mother": "Naam moeder en telefoonnummer",
    "reg.c.father": "Naam vader en telefoonnummer",
    "reg.a.name": "Voor-, achter- en patroniemnaam",
    "reg.a.gender": "Geslacht",
    "reg.a.dob": "Geboortedatum",
    "reg.a.nationality": "Nationaliteit",
    "reg.a.nativeLang": "Moedertaal",
    "reg.a.email": "E-mailadres",
    "reg.a.phone": "Telefoonnummer",
    "reg.a.address": "Adres (in Latijnse letters)",
    "reg.crs.preschool": "Kleuterklas",
    "reg.crs.abc": "Alfabet (beginners)",
    "reg.crs.mayreni": "Moedertaal — taalles",
    "reg.crs.literature": "Literatuur",
    "reg.crs.environment": "Ik en mijn omgeving",
    "reg.crs.homeland": "Vaderlandkunde",
    "reg.crs.history": "Geschiedenis",
    "reg.crs.armForeign": "Armeens voor anderstalige kinderen en volwassenen",
    "reg.crs.folkDance": "Volksdans",
    "reg.crs.tradDance": "Traditionele zang en dans",
    "reg.crs.piano": "Piano",
    "reg.crs.chess": "Schaken",
    "reg.crs.literacy": "Alfabetisering (lezen en schrijven)",
    "reg.crs.armSecond": "Armeens als tweede taal",
    "reg.lvl.beginner": "Beginner — geen voorkennis",
    "reg.lvl.elementary": "Elementair — ik kan lezen en schrijven",
    "reg.lvl.intermediate": "Gemiddeld — ik kan woorden verbinden en eenvoudige zinnen vormen",
    "reg.lvl.advanced": "Gevorderd — ik kan vlot zinnen vormen",
    "reg.lvl.excellent": "Uitstekend — ik kan vloeiend communiceren",
    "contact.eyebrow": "Contactgegevens",
    "contact.title": "Neem contact met ons op",
    "contact.title2": "Contact",
    "contact.addr": "Adres", "contact.email": "E-mail", "contact.phone": "Telefoon",
    "contact.fbGroup": "Facebook-groep van de school ↗",
    "foot.name": "Levon Shant Zaterdagschool",
    "foot.blurb": "Hamazkayin-afdeling Mechelen (België). Armeense taal, geschiedenis en cultuur.",
    "foot.linksTitle": "Snel naar",
    "foot.copyright": "Hamazkayin Levon Shant Zaterdagschool",
    "auth.signin": "Personeel aanmelden",
    "auth.signout": "Afmelden",
    "auth.modalTitle": "Personeelsaccount",
    "auth.modalSub": "Voor Admin- en SMM-accounts. Ouders hebben geen account nodig om het inschrijvingsformulier in te vullen.",
    "auth.tabSignin": "Aanmelden",
    "auth.tabSignup": "Registreren als personeel",
    "auth.passwordLabel": "Wachtwoord",
    "auth.submitSignin": "Aanmelden",
    "auth.signupHelper": "Kies uw naam, e-mailadres en wachtwoord. Het account wordt pas actief nadat de beheerder het heeft goedgekeurd en uw rol heeft toegewezen (Admin of SMM).",
    "auth.nameLabel": "Naam",
    "auth.passwordMinLabel": "Wachtwoord (minstens 6 tekens)",
    "auth.submitSignup": "Aanvraag versturen",
    "aria.home": "Startpagina",
    "aria.menu": "Menu",
    "aria.prevMonth": "Vorige maand",
    "aria.nextMonth": "Volgende maand",
    "aria.prevYear": "Vorig schooljaar",
    "aria.nextYear": "Volgend schooljaar",
    "aria.close": "Sluiten",
    "yearcal.imgAlt": "Jaarkalender van het schooljaar"
  },
  en: {
    "brand.title": "Levon Shant Saturday School",
    "brand.sub": "Hamazkayin Mechelen branch",
    "nav.about": "Our school",
    "nav.hamazkayin": "Hamazkayin",
    "nav.department": "Education department",
    "nav.calendar": "Calendar",
    "nav.activities": "Activities",
    "nav.gallery": "Photos/videos",
    "nav.register": "Register",
    "nav.contact": "Contact",
    "hero.title": "Welcome to the Hamazkayin Levon Shant Saturday School",
    "hero.lede": "At the Hamazkayin Levon Shant Saturday School, Armenian children and families learn the Armenian language, history, and culture, and take part every week in cultural and youth activities in Mechelen.",
    "hero.cta1": "Register",
    "hero.cta2": "See activities",
    "hero.fact1": "founding year",
    "hero.fact2": "Nijverheidsstraat 45",
    "hero.fact3": "Armenian education network",
    "about.eyebrow": "Our school",
    "about.title": "History and founding",
    "about.p1": "In the 1999–2000 school year, on the initiative of the Belgian ARF party, the Levon Shant Saturday School was founded in Mechelen.",
    "about.p2": "The school was founded by Edik Kotanjian and Grigor Voskanian; Voskanian was also director of the school in those early years.",
    "about.p3": "Thanks to their efforts, the foundation was laid on which the school grew, expanded, and became what it is today: a vibrant Armenian community in the heart of Mechelen.",
    "about.card1title": "What we offer",
    "about.card1text": "Armenian language lessons (spoken and written), Armenian history, singing and dance, and cultural and youth activities throughout the school year.",
    "about.tlLink": "See the full timeline ↓",
    "hist.eyebrow": "Year by year",
    "hist.title": "The school's history, year by year",
    "hist.lede": "From founding to today: the key milestones, people, and achievements that shaped the school.",
    "hz.eyebrow": "Our network",
    "hz.title": "Hamazkayin Armenian Educational and Cultural Society",
    "hz.p1": "On May 28, 1928, a group of nine Armenian intellectuals — including writer and educator Levon Shant, historian Nikol Aghbalian, former prime minister Hamo Ohanjanian, and director Gaspar Ipekian — founded the \u201CHamazkayin Armenian Educational and Cultural Society\u201D in Cairo.",
    "hz.p2": "Hamazkayin wanted to give new generations outside Armenia not just a general education, but an Armenian upbringing as well, to keep national identity and cultural traditions alive. Today Hamazkayin is a non-profit with branches across the Middle East, Europe, the US, Canada, South America, and Australia — and the school in Mechelen is part of that network.",
    "hz.cta": "More at hamazkayin.com ↗",
    "dept.eyebrow": "Structure",
    "dept.title": "Education department",
    "dept.lede": "Classes are organized by age group and take place every Saturday morning. Contact the school for the teaching staff, schedule, and holidays.",
    "dept.c1t": "Teaching staff", "dept.c1d": "Meet the teachers ↓",
    "dept.c2t": "Classes and groups", "dept.c2d": "See the full list ↓",
    "dept.c3t": "Class hours", "dept.c3d": "See the full schedule below ↓",
    "dept.c4t": "Calendar", "dept.c4d": "The school year calendar at a glance ↓",
    "staff.eyebrow": "Teaching staff",
    "staff.title": "Meet our teachers",
    "staff.lede": "Experienced and dedicated teachers in language, history, art, and dance.",
    "staff.loading": "Loading…",
    "classes.eyebrow": "Classes and groups",
    "classes.title": "Every class in one list",
    "classes.lede": "The full list, by age group and subject.",
    "cal.eyebrow": "Schedule",
    "cal.title": "Class schedule and activities calendar",
    "cal.lede": "See when each class takes place, and follow upcoming activities in calendar form.",
    "cal.scheduleTitle": "📖 Class schedule (Saturday)",
    "cal.loading": "Loading…",
    "cal.legendClass": "Classes",
    "cal.legendEvent": "Activity",
    "yearcal.eyebrow": "School year",
    "yearcal.title": "The school year calendar at a glance",
    "yearcal.lede": "Holidays, celebrations, and important dates throughout the school year.",
    "feed.eyebrow": "Latest news",
    "feed.title": "Cultural and youth activities & announcements",
    "feed.lede": "This section is updated directly by the school team.",
    "feed.all": "All", "feed.eventsf": "Activities", "feed.newsf": "Announcements", "feed.loading": "Loading…",
    "gal.eyebrow": "Play and knowledge",
    "gal.title": "Photos and videos",
    "gal.lede": "Images from classes and activities, published by the school team.",
    "gal.loading": "Loading…",
    "reg.eyebrow": "REGISTRATION",
    "reg.title": "Register with the school",
    "reg.lede": "Fill in the form and the school coordinator will contact you to confirm the registration. Your details are only visible to the administrator.",
    "reg.needt": "What you'll need",
    "reg.need1": "Personal details (name, date of birth, address)",
    "reg.need2": "Parents' contact details (for registering children)",
    "reg.need3": "Preferred class(es)",
    "reg.tabChild": "👶 Child registration",
    "reg.tabAdult": "🧑 Adult registration",
    "reg.submit": "Submit registration",
    "reg.male": "Male", "reg.female": "Female",
    "reg.courses": "Select the preferred class(es)",
    "reg.consentQ": "Do you agree that photos and videos from school activities and classes featuring your child may be posted on the school's official website and social media (Facebook, etc.)?",
    "reg.consentQAdult": "Do you agree that photos and videos from school activities featuring you may be posted on the school's official website and social media (Facebook, etc.)?",
    "reg.consentYes": "Yes, I agree",
    "reg.consentNo": "No, I do not agree",
    "reg.levelQ": "What is your current level of Armenian?",
    "reg.c.childName": "Child's full name (first, last, patronymic)",
    "reg.c.childDob": "Date of birth",
    "reg.c.gender": "Gender",
    "reg.c.address": "Address (in Latin letters)",
    "reg.c.nationality": "Nationality",
    "reg.c.nativeLang": "Native language",
    "reg.c.email": "Email address",
    "reg.c.mother": "Mother's name and phone number",
    "reg.c.father": "Father's name and phone number",
    "reg.a.name": "Full name (first, last, patronymic)",
    "reg.a.gender": "Gender",
    "reg.a.dob": "Date of birth",
    "reg.a.nationality": "Nationality",
    "reg.a.nativeLang": "Native language",
    "reg.a.email": "Email address",
    "reg.a.phone": "Phone number",
    "reg.a.address": "Address (in Latin letters)",
    "reg.crs.preschool": "Preschool group",
    "reg.crs.abc": "Alphabet (beginners)",
    "reg.crs.mayreni": "Native language class",
    "reg.crs.literature": "Literature",
    "reg.crs.environment": "Me and my surroundings",
    "reg.crs.homeland": "Homeland studies",
    "reg.crs.history": "History",
    "reg.crs.armForeign": "Armenian for non-Armenian-speaking children and adults",
    "reg.crs.folkDance": "Folk dance",
    "reg.crs.tradDance": "Traditional song and dance",
    "reg.crs.piano": "Piano",
    "reg.crs.chess": "Chess",
    "reg.crs.literacy": "Literacy (reading and writing)",
    "reg.crs.armSecond": "Armenian as a second language",
    "reg.lvl.beginner": "Beginner — no prior knowledge",
    "reg.lvl.elementary": "Elementary — I can read and write",
    "reg.lvl.intermediate": "Intermediate — I can connect words and form simple sentences",
    "reg.lvl.advanced": "Advanced — I can form sentences fluently",
    "reg.lvl.excellent": "Excellent — I can communicate fluently",
    "contact.eyebrow": "Contact details",
    "contact.title": "Get in touch",
    "contact.title2": "Contact",
    "contact.addr": "Address", "contact.email": "Email", "contact.phone": "Phone",
    "contact.fbGroup": "School's Facebook group ↗",
    "foot.name": "Levon Shant Saturday School",
    "foot.blurb": "Hamazkayin Mechelen branch (Belgium). Armenian language, history, and culture.",
    "foot.linksTitle": "Quick links",
    "foot.copyright": "Hamazkayin Levon Shant Saturday School",
    "auth.signin": "Staff sign in",
    "auth.signout": "Sign out",
    "auth.modalTitle": "Staff account",
    "auth.modalSub": "For Admin and SMM accounts. Parents don't need an account to fill in the registration form.",
    "auth.tabSignin": "Sign in",
    "auth.tabSignup": "Register as staff",
    "auth.passwordLabel": "Password",
    "auth.submitSignin": "Sign in",
    "auth.signupHelper": "Choose your name, email, and password. The account will only become active once the administrator has approved it and assigned your role (Admin or SMM).",
    "auth.nameLabel": "Full name",
    "auth.passwordMinLabel": "Password (at least 6 characters)",
    "auth.submitSignup": "Submit request",
    "aria.home": "Home page",
    "aria.menu": "Menu",
    "aria.prevMonth": "Previous month",
    "aria.nextMonth": "Next month",
    "aria.prevYear": "Previous school year",
    "aria.nextYear": "Next school year",
    "aria.close": "Close",
    "yearcal.imgAlt": "School year calendar"
  }
};
let currentLang = "hy";
const SUPPORTED_LANGS = ["hy", "nl", "en"];

let contentOverrides = {}; // filled from site_content, keyed by field key: {hy, nl, en}

// ---------------------------------------------------------
// School history timeline — bilingual, rendered into #historyTimeline
// ---------------------------------------------------------
const TIMELINE = [
  { year:"1999–2000",
    hy:{ title:"Դպրոցի հիմնադրում", body:"Բելգիայի ՀՅԴ կուսակցության որոշմամբ Մեխելենում հիմնադրվեց Լևոն Շանթի անվան դպրոցը՝ Էդիկ Քոթանջյանի և Գրիգոր Ոսկանյանի ջանքերով։ Ոսկանյանը դարձավ նաև դպրոցի առաջին տնօրենը։" },
    nl:{ title:"Oprichting van de school", body:"Op initiatief van de Belgische ARF-partij werd de Levon Shant-school opgericht in Mechelen door Edik Kotanjian en Grigor Voskanian; Voskanian werd meteen ook de eerste directeur." },
    en:{ title:"Founding of the school", body:"On the initiative of the Belgian ARF party, the Levon Shant school was founded in Mechelen by Edik Kotanjian and Grigor Voskanian; Voskanian also became the school's first director." } },
  { year:"2000",
    hy:{ title:"Առաջին ուսուցիչները", body:"Արուսյակ Մովսիսյանը մի քանի ամիս դասավանդեց, ապա տեղափոխվեց Անտվերպենի դպրոց. նրա հետ դասավանդում էր նաև Զարինե Մեջլումյանը՝ դպրոցի առաջին ուսուցիչները։" },
    nl:{ title:"De eerste leerkrachten", body:"Arusyak Movsisyan gaf enkele maanden les voor ze naar de school in Antwerpen verhuisde; samen met Zarine Mejlumyan waren zij de eerste leerkrachten van de school." },
    en:{ title:"The first teachers", body:"Arusyak Movsisyan taught for a few months before moving to the school in Antwerp; together with Zarine Mejlumyan, they were the school's first teachers." } },
  { year:"2006",
    hy:{ title:"Շուշանիկ Մովսիսյանի գալուստը", body:"Հայաստանից ժամանած վաստակավոր մանկավարժ Շուշանիկ Մովսիսյանը միացավ դպրոցին, և նրա գործունեությունը դարձավ բեկումնային դպրոցի կյանքում։" },
    nl:{ title:"Shushanik Movsisyan sluit aan", body:"De ervaren pedagoge Shushanik Movsisyan kwam uit Armenië naar de school — een keerpunt in het bestaan van de school." },
    en:{ title:"Shushanik Movsisyan joins", body:"The experienced educator Shushanik Movsisyan arrived from Armenia to join the school — a turning point in the school's history." } },
  { year:"2009",
    hy:{ title:"Դպրոցը միանում է Համազգայինին", body:"Համազգային Հայ Կրթական և Մշակութային Միությունը վերամիավորվեց Արմեն Արսլանյանի նախագահությամբ, և դպրոցը փոխանցվեց Համազգայինին՝ մշակույթի ու կրթության հարցերով պատասխանատու Սամվել Սարկիսյանի գլխավորությամբ։" },
    nl:{ title:"De school wordt deel van Hamazkayin", body:"Hamazkayin hereenigde zich onder voorzitter Armen Arslanian, en de school werd overgedragen aan Hamazkayin, onder leiding van Samvel Sarkisian voor onderwijs en cultuur." },
    en:{ title:"The school joins Hamazkayin", body:"Hamazkayin reunified under chairman Armen Arslanian, and the school was transferred to Hamazkayin, led by Samvel Sarkisian for education and culture." } },
  { year:"2009–2011",
    hy:{ title:"Տնօրեն՝ Հասմիկ Յագմուրյան", body:"Այս տարիներին դպրոցի տնօրենի պաշտոնը ստանձնեց Հասմիկ Յագմուրյանը։" },
    nl:{ title:"Directeur Hasmik Yagmuryan", body:"In deze jaren was Hasmik Yagmuryan directeur van de school." },
    en:{ title:"Director Hasmik Yagmuryan", body:"In these years, Hasmik Yagmuryan served as director of the school." } },
  { year:"2010",
    hy:{ title:"«Հայ ասպետ» և այց Արցախ", body:"Դպրոցի սաները մասնակցեցին «Հայ ասպետ» հեռուստախաղին և այցելեցին Արցախ՝ ծանոթանալով նրա մշակույթին։" },
    nl:{ title:"'Hay Aspet' en een reis naar Artsach", body:"Leerlingen namen deel aan het tv-programma 'Hay Aspet' en reisden naar Artsach om er kennis te maken met de cultuur." },
    en:{ title:"'Hay Aspet' and a trip to Artsakh", body:"Students took part in the TV show 'Hay Aspet' and traveled to Artsakh to experience its culture firsthand." } },
  { year:"2011",
    hy:{ title:"Լիանա Մելքոնյանը՝ կազմակերպչական պատասխանատու", body:"Լիանա Մելքոնյանը նշանակվեց դպրոցի կազմակերպչական հարցերով պատասխանատու՝ պաշտոն, որը ստանձնեց մինչ օրս։" },
    nl:{ title:"Liana Melkonian wordt verantwoordelijk", body:"Liana Melkonian werd verantwoordelijk voor de organisatie van de school — een rol die ze sindsdien behoudt." },
    en:{ title:"Liana Melkonian becomes responsible", body:"Liana Melkonian was appointed responsible for the school's organizational matters — a role she has held ever since." } },
  { year:"2014",
    hy:{ title:"Բացվում է նախադպրոցական խումբը", body:"Բացվեց նախադպրոցական խումբը՝ իր տեսակով առաջինը Բելգիայում։" },
    nl:{ title:"De kleuterklas gaat open", body:"De kleuterklas opende — de eerste in zijn soort in België." },
    en:{ title:"The preschool group opens", body:"The preschool group opened — the first of its kind in Belgium." } },
  { year:"2024",
    hy:{ title:"Լիանա Մելքոնյանը՝ դպրոցի տնօրեն", body:"Կազմակերպչական պատասխանատվության կողքին, Լիանա Մելքոնյանը ստանձնեց նաև դպրոցի տնօրենի պաշտոնը։" },
    nl:{ title:"Liana Melkonian wordt directeur", body:"Naast haar organisatorische rol werd Liana Melkonian ook directeur van de school." },
    en:{ title:"Liana Melkonian becomes director", body:"Alongside her organizational role, Liana Melkonian also took on the position of school director." } },
  { year:"Այսօր / Vandaag / Today",
    hy:{ title:"Այսօր", body:"Դպրոցում գործում են նկարչության, ասեղնագործության և դաշնամուրի խմբակներ, պարի խմբակները տարիների աշխատանքով վերածվել են պրոֆեսիոնալ պարախմբերի, և կանոնավոր կազմակերպվում են բարեգործական միջոցառումներ ու ծրագրեր։" },
    nl:{ title:"Vandaag", body:"De school heeft clubs voor tekenen, borduren en piano; de dansgroepen zijn na jaren werk uitgegroeid tot professionele ensembles, en er worden regelmatig liefdadigheidsevenementen georganiseerd." },
    en:{ title:"Today", body:"The school runs clubs for drawing, embroidery, and piano; the dance groups have grown, after years of work, into professional ensembles, and charitable events and programs are held regularly." } }
];

function renderTimeline(lang){
  const el = document.getElementById("historyTimeline");
  if (!el) return;
  el.innerHTML = TIMELINE.map(item=>{
    const t = item[lang] || item.hy;
    return `<div class="hist-item">
      <span class="hist-dot" aria-hidden="true"></span>
      <span class="hist-year">${item.year}</span>
      <h3>${escapeHtml(t.title)}</h3>
      <p>${escapeHtml(t.body)}</p>
    </div>`;
  }).join("");
}

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

function renderClassesList(lang){
  const el = document.getElementById("classesList");
  if (!el) return;
  const override = contentOverrides["classes.list"];
  const text = (override && override[lang]) || DEFAULT_CLASSES[lang] || DEFAULT_CLASSES.hy;
  const items = text.split("\n").map(s=>s.trim()).filter(Boolean);
  el.innerHTML = items.map(i=>`<li>${escapeHtml(i)}</li>`).join("");
}

function applyLang(lang){
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    const override = contentOverrides[key];
    if (override && override[lang]) { el.textContent = override[lang]; return; }
    if (lang === "hy") {
      if (el.dataset.orig) el.textContent = el.dataset.orig;
      return;
    }
    if (i18n[lang] && i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{
    const key = el.getAttribute("data-i18n-aria");
    if (lang === "hy") { if (el.dataset.origAria) el.setAttribute("aria-label", el.dataset.origAria); return; }
    if (i18n[lang] && i18n[lang][key]) el.setAttribute("aria-label", i18n[lang][key]);
  });
  document.querySelectorAll("[data-i18n-alt]").forEach(el=>{
    const key = el.getAttribute("data-i18n-alt");
    if (lang === "hy") { if (el.dataset.origAlt) el.setAttribute("alt", el.dataset.origAlt); return; }
    if (i18n[lang] && i18n[lang][key]) el.setAttribute("alt", i18n[lang][key]);
  });
  document.querySelectorAll(".lang-toggle button").forEach(b=>{
    b.classList.toggle("active", b.dataset.lang === lang);
  });
  const toggleEl = document.getElementById("langToggle");
  if (toggleEl){
    const idx = SUPPORTED_LANGS.indexOf(lang);
    toggleEl.style.setProperty("--lang-idx", idx >= 0 ? idx : 0);
  }
  renderTimeline(lang);
  renderClassesList(lang);
  renderCalendar();
  loadSchedule();
  loadYearCalDisplay();
  loadStaff();
  loadFeed();
  loadGallery();
  updateHistoryToggleLabel();
  renderAuthArea();
}
document.querySelectorAll("[data-i18n]").forEach(el=> el.dataset.orig = el.textContent);
document.querySelectorAll("[data-i18n-aria]").forEach(el=> el.dataset.origAria = el.getAttribute("aria-label"));
document.querySelectorAll("[data-i18n-alt]").forEach(el=> el.dataset.origAlt = el.getAttribute("alt"));
document.querySelectorAll(".lang-toggle button").forEach(btn=>{
  btn.addEventListener("click", ()=> applyLang(btn.dataset.lang));
});

// History timeline show/hide toggle (bilingual label)
const HISTORY_TOGGLE_LABEL = {
  hy: { closed:"Տեսնել ամբողջ ժամանակագրությունը ↓", open:"Թաքցնել ժամանակագրությունը ↑" },
  nl: { closed:"Bekijk de volledige tijdlijn ↓", open:"Verberg de tijdlijn ↑" },
  en: { closed:"See the full timeline ↓", open:"Hide the timeline ↑" }
};
let historyOpen = false;
function updateHistoryToggleLabel(){
  const btn = document.getElementById("historyToggle");
  if (!btn) return;
  const set = HISTORY_TOGGLE_LABEL[currentLang] || HISTORY_TOGGLE_LABEL.hy;
  btn.textContent = historyOpen ? set.open : set.closed;
  btn.setAttribute("aria-expanded", String(historyOpen));
}
document.getElementById("historyToggle")?.addEventListener("click", ()=>{
  historyOpen = !historyOpen;
  document.getElementById("history").style.display = historyOpen ? "" : "none";
  updateHistoryToggleLabel();
  if (historyOpen) document.getElementById("history").scrollIntoView({ behavior:"smooth", block:"start" });
});

// mobile nav toggle
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
menuToggle?.addEventListener("click", ()=>{
  const open = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", open);
});
document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click", ()=> mainNav?.classList.remove("open")));

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---------------------------------------------------------
// Demo data (shown when Supabase isn't configured yet)
// ---------------------------------------------------------
const demoPosts = [
  { id:"d1", type:"event", title:"2025–2026 ուսումնական տարվա բացում", title_nl:"Opening van het schooljaar 2025–2026", title_en:"Opening of the 2025–2026 school year",
    body:"Հրավիրում ենք բոլոր ընտանիքներին դպրոցի բացման արարողությանը։", body_nl:"We nodigen alle gezinnen uit voor de openingsceremonie van de school.", body_en:"We invite all families to the school's opening ceremony.",
    date:"2025-09-06", media_type:"image", media_url:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097689632-5S0MPFQDE2YO0RWDIIF4/Schermafbeelding+2025-10-19+112541.png", author_name:"Դպրոց" },
  { id:"d2", type:"news", title:"Գրանցումները բացվեցին", title_nl:"De inschrijvingen zijn geopend", title_en:"Registration is now open",
    body:"2025–2026 ուսումնական տարվա գրանցումներն այժմ բաց են բոլոր տարիքային խմբերի համար։", body_nl:"De inschrijvingen voor het schooljaar 2025–2026 zijn nu open voor alle leeftijdsgroepen.", body_en:"Registration for the 2025–2026 school year is now open for all age groups.",
    date:"2025-08-20", media_type:null, media_url:null, author_name:"Դպրոց" }
];

// ---------------------------------------------------------
// 4. Posts: read (public); publishing/deleting happens in the admin area
// ---------------------------------------------------------
async function fetchPosts(){
  if (!SUPABASE_READY) return demoPosts;
  const { data, error } = await supabase.from("posts").select("*").order("created_at", { ascending:false });
  if (error){ console.warn(error.message); return []; }
  return data || [];
}

function postTitle(p, lang){
  const key = lang === "nl" ? "title_nl" : lang === "en" ? "title_en" : "title";
  return p[key] || p.title || p.title_nl || p.title_en || "";
}
function postBody(p, lang){
  const key = lang === "nl" ? "body_nl" : lang === "en" ? "body_en" : "body";
  return p[key] || p.body || p.body_nl || p.body_en || "";
}

function postCardHTML(p){
  const kindLabel = pickLang({
    hy: p.type === "event" ? "Միջոցառում" : p.type === "gallery" ? "Պատկեր" : "Հայտարարություն",
    nl: p.type === "event" ? "Activiteit" : p.type === "gallery" ? "Foto" : "Mededeling",
    en: p.type === "event" ? "Activity" : p.type === "gallery" ? "Photo" : "Announcement"
  });
  const title = postTitle(p, currentLang);
  const body = postBody(p, currentLang);
  let media = "";
  if (p.media_type === "video") media = `<video src="${p.media_url}" controls></video>`;
  else if (p.media_type === "youtube") {
    const idm = p.media_url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
    const vid = idm ? idm[1] : "";
    media = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
  } else if (p.media_url) media = `<img src="${p.media_url}" alt="${title}">`;
  else media = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:.85rem;">${pickLang({hy:"Առանց պատկերի", nl:"Geen afbeelding", en:"No image"})}</div>`;

  return `<article class="post-card" data-post-id="${p.id}" tabindex="0" role="button" aria-label="${escapeHtml(title)}">
    <div class="post-media">${media}<span class="kind">${kindLabel}</span></div>
    <div class="post-body">
      <span class="post-date">${p.date || ""}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(body)}</p>
      <div class="post-foot" style="justify-content:flex-end;"><span class="post-more">${pickLang({hy:"Ավելին ↗", nl:"Meer info ↗", en:"More info ↗"})}</span></div>
    </div>
  </article>`;
}
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function pickLang(dict){ return dict[currentLang] || dict.hy; }

// ---------------------------------------------------------
// Post/event detail modal — clicking a card opens the full
// title, date, image/video, and description.
// ---------------------------------------------------------
let allKnownPosts = []; // combined feed + gallery cache, used to look up detail by id

function openPostDetail(post){
  const backdrop = document.getElementById("postDetailBackdrop");
  const body = document.getElementById("postDetailBody");
  if (!backdrop || !body || !post) return;
  const title = postTitle(post, currentLang);
  const desc = postBody(post, currentLang);
  let media = "";
  if (post.media_type === "video") media = `<video src="${post.media_url}" controls style="width:100%; border-radius:12px;"></video>`;
  else if (post.media_type === "youtube") {
    const idm = post.media_url.match(/(?:v=|youtu\.be\/)([\w-]+)/);
    const vid = idm ? idm[1] : "";
    media = `<div style="aspect-ratio:16/9;"><iframe width="100%" height="100%" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen style="border-radius:12px;"></iframe></div>`;
  } else if (post.media_url) media = `<img src="${post.media_url}" alt="${escapeHtml(title)}" style="width:100%; border-radius:12px; display:block;">`;

  body.innerHTML = `
    ${media}
    <div style="padding-top:18px;">
      <span class="post-date">${post.date || ""}</span>
      <h2 style="margin:6px 0 12px;">${escapeHtml(title)}</h2>
      <p style="color:var(--ink-soft); line-height:1.7; white-space:pre-line;">${escapeHtml(desc)}</p>
    </div>`;
  backdrop.classList.add("open");
}

document.getElementById("closePostDetail")?.addEventListener("click", ()=>{
  document.getElementById("postDetailBackdrop")?.classList.remove("open");
});
document.getElementById("postDetailBackdrop")?.addEventListener("click", (e)=>{
  if (e.target.id === "postDetailBackdrop") e.target.classList.remove("open");
});

function wireCardClicks(container){
  if (!container) return;
  container.querySelectorAll(".post-card").forEach(card=>{
    const open = ()=>{
      const post = allKnownPosts.find(p=>String(p.id) === card.dataset.postId);
      if (post) openPostDetail(post);
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e)=>{ if (e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); } });
  });
}

let allPostsCache = [];
async function loadFeed(){
  const el = document.getElementById("activitiesFeed");
  if (!el) return;
  try{
    allPostsCache = await fetchPosts();
    allKnownPosts = allPostsCache;
    renderFeed("all");
  }catch(err){
    el.innerHTML = `<div class="empty-state">Չհաջողվեց բեռնել տվյալները։ (${err.message})</div>`;
  }
}
function renderFeed(filter){
  const el = document.getElementById("activitiesFeed");
  const items = allPostsCache.filter(p=> p.type !== "gallery" && (filter==="all" || p.type===filter));
  el.innerHTML = items.length ? items.map(postCardHTML).join("") : `<div class="empty-state">Դեռ հրապարակումներ չկան։</div>`;
  wireCardClicks(el);
}
document.querySelectorAll("#feedFilters .chip").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll("#feedFilters .chip").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderFeed(btn.dataset.filter);
  });
});

async function loadGallery(){
  const el = document.getElementById("galleryFeed");
  if (!el) return;
  try{
    const posts = await fetchPosts();
    allKnownPosts = [...allKnownPosts.filter(p=>!posts.some(np=>np.id===p.id)), ...posts];
    const items = posts.filter(p=> p.type==="gallery" || p.media_url);
    el.innerHTML = items.length ? items.map(postCardHTML).join("") : `<div class="empty-state">Դեռ նկարներ/տեսանյութեր չկան։</div>`;
    wireCardClicks(el);
  }catch(err){
    el.innerHTML = `<div class="empty-state">Չհաջողվեց բեռնել։ (${err.message})</div>`;
  }
}

// ---------------------------------------------------------
// 5. Registrations: public write, admin-only read (viewing happens in admin.js)
// ---------------------------------------------------------
document.querySelectorAll('#regTypeToggle .chip').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#regTypeToggle .chip').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const type = btn.dataset.regtype;
    document.getElementById('childRegForm').style.display = type === 'child' ? '' : 'none';
    document.getElementById('adultRegForm').style.display = type === 'adult' ? '' : 'none';
  });
});

function checkedValues(containerId){
  return Array.from(document.querySelectorAll(`#${containerId} input:checked`)).map(i=>i.value);
}
function radioValue(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : "";
}

function toRegistrationRow(p){
  if (p.type === "child"){
    return {
      type: "child", child_name: p.childName, child_dob: p.childDob || null, gender: p.gender,
      address: p.address, nationality: p.nationality, native_lang: p.nativeLang, email: p.email,
      mother: p.mother, father: p.father, courses: p.courses, photo_consent: p.photoConsent
    };
  }
  return {
    type: "adult", name: p.name, gender: p.gender, dob: p.dob || null, nationality: p.nationality,
    native_lang: p.nativeLang, email: p.email, phone: p.phone, address: p.address,
    courses: p.courses, level: p.level, photo_consent: p.photoConsent
  };
}

async function submitRegistration(payload, msgEl, formEl){
  msgEl.className = "form-msg"; msgEl.textContent = "";
  if (!SUPABASE_READY){
    msgEl.textContent = "Կայքը դեռ միացված չէ տվյալների բազային. տես README.md։";
    msgEl.classList.add("show","err"); return;
  }
  try{
    const { error } = await supabase.from("registrations").insert(toRegistrationRow(payload));
    if (error) throw error;
    msgEl.textContent = "Շնորհակալություն, ձեր դիմումն ուղարկվեց ✔";
    msgEl.classList.add("show","ok");
    formEl.reset();
    sendRegistrationEmail(payload); // best-effort; never blocks the confirmation above
  }catch(err){
    msgEl.textContent = "Սխալ՝ " + err.message;
    msgEl.classList.add("show","err");
  }
}

// Builds a clearly organized, labeled summary and emails it to the school
// (levon.shant.dproc@gmail.com — set as the fixed "To" address in the
// EmailJS template itself, not passed from the browser). Silently does
// nothing if EmailJS hasn't been configured yet — the database is still
// the source of truth either way, visible in the dashboard's "Գրանցումներ" tab.
function buildRegistrationEmail(payload){
  const today = new Date().toLocaleDateString("hy-AM");
  if (payload.type === "child"){
    const lines = [
      `Նոր գրանցում՝ ԵՐԵԽԱ  (ուղարկվել է ${today})`,
      "—".repeat(32),
      `Երեխայի անուն, ազգանուն, հայրանուն.  ${payload.childName || "—"}`,
      `Ծննդյան տարեթիվ.  ${payload.childDob || "—"}`,
      `Սեռ.  ${payload.gender || "—"}`,
      `Հասցե.  ${payload.address || "—"}`,
      `Ազգություն.  ${payload.nationality || "—"}`,
      `Մայրենի լեզու.  ${payload.nativeLang || "—"}`,
      `Էլ. հասցե.  ${payload.email || "—"}`,
      "",
      `Մայր (անուն, հեռախոս).  ${payload.mother || "—"}`,
      `Հայր (անուն, հեռախոս).  ${payload.father || "—"}`,
      "",
      `Ընտրված դասընթացներ.`,
      ...(payload.courses && payload.courses.length ? payload.courses.map(c=>`  • ${c}`) : ["  —"]),
      "",
      `Համաձայնություն նկար/տեսանյութի հրապարակմանը.  ${payload.photoConsent || "—"}`
    ];
    return { subject: `Նոր գրանցում (Երեխա) — ${payload.childName || "անանուն"}`, message: lines.join("\n"), replyTo: payload.email || "" };
  }
  const lines = [
    `Նոր գրանցում՝ ՄԵԾԱՀԱՍԱԿ  (ուղարկվել է ${today})`,
    "—".repeat(32),
    `Անուն, ազգանուն, հայրանուն.  ${payload.name || "—"}`,
    `Սեռ.  ${payload.gender || "—"}`,
    `Ծննդյան տարեթիվ.  ${payload.dob || "—"}`,
    `Ազգություն.  ${payload.nationality || "—"}`,
    `Մայրենի լեզու.  ${payload.nativeLang || "—"}`,
    `Էլ. հասցե.  ${payload.email || "—"}`,
    `Հեռախոսահամար.  ${payload.phone || "—"}`,
    `Հասցե.  ${payload.address || "—"}`,
    "",
    `Ընտրված դասընթացներ.`,
    ...(payload.courses && payload.courses.length ? payload.courses.map(c=>`  • ${c}`) : ["  —"]),
    "",
    `Հայերենի ներկայիս մակարդակ.  ${payload.level || "—"}`,
    `Համաձայնություն նկար/տեսանյութի հրապարակմանը.  ${payload.photoConsent || "—"}`
  ];
  return { subject: `Նոր գրանցում (Մեծահասակ) — ${payload.name || "անանուն"}`, message: lines.join("\n"), replyTo: payload.email || "" };
}

async function sendRegistrationEmail(payload){
  if (!EMAILJS_READY) return;
  const { subject, message, replyTo } = buildRegistrationEmail(payload);
  try{
    await window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      subject, message, reply_to: replyTo
    });
  }catch(err){
    console.warn("Registration email could not be sent (saved regardless):", err.message || err);
  }
}

document.getElementById("childRegForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    type: "child",
    childName: document.getElementById("c_childName").value.trim(),
    childDob: document.getElementById("c_childDob").value,
    gender: radioValue("c_gender"),
    address: document.getElementById("c_address").value.trim(),
    nationality: document.getElementById("c_nationality").value.trim(),
    nativeLang: document.getElementById("c_nativeLang").value.trim(),
    email: document.getElementById("c_email").value.trim(),
    mother: document.getElementById("c_mother").value.trim(),
    father: document.getElementById("c_father").value.trim(),
    courses: checkedValues("c_courses"),
    photoConsent: radioValue("c_consent")
  };
  await submitRegistration(payload, document.getElementById("childRegMsg"), e.target);
});

document.getElementById("adultRegForm")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const payload = {
    type: "adult",
    name: document.getElementById("a_name").value.trim(),
    gender: radioValue("a_gender"),
    dob: document.getElementById("a_dob").value,
    nationality: document.getElementById("a_nationality").value.trim(),
    nativeLang: document.getElementById("a_nativeLang").value.trim(),
    email: document.getElementById("a_email").value.trim(),
    phone: document.getElementById("a_phone").value.trim(),
    address: document.getElementById("a_address").value.trim(),
    courses: checkedValues("a_courses"),
    level: radioValue("a_level"),
    photoConsent: radioValue("a_consent")
  };
  await submitRegistration(payload, document.getElementById("adultRegMsg"), e.target);
});

// ---------------------------------------------------------
// 7. Site content editor (admin-only editing happens in admin.js;
//    this file only reads the saved values to display them)
// ---------------------------------------------------------

async function loadSiteContent(){
  if (!SUPABASE_READY) return;
  try{
    const { data, error } = await supabase.from("site_content").select("*");
    if (error) throw error;
    contentOverrides = {};
    (data || []).forEach(row=>{ contentOverrides[row.key] = { hy: row.value_hy, nl: row.value_nl, en: row.value_en }; });
    applyLang(currentLang);
    if (contentOverrides.yearCalImage && contentOverrides.yearCalImage.hy){
      const img = document.getElementById("yearCalImg");
      if (img) img.src = contentOverrides.yearCalImage.hy;
    }
    if (contentOverrides.logoUrl && contentOverrides.logoUrl.hy){
      applyLogo(contentOverrides.logoUrl.hy);
    }
    applyContactInfo();
  }catch(err){ console.warn("Could not load site content overrides:", err.message); }
}

// ---------------------------------------------------------
// 7b. Contact details (address/email/phone) — single value each,
//     same across all three languages, admin-only.
// ---------------------------------------------------------
function applyContactInfo(){
  const addr = contentOverrides.contactAddress?.hy;
  const email = contentOverrides.contactEmail?.hy;
  const phone = contentOverrides.contactPhone?.hy;
  const fb = contentOverrides.contactFacebook?.hy;
  const ig = contentOverrides.contactInstagram?.hy;
  const blog = contentOverrides.contactBlog?.hy;

  if (addr){
    document.getElementById("contactAddressVal")?.replaceChildren(document.createTextNode(addr));
    document.getElementById("footerAddressVal")?.replaceChildren(document.createTextNode(addr));
  }
  if (email){
    [document.getElementById("contactEmailLink"), document.getElementById("footerEmailLink")].forEach(el=>{
      if (el){ el.textContent = email; el.href = "mailto:" + email; }
    });
  }
  if (phone){
    [document.getElementById("contactPhoneLink"), document.getElementById("footerPhoneLink")].forEach(el=>{
      if (el){ el.textContent = phone; el.href = "tel:" + phone.replace(/[^\d+]/g, ""); }
    });
  }
  if (fb){
    [document.getElementById("contactFbLink"), document.getElementById("footerFbLink")].forEach(el=>{ if (el) el.href = fb; });
  }
  if (ig){
    [document.getElementById("contactIgLink"), document.getElementById("footerIgLink")].forEach(el=>{ if (el) el.href = ig; });
  }
  if (blog){
    [document.getElementById("contactBlogLink"), document.getElementById("footerBlogLink")].forEach(el=>{ if (el) el.href = blog; });
  }
}

// ---------------------------------------------------------
// 8. Weekly lesson schedule ("Դասացուցակ") — shared, staff-editable.
// ---------------------------------------------------------
const demoSchedule = [
  { id:"s1",  start:"08:00", end:"09:00", course:"Հայերեն՝ օտարախոս մեծահասակների համար", courseNl:"Armeens voor anderstalige volwassenen", courseEn:"Armenian for non-Armenian-speaking adults", teacher:"Արփինե Հովհաննիսյան", teacherLatin:"Arpine Hovhannisyan" },
  { id:"s2",  start:"09:00", end:"10:00", course:"Հայերեն՝ մեծահասակների համար", courseNl:"Armeens voor volwassenen", courseEn:"Armenian for adults", teacher:"Արփինե Հովհաննիսյան", teacherLatin:"Arpine Hovhannisyan" },
  { id:"s3",  start:"09:00", end:"12:00", course:"Նախադպրոցական խումբ", courseNl:"Kleutergroep", courseEn:"Preschool group", teacher:"Գայանե Մովսիսյան, Քրիստինե Կիրակոսյան, Անուշ Ասատրյան", teacherLatin:"Gayane Movsisyan, Kristine Kirakosyan, Anush Asatryan" },
  { id:"s4",  start:"09:00", end:"09:45", course:"Ժողովրդական պար (նոր խումբ)", courseNl:"Volksdans (nieuwe groep)", courseEn:"Folk dance (new group)", teacher:"Մերի Կարապետյան", teacherLatin:"Meri Karapetyan" },
  { id:"s5",  start:"09:15", end:"10:30", course:"Գրականություն", courseNl:"Literatuur", courseEn:"Literature", teacher:"Գայանե Գրիգորյան", teacherLatin:"Gayane Grigoryan" },
  { id:"s6",  start:"09:45", end:"10:45", course:"Ժողովրդական պար (փոքրիկներ)", courseNl:"Volksdans (kleintjes)", courseEn:"Folk dance (little ones)", teacher:"Մերի Կարապետյան", teacherLatin:"Meri Karapetyan" },
  { id:"s7",  start:"10:00", end:"11:00", course:"Դասապատրաստում", courseNl:"Lesvoorbereiding", courseEn:"Lesson preparation", teacher:"Արփինե Հովհաննիսյան", teacherLatin:"Arpine Hovhannisyan" },
  { id:"s8",  start:"10:15", end:"11:15", course:"Այբբենարան", courseNl:"Alfabetklas", courseEn:"Alphabet class", teacher:"Անահիտ Աղաբաբյան", teacherLatin:"Anahit Aghababyan" },
  { id:"s9",  start:"10:45", end:"12:00", course:"Ժողովրդական պար (միջին խումբ)", courseNl:"Volksdans (middengroep)", courseEn:"Folk dance (middle group)", teacher:"Մերի Կարապետյան", teacherLatin:"Meri Karapetyan" },
  { id:"s10", start:"11:00", end:"12:00", course:"Ես և շրջակա միջավայրը", courseNl:"Ik en mijn omgeving", courseEn:"Me and my surroundings", teacher:"Անուշ Ասատրյան", teacherLatin:"Anush Asatryan" },
  { id:"s11", start:"11:00", end:"12:00", course:"Մայրենի 4", courseNl:"Moedertaal 4", courseEn:"Native language 4", teacher:"Գայանե Գրիգորյան", teacherLatin:"Gayane Grigoryan" },
  { id:"s12", start:"11:00", end:"12:00", course:"Այբբենարան", courseNl:"Alfabetklas", courseEn:"Alphabet class", teacher:"Արփինե Հովհաննիսյան", teacherLatin:"Arpine Hovhannisyan" },
  { id:"s13", start:"11:15", end:"12:15", course:"Մայրենի 1", courseNl:"Moedertaal 1", courseEn:"Native language 1", teacher:"Անահիտ Աղաբաբյան", teacherLatin:"Anahit Aghababyan" },
  { id:"s14", start:"12:00", end:"13:30", course:"Ժողովրդական պար (մեծերի խումբ)", courseNl:"Volksdans (grote groep)", courseEn:"Folk dance (senior group)", teacher:"Մերի Կարապետյան", teacherLatin:"Meri Karapetyan" },
  { id:"s15", start:"12:10", end:"13:10", course:"Պատմություն", courseNl:"Geschiedenis", courseEn:"History", teacher:"Գայանե Գրիգորյան", teacherLatin:"Gayane Grigoryan" },
  { id:"s16", start:"12:15", end:"13:15", course:"Ես և շրջակա միջավայրը", courseNl:"Ik en mijn omgeving", courseEn:"Me and my surroundings", teacher:"Անուշ Ասատրյան", teacherLatin:"Anush Asatryan" },
  { id:"s17", start:"12:15", end:"13:15", course:"Հայերեն՝ մեծահասակների համար", courseNl:"Armeens voor volwassenen", courseEn:"Armenian for adults", teacher:"Արփինե Հովհաննիսյան", teacherLatin:"Arpine Hovhannisyan" },
  { id:"s18", start:"13:30", end:"14:30", course:"Ավանդական պար (փոքրիկներ)", courseNl:"Traditionele dans (kleintjes)", courseEn:"Traditional dance (little ones)", teacher:"Լիանա Եղունյան", teacherLatin:"Liana Yeghunyan" },
  { id:"s19", start:"13:45", end:"15:00", course:"Ժողովրդական պար", courseNl:"Volksdans", courseEn:"Folk dance", teacher:"Մոնիկա Թովմասյան", teacherLatin:"Monika Tovmasyan" },
  { id:"s20", start:"14:30", end:"16:00", course:"Ավանդական պար (միջին խումբ)", courseNl:"Traditionele dans (middengroep)", courseEn:"Traditional dance (middle group)", teacher:"Լիանա Եղունյան", teacherLatin:"Liana Yeghunyan" },
  { id:"s21", start:"16:00", end:"18:00", course:"Ավանդական պար (մեծերի խումբ)", courseNl:"Traditionele dans (grote groep)", courseEn:"Traditional dance (senior group)", teacher:"Լիանա Եղունյան", teacherLatin:"Liana Yeghunyan" },
  { id:"s22", start:"", end:"", course:"Ավանդական երգ", courseNl:"Traditionele zang", courseEn:"Traditional singing", teacher:"Անուշ Տերտերյան", teacherLatin:"Anush Terteryan" },
  { id:"s23", start:"", end:"", course:"Դաշնամուր", courseNl:"Piano", courseEn:"Piano", teacher:"Անահիտ Փանոսյան", teacherLatin:"Anahit Panosyan" }
];

function timeLabel(t){ return t || ""; }
function activeOnly(rows){ return rows.filter(r => r.active !== false); }
function scheduleCourse(r, lang){
  const key = lang === "nl" ? "courseNl" : lang === "en" ? "courseEn" : "course";
  return r[key] || r.course || r.courseNl || r.courseEn || "";
}
function scheduleTeacher(r, lang){
  return (lang !== "hy" && r.teacherLatin) ? r.teacherLatin : (r.teacher || r.teacherLatin || "");
}

async function fetchSchedule(){
  if (!SUPABASE_READY) return demoSchedule;
  const { data, error } = await supabase.from("schedule").select("*").order("start_time");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(r=>({ id:r.id, start:r.start_time, end:r.end_time, course:r.course, courseNl:r.course_nl, courseEn:r.course_en, teacher:r.teacher, teacherLatin:r.teacher_latin, active:r.active }));
}

async function loadSchedule(){
  // The standalone weekly-schedule list next to the calendar was removed as a
  // duplicate — the schedule now only appears when a Saturday is clicked in
  // the calendar itself (see renderCalendar). Kept as a harmless no-op.
  const el = document.getElementById("scheduleList");
  if (!el) return;
  try{
    const rows = activeOnly(await fetchSchedule());
    el.innerHTML = rows.length ? rows.map(r=>`
      <div class="schedule-row">
        <span class="schedule-time">${timeLabel(r.start)}–${timeLabel(r.end)}</span>
        <div>
          <div class="schedule-course">${escapeHtml(scheduleCourse(r, currentLang))}</div>
          ${r.teacher ? `<div class="schedule-teacher">${escapeHtml(scheduleTeacher(r, currentLang))}</div>` : ""}
        </div>
      </div>`).join("") : `<div class="empty-state">${pickLang({hy:"Դասացուցակը դեռ լրացված չէ։", nl:"Het lesrooster is nog niet ingevuld.", en:"The schedule hasn't been filled in yet."})}</div>`;
  }catch(err){
    el.innerHTML = `<div class="empty-state">Չհաջողվեց բեռնել։ (${err.message})</div>`;
  }
}

// ---------------------------------------------------------
// 9. Events calendar — month grid, synchronized with the yearly
//    overview raster via a single shared events source (see fetchAllEvents).
// ---------------------------------------------------------
const CAL_WEEKDAYS = { hy:["Երկ","Երք","Չրք","Հնգ","Ուրբ","Շբթ","Կիր"], nl:["Ma","Di","Wo","Do","Vr","Za","Zo"], en:["Mo","Tu","We","Th","Fr","Sa","Su"] };
const CAL_MONTHS = {
  hy:["Հունվար","Փետրվար","Մարտ","Ապրիլ","Մայիս","Հունիս","Հուլիս","Օգոստոս","Սեպտեմբեր","Հոկտեմբեր","Նոյեմբեր","Դեկտեմբեր"],
  nl:["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
  en:["January","February","March","April","May","June","July","August","September","October","November","December"]
};
let calViewDate = new Date();
let calSelectedDate = null;

function pad2(n){ return String(n).padStart(2,"0"); }
function isoDate(y,m,d){ return `${y}-${pad2(m+1)}-${pad2(d)}`; }

async function fetchCalendarEvents(){
  const posts = await fetchPosts();
  return posts.filter(p=> p.type === "event" && p.date);
}

// Unified event source: published "event" posts + the yearly holiday/important-date
// list, normalized into one shape so both the monthly calendar and the yearly month
// raster always show the same thing, however an entry was added.
async function fetchAllEvents(){
  const posts = (await fetchCalendarEvents()).map(p=>({
    start:p.date, end:p.date,
    labelHy:p.title, labelNl:p.title_nl || p.title, labelEn:p.title_en || p.title,
    notesHy:p.body, notesNl:p.body_nl || p.body, notesEn:p.body_en || p.body,
    source:"post", id:p.id
  }));
  const holidays = (await fetchYearCalEntries()).map(e=>({ ...e, source:"holiday" }));
  return [...posts, ...holidays];
}

function expandDateRange(start, end){
  const days = [];
  if (!start) return days;
  const last = new Date((end || start) + "T00:00:00");
  let cur = new Date(start + "T00:00:00");
  let guard = 0;
  while (cur <= last && guard < 366){
    days.push(isoDate(cur.getFullYear(), cur.getMonth(), cur.getDate()));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return days;
}

async function renderCalendar(){
  const grid = document.getElementById("calGrid");
  const weekdaysEl = document.getElementById("calWeekdays");
  const label = document.getElementById("calMonthLabel");
  const listEl = document.getElementById("calEventsList");
  if (!grid) return;

  weekdaysEl.innerHTML = CAL_WEEKDAYS[currentLang].map(d=>`<span>${d}</span>`).join("");

  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();
  label.textContent = `${CAL_MONTHS[currentLang][month]} ${year}`;

  let events = [];
  try{ events = await fetchAllEvents(); }catch(err){ console.warn(err.message); }
  const eventsByDate = {};
  events.forEach(ev=>{
    expandDateRange(ev.start, ev.end).forEach(d=>{ (eventsByDate[d] ||= []).push(ev); });
  });

  let scheduleRows = [];
  try{ scheduleRows = activeOnly(await fetchSchedule()); }catch(err){ console.warn(err.message); }

  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first offset
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayIso = isoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  let cells = "";
  for (let i=0;i<firstDay;i++) cells += `<div class="cal-day empty"></div>`;
  for (let d=1; d<=daysInMonth; d++){
    const iso = isoDate(year, month, d);
    const dow = new Date(year, month, d).getDay();
    const isClassSaturday = dow === 6 && scheduleRows.length > 0;
    const hasEvents = !!eventsByDate[iso];
    const classes = ["cal-day"];
    if (iso === todayIso) classes.push("today");
    if (iso === calSelectedDate) classes.push("selected");
    const dots = `${isClassSaturday ? '<span class="dot dot-class"></span>' : ''}${hasEvents ? '<span class="dot"></span>' : ''}`;
    cells += `<div class="${classes.join(' ')}" data-date="${iso}">${d}${dots ? `<span class="dots-wrap">${dots}</span>` : ''}</div>`;
  }
  grid.innerHTML = cells;

  grid.querySelectorAll(".cal-day:not(.empty)").forEach(cell=>{
    cell.addEventListener("click", ()=>{
      calSelectedDate = calSelectedDate === cell.dataset.date ? null : cell.dataset.date;
      renderCalendar();
    });
  });

  const monthPrefix = `${year}-${pad2(month+1)}`;
  let html = "";

  if (calSelectedDate){
    const [sy,sm,sd] = calSelectedDate.split("-").map(Number);
    const dow = new Date(sy, sm-1, sd).getDay();
    if (dow === 6 && scheduleRows.length){
      html += scheduleRows.map(r=>`
        <div class="cal-event-item">
          <span class="cal-event-date schedule-time">${timeLabel(r.start)}${r.end ? "–"+timeLabel(r.end) : ""}</span>
          <div><h4>${escapeHtml(scheduleCourse(r, currentLang))}</h4>${r.teacher ? `<p>${escapeHtml(scheduleTeacher(r, currentLang))}</p>` : ""}</div>
        </div>`).join("");
    }
    const dayEvents = eventsByDate[calSelectedDate] || [];
    html += dayEvents.map(ev=>`
      <div class="cal-event-item${ev.source === 'post' ? ' clickable' : ''}" ${ev.source === 'post' ? `data-post-id="${ev.id}"` : ''}>
        <span class="cal-event-date">${formatDateRange(ev.start, ev.end)}</span>
        <div><h4>${escapeHtml(yearCalLabel(ev, currentLang))}</h4>${yearCalNotes(ev, currentLang) ? `<p>${escapeHtml(yearCalNotes(ev, currentLang))}</p>` : ""}</div>
      </div>`).join("");

    if (!html){
      html = `<div class="empty-state">${pickLang({hy:"Այս օրը ոչինչ պլանավորված չէ։", nl:"Geen activiteit op deze dag.", en:"Nothing planned on this day."})}</div>`;
    }
  } else {
    const monthEvents = events
      .filter(ev => expandDateRange(ev.start, ev.end).some(d => d.startsWith(monthPrefix)))
      .sort((a,b)=>a.start.localeCompare(b.start));
    html = monthEvents.length ? monthEvents.map(ev=>`
      <div class="cal-event-item${ev.source === 'post' ? ' clickable' : ''}" ${ev.source === 'post' ? `data-post-id="${ev.id}"` : ''}>
        <span class="cal-event-date">${formatDateRange(ev.start, ev.end)}</span>
        <div><h4>${escapeHtml(yearCalLabel(ev, currentLang))}</h4>${yearCalNotes(ev, currentLang) ? `<p>${escapeHtml(yearCalNotes(ev, currentLang))}</p>` : ""}</div>
      </div>`).join("") : `<div class="empty-state">${pickLang({
        hy:"Այս ամսում այլ միջոցառում չկա։ Սեղմեք շաբաթ օրվա վրա՝ դասացուցակը տեսնելու համար։",
        nl:"Geen activiteit deze maand. Klik op een zaterdag voor het lesrooster.",
        en:"No other activities this month. Click a Saturday to see the class schedule."
      })}</div>`;
  }

  listEl.innerHTML = html;
  listEl.querySelectorAll(".cal-event-item.clickable").forEach(item=>{
    item.addEventListener("click", async ()=>{
      if (!allKnownPosts.length) allKnownPosts = await fetchPosts();
      const post = allKnownPosts.find(p=>String(p.id) === item.dataset.postId);
      if (post) openPostDetail(post);
    });
  });
}

document.getElementById("calPrev")?.addEventListener("click", ()=>{
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()-1, 1);
  calSelectedDate = null;
  renderCalendar();
});
document.getElementById("calNext")?.addEventListener("click", ()=>{
  calViewDate = new Date(calViewDate.getFullYear(), calViewDate.getMonth()+1, 1);
  calSelectedDate = null;
  renderCalendar();
});

// ---------------------------------------------------------
// 10. Teaching staff ("Ուսուցչական կազմ") — shared, staff-editable.
// ---------------------------------------------------------
const demoStaff = [
  { id:"t1", name:"Լիանա Մելքոնյան", nameLatin:"Liana Melkonyan", role:"Դպրոցի տնօրեն և կազմակերպչական հարցերով պատասխանատու", roleNl:"Directeur van de school en verantwoordelijke voor de organisatie", roleEn:"School director and organizational coordinator", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697864-NL580EKUOR71WL9QFDHJ/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.17.07_2f78111a.jpg" },
  { id:"t2", name:"Գայանե Մովսիսյան", nameLatin:"Gayane Movsisyan", role:"Նախադպրոցական խմբի ուսուցչուհի", roleNl:"Lerares kleutergroep", roleEn:"Preschool group teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697890-9UIVKPYZ7LJERK48ALZB/WhatsApp+Image+2026-01-31+at+19.41.56.jpeg" },
  { id:"t3", name:"Քրիստինե Կիրակոսյան", nameLatin:"Kristine Kirakosyan", role:"Նախադպրոցական խմբի ուսուցչուհի", roleNl:"Lerares kleutergroep", roleEn:"Preschool group teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697923-A2GNKUOU23OZBLCVATLC/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.17.38_7e8fbe21.jpg" },
  { id:"t4", name:"Անահիտ Աղաբաբյան", nameLatin:"Anahit Aghababyan", role:"Այբբենարանի ուսուցչուհի", roleNl:"Lerares alfabetklas", roleEn:"Alphabet class teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697873-TJ4SE0Y18Y8CES6WCKEP/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.17.52_8be250e0.jpg" },
  { id:"t5", name:"Գայանե Գրիգորյան", nameLatin:"Gayane Grigoryan", role:"Մայրենի լեզվի, գրականության և պատմության ուսուցչուհի", roleNl:"Lerares moedertaal, literatuur en geschiedenis", roleEn:"Native language, literature, and history teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697898-299S4Y0XIP1X86E636UZ/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.15.48_341f1355.jpg" },
  { id:"t6", name:"Անուշ Ասատրյան", nameLatin:"Anush Asatryan", role:"Մենթոր վերապատրաստող և «Ես և շրջակա միջավայրը» ուսուցչուհի", roleNl:"Mentor-opleider en lerares 'Ik en mijn omgeving'", roleEn:"Mentor trainer and 'Me and my surroundings' teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697931-OCKZQ4VFOW6RBFLOVA93/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.21.18_b63d236e.jpg" },
  { id:"t7", name:"Արփինե Հովհաննիսյան", nameLatin:"Arpine Hovhannisyan", role:"Հայերենի ուսուցում օտարախոսների համար և այբբենարանի ուսուցչուհի", roleNl:"Armeens voor anderstaligen en lerares alfabetklas", roleEn:"Armenian for non-Armenian-speakers and alphabet class teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697907-VTTURBSFGTAOJWBIZ6OV/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.25.30_11aef00b.jpg" },
  { id:"t8", name:"Անահիտ Փանոսյան", nameLatin:"Anahit Panosyan", role:"Դաշնամուրի ուսուցչուհի", roleNl:"Pianolerares", roleEn:"Piano teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697915-24CLQUD0WYK0K793UZL0/Afbeelding+van+WhatsApp+op+2025-11-16+om+21.18.09_ec4ec8b4.jpg" },
  { id:"t9", name:"Նարեկ Առաքելյան", nameLatin:"Narek Arakelyan", role:"Շախմատի ուսուցիչ", roleNl:"Schaakleraar", roleEn:"Chess teacher", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/e580ecdd-a091-423a-884c-0edd8163c728/WhatsApp+Image+2026-02-22+at+12.24.47.jpeg" },
  { id:"t10", name:"Մերի Կարապետյան", nameLatin:"Meri Karapetyan", role:"Ժողովրդական պարի պարուսույց", roleNl:"Volksdanslerares", roleEn:"Folk dance instructor", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697856-NF18MICA3QZR7HPEYBSD/WhatsApp+Image+2026-02-07+at+20.11.42.jpeg" },
  { id:"t11", name:"Լիանա Եղունյան", nameLatin:"Liana Yeghunyan", role:"Ավանդական պարի պարուսույց", roleNl:"Lerares traditionele dans", roleEn:"Traditional dance instructor", photoUrl:"https://images.squarespace-cdn.com/content/v1/6990ce3dc5ac547efa5211aa/1771097697882-KVST7B75VF2ZWKAKS81G/WhatsApp+Image+2026-01-31+at+19.43.50.jpeg" }
];

async function fetchStaff(){
  if (!SUPABASE_READY) return demoStaff;
  const { data, error } = await supabase.from("staff").select("*").order("created_at");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(t=>({ id:t.id, name:t.name, nameLatin:t.name_latin, role:t.role, roleNl:t.role_nl, roleEn:t.role_en, photoUrl:t.photo_url }));
}

function staffRole(t, lang){
  const key = lang === "nl" ? "roleNl" : lang === "en" ? "roleEn" : "role";
  return t[key] || t.role || t.roleNl || t.roleEn || "";
}

// Armenian-script names aren't readable to most Dutch/English visitors, so
// non-Armenian languages show the Latin transliteration when one is set.
function staffName(t, lang){
  return (lang !== "hy" && t.nameLatin) ? t.nameLatin : (t.name || t.nameLatin || "");
}

function staffInitials(name){
  return (name||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
}

async function loadStaff(){
  const el = document.getElementById("staffGrid");
  if (!el) return;
  try{
    const rows = await fetchStaff();
    el.innerHTML = rows.length ? rows.map(t=>{
      const displayName = staffName(t, currentLang);
      return `
      <div class="staff-card">
        <div class="staff-photo${t.photoUrl ? "" : " placeholder"}">
          ${t.photoUrl ? `<img src="${t.photoUrl}" alt="${escapeHtml(displayName)}">` : staffInitials(displayName)}
        </div>
        <div class="staff-body">
          <h3>${escapeHtml(displayName)}</h3>
          <p>${escapeHtml(staffRole(t, currentLang))}</p>
        </div>
      </div>`;
    }).join("") : `<div class="empty-state">${pickLang({hy:"Անձնակազմի տվյալները դեռ լրացված չեն։", nl:"De personeelsgegevens zijn nog niet ingevuld.", en:"Staff details haven't been filled in yet."})}</div>`;
  }catch(err){
    el.innerHTML = `<div class="empty-state">Չհաջողվեց բեռնել։ (${err.message})</div>`;
  }
}


// ---------------------------------------------------------
// 11. Yearly academic calendar — dynamic, staff-editable, bilingual
//     month raster. Seeded with the school's real 2025–2026 calendar.
// ---------------------------------------------------------
function formatDateRange(start, end){
  if (!start) return "";
  if (!end || end === start) return start;
  return `${start} → ${end}`;
}

const demoYearCal = [
  { start:"2025-09-05", end:"2025-09-05", labelHy:"ARMO Get Together միջոցառում", labelNl:"ARMO Get Together-evenement", labelEn:"ARMO Get Together event" },
  { start:"2025-09-06", end:"2025-09-06", labelHy:"Վերապատրաստման դասընթաց ուսուցիչների համար", labelNl:"Bijscholing voor leerkrachten", labelEn:"Training course for teachers" },
  { start:"2025-09-13", end:"2025-09-13", labelHy:"Նոր ուսումնական տարվա առաջին օր", labelNl:"Eerste dag van het nieuwe schooljaar", labelEn:"First day of the new school year" },
  { start:"2025-09-21", end:"2025-09-21", labelHy:"ՀՀ անկախության օր", labelNl:"Onafhankelijkheidsdag van Armenië", labelEn:"Independence Day of Armenia" },
  { start:"2025-10-05", end:"2025-10-05", labelHy:"Ուսուցչի տոն", labelNl:"Dag van de leerkracht", labelEn:"Teacher's Day" },
  { start:"2025-10-11", end:"2025-10-11", labelHy:"Երևանի օր", labelNl:"Dag van Jerevan", labelEn:"Yerevan Day" },
  { start:"2025-10-13", end:"2025-10-13", labelHy:"Թարգմանչաց տոն", labelNl:"Feest van de Heilige Vertalers", labelEn:"Feast of the Holy Translators" },
  { start:"2025-10-26", end:"2025-10-26", labelHy:"«Հոգու մեղեդի» միջոցառում", labelNl:"Evenement 'Hogu Meghedi' (Melodie van de ziel)", labelEn:"'Hogu Meghedi' event (Melody of the Soul)" },
  { start:"2025-11-16", end:"2025-11-16", labelHy:"Հանդուրժողականության միջազգային օր", labelNl:"Internationale Dag van de Verdraagzaamheid", labelEn:"International Day of Tolerance" },
  { start:"2025-11-22", end:"2025-11-22", labelHy:"«Երեք խորհրդանիշները» ներկայացում՝ նախադպրոցական խմբի համար", labelNl:"Voorstelling 'Drie symbolen' voor de kleutergroep", labelEn:"'Three Symbols' performance for the preschool group" },
  { start:"2025-12-14", end:"2025-12-14", labelHy:"Բաց դասընթաց ծնողների համար", labelNl:"Open les voor ouders", labelEn:"Open class for parents" },
  { start:"2025-12-20", end:"2025-12-20", labelHy:"Ամանորյա հանդես (նախադպրոցական և այբբենարանի դասարանների համար)", labelNl:"Nieuwjaarsfeest (voor de kleutergroep en de alfabetklas)", labelEn:"New Year celebration (for the preschool group and alphabet class)" },
  { start:"2025-12-27", end:"2025-12-27", labelHy:"Տարեվերջյան վերջին դասը", labelNl:"Laatste les van het jaar", labelEn:"Last class of the year" },
  { start:"2026-01-01", end:"2026-01-01", labelHy:"Նոր տարի", labelNl:"Nieuwjaar", labelEn:"New Year" },
  { start:"2026-01-03", end:"2026-01-03", labelHy:"Հանգստյան օր", labelNl:"Vrije dag", labelEn:"No class" },
  { start:"2026-01-06", end:"2026-01-06", labelHy:"Սուրբ Ծնունդ", labelNl:"Kerstmis (Armeens-Apostolisch)", labelEn:"Christmas (Armenian Apostolic)" },
  { start:"2026-01-10", end:"2026-01-10", labelHy:"Սահադաշտ (ուսումնական այց)", labelNl:"Schaatsbaan (uitstap)", labelEn:"Ice rink (school outing)" },
  { start:"2026-01-27", end:"2026-01-27", labelHy:"44-օրյա պատերազմի զոհերի հիշատակի օր", labelNl:"Herdenkingsdag slachtoffers van de 44-daagse oorlog", labelEn:"Remembrance Day for the 44-Day War victims" },
  { start:"2026-01-28", end:"2026-01-28", labelHy:"Բանակի օր", labelNl:"Legerdag", labelEn:"Army Day" },
  { start:"2026-02-19", end:"2026-02-19", labelHy:"Գիրք նվիրելու օր", labelNl:"Dag van het boeken cadeau geven", labelEn:"Book Gifting Day" },
  { start:"2026-02-21", end:"2026-02-21", labelHy:"Մայրենի լեզվի միջազգային օր", labelNl:"Internationale Moedertaaldag", labelEn:"International Mother Language Day" },
  { start:"2026-03-08", end:"2026-03-08", labelHy:"Կանանց և աղջիկների տոն", labelNl:"Dag van de Vrouw en het Meisje", labelEn:"Women's and Girls' Day" },
  { start:"2026-04-04", end:"2026-04-04", labelHy:"Զատիկ", labelNl:"Pasen", labelEn:"Easter" },
  { start:"2026-04-07", end:"2026-04-07", labelHy:"Մայրության և գեղեցկության օր", labelNl:"Dag van het Moederschap en de Schoonheid", labelEn:"Motherhood and Beauty Day" },
  { start:"2026-04-11", end:"2026-04-11", labelHy:"Հանգստյան օր", labelNl:"Vrije dag", labelEn:"No class" },
  { start:"2026-04-24", end:"2026-04-24", labelHy:"Հայոց ցեղասպանության զոհերի հիշատակի օր", labelNl:"Herdenkingsdag Armeense Genocide", labelEn:"Armenian Genocide Remembrance Day" },
  { start:"2026-05-15", end:"2026-05-15", labelHy:"Ավանդական երգ ու պարի համույթի ելույթ", labelNl:"Optreden van de traditionele zang- en dansgroep", labelEn:"Traditional song and dance ensemble performance" },
  { start:"2026-05-16", end:"2026-05-16", labelHy:"«Տիեզերքից մինչև իմ հայրենի աշխարհը» դաս-միջոցառում", labelNl:"Les-evenement 'Van het heelal tot mijn thuisland'", labelEn:"'From the universe to my homeland' class event" },
  { start:"2026-05-23", end:"2026-05-23", labelHy:"«Փոքրիկ հայրենասեր» ինտելեկտուալ խաղ", labelNl:"Intellectueel spel 'Kleine vaderlander'", labelEn:"'Little Patriot' quiz game" },
  { start:"2026-06-01", end:"2026-06-01", labelHy:"Երեխաների պաշտպանության միջազգային օր", labelNl:"Internationale Dag van het Kind", labelEn:"International Children's Day" },
  { start:"2026-06-06", end:"2026-06-06", labelHy:"Այբբենարանի ավարտական հանդես", labelNl:"Eindfeest van de alfabetklas", labelEn:"Alphabet class graduation celebration" },
  { start:"2026-07-01", end:"2026-07-01", labelHy:"Ամառային արձակուրդի սկիզբ", labelNl:"Start van de zomervakantie", labelEn:"Start of summer break" },
  { start:"2026-08-31", end:"2026-08-31", labelHy:"Ամառային արձակուրդի ավարտ", labelNl:"Einde van de zomervakantie", labelEn:"End of summer break" }
];

async function fetchYearCalEntries(){
  if (!SUPABASE_READY) return demoYearCal;
  const { data, error } = await supabase.from("yearly_events").select("*").order("start_date");
  if (error){ console.warn(error.message); return []; }
  return (data || []).map(e=>({
    id:e.id, start:e.start_date, end:e.end_date || e.start_date,
    labelHy:e.label_hy, labelNl:e.label_nl, labelEn:e.label_en,
    notesHy:e.notes_hy, notesNl:e.notes_nl, notesEn:e.notes_en
  }));
}

function yearCalLabel(e, lang){
  const key = lang === "nl" ? "labelNl" : lang === "en" ? "labelEn" : "labelHy";
  return e[key] || e.labelHy || e.labelNl || e.labelEn || "";
}
function yearCalNotes(e, lang){
  const key = lang === "nl" ? "notesNl" : lang === "en" ? "notesEn" : "notesHy";
  return e[key] || "";
}

const YEAR_CAL_MONTH_COLORS = [
  "var(--blue)", "var(--pomegranate)", "var(--apricot-deep)", "var(--blue-deep)",
  "var(--pomegranate)", "var(--blue)", "var(--apricot-deep)", "var(--blue-deep)",
  "var(--pomegranate)", "var(--blue)", "var(--apricot-deep)", "var(--blue-deep)"
];
const ACADEMIC_MONTH_ORDER = [8,9,10,11,0,1,2,3,4,5,6,7];
const MONTH_NAME = {
  hy: ["Հունվար","Փետրվար","Մարտ","Ապրիլ","Մայիս","Հունիս","Հուլիս","Օգոստոս","Սեպտեմբեր","Հոկտեմբեր","Նոյեմբեր","Դեկտեմբեր"],
  nl: ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"]
};

function dayNum(iso){ return iso ? parseInt(iso.split("-")[2], 10) : ""; }

// Academic year runs September→August. Computed purely from each entry's date,
// so admin never has to tag anything by year — adding a date in Sept 2026 or
// later automatically lands in the "2026–2027" year.
function academicStartYearOf(iso){
  const [y, m] = iso.split("-").map(Number);
  return m >= 9 ? y : y - 1;
}
function academicYearLabel(startYear){ return `${startYear}–${startYear + 1}`; }
function defaultAcademicStartYear(){
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}
let yearCalViewStartYear = defaultAcademicStartYear();

document.getElementById("yearCalPrev")?.addEventListener("click", ()=>{
  yearCalViewStartYear--;
  loadYearCalDisplay();
});
document.getElementById("yearCalNext")?.addEventListener("click", ()=>{
  yearCalViewStartYear++;
  loadYearCalDisplay();
});

async function loadYearCalDisplay(){
  const listEl = document.getElementById("yearCalList");
  const imgWrap = document.getElementById("yearCalImageWrap");
  const yearLabelEl = document.getElementById("yearCalYearLabel");
  if (!listEl || !imgWrap) return;
  if (yearLabelEl) yearLabelEl.textContent = academicYearLabel(yearCalViewStartYear);
  try{
    const allEntries = await fetchAllEvents();
    if (allEntries.length){
      const entries = allEntries.filter(e => e.start && academicStartYearOf(e.start) === yearCalViewStartYear);
      const byMonth = {};
      entries.forEach(e=>{
        if (!e.start) return;
        const m = parseInt(e.start.split("-")[1], 10) - 1;
        (byMonth[m] ||= []).push(e);
      });
      Object.values(byMonth).forEach(list => list.sort((a,b)=> a.start.localeCompare(b.start)));

      listEl.innerHTML = ACADEMIC_MONTH_ORDER.map(m=>{
        const list = byMonth[m] || [];
        const monthLabel = MONTH_NAME[currentLang][m];
        const bg = YEAR_CAL_MONTH_COLORS[m];
        const body = list.length
          ? list.map(e=>`
              <div class="year-cal-entry">
                <span class="year-cal-day">${dayNum(e.start)}${e.end && e.end !== e.start ? "–"+dayNum(e.end) : ""}</span>
                <div class="year-cal-entry-text">
                  <h4>${escapeHtml(yearCalLabel(e, currentLang))}</h4>
                  ${yearCalNotes(e, currentLang) ? `<p>${escapeHtml(yearCalNotes(e, currentLang))}</p>` : ""}
                </div>
              </div>`).join("")
          : `<div class="year-cal-month-empty">${pickLang({hy:"Դեռ ոչինչ", nl:"Geen items", en:"Nothing yet"})}</div>`;
        return `<div class="year-cal-month">
          <div class="year-cal-month-head" style="background:${bg};">${monthLabel}</div>
          <div class="year-cal-month-body">${body}</div>
        </div>`;
      }).join("");

      listEl.style.display = "grid";
      imgWrap.style.display = "none";
    } else {
      listEl.style.display = "none";
      imgWrap.style.display = "";
    }
  }catch(err){
    console.warn("Could not load yearly calendar entries:", err.message);
  }
}


// ---------------------------------------------------------
// 12. Yearly calendar overview image — falls back to the school's
//     original graphic; editable from the admin area (admin.html).
// ---------------------------------------------------------
const DEFAULT_YEAR_CAL_URL = document.getElementById("yearCalImg")?.getAttribute("src") || "";

// ---------------------------------------------------------
// 13. School logo — editable from the admin area (admin.html).
// ---------------------------------------------------------
function applyLogo(url){
  const box = document.getElementById("crestBox");
  if (!box) return;
  if (url){
    box.innerHTML = `<img src="${url}" alt="Դպրոցի լոգո">`;
  } else {
    box.innerHTML = `<span id="crestInitials">ԼՇ</span>`;
  }
}

// initial load
renderTimeline("hy");
renderClassesList("hy");
updateHistoryToggleLabel();
loadFeed();
loadGallery();
loadSiteContent();
loadSchedule();
loadStaff();
loadYearCalDisplay();
renderCalendar();
