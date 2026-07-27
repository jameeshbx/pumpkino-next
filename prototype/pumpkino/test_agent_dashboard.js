const fs = require("fs");
const { JSDOM } = require("jsdom");

const html = fs.readFileSync("pumpkino-Agent-dashboard-final-v2.html", "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;

// jsdom doesn't implement window.open — stub it so the new outbound
// Email/WhatsApp/PDF actions (which call window.open(...).document.write(...))
// don't crash the test.
const openedUrls = [];
window.open = function(url) {
  openedUrls.push(url || "");
  return { document: { write: function () {}, close: function () {} }, print: function () {}, focus: function () {} };
};

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function assert(cond, msg) {
  if (!cond) throw new Error("FAIL: " + msg);
  console.log("OK: " + msg);
}

async function main() {
  await wait(300);
  const doc = window.document;

  // ---- Scenario 1: mark a fresh 'new' lead (id:1, Nandu) as lost — silent expiry ----
  window.openLead(1);
  let modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "openLead (new stage) modal has Mark as lost button");
  window.openMarkLost(1);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("no_response_expired") > -1, "openMarkLost shows no_response_expired option");
  doc.querySelectorAll('input[name="mlReason"]').forEach(r => { r.checked = (r.value === "no_response_expired"); });
  window.submitMarkLost(1);
  let board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Nandu") === -1, "lost 'new' lead removed from active kanban board");

  // ---- Scenario 2: drive a lead through the real AI-generation -> send -> customer view flow, then lose it ----
  window.openLead(2);
  window.runAgent(2);
  await wait(3300); // 4 AI steps @650ms + 400ms buffer, matches runAgent's own timing
  // cover-image prompt should now be showing; skip it
  window.applyCoverImage(2, true);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Send to Customer") > -1, "itinerary generated and ready to send");
  window.shareToCustomer(2);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Priya Mathan") > -1, "lead now sitting in 'sent' column");
  window.openCustomerView(2);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "openCustomerView (sent stage) modal has Mark as lost button");
  window.openMarkLost(2);
  doc.querySelectorAll('input[name="mlReason"]').forEach(r => { r.checked = (r.value === "rejected_quote"); });
  window.submitMarkLost(2);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Priya Mathan") === -1, "lost 'sent' lead removed from active kanban board");

  // ---- Scenario 3: drive lead id:3 (Vaishnavi Ghonge, seeded at 'sent') all the way
  // through confirm -> DMC quote -> markup -> invoice -> payment -> partial payment,
  // then cancel it, and verify a REAL advance_paid / refund-pending outcome ----
  window.openCustomerView(3);
  window.confirmItinerary(3); // stage -> confirmed, auto-opens openPushDMC(3)
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Request a quote from DMCs") > -1, "confirming itinerary auto-opens the DMC quote-request screen");
  assert(modal.indexOf(">Email<") > -1 && modal.indexOf("WhatsApp") > -1 && modal.indexOf("Download PDF") > -1, "quote-request screen has Email/WhatsApp/Download PDF outbound actions");
  assert(modal.indexOf("Mark as lost") > -1, "quote-request screen also has Mark as lost");
  // exercise the three outbound actions (no DMC checkbox picked -> falls back to full network)
  window.shareQuoteEmailToDmc(3);
  window.shareQuoteWhatsAppToDmc(3);
  window.downloadQuoteRequestPdf(3);
  assert(openedUrls.some(u => u.indexOf("mailto:") === 0), "Email action opened a mailto: link");
  assert(openedUrls.some(u => u.indexOf("https://wa.me/") === 0), "WhatsApp action opened a wa.me link");
  assert(openedUrls.filter(u => u === "").length >= 1, "Download PDF action opened a blank print window");

  // Requesting a quote no longer pretends a DMC replies instantly — it just
  // logs the request and puts the lead in an "awaiting" state.
  window.runDmcRequest(3); // no checkbox picked -> defaults to first DMC
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Awaiting response") > -1, "DMC quotes inbox shows the request as awaiting, not already quoted");
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Awaiting quotes") > -1, "confirmed-stage card shows an 'Awaiting quotes' tag while the DMC hasn't replied yet");
  window.openConfirmedStageClick(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("DMC quotes") > -1, "clicking the card again (still awaiting) goes to the quotes inbox, not back to the DMC picker");
  doc.getElementById("dmcQuoteInput0").value = "48000";
  window.logDmcQuote(3, 0); // agent manually logs what the DMC actually quoted
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("₹48,000") > -1, "logged quote amount shows up in the inbox");
  assert(modal.indexOf("Select this DMC") > -1, "a logged quote can now be selected");
  window.selectWinningDmc(3, 0); // stage -> dmc, opens openUpdateItineraryAfterDmc
  window.openMarkup(3); // "Skip — no changes needed"
  window.applyMarkup(3); // uses rule-suggested type/value already in the form
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Price preview") > -1, "markup calculated");
  window.proceedToCustomerPriceConfirm(3); // stage -> markup, opens openShareFinalPrice
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Mark as lost") > -1, "Share final price screen has Mark as lost (rejected_after_pricing case)");
  window.customerConfirmsFinalPrice(3); // generates invoice, opens openConfirmDmcBlock
  window.submitDmcBlock(3); // opens openInventoryBlockStatus
  window.openSendPayment(3);
  window.sendPaymentLink(3); // stage -> payment
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Vaishnavi Ghonge") > -1, "lead now sitting in 'payment' column");
  window.openMarkPaid(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Cancel booking") > -1, "Payment tracking modal has Cancel booking button");
  window.markAdvancePaid(3); // customerPayments status -> 'partial'
  window.openMarkPaid(3);
  window.openCancelBooking(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("advance") > -1, "cancel modal for a partially-paid booking mentions the advance");
  const btn3 = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Confirm cancellation");
  assert(!!btn3, "found Confirm cancellation button");
  window.eval(btn3.getAttribute("onclick"));
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Vaishnavi Ghonge") === -1, "cancelled booking removed from active board");
  window.openLostCancelledDetail(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("advance paid") > -1, "lead 3 recorded paymentStateAtExit=advance_paid");
  assert(modal.toLowerCase().indexOf("pending") > -1, "lead 3 refundStatus set to pending after a real advance payment");

  // ---- Scenario 4: cancel an already-'done', fully-paid booking (id:8, Yatrasoul) ----
  window.openBookingSummary(8);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Cancel booking") > -1, "Booking summary (done stage) modal has Cancel booking button");
  window.openCancelBooking(8);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("full amount") > -1 || modal.toLowerCase().indexOf("full amount has been collected") > -1, "cancel modal for a fully-paid booking mentions the full amount collected");
  const btn8 = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Confirm cancellation");
  window.eval(btn8.getAttribute("onclick"));
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Yatrasoul") === -1, "fully-paid cancelled booking removed from active board");
  window.openLostCancelledDetail(8);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("fully paid") > -1, "lead 8 recorded paymentStateAtExit=fully_paid");

  // ---- Scenario 5: Lost & cancelled list shows everything, with reopen ----
  window.openLostCancelled();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Nandu") > -1, "lost list shows lead 1 (Nandu)");
  assert(modal.indexOf("Priya Mathan") > -1, "lost list shows lead 2 (Priya Mathan)");
  assert(modal.indexOf("Vaishnavi Ghonge") > -1, "lost list shows cancelled lead 3");
  assert(modal.indexOf("Yatrasoul") > -1, "lost list shows cancelled lead 8");

  window.openLostCancelledDetail(1);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Reopen") > -1, "lost lead detail shows Reopen button");
  window.reopenRequest(1);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Nandu") > -1, "reopened lead is back on the active board");

  // ---- Scenario 5b: cancelled leads can be reopened too (not just lost ones) ----
  window.openLostCancelledDetail(3);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Reopen") > -1, "cancelled lead detail also shows a Reopen button");
  // lead 3's refund is 'pending' (not yet processed) -> reopening should go straight through, no warning
  window.confirmReopen(3);
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Vaishnavi Ghonge") > -1, "cancelled lead with a pending refund reopens directly, back on the active board");

  // lead 8: mark its refund as processed, then confirm the warning gate kicks in
  window.setRefundStatus(8, "processed");
  window.confirmReopen(8);
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("already been processed") > -1, "reopening a cancelled lead with a processed refund shows a warning instead of reopening immediately");
  assert(modal.indexOf("Reopen anyway") > -1, "warning screen offers an explicit 'Reopen anyway' override");
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Yatrasoul") === -1, "lead 8 is still off the active board while the warning is showing");
  const reopenAnywayBtn = [...doc.querySelectorAll("button")].find(b => b.textContent.trim() === "Reopen anyway");
  window.eval(reopenAnywayBtn.getAttribute("onclick"));
  board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Yatrasoul") > -1, "'Reopen anyway' puts the lead back on the active board");

  // ---- Scenario 6: excluded from Leads and pipeline + Upcoming trips + CRM lists ----
  // (leads 3 and 8 were reopened in scenario 5b above, so only the still-lost
  // lead 2 should be excluded from the active list at this point)
  window.openLeadsList();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Priya Mathan") === -1, "Leads and pipeline list excludes the still-lost lead");
  assert(modal.indexOf("Vaishnavi Ghonge") > -1, "Leads and pipeline list includes the reopened (formerly cancelled) lead");

  console.log("\nALL AGENCY DASHBOARD LIFECYCLE TESTS PASSED");
}

main().catch(e => { console.error(e); process.exit(1); });
