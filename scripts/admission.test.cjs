const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function loadAdmission() {
  const source = fs.readFileSync(path.join(__dirname, "..", "utils", "admission.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const module = { exports: {} };
  new Function("module", "exports", "require", outputText)(module, module.exports, require);
  return module.exports;
}

test("admission labels free entry, priced tickets and paid entry without a price", () => {
  const { admissionLabel, hasTicketPrice } = loadAdmission();
  assert.equal(admissionLabel({ isPaid: false, price: 0, currency: "RWF" }), "Free entry");
  assert.equal(admissionLabel({ isPaid: false, price: 9000, currency: "RWF" }), "Free entry");
  assert.match(admissionLabel({ isPaid: true, price: 5000, currency: "RWF" }), /^RWF 5.?000$/);
  assert.equal(admissionLabel({ isPaid: true, price: 0, currency: "RWF" }), "Paid entry");
  assert.equal(hasTicketPrice({ isPaid: true, price: 0, currency: "RWF" }), false);
});

test("Get Tickets only opens web links on paid events", () => {
  const { ticketLink } = loadAdmission();
  assert.equal(ticketLink({ isPaid: true, organizerWebsite: " https://tix.rw/jazz " }), "https://tix.rw/jazz");
  assert.equal(ticketLink({ isPaid: false, organizerWebsite: "https://tix.rw/jazz" }), undefined);
  assert.equal(ticketLink({ isPaid: true, organizerWebsite: "javascript:alert(1)" }), undefined);
  assert.equal(ticketLink({ isPaid: true }), undefined);
});
