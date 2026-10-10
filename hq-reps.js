/* Social Onyx HQ - Team panel: SALES REPS card (2026-10-09, Chris: "i need comms trackers for any reps that join").
   Loaded by hq.html; uses its globals (esc, hqPost, toast). Admins only: the server refuses everyone else.
   Anyone given the Sales Rep role gets a row here automatically. When a rep is Live they get a private live
   commissions board, a leaderboard row, and their commissions are booked by the name on their agreements.
   Links are never shown on the page: Copy puts the link on the clipboard, Text sends it to the rep's phone. */
var RepsCard=(function(){
  var R=null,box=null;
  var PLANS=[['rep','10% new deals, 5% upsells'],['base_only','Base salary only'],['none','No commission']];
  var STATUS={live:['Live','green'],off:['Off','dim'],needs_ghl:['Pick their GHL name','amber'],not_on_team:['Not on the team yet','dim'],member_off:['Deactivated','dim']};
  function pill(s){var x=STATUS[s]||[s,'dim'];return '<span class="pill '+x[1]+'">'+esc(x[0])+'</span>';}
  function opts(list,sel){return list.map(function(o){var v=o[0],t=o[1];return '<option value="'+esc(v)+'"'+(v===sel?' selected':'')+'>'+esc(t)+'</option>';}).join('');}
  function ghlOpts(cur){var l=(R.ghl_users||[]).slice();if(cur&&l.indexOf(cur)<0)l.unshift(cur);return (cur?'':'<option value="">Pick their GHL user</option>')+opts(l.map(function(n){return [n,n]}),cur);}
  function pct(x){return Math.round(Number(x)*1000)/10+'%';}
  function row(r){
    var dis=r.status==='not_on_team'||r.status==='member_off';
    var acts='<button class="btn sm primary" data-rs="'+r.id+'">Save</button> '
      +(r.status==='live'||r.status==='off'?'<button class="btn sm'+(r.enabled?' danger':'')+'" data-ron="'+r.id+'" data-v="'+(r.enabled?'0':'1')+'">'+(r.enabled?'Turn off':'Turn on')+'</button> ':'')
      +(r.board_live?'<button class="btn sm" data-rl="'+r.id+'">Copy link</button> <button class="btn sm" data-rt="'+r.id+'"'+(r.phone_last4?'':' disabled title="No mobile number on file"')+'>Text link</button> <button class="btn sm danger" data-rr="'+r.id+'">Reset link</button>':'');
    var note=r.status==='not_on_team'?'Invite them above with their email; they link up here by themselves.':r.status==='needs_ghl'?'Pick the exact GHL user, then Save. Nothing is live until then.':r.link_sent_at?'Link texted '+esc(String(r.link_sent_at).slice(0,10)):'';
    return '<tr><td><b>'+esc(r.name)+'</b>'+(r.comp_plan==='rep'&&(r.rate_new!=0.1||r.rate_upsell!=0.05)?'<div class="sub">'+pct(r.rate_new)+' / '+pct(r.rate_upsell)+'</div>':'')
      +'<label class="sub" style="display:block;margin-top:6px">Matches on agreements</label><input type="text" class="rp-match" style="min-width:150px" data-r="'+r.id+'" value="'+esc(r.match_names.join(', '))+'" placeholder="e.g. jon, jonathan"'+(dis?' disabled':'')+'></td>'
      +'<td><select class="rp-ghl" style="min-width:170px" data-r="'+r.id+'"'+(dis?' disabled':'')+'>'+ghlOpts(r.ghl_name)+'</select></td>'
      +'<td><select class="rp-plan" style="min-width:190px" data-r="'+r.id+'"'+(dis?' disabled':'')+'>'+opts(PLANS,r.comp_plan)+'</select></td>'
      +'<td><label class="chk"><input type="checkbox" class="rp-board" data-r="'+r.id+'"'+(r.board?' checked':'')+(dis?' disabled':'')+'> board</label><label class="chk"><input type="checkbox" class="rp-lb" data-r="'+r.id+'"'+(r.leaderboard?' checked':'')+(dis?' disabled':'')+'> leaderboard</label></td>'
      +'<td>'+pill(r.status)+(note?'<div class="sub">'+note+'</div>':'')+'</td><td style="min-width:230px">'+(dis?'':acts)+'</td></tr>';
  }
  function html(){
    var rows=R.reps.map(row).join('')||'<tr><td colspan="6" class="sub">No reps yet.</td></tr>';
    var cand=R.candidates.length?'<div class="form" style="margin-top:12px"><div><label>Add a team member as a rep</label><select id="rp-new-m">'+opts(R.candidates.map(function(m){return [m.id,m.name]}),'')+'</select></div><div><label>Their GHL user</label><select id="rp-new-g">'+ghlOpts('')+'</select></div><div><button class="btn primary" id="rp-new-go">Add rep</button></div></div>':'';
    return '<div class="card"><h3>Sales reps: commission boards</h3>'
      +(R.warn&&R.warn.length?'<div class="sub" style="color:var(--amber);margin-bottom:8px">'+esc(R.warn.join(' '))+'</div>':'')
      +'<div style="overflow-x:auto"><table><tr><th>Rep</th><th>GHL name</th><th>Paid as</th><th>Shows on</th><th>Status</th><th></th></tr>'+rows+'</table></div>'+cand
      +'<div class="foot">Anyone you invite with the Sales Rep role lands here by themselves. Live means: a private commissions board that updates every minute, a row on the leaderboard, and commissions booked by the name on their agreements (10% of cash on new deals, 5% to the seller and 5% to the original closer on upsells). Turn off or deactivate someone and their link stops working. "Matches on agreements" is every spelling of their name typed on contracts (comma separated; an agreement matches when the typed name starts with one of them). Copy and Text never show the link on this page; Reset makes a new link and kills the old one.</div></div>';
  }
  function val(cls,id){var e=box.querySelector('.'+cls+'[data-r="'+id+'"]');return e?(e.type==='checkbox'?e.checked:e.value):undefined;}
  function call(body,done){hqPost(body).then(function(j){if(!j.ok){toast(j.error||'Failed');return;}done(j);}).catch(function(e){toast('Could not reach the HQ: '+e);});}
  function wire(){
    function all(sel,fn){[].forEach.call(box.querySelectorAll(sel),fn);}
    all('[data-rs]',function(b){b.onclick=function(){var id=+b.getAttribute('data-rs');call({action:'rep_save',id:id,ghl_name:val('rp-ghl',id),match_names:val('rp-match',id),comp_plan:val('rp-plan',id),board:val('rp-board',id),leaderboard:val('rp-lb',id)},function(){toast('Saved');load();});};});
    all('[data-ron]',function(b){b.onclick=function(){var id=+b.getAttribute('data-ron'),on=b.getAttribute('data-v')==='1';if(!on&&!confirm('Turn this rep off? Their board link stops working and they leave the leaderboard. Commissions on deals they already closed still book.'))return;call({action:'rep_save',id:id,enabled:on},function(){toast(on?'Turned on':'Turned off');load();});};});
    all('[data-rl]',function(b){b.onclick=function(){call({action:'rep_link',id:+b.getAttribute('data-rl')},function(j){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(j.url).then(function(){toast('Board link copied. Send it to them privately.');},function(){window.prompt('Copy their board link:',j.url);});}else window.prompt('Copy their board link:',j.url);});};});
    all('[data-rt]',function(b){b.onclick=function(){if(!confirm('Text this rep their board link now?'))return;b.disabled=true;call({action:'rep_text',id:+b.getAttribute('data-rt')},function(j){toast('Texted to the number ending '+j.phone_hint);load();});};});
    all('[data-rr]',function(b){b.onclick=function(){if(!confirm('Make a new link? The current one stops working within a minute, so you will need to send them the new one.'))return;call({action:'rep_reset',id:+b.getAttribute('data-rr')},function(j){toast(j.note||'New link made');load();});};});
    var go=document.getElementById('rp-new-go');if(go)go.onclick=function(){var m=document.getElementById('rp-new-m').value,g=document.getElementById('rp-new-g').value;if(!m||!g){toast('Pick the person and their GHL user');return;}go.disabled=true;call({action:'rep_save',member_id:m,ghl_name:g},function(j){toast(j.linked?'Linked to their existing row. Use Turn on when they are cleared.':'Added. They are live now.');load();});};
  }
  function load(){if(!box)return;hqPost({action:'reps_list'}).then(function(j){if(!j.ok){box.innerHTML='<div class="card"><div class="sub" style="color:var(--amber)">Sales reps: '+esc(j.error||'could not load')+'</div></div>';return;}R=j;box.innerHTML=html();wire();}).catch(function(e){box.innerHTML='<div class="card"><div class="sub" style="color:var(--amber)">Sales reps: '+esc(String(e))+'</div></div>';});}
  return {mount:function(el){box=el;if(box){box.innerHTML='<div class="card"><div class="sub">Loading sales reps...</div></div>';load();}}};
})();
