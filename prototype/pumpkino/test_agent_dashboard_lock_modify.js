const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("pumpkino-Agent-dashboard-final-v2.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK: " + msg);
}

async function main() {
  await wait(300);
  const doc = window.document;

  // ---- Feature 1: locked itinerary once fully paid (id:8, Yatrasoul, seeded at 'done') ----
  window.openLeadDetail(8);
  let modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("locked") > -1, "openLeadDetail shows a locked label for a done-stage lead");
  assert(modal.indexOf("Save this itinerary to library") === -1, "done-stage lead detail hides 'save to library' action");

  window.viewItinerary(8);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Itinerary — locked") > -1 || modal.indexOf("Itinerary — locked") > -1, "viewItinerary shows the locked template for a done-stage lead");
  assert(modal.indexOf("Edit before sending") === -1, "locked itinerary view has no 'Edit before sending' button");
  assert(modal.indexOf("Edit inclusions") === -1, "locked itinerary view has no 'Edit inclusions...' button");
  assert(modal.indexOf("Send to Customer") === -1, "locked itinerary view has no 'Send to Customer' button");
  assert(modal.indexOf("Download voucher") > -1, "locked itinerary view still offers Download voucher");
  assert(modal.indexOf("Cancel booking") > -1, "locked itinerary view still offers Cancel booking as the way to change plans");

  // Sanity: a NOT-done lead should still get the normal editable template.
  // id:4 (Jameesh) is seeded at 'confirmed' with a _generatedPrice already set.
  window.viewItinerary(4);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Edit before sending") > -1, "a non-done lead still gets the normal editable itinerary template");

  // ---- Feature 2: "Modify by agent" option on customer change requests ----
  // id:3 (Vaishnavi Ghonge, seeded at 'sent' with a price) -> open the customer
  // link preview -> request changes -> should now offer a manual-edit path,
  // not just the AI rework.
  window.openCustomerView(3);
  window.showChangeForm(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Send to AI agent to rework") > -1, "change-request screen still offers the AI rework option");
  assert(modal.indexOf("Modify myself") > -1, "change-request screen now also offers a manual agent-edit option");

  doc.getElementById("changeNote").value = "Swap Day 2 for a houseboat stay";
  window.reviseItineraryManually(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Edit itinerary") > -1, "Modify myself opens the real itinerary editor, not a simulated AI step");
  assert(modal.indexOf("Day 1") > -1, "itinerary editor shows editable day fields");

  const notifModal = (function(){ window.openNotifications(); return doc.getElementById("modalContent").innerHTML; })();
  assert(notifModal.indexOf("Vaishnavi Ghonge requested changes") > -1, "manual revision still logs a change-request notification");

  console.log("\nALL LOCK + MODIFY-BY-AGENT TESTS PASSED");
}

main().catch(e => { console.error(e); process.exit(1); });
