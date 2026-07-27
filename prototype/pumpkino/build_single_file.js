// Merges the 18 standalone Pumpkino prototype pages into one self-contained
// HTML file with a client-side hash router. Each page keeps its own <style>
// and <script> exactly as authored; only internal navigation targets get
// rewritten (filename.html -> #/route) so the whole prototype is click-through
// -able from a single file. Source files are left untouched — this is a build
// step, not a replacement for them.
const fs = require("fs");
const path = require("path");

const ROUTE_MAP = [
  ["pumpkino-home.html", "home"],
  ["pumpkino-login.html", "login"],
  ["pumpkino-signup.html", "signup"],
  ["pumpkino-forgot-password.html", "forgot-password"],
  ["pumpkino-verify-email.html", "verify-email"],
  ["pumpkino-onboarding.html", "onboarding"],
  ["pumpkino-pricing.html", "pricing"],
  ["pumpkino-subscription.html", "subscription"],
  ["pumpkino-profile.html", "profile"],
  ["pumpkino-marketplace.html", "marketplace"],
  ["pumpkino-dmc-detail.html", "dmc-detail"],
  ["pumpkino-admin.html", "admin"],
  ["pumpkino-Agent-dashboard-final-v2.html", "agent-dashboard"],
  ["dmc-portal-final-v2.html", "dmc-portal"],
  ["pumpkino-support.html", "support"],
  ["pumpkino-terms.html", "terms"],
  ["pumpkino-privacy.html", "privacy"],
  ["pumpkino-refund-policy.html", "refund-policy"],
];

const DEFAULT_ROUTE = "home";
const NAV_LABELS = {
  home: "Home", login: "Log in", signup: "Sign up", "forgot-password": "Forgot password",
  "verify-email": "Verify email", onboarding: "Onboarding", pricing: "Pricing",
  subscription: "Subscription", profile: "Profile", marketplace: "Marketplace",
  "dmc-detail": "DMC detail", admin: "Admin", "agent-dashboard": "Agency Dashboard",
  "dmc-portal": "DMC Portal", support: "Support", terms: "Terms", privacy: "Privacy",
  "refund-policy": "Refund Policy"
};

function b64(str) {
  return Buffer.from(str, "utf8").toString("base64");
}

const pages = {};
const missing = [];

for (const [filename, route] of ROUTE_MAP) {
  if (!fs.existsSync(filename)) { missing.push(filename); continue; }
  let raw = fs.readFileSync(filename, "utf8");

  // Rewrite internal navigation targets to hash routes. Order-independent —
  // none of the 18 filenames are substrings of one another.
  for (const [fn, r] of ROUTE_MAP) {
    raw = raw.split(fn).join("#/" + r);
  }

  // Pages that read their own query string via `window.location.search` need
  // to read it from the hash instead, since the route+query now live in
  // location.hash, not location.search. Router.query() (defined in the shell)
  // returns the same "?key=val" shape so URLSearchParams usage is unchanged.
  raw = raw.split("window.location.search").join("Router.query()");

  // pumpkino-home.html's counter animation is wired to a real DOMContentLoaded,
  // which only ever fires once for the whole merged document — if "home" isn't
  // the first route visited, that listener would never fire when the user
  // later navigates back to it. Call it directly instead; by the time a page's
  // script runs here, its markup is already mounted, which is the same
  // precondition DOMContentLoaded was guarding.
  raw = raw.replace(/window\.addEventListener\(\s*'DOMContentLoaded'\s*,\s*(\w+)\s*\)\s*;/g, "$1();");

  const titleMatch = raw.match(/<title>([\s\S]*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].trim() : route;

  // IMPORTANT: several pages build print-preview popups via
  // `w.document.write('...<style>...</style></head><body>...</body></html>')`
  // as plain JS string literals — meaning fake "<body", "</body>", "<style>"
  // substrings exist INSIDE the real <script> block, positioned after it
  // starts. A naive regex hunting for the *closing* </body> tag grabs one of
  // these fakes instead of the real one at the true end of the file, silently
  // truncating everything after it (including the whole real <script> tag in
  // the worst case). Every file was independently verified to contain exactly
  // one real, literal "<script>"/"</script>" pair with no nested occurrences
  // of either substring anywhere else — so scriptOpenIdx/scriptCloseIdx here
  // are unambiguous, and everything real (head styles, body markup) is
  // guaranteed to sit *before* scriptOpenIdx, sidestepping the ambiguous tags
  // entirely rather than trying to out-clever them with lookahead regex.
  const scriptOpenTag = "<script>";
  const scriptCloseTag = "</script>";
  const scriptOpenIdx = raw.indexOf(scriptOpenTag);
  const scriptCloseIdx = raw.indexOf(scriptCloseTag);
  const hasScript = scriptOpenIdx > -1 && scriptCloseIdx > scriptOpenIdx;
  const script = hasScript ? raw.slice(scriptOpenIdx + scriptOpenTag.length, scriptCloseIdx) : "";

  // Boundary marking "end of real head/body content" — either where the one
  // real <script> tag begins, or (for script-less legal pages) the file's
  // true final </body>, found via lastIndexOf since it's guaranteed to be the
  // last occurrence of that substring in the file.
  const contentEnd = hasScript ? scriptOpenIdx : raw.lastIndexOf("</body>");

  const headSection = raw.slice(0, contentEnd);
  let style = "";
  const styleRe = /<style>([\s\S]*?)<\/style>/g;
  let sm;
  while ((sm = styleRe.exec(headSection))) { style += sm[1] + "\n"; }

  const bodyOpenMatch = raw.match(/<body[^>]*>/);
  const bodyContentStart = bodyOpenMatch ? bodyOpenMatch.index + bodyOpenMatch[0].length : 0;
  const bodyHtml = raw.slice(bodyContentStart, contentEnd).trim();

  pages[route] = {
    title: title,
    style: b64(style),
    body: b64(bodyHtml),
    script: b64(script)
  };
  console.log("Packed " + filename + " -> #/" + route + "  (title: " + title + ")");
}

if (missing.length) {
  console.error("Missing source files, aborting: " + missing.join(", "));
  process.exit(1);
}

const navHtml = ROUTE_MAP.map(([, route]) =>
  '<a href="#/' + route + '" style="margin-right:10px;">' + NAV_LABELS[route] + "</a>"
).join("");

const shell = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Pumpkino — Full Prototype</title>
<style>
  html,body{margin:0;padding:0;}
  #pk-devnav{position:sticky; top:0; z-index:99999; background:#12392A; color:#EAF5EF; font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; padding:6px 14px; overflow-x:auto; white-space:nowrap;}
  #pk-devnav a{color:#EAF5EF; text-decoration:none; opacity:.85;}
  #pk-devnav a:hover{opacity:1; text-decoration:underline;}
  #pk-devnav .lbl{opacity:.55; margin-right:10px;}
</style>
<style id="page-style"></style>
</head>
<body>
<div id="pk-devnav"><span class="lbl">All pages (dev index):</span>${navHtml}</div>
<div id="app"></div>
<script>
var PAGES = ${JSON.stringify(pages)};
var DEFAULT_ROUTE = ${JSON.stringify(DEFAULT_ROUTE)};

var Router = (function(){
  // atob() only decodes base64 into a raw byte-string (one JS "character"
  // per byte, Latin-1 style) — it does NOT reassemble multi-byte UTF-8
  // sequences. Every non-ASCII character on every page (em dashes, ₹, curly
  // quotes, bullets, emoji) was built as proper UTF-8, so decoding needs the
  // classic escape/decodeURIComponent round-trip to turn those raw bytes back
  // into a correct JS string — plain atob() alone renders it as mojibake
  // (e.g. "—" showing up as "â€”").
  function b64ToUtf8(b64){
    return decodeURIComponent(escape(atob(b64)));
  }
  function parseHash(){
    var h = (location.hash || '').replace(/^#\\/?/, '');
    var qIdx = h.indexOf('?');
    var route = qIdx > -1 ? h.slice(0, qIdx) : h;
    var query = qIdx > -1 ? h.slice(qIdx) : '';
    if(!PAGES[route]) route = DEFAULT_ROUTE;
    return { route: route, query: query };
  }
  function query(){ return parseHash().query; }
  function mount(){
    var parsed = parseHash();
    var page = PAGES[parsed.route];
    document.title = page.title;
    document.getElementById('page-style').textContent = b64ToUtf8(page.style);
    document.getElementById('app').innerHTML = b64ToUtf8(page.body);
    window.scrollTo(0, 0);
    var code = b64ToUtf8(page.script);
    if(code){
      // Indirect eval (the "(0, eval)" trick) runs the code synchronously in
      // true global scope — the same semantics a real <script> tag has. A
      // dynamically createElement()'d + appendChild()'d <script> looks
      // equivalent but actually executes asynchronously in real browsers
      // (it's scheduled, not inline), which is exactly wrong here: this next
      // line needs the page's window.* handlers to exist immediately so
      // inline onclick="..." attributes in the just-mounted HTML resolve.
      try {
        (0, eval)(code);
      } catch (e) {
        console.error('Page script error on #/' + parsed.route + ':', e && e.stack ? e.stack : e);
      }
    }
  }
  window.addEventListener('hashchange', mount);
  window.addEventListener('DOMContentLoaded', mount);
  return { query: query, mount: mount };
})();
</script>
</body>
</html>
`;

fs.writeFileSync("Pumpkino_Full_Prototype.html", shell, "utf8");
console.log("\\nWrote Pumpkino_Full_Prototype.html (" + Object.keys(pages).length + " pages, " + shell.length + " bytes)");
