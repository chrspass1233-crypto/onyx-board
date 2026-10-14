// After-call report form (Chris 2026-10-12), SHARED by pages/index.html (each rep's board) and pages/calls.html (the
// one-link page for the team Discord, 2026-10-14). The page that loads this file provides:
//   LAST          the board answer it last rendered ({calls, calls_meta, ...})
//   esc(s)        HTML escaping
//   acPost(body)  sends {action:"post_call", ...} its own way (board token or signed-in session), resolves to the JSON
//   load(after)   reloads the calls; after = true queues a reload behind one in flight
// and calls acSection() inside its render, then wireAC() (or keeps the open form across a refresh, as index.html does).
var AC = { open: null, d: {}, flash: null };   // open form, drafts per call, last saved
// ---- After-call reports (Chris 2026-10-12). One short report per GHL booked call: outcome, objection when it matters,
// follow-up date, what was pitched, lead quality, notes. Answers the system filled in from GHL agreements and payments
// are marked AUTO until the rep changes them. While a form is open the minute refresh keeps it exactly as it is.
function acLists() { var M = (LAST && LAST.calls_meta) || {}; return { M: M, out: M.outcomes || [], obj: M.objections || [], need: M.needs_objection || [], ns: M.not_showed || ['no_show', 'rescheduled'] }; }
function niceDay(ymd) { return /^\d{4}-\d{2}-\d{2}$/.test(ymd || '') ? new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : ''; }
function acLabel(k) { var o = acLists().out.filter(function (x) { return x[0] === k; })[0]; return o ? o[1] : k; }
function acCall(id) { return ((LAST && LAST.calls) || []).filter(function (c) { return c.id === id; })[0] || null; }
function addDaysYmd(ymd, n) { var p = String(ymd).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n)).toISOString().slice(0, 10); }
function draftFor(c) {
  if (AC.d[c.id]) return AC.d[c.id];
  var r = c.report, v = (c.prefill && c.prefill.values) || {}, s = function (x) { return x == null ? '' : String(Number(x)); };
  AC.d[c.id] = r ? { outcome: r.outcome, outcome_other: r.outcome_other || '', objection: r.objection || '', objection_other: r.objection_other || '', follow_up_on: r.follow_up_on || '', reviews_pitched: s(r.reviews_pitched), price_quoted: s(r.price_quoted), agreement_sent: r.agreement_sent == null ? null : r.agreement_sent, lead_quality: r.lead_quality || 0, notes: r.notes || '' }
    : { outcome: v.outcome || '', outcome_other: '', objection: '', objection_other: '', follow_up_on: '', reviews_pitched: s(v.reviews_pitched), price_quoted: s(v.price_quoted), agreement_sent: v.agreement_sent === true ? true : null, lead_quality: 0, notes: '' };
  return AC.d[c.id];
}
function autoTag(c, f) { var v = (c.prefill && c.prefill.values) || {}, d = AC.d[c.id] || {}; return (f in v) && String(d[f]) === String(v[f]) ? '<span class="auto">AUTO</span>' : ''; }
function acDone(r) {   // a custom outcome shows the rep's own words (clipped)
  var t = r.outcome === 'custom' && r.outcome_other ? (r.outcome_other.length > 24 ? r.outcome_other.slice(0, 23).replace(/\s+$/, '') + '...' : r.outcome_other) : acLabel(r.outcome);
  return 'DONE: ' + t.toUpperCase();
}
function acRow(c) {
  var st = c.report ? '<span class="pill done">' + esc(acDone(c.report)) + '</span>' : c.missing ? '<span class="pill todo">NEEDS REPORT</span>' : '<span class="pill later">LATER TODAY</span>';
  return '<div class="cl' + (AC.open === c.id ? ' open' : '') + '" data-ac="' + esc(c.id) + '"><div class="top"><div><div class="biz">' + esc(c.lead) + '</div><div class="sub">' + esc((c.business ? c.business + ' - ' : '') + c.when) + '</div>'
    + (AC.flash === c.id ? '<div class="saved">Saved. Tap to change it (open for ' + (acLists().M.edit_days || 7) + ' days).</div>' : '') + '</div>' + st + '</div></div>';
}
function acForm(c) {
  var L = acLists(), d = draftFor(c), today = L.M.today;
  var taps = function (cls, f, opts) { return '<div class="taps ' + cls + '">' + opts.map(function (o) { return '<button type="button" class="tap' + (String(d[f]) === String(o[0]) ? ' on' : '') + '" data-f="' + f + '" data-v="' + esc(o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div>'; };
  var h = c.prefill && c.prefill.note ? '<div class="note">' + esc(c.prefill.note) + '</div>' : '';
  h += '<div class="q">What happened?' + autoTag(c, 'outcome') + '</div>' + taps('', 'outcome', L.out);
  if (d.outcome === 'custom') h += '<input id="ac-outcome_other" data-t="outcome_other" maxlength="200" placeholder="Say what happened on the call" value="' + esc(d.outcome_other) + '" style="margin-top:8px">';
  // no show / rescheduled: the call did not happen, nothing else to fill in, one tap saves it
  if (L.ns.indexOf(d.outcome) >= 0) return h + '<button type="button" class="btn" id="ac-save">Save as ' + esc(acLabel(d.outcome).toLowerCase()) + '</button><button type="button" class="btn ghost" id="ac-close">Close</button><div class="out" id="ac-out"></div>';
  if (L.need.indexOf(d.outcome) >= 0) {
    h += '<div class="q">Main objection</div>' + taps('one', 'objection', L.obj);
    if (d.objection === 'other') h += '<input id="ac-objection_other" data-t="objection_other" maxlength="200" placeholder="What did they say?" value="' + esc(d.objection_other) + '" style="margin-top:8px">';
  }
  if (d.outcome === 'follow_up') h += '<div class="q">Follow up on</div><input id="ac-follow_up_on" data-t="follow_up_on" type="date" min="' + esc(today) + '" max="' + esc(addDaysYmd(today, L.M.follow_up_max_days || 60)) + '" value="' + esc(d.follow_up_on) + '">';
  h += '<div class="g2"><div><div class="q">Reviews pitched<span data-auto="reviews_pitched">' + autoTag(c, 'reviews_pitched') + '</span></div><input id="ac-reviews_pitched" data-t="reviews_pitched" inputmode="numeric" placeholder="10" value="' + esc(d.reviews_pitched) + '"></div>'
    + '<div><div class="q">Price per review<span data-auto="price_quoted">' + autoTag(c, 'price_quoted') + '</span></div><input id="ac-price_quoted" data-t="price_quoted" inputmode="decimal" placeholder="650" value="' + esc(d.price_quoted) + '"></div></div>';
  h += '<div class="q">Agreement sent?' + autoTag(c, 'agreement_sent') + '</div>' + taps('', 'agreement_sent', [[true, 'Yes'], [false, 'No']]);
  h += '<div class="q">Lead quality (1 = bad, 5 = great)</div>' + taps('five', 'lead_quality', [[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]);
  h += '<div class="q">Notes (optional)</div><textarea id="ac-notes" data-t="notes" maxlength="1000" placeholder="What should the next call know?">' + esc(d.notes) + '</textarea>';
  return h + '<button type="button" class="btn" id="ac-save">' + (c.report ? 'Save changes' : 'Save report') + '</button><button type="button" class="btn ghost" id="ac-close">Close</button><div class="out" id="ac-out"></div>';
}
function acSection() {
  var m = LAST, C = m.calls || [], M = m.calls_meta || {};
  var head = '<h2>After-call reports' + (M.missing ? '<span class="badge">' + M.missing + ' to do</span>' : '') + '</h2>';
  if (!m.calls_meta) return '';
  if (M.error) return '<section id="ac">' + head + '<div class="empty">' + esc(M.error) + '</div></section>';
  if (!C.length) return '<section id="ac">' + head + '<div class="empty">' + (M.reports_start && M.today < M.reports_start ? 'After-call reports start ' + niceDay(M.reports_start) + '. Your booked calls show here from that day.' : 'No calls booked with you in GHL in the last ' + (M.edit_days || 7) + ' days.') + '</div></section>';
  if (AC.open && !acCall(AC.open)) AC.open = null;
  return '<section id="ac">' + head + C.map(function (c) { return acRow(c) + (AC.open === c.id ? '<div class="acf" id="acf">' + acForm(c) + '</div>' : ''); }).join('')
    + '<div class="empty">Tap a call and log what happened right after it ends. No show and Rescheduled save in one tap. AUTO answers came from GHL agreements and payments: check them. You can change a report for ' + (M.edit_days || 7) + ' days.</div></section>';
}
function refreshAC() {
  var sec = document.getElementById('ac'); if (!sec || !LAST) return;
  var tmp = document.createElement('div'); tmp.innerHTML = acSection(); if (!tmp.firstChild) return;
  sec.parentNode.replaceChild(tmp.firstChild, sec); wireAC();
}
function wireAC() {
  var sec = document.getElementById('ac'); if (!sec) return;
  sec.onclick = function (e) {
    var t = e.target.closest ? e.target.closest('[data-f],[data-ac],#ac-save,#ac-close') : null; if (!t) return;
    if (t.id === 'ac-close') { AC.open = null; refreshAC(); return; }
    var c = acCall(AC.open);
    if (t.id === 'ac-save') { if (c) saveAC(c, t); return; }
    if (t.hasAttribute('data-ac')) { var id = t.getAttribute('data-ac'); AC.open = AC.open === id ? null : id; AC.flash = null; refreshAC(); return; }
    if (!c) return;
    var f = t.getAttribute('data-f'), v = t.getAttribute('data-v'), d = draftFor(c);
    if (f === 'agreement_sent') { var b = v === 'true'; d[f] = d[f] === b ? null : b; }
    else if (f === 'lead_quality') d[f] = Number(v);
    else d[f] = v;
    var y = window.scrollY; document.getElementById('acf').innerHTML = acForm(c); window.scrollTo(0, y);
  };
  sec.oninput = function (e) {
    var f = e.target.getAttribute && e.target.getAttribute('data-t'), c = acCall(AC.open); if (!f || !c) return;
    draftFor(c)[f] = e.target.value;
    var tag = sec.querySelector('[data-auto="' + f + '"]'); if (tag) tag.innerHTML = autoTag(c, f);
  };
  sec.onchange = sec.oninput;   // date pickers on some phones only fire change
}
function saveAC(c, btn) {
  var d = draftFor(c), out = document.getElementById('ac-out'), skip = acLists().ns.indexOf(d.outcome) >= 0;
  if (!d.outcome) { out.textContent = 'Pick what happened on the call.'; return; }
  if (d.outcome === 'custom' && Array.from(String(d.outcome_other || '').trim()).length < 2) { out.textContent = 'Say what happened on the call.'; return; }
  if (!skip && !d.lead_quality) { out.textContent = 'Rate the lead from 1 to 5.'; return; }
  var body = skip ? { action: 'post_call', appointment_id: c.id, call_at: c.call_at, outcome: d.outcome, prefilled: c.prefill || null }
    : { action: 'post_call', appointment_id: c.id, call_at: c.call_at, outcome: d.outcome, outcome_other: d.outcome === 'custom' ? d.outcome_other : '', objection: d.objection, objection_other: d.objection_other, follow_up_on: d.follow_up_on, reviews_pitched: d.reviews_pitched, price_quoted: d.price_quoted, agreement_sent: d.agreement_sent, lead_quality: d.lead_quality, notes: d.notes, prefilled: c.prefill || null };
  btn.disabled = true; out.textContent = 'Saving...';
  acPost(body)
    .then(function (j) { btn.disabled = false; if (!j.ok) { out.textContent = j.error || 'Could not save it.'; return; } delete AC.d[c.id]; AC.open = null; AC.flash = c.id; load(true); })
    .catch(function (e) { btn.disabled = false; out.textContent = 'Could not save it: ' + e + '. Screenshot this and send it to Chris.'; console.error(e); });
}
