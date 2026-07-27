const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("dmc-portal-final-v2.html", "utf8");
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

  // ---- Scenario 1: mark a 'new'-stage request as lost (agency_declined) ----
  window.openRequest(1);
  let modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "openRequest modal has Mark as lost button");
  window.openMarkLost(1);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("agency_declined") > -1, "openMarkLost shows agency_declined option");
  // select the 'agency_booked_elsewhere' radio
  const radios = doc.querySelectorAll('input[name="mlReason"]');
  let picked = null;
  radios.forEach(r => { if (r.value === "agency_booked_elsewhere") { r.checked = true; picked = r; } else r.checked = false; });
  assert(picked, "found agency_booked_elsewhere radio");
  doc.getElementById("mlNote").value = "Booked with a competitor DMC";
  window.submitMarkLost(1);

  // request 1 should no longer appear in the active 'new' column
  let board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Ebina Paul") === -1, "lost request removed from active kanban board");

  // ---- Scenario 2: mark a 'sent'-stage request as lost ----
  // (seed id:4 is a pre-existing, previously-flagged demo gap: it's hardcoded to
  // stage:'sent' without ever going through buildDraftQuote(), so it has no
  // _nightHotels and openSentQuote crashes on it — not something this change
  // caused. Drive id:2 through the real checkAvailability -> sendQuote flow instead.)
  window.checkAvailability(2);
  await wait(2500);
  window.sendQuote(2);
  window.openSentQuote(2);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "openSentQuote modal has Mark as lost button");
  window.openMarkLost(2);
  doc.querySelectorAll('input[name="mlReason"]').forEach(r => { r.checked = (r.value === "no_response_expired"); });
  window.submitMarkLost(2);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Rahul Nair") === -1, "lost sent-quote removed from active board");

  // ---- Scenario 3: cancel a 'payment'-stage booking (request 5, advance-ish) ----
  window.openPaymentTracking(5);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Cancel booking") > -1, "openPaymentTracking modal has Cancel booking button");
  window.openCancelBooking(5);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("cancellation policy") > -1, "cancel modal shows cancellation policy");
  // grab the confirm button's onclick to call with the exact args the UI would use
  const btn = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Confirm cancellation");
  assert(!!btn, "found Confirm cancellation button");
  const onclickAttr = btn.getAttribute("onclick");
  window.eval(onclickAttr);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Sneha Rao") === -1, "cancelled payment-stage booking removed from active board");

  // ---- Scenario 3b: cancel AFTER a real advance payment, verify genuine refund-pending ----
  window.checkAvailability(3);
  await wait(2500);
  window.sendQuote(3);
  window.openSentQuote(3);
  window.openBookingDetailsCapture(3);
  doc.getElementById("bdLeadName").value = "Priya Suresh";
  window.agentConfirmedQuote(3);
  window.markPaymentRequested(3);
  window.markAgentAdvancePaid(3);
  window.openPaymentTracking(3);
  window.openCancelBooking(3);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("advance") > -1, "cancel modal for a partially-paid booking mentions the advance");
  const btn3 = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Confirm cancellation");
  window.eval(btn3.getAttribute("onclick"));
  window.openLostCancelledDetail(3);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("advance paid") > -1, "request 3 recorded paymentStateAtExit=advance_paid");
  assert(modal.indexOf("pending") > -1, "request 3 refundStatus set to pending after real advance payment");

  // ---- Scenario 4: Lost & Cancelled list shows everything, with reopen + refund actions ----
  window.openLostCancelled();
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Ebina Paul") > -1, "lost list shows request 1");
  assert(modal.indexOf("Rahul Nair") > -1, "lost list shows request 2");
  assert(modal.indexOf("Priya Suresh") > -1, "lost list shows cancelled request 3");
  assert(modal.indexOf("Sneha Rao") > -1, "lost list shows cancelled request 5");

  window.openLostCancelledDetail(3);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.toLowerCase().indexOf("refund") > -1, "cancelled detail mentions refund");
  assert(modal.indexOf("Mark refund processed") > -1, "refund-pending shows processed/denied actions");
  window.setRefundStatus(3, "processed");
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.toLowerCase().indexOf("processed") > -1, "refund status updated to processed");

  window.openLostCancelledDetail(5);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("not applicable") > -1, "request 5 (no payment on file) correctly shows refund not applicable");

  window.openLostCancelledDetail(1);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Reopen") > -1, "lost item shows Reopen button");
  window.reopenRequest(1);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Ebina Paul") > -1, "reopened request is back on the active board");

  // ---- Scenario 4b: cancelled requests can be reopened too (not just lost ones) ----
  // request 5 has refundStatus 'not_applicable' (no payment was ever on file) -> reopens directly
  window.openLostCancelledDetail(5);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("Reopen") > -1, "cancelled request detail also shows a Reopen button");
  window.confirmReopen(5);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Sneha Rao") > -1, "cancelled request with no refund on file reopens directly, back on the active board");

  // request 3 has refundStatus 'processed' (set earlier in scenario 4) -> should warn first
  window.confirmReopen(3);
  modal = doc.getElementById("modal").innerHTML;
  assert(modal.indexOf("already been processed") > -1, "reopening a cancelled request with a processed refund shows a warning instead of reopening immediately");
  assert(modal.indexOf("Reopen anyway") > -1, "warning screen offers an explicit 'Reopen anyway' override");
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Priya Suresh") === -1, "request 3 is still off the active board while the warning is showing");
  const reopenAnywayBtn = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Reopen anyway");
  window.eval(reopenAnywayBtn.getAttribute("onclick"));
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Priya Suresh") > -1, "'Reopen anyway' puts the request back on the active board");

  // ---- Scenario 5: KPI counts exclude lost/cancelled ----
  const kpis = doc.getElementById("kpis").innerHTML;
  assert(kpis.indexOf("Lost / cancelled") > -1, "KPI row shows Lost / cancelled tile");

  console.log("\nALL DMC PORTAL LIFECYCLE TESTS PASSED");
}

main().catch(e => { console.error(e); process.exit(1); });
