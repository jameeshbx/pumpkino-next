const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("Pumpkino_Full_Prototype.html", "utf8");

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK: " + msg);
}

const ROUTES = [
  ["home", "Every itinerary"],
  ["login", "Log in"],
  ["signup", "Create your"],
  ["forgot-password", "Reset"],
  ["verify-email", "erify"],
  ["onboarding", "Welcome"],
  ["pricing", "Plans"],
  ["subscription", "Subscription"],
  ["profile", "Profile"],
  ["marketplace", "Marketplace"],
  ["dmc-detail", ""],
  ["admin", "Admin"],
  ["agent-dashboard", ""],
  ["dmc-portal", ""],
  ["support", "Support"],
  ["terms", "Terms"],
  ["privacy", "Privacy"],
  ["refund-policy", "Refund"]
];

async function main() {
  // ---- Fresh load per route (closest simulation of "click a link, arrive at a page") ----
  for (const [route, expect] of ROUTES) {
    const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "http://localhost/#/" + route });
    await wait(250);
    const app = dom.window.document.getElementById("app");
    assert(!!app && app.innerHTML.trim().length > 0, "#/" + route + " mounted non-empty content");
    if (expect) assert(app.innerHTML.indexOf(expect) > -1, "#/" + route + " contains expected text '" + expect + "'");
    assert(dom.window.document.title.indexOf("Pumpkino") > -1, "#/" + route + " set a Pumpkino page title");
    dom.window.close();
  }

  // ---- One long session: navigate across many routes in a single document,
  // the way a real user clicking through the app would, and check nothing
  // leaks/breaks between pages ----
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "http://localhost/" });
  const { window } = dom;
  const doc = window.document;
  await wait(250);
  assert(doc.getElementById("app").innerHTML.indexOf("Every itinerary") > -1, "default route (no hash) loads home");

  // home -> signup with role=dmc via a real link click
  const dmcSignupLink = [...doc.querySelectorAll("a")].find(a => a.getAttribute("href") === "#/signup?role=dmc");
  assert(!!dmcSignupLink, "home page has a DMC signup link rewritten to #/signup?role=dmc");
  dmcSignupLink.click();
  await wait(250);
  assert(window.location.hash === "#/signup?role=dmc", "hash updated after clicking internal link");
  assert(doc.getElementById("app").innerHTML.indexOf("Create your") > -1, "navigated to signup via in-page link");
  // signup reads role from the hash query via Router.query() -> should default UI to DMC role
  let roleBtnDmc = doc.getElementById("roleBtnDmc") || doc.querySelector('[id*="Dmc"]');
  assert(!!roleBtnDmc, "signup page rendered a DMC role element after deep-linking role=dmc");

  // marketplace -> dmc-detail via dynamically generated link (?id=...)
  window.location.hash = "#/marketplace";
  await wait(250);
  const dmcCard = [...doc.querySelectorAll("a")].find(a => /^#\/dmc-detail\?id=/.test(a.getAttribute("href") || ""));
  assert(!!dmcCard, "marketplace page generated a #/dmc-detail?id=... link");
  dmcCard.click();
  await wait(250);
  assert(doc.getElementById("app").innerHTML.length > 0, "navigated to dmc-detail via generated link");

  // login -> quick demo agent -> should land on onboarding?role=agent -> skip to agent-dashboard
  window.location.hash = "#/login";
  await wait(250);
  const quickDemoBtn = [...doc.querySelectorAll("button")].find(b => b.textContent.indexOf("Quick demo: Agency") > -1);
  assert(!!quickDemoBtn, "login page has Quick demo: Agency button");
  quickDemoBtn.click();
  await wait(700); // login's own setTimeout(450) before redirecting
  assert(window.location.hash.indexOf("onboarding") > -1, "quick demo agency login redirected to onboarding");
  assert(window.location.hash.indexOf("role=agent") > -1, "onboarding redirect preserved role=agent query");
  assert(doc.getElementById("app").innerHTML.indexOf("Welcome") > -1, "onboarding page rendered after login redirect");

  const skipLink = doc.getElementById("skipDashLink");
  assert(!!skipLink, "onboarding has a Skip to Dashboard link");
  assert(skipLink.getAttribute("href") === "#/agent-dashboard", "skip link correctly points at #/agent-dashboard for the agent role");
  skipLink.click();
  await wait(400);
  assert(doc.getElementById("board"), "landed on the agent dashboard (kanban board element present)");
  assert(typeof window.openLead === "function", "agent-dashboard's window.openLead is defined after navigating in");

  // Exercise a real dashboard feature post-merge: the lost/cancelled lifecycle
  // work from earlier this session should still function inside the merged file.
  window.openLead(1);
  let modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "agent-dashboard Mark as lost still present post-merge");

  // Now jump to the DMC portal and confirm its globals took over correctly
  window.location.hash = "#/dmc-portal";
  await wait(400);
  assert(typeof window.openMarkLost === "function", "dmc-portal's window.openMarkLost is defined after navigating in (overwrote agent-dashboard's own)");
  assert(doc.getElementById("board"), "dmc-portal board element present after navigating from agent-dashboard");

  // Static legal pages (no <script> at all) should mount without error
  window.location.hash = "#/terms";
  await wait(150);
  assert(doc.getElementById("app").innerHTML.indexOf("Terms") > -1, "terms (script-less) page mounts fine");

  console.log("\nALL MERGED-PROTOTYPE ROUTER TESTS PASSED");
  window.close();
}

main().catch(e => { console.error(e); process.exit(1); });
