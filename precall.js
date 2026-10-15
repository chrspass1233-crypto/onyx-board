// Pre-call prospect research on calls.html (Chris approved 2026-10-15). Loaded AFTER postcall.js. Uses from the page:
//   LAST (the last calls answer: today + research), esc(s).
// Adds: todaySection() ("Today's calls", first on the page, anchor #today), a Research button under every call (today's
// list and the after-call list, by wrapping postcall.js acRow), and rsAfterRender() (jumps to #today once).
// A card is drawn only when its button is opened; which ones are open survives the minute refresh. Nothing is sent.
var RS = { open: {}, jumped: false };
function rsCard(id) { return (LAST && LAST.research && LAST.research[id]) || null; }
function rsF1(x) { return (Math.round(x * 10 + 1e-9) / 10).toFixed(1); }
function rsDay(iso, yr) { var t = Date.parse(iso || ''); if (!isFinite(t)) return ''; var o = { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' }; if (yr && new Date(t).getFullYear() !== new Date().getFullYear()) o.year = 'numeric'; return new Date(t).toLocaleDateString('en-US', o); }
function rsN(n, one) { return n + ' ' + one + (n === 1 ? '' : 's'); }
function rsUrl(u) { return /^https?:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? String(u) : ''; }
function rsToggle(key, id) {
  var c = rsCard(id), open = !!RS.open[key];
  return '<div class="rs"><button type="button" class="rs-t' + (open ? ' on' : '') + '" data-rs="' + esc(key) + '" data-id="' + esc(id) + '" aria-expanded="' + open + '">'
    + '<span class="rs-l">Research</span><span class="rs-s">' + esc(c ? c.summary : 'not ready yet') + '</span><span class="rs-a">' + (open ? 'Hide' : 'Show') + '</span></button>'
    + (open ? '<div class="rs-card">' + rsBody(c) + '</div>' : '') + '</div>';
}
function rsBody(c) {
  if (!c) return '<div class="rs-dim">No research for this call yet. It runs at 7:30 AM and every hour from 9:30 AM to 6:30 PM for today\'s and tomorrow\'s calls.</div>';
  var b = c.biz || {}, g = c.google || {}, m = c.math || {}, rv = c.rivals || {}, h = '';
  h += '<div class="rs-h">' + esc(b.name) + '</div>';
  var sub = [b.category, b.city].filter(Boolean).join(' in ');
  if (sub || (b.lead && b.lead !== b.name)) h += '<div class="rs-dim">' + esc([sub, b.lead && b.lead !== b.name ? 'Lead: ' + b.lead : ''].filter(Boolean).join('. ')) + '</div>';
  var links = [];
  if (rsUrl(b.website)) links.push('<a href="' + esc(rsUrl(b.website)) + '" target="_blank" rel="noopener noreferrer">Website</a>');
  if (b.phone) links.push('<a href="tel:' + esc(String(b.phone).replace(/[^\d+]/g, '')) + '">' + esc(b.phone) + '</a>');
  if (rsUrl(b.maps_url)) links.push('<a href="' + esc(rsUrl(b.maps_url)) + '" target="_blank" rel="noopener noreferrer">Google listing</a>');
  if (links.length) h += '<div class="rs-links">' + links.join('') + '</div>';
  var s = c.source || {};
  h += '<div class="rs-p"><span class="rs-k">Found us:</span> ' + esc(s.label || 'Not known') + (s.ad ? ' <span class="rs-dim">(' + esc(s.ad) + ')</span>' : '') + (s.creator ? '. Creator: ' + esc(s.creator) : '') + '</div>';
  (c.notes || []).forEach(function (n) { h += '<div class="rs-note">' + esc(n) + '</div>'; });
  var useNow = g.basis === 'now', r = useNow ? g.rating : g.then_rating, n = useNow ? g.count : g.then_count;
  h += '<div class="rs-q">Google ' + (useNow ? 'now' + (c.google_at ? ' (' + esc(rsDay(c.google_at)) + ')' : '') : g.basis === 'signup' ? 'when they signed up' : '') + '</div>';
  h += r != null ? '<div><span class="rs-big">' + rsF1(r) + '</span> stars, ' + esc(rsN(n || 0, 'review')) + '</div>' : '<div class="rs-dim">No Google rating on file.</div>';
  if (g.since) h += '<div class="rs-p">' + esc(g.since) + '</div>';
  if (c.asked_remove != null) h += '<div class="rs-p">They asked to remove ' + esc(rsN(c.asked_remove, 'review')) + ' on the form.</div>';
  var f = c.bad || [], found = c.bad_found;
  h += '<div class="rs-q">Newest bad reviews' + (f.length ? ' (' + f.length + (found != null && found >= f.length ? ' of ' + found : '') + ' found at sign-up)' : '') + '</div>';
  h += f.length ? f.map(function (x) { return '<div class="rs-rev"><b>' + esc(x.who) + '</b>' + (x.stars ? ' <span class="rs-st">' + x.stars + ' star' + (x.stars === 1 ? '' : 's') + '</span>' : '') + (x.date ? ' <span class="rs-dim">' + esc(rsDay(x.date, true)) + '</span>' : '') + (x.text ? '<div>' + esc(x.text) + '</div>' : '') + '</div>'; }).join('')
    : '<div class="rs-dim">' + (found === 0 ? 'None found at sign-up.' : 'None on file.') + '</div>';
  h += '<div class="rs-q">After removal (estimate)</div>';
  if (m.asked_line) h += '<div class="rs-p">' + esc(m.asked_line) + '</div>';
  h += '<div class="rs-p">' + esc(m.after_line || '') + '</div>';
  if (m.need_line) h += '<div class="rs-p">' + esc(m.need_line) + '</div>';
  if (m.assumption) h += '<div class="rs-dim">' + esc(m.assumption) + '</div>';
  var L = rv.list || [];
  h += '<div class="rs-q">Closest competitors' + (rv.radius_km ? ' (same category, within ' + rv.radius_km + ' km / ' + Math.round(rv.radius_km * 0.621371) + ' mi)' : '') + '</div>';
  h += L.map(function (x) { return '<div class="rs-row"><span>' + esc(x.name) + '</span><span class="rs-nw">' + rsF1(x.rating) + ' (' + (x.count == null ? '?' : x.count) + ') - ' + x.miles.toFixed(1) + ' mi</span></div>'; }).join('');
  if (rv.rank && rv.rank.line) h += '<div class="rs-p">' + esc(rv.rank.line) + '</div>';
  if (rv.note) h += '<div class="rs-dim">' + esc(rv.note) + '</div>';
  if (!L.length && !rv.note) h += '<div class="rs-dim">No competitor search for this lead.</div>';
  return h + '<div class="rs-dim rs-foot">Research from ' + esc(rsDay(c.built_at)) + '. Numbers in brackets are review counts.</div>';
}
function todaySection() {
  var T = LAST && LAST.today; if (!T) return '';
  var items = T.items || [], head = '<h2>Today\'s calls' + (items.length ? '<span class="rs-cnt">' + items.length + '</span>' : '') + (T.all ? '<span class="rs-cnt">all reps</span>' : '') + '</h2>';
  var warn = T.error ? '<div class="empty rs-warn">' + esc(T.error) + '</div>' : '';
  if (!items.length) return '<section id="today">' + head + (warn || '<div class="empty">No calls booked for today.</div>') + '</section>';
  return '<section id="today">' + head + warn + items.map(function (x) {
    var c = rsCard(x.id), biz = x.business || (c && c.biz && c.biz.name !== x.lead ? c.biz.name : '');
    var st = x.done ? '<span class="pill done">DONE</span>' : x.started ? '<span class="pill rs-now">STARTED</span>' : '';
    return '<div class="tc" data-tc="' + esc(x.id) + '"><div class="top"><div><div class="biz"><span class="rs-tm">' + esc(x.time) + '</span>' + esc(x.lead) + '</div><div class="sub">'
      + esc([biz, x.rep ? 'with ' + x.rep : ''].filter(Boolean).join(' - ')) + '</div></div>' + st + '</div>' + rsToggle('t:' + x.id, x.id) + '</div>';
  }).join('') + '</section>';
}
function rsAfterRender() {
  if (RS.jumped || location.hash !== '#today') return;
  var t = document.getElementById('today'); if (!t) return;
  RS.jumped = true; try { t.scrollIntoView(); } catch (e) {}
}
// every call in the after-call list gets the same Research button (postcall.js draws the rows; this adds one line)
if (typeof acRow === 'function') { var rsAcRow = acRow; acRow = function (c) { return rsAcRow(c) + '<div class="rs-ac">' + rsToggle('a:' + c.id, c.id) + '</div>'; }; }
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('[data-rs]') : null; if (!t) return;
  var key = t.getAttribute('data-rs'), wrap = t.parentNode, tmp = document.createElement('div');
  RS.open[key] = !RS.open[key];
  tmp.innerHTML = rsToggle(key, t.getAttribute('data-id'));
  wrap.parentNode.replaceChild(tmp.firstChild, wrap);
});
