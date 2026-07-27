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

const CSV = [
  "Name,Mobile,Email,Destination,Status,Lead Source",
  "Anu Menon,9876543210,anu@email.com,Goa,Hot Lead,Facebook Ad",
  "Ravi Kumar,+91 98450 11223,ravi.dup@email.com,Munnar,Contacted,Instagram",   // duplicate mobile of seed lead id:1
  ",9998887776,,Ooty,Booked,Referral",                                          // missing name -> skipped
  "Deepa Iyer,9123456780,deepa@email.com,Kashmir,Booked,Website"
].join("\n");

async function main() {
  await wait(300);
  const doc = window.document;

  // Default demo user is 'Travel Agent Admin', which canAddLeadUI() excludes (admins don't
  // add leads directly) -- switch to an Executive so '+ Add lead' / 'Import leads' are visible.
  window.switchUser(7);

  // ---- Open the import wizard from Leads and pipeline ----
  window.openLeadsList();
  let modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Import leads from CSV") > -1, "Leads and pipeline shows an Import leads button next to + Add lead");

  window.openImportLeads();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Upload CSV file") > -1, "import wizard shows file upload option");
  assert(modal.indexOf("Paste CSV text") > -1, "import wizard shows paste option");

  // ---- Paste CSV and parse ----
  doc.getElementById("importPaste").value = CSV;
  window.parseImportFile();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Map your columns") > -1, "moves to column mapping step");
  assert(modal.indexOf("4 rows found") > -1, "reports correct row count (4)");

  // check auto-guessed mapping: Name->0, Mobile->1, Email->2, Destination->3, Status->4
  const nameSel = doc.getElementById("impMap_name");
  const mobileSel = doc.getElementById("impMap_mobile");
  const emailSel = doc.getElementById("impMap_email");
  const destSel = doc.getElementById("impMap_dest");
  const stageSel = doc.getElementById("impMap_stage");
  assert(nameSel.value === "0", "auto-guessed Name column");
  assert(mobileSel.value === "1", "auto-guessed Mobile column");
  assert(emailSel.value === "2", "auto-guessed Email column");
  assert(destSel.value === "3", "auto-guessed Destination column");
  assert(stageSel.value === "4", "auto-guessed Status->stage column");

  // ---- Continue to stage mapping (since a stage column was mapped) ----
  window.saveImportColumnMap();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Map lead statuses") > -1, "moves to stage-mapping step since Status column was mapped");
  assert(modal.indexOf("Hot Lead") > -1, "shows distinct source status value Hot Lead");
  assert(modal.indexOf("Booked") > -1, "shows distinct source status value Booked");
  assert(modal.indexOf("Contacted") > -1, "shows distinct source status value Contacted");

  window.saveImportStageMap();
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Preview before importing") > -1, "moves to preview step");
  assert(modal.indexOf("Rows found</span><span>4") > -1, "preview shows 4 rows found");
  assert(modal.indexOf("Ready to import</span><span>2") > -1, "preview shows 2 ready to import (1 dup skipped, 1 missing name skipped)");
  assert(modal.indexOf("duplicates") > -1 || modal.indexOf("uplicate") > -1, "preview mentions duplicate detection");
  assert(modal.indexOf("Missing a name (skipped)</span><span>1") > -1, "preview correctly skips the no-name row");
  assert(modal.indexOf("Anu Menon") > -1, "sample preview table shows Anu Menon");
  assert(modal.indexOf("Deepa Iyer") > -1, "sample preview table shows Deepa Iyer");
  assert(modal.indexOf("Ravi Kumar") === -1, "duplicate Ravi Kumar (matches seed lead mobile) excluded from the import sample by default");

  // ---- Commit the import ----
  // Note: leads/nextId live inside the page's IIFE closure and aren't reachable via
  // window.eval (indirect eval runs in true global scope) -- seed leads are ids 1-8 with
  // nextId starting at 9, so the two new leads (Ravi/no-name rows are excluded) land at
  // predictable ids: Anu Menon -> 9, Deepa Iyer -> 10.
  const cardsBefore = doc.querySelectorAll("#board .card").length;
  window.confirmImportLeads();
  const cardsAfter = doc.querySelectorAll("#board .card").length;
  assert(cardsAfter === cardsBefore + 2, "exactly 2 new leads added to the active board (Anu Menon, Deepa Iyer)");
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Import complete") > -1, "shows import-complete confirmation");
  assert(modal.indexOf("Undo this import") > -1, "offers an undo option");

  const board = doc.getElementById("board").innerHTML;
  assert(board.indexOf("Anu Menon") > -1, "newly imported lead Anu Menon appears on the live board");
  assert(board.indexOf("Deepa Iyer") > -1, "newly imported lead Deepa Iyer appears on the live board");

  // check importedNotes surfaced in lead detail, and stage auto-guessing worked
  window.openLeadDetail(9); // Anu Menon
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("New lead") > -1, '"Hot Lead" with no keyword match defaults to stage new');
  assert(modal.indexOf("From imported CRM data") > -1, "openLeadDetail surfaces the imported notes banner");
  assert(modal.indexOf("Lead Source: Facebook Ad") > -1, "unmapped Lead Source column captured into importedNotes and shown");

  window.openLeadDetail(10); // Deepa Iyer
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Completed") > -1, '"Booked" auto-guesses to stage done');

  // ---- Undo the import ----
  window.openLeadsList();
  window.openImportLeads();
  doc.getElementById("importPaste").value = "Name,Mobile\nUndo Test Person,9111122223";
  window.parseImportFile();
  window.saveImportColumnMap(); // no stage column mapped this time -> straight to preview
  modal = doc.getElementById("modalContent").innerHTML;
  assert(modal.indexOf("Preview before importing") > -1, "no stage column mapped skips straight to preview");
  const cardsBefore2 = doc.querySelectorAll("#board .card").length;
  window.confirmImportLeads();
  const cardsAfter2 = doc.querySelectorAll("#board .card").length;
  assert(cardsAfter2 === cardsBefore2 + 1, "second import added 1 lead to the board");
  const boardWithUndoLead = doc.getElementById("board").innerHTML;
  assert(boardWithUndoLead.indexOf("Undo Test Person") > -1, "Undo Test Person is on the board before undo");

  window.undoLastImport();
  const cardsAfterUndo = doc.querySelectorAll("#board .card").length;
  assert(cardsAfterUndo === cardsBefore2, "undo removes exactly the lead(s) from the last import");
  const boardAfterUndo = doc.getElementById("board").innerHTML;
  assert(boardAfterUndo.indexOf("Undo Test Person") === -1, "undone lead no longer appears on the board");
  // earlier import (Anu Menon, Deepa Iyer) should be untouched by this second undo
  assert(boardAfterUndo.indexOf("Anu Menon") > -1, "earlier import is unaffected by a later undo");

  console.log("\nALL CSV IMPORT TESTS PASSED");
}

main().catch(e => { console.error(e); process.exit(1); });
