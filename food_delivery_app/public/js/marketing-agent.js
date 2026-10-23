/* SmartSoko Studio: admin review, planning and automation controls. */
'use strict';
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const platformName = p => ({facebook:'Facebook',instagram:'Instagram',x:'X / Twitter'}[p] || p);
const icon = p => '<span class="network-icon '+esc(p)+'">'+({facebook:'f',instagram:'◎',x:'𝕏'}[p] || 's.')+'</span>';
const eat = date => date && Number.isFinite(Date.parse(date)) ? new Date(date).toLocaleString('en-GB',{timeZone:'Africa/Dar_es_Salaam',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' EAT' : 'No schedule';
let posts = [], dashboard = null, user = null, busy = false, formLoaded = false, editingId = null;
const selected = new Set();
const views = {overview:'Command centre',review:'Review inbox',calendar:'Content calendar',activity:'Agent activity',settings:'Brand & automation'};
function showView(view) {
    if (!views[view]) return;
    document.querySelectorAll('[data-page]').forEach(el=>el.hidden=el.dataset.page!==view);
    document.querySelectorAll('nav [data-view]').forEach(el=>{if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    $('viewTitle').textContent=views[view];
    history.replaceState(null,'','#'+view);
}
document.addEventListener('click',event=>{
    const nav=event.target.closest('[data-view]'); if(nav)showView(nav.dataset.view);
    const close=event.target.closest('[data-close]'); if(close)$(close.dataset.close).close();
});
$('today').textContent=new Date().toLocaleDateString('en-GB',{timeZone:'Africa/Dar_es_Salaam',day:'numeric',month:'long',year:'numeric'});
const hourSelect=$('automationForm').elements.dailyHour;
hourSelect.innerHTML=Array.from({length:24},(_,h)=>'<option value="'+h+'">'+String(h).padStart(2,'0')+':00 EAT</option>').join('');
function notice(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
async function api(path='',method='GET',body) {
    if(!user)throw new Error('Sign in with a platform admin account at /login, then return here.');
    const token=await user.getIdToken();
    const response=await fetch('/api/admin/marketing-agent'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(60000)});
    const result=await response.json().catch(()=>null);
    if(!response.ok||!result?.success)throw new Error(result?.error||'The agent service is unavailable. Refresh to check its latest state.');
    return result.data;
}
const empty=(title,detail)=>'<div class="empty"><strong>'+esc(title)+'</strong>'+esc(detail)+'</div>';
function quality(post){return dashboard?.automation?.quality?.[post.id]||{passed:true,blockers:[]};}
function card(post,compact=false) {
    const editable=['draft','approved'].includes(post.status),q=quality(post);
    return '<article class="post-card" data-id="'+esc(post.id)+'"><div class="post-top">'+
    (!compact&&post.status==='draft'?'<input type="checkbox" data-select="'+esc(post.id)+'" aria-label="Select '+esc(post.platform)+' draft" '+(selected.has(post.id)?'checked':'')+'>':'')+
    icon(post.platform)+'<span>'+esc(platformName(post.platform))+'</span><span class="badge '+(['unknown','publishing'].includes(post.status)?'attention':'')+'">'+esc(post.status)+'</span></div>'+
    '<div class="post-image">'+(post.imageUrl?'<img src="'+esc(post.imageUrl)+'" alt="Campaign product creative" loading="lazy" referrerpolicy="no-referrer">':'<span class="image-fallback">Local finds.<br>Daily stories.</span>')+'</div>'+
    '<div class="post-content"><span class="post-pillar">'+esc(post.pillar||post.campaign)+'</span><p class="post-copy">'+esc(post.text)+'</p>'+
    (!q.passed?'<div class="quality">'+esc(q.blockers.join(' · '))+'</div>':'')+
    '<div class="post-meta">'+esc(eat(post.scheduledAt))+'<br>'+esc(post.generator)+' · '+esc(post.campaign)+(post.remoteId?'<br>Confirmed post: '+esc(post.remoteId):'')+
    (post.imageCredit?'<br>'+esc(post.imageCredit):'')+(post.imageStatus?'<br>Image: '+esc(post.imageStatus):'')+
    (post.imageSourceUrl&&/^https:\/\/www\.pexels\.com\//.test(post.imageSourceUrl)?'<br><a href="'+esc(post.imageSourceUrl)+'" target="_blank" rel="noopener noreferrer">Photos provided by Pexels ↗</a>':'')+
    (post.imageNote?'<br>'+esc(post.imageNote):'')+'</div></div>'+
    '<div class="post-actions"><button data-action="copy">Copy</button>'+
    (editable?'<button data-action="edit">Edit story</button><button data-action="find-image">Find image</button>':'')+
    (post.status==='draft'?'<button class="approve" data-action="approve">Approve →</button>':'')+
    (post.status==='approved'?'<button data-action="publish">Publish now ↗</button>':'')+
    (editable&&!compact?'<button data-action="cancel">Cancel</button>':'')+'</div></article>';
}
function watchImages() {
    document.querySelectorAll('.post-image img').forEach(img=>img.addEventListener('error',()=>{
        const fallback=document.createElement('span');fallback.className='image-fallback';fallback.textContent='Creative needs attention';img.replaceWith(fallback);
    },{once:true}));
}
function renderPosts(){
    const query=$('search').value.toLowerCase(),channel=$('platformFilter').value,status=$('filter').value;
    const visible=posts.filter(p=>(channel==='all'||p.platform===channel)&&(status==='all'||p.status===status)&&((p.text||'')+' '+p.campaign).toLowerCase().includes(query));
    $('posts').innerHTML=visible.length?visible.map(p=>card(p)).join(''):empty('A clear desk.','No posts match these filters. Run the agent or create a campaign to begin.');
    $('queueCount').textContent=visible.length+' posts · '+selected.size+' selected';
    $('previewPosts').innerHTML=posts.filter(p=>['draft','approved'].includes(p.status)).slice(0,3).map(p=>card(p,true)).join('')||empty('Your next stories are on their way.','Run the agent to prepare a campaign from the live catalogue.');
    $('approveSelected').disabled=busy||!user||!selected.size;
    watchImages();
}
function renderCalendar(){
    const groups=new Map();
    posts.filter(p=>p.scheduledAt&&p.status!=='cancelled'&&Number.isFinite(Date.parse(p.scheduledAt))).sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt)).forEach(p=>{
        const day=new Date(Date.parse(p.scheduledAt)+3*3600000).toISOString().slice(0,10);
        if(!groups.has(day))groups.set(day,[]);groups.get(day).push(p);
    });
    $('calendar').innerHTML=groups.size?[...groups].map(([day,items])=>'<article class="calendar-day"><h3>'+esc(new Date(day+'T12:00:00+03:00').toLocaleDateString('en-GB',{timeZone:'Africa/Dar_es_Salaam',weekday:'long',day:'numeric',month:'long'}))+'</h3>'+items.map(p=>'<div class="calendar-item"><time>'+esc(new Date(p.scheduledAt).toLocaleTimeString('en-GB',{timeZone:'Africa/Dar_es_Salaam',hour:'2-digit',minute:'2-digit'}))+'</time>'+icon(p.platform)+'<span>'+esc(p.campaign)+'</span><span class="badge">'+esc(p.status)+'</span><button class="text-button" data-action="inspect" data-id="'+esc(p.id)+'">View →</button></div>').join('')+'</article>').join(''):empty('Room for your next campaign.','Scheduled drafts will appear here, in Tanzania time.');
}
function renderActivity(){
    const automation=dashboard?.automation,history=automation?.history||[];
    const current=automation?.run?.status==='running'?[automation.run,...history]:history;
    $('activity').innerHTML=current.length?current.map(run=>'<article class="activity-card"><span class="eyebrow">'+esc(eat(run.startedAt))+' · '+esc(run.status)+'</span><h3>'+esc(run.summary||'Preparing today’s campaign…')+'</h3><div class="steps">'+(run.steps||[]).map(step=>'<div class="step"><span>✓</span>'+esc(step)+'</div>').join('')+'</div>'+(run.error?'<p>'+esc(run.error)+'</p>':'')+'<p>'+esc((run.postIds||[]).length)+' posts prepared · '+esc(run.actor||'marketing-agent')+'</p></article>').join(''):empty('Every working day leaves a record.','Your agent’s planning and checks will appear here after its first run.');
}
function fillSettings(){
    const config=dashboard?.automation?.config;if(!config||formLoaded)return;
    const form=$('automationForm');
    for(const key of ['brandBrief','language','provider','mode','dailyHour'])form.elements[key].value=config[key];
    form.elements.enabled.checked=config.enabled;
    form.querySelectorAll('[name=platforms]').forEach(el=>el.checked=config.platforms.includes(el.value));
    formLoaded=true;
}
function render(){
    const auto=dashboard?.automation,config=auto?.config,counts=auto?.counts||{};
    $('metricDrafts').textContent=counts.drafts??posts.filter(p=>p.status==='draft').length;
    $('metricScheduled').textContent=counts.scheduled??0;$('metricPublished').textContent=counts.published??0;$('metricAttention').textContent=counts.attention??0;
    $('reviewBadge').textContent=counts.drafts??0;
    $('sideStatus').textContent=config?.enabled?'● Daily agent active':'○ Daily agent paused';
    $('heroState').textContent=auto?.run?.status==='running'?'Your agent is at work.':config?.enabled?'A rhythm you can rely on.':'Ready when you are.';
    $('heroDetail').textContent=config?.mode==='autopublish'?'Plans, checks and queues eligible posts automatically.':'Plans and prepares daily. You make the final editorial call.';
    $('nextRun').textContent=config?.enabled?auto.nextRun:'Paused';
    $('briefBadge').textContent=auto?.run?.status||'Ready to begin';
    $('briefText').textContent=auto?.run?.summary||'Your agent combines the live catalogue with your brand brief to prepare tomorrow’s posts. Set its direction once, then review the work here.';
    $('briefSteps').innerHTML=(auto?.run?.steps||['Read the catalogue','Plan the channel mix','Draft and check each story','Prepare your review brief']).map(step=>'<div class="step"><span>'+(auto?.run?.status==='completed'?'✓':'○')+'</span>'+esc(step)+'</div>').join('');
    $('blockers').textContent=(auto?.blockers||[]).length?'Before going live: '+auto.blockers.join(' · '):'All selected accounts have credentials configured. Confirm platform permissions before the first live campaign.';
    const channelHtml=['facebook','instagram','x'].map(p=>'<div class="channel">'+icon(p)+'<span>'+esc(platformName(p))+'</span><span class="badge '+(dashboard?.connected?.[p]?'':'attention')+'">'+(dashboard?.connected?.[p]?'Configured':'Connect account')+'</span></div>').join('');
    $('channels').innerHTML=channelHtml;$('setupList').innerHTML=channelHtml;
    $('providerStatus').textContent='Gemini: '+(dashboard?.aiConfigured?'configured':'not configured')+' · Groq: '+(dashboard?.groqConfigured?'configured':'not configured')+'. Provider output always passes through draft validation.';
    selected.forEach(id=>{if(!posts.some(p=>p.id===id&&p.status==='draft'))selected.delete(id);});
    renderPosts();renderCalendar();renderActivity();fillSettings();
}
async function refresh(){
    dashboard=await api();posts=dashboard.posts;render();
}
async function run(fn,success){
    if(busy)return;busy=true;document.querySelectorAll('button:not([data-view]):not([data-close])').forEach(b=>b.disabled=true);
    try{const result=await fn();await refresh();notice(typeof success==='function'?success(result):success||'Workspace refreshed.');}
    catch(error){notice(error.message,true);try{await refresh();}catch(_){}}
    finally{busy=false;document.querySelectorAll('button:not([data-view]):not([data-close])').forEach(b=>b.disabled=!user);$('approveSelected').disabled=!user||!selected.size;}
}
$('runAgent').addEventListener('click',()=>{notice('Your agent is reading the catalogue and preparing its brief…');run(()=>api('/run','POST'),result=>result.skipped?result.reason||'Agent is paused.':result.summary);});
$('refresh').addEventListener('click',()=>run(async()=>{}));
['search','filter','platformFilter'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',renderPosts));
$('setupButton').addEventListener('click',()=>$('setup').showModal());
document.addEventListener('change',event=>{
    if(event.target.matches('[data-select]')){event.target.checked?selected.add(event.target.dataset.select):selected.delete(event.target.dataset.select);$('queueCount').textContent=selected.size+' selected';$('approveSelected').disabled=!selected.size||!user;}
});
$('approveSelected').addEventListener('click',()=>{
    if(!selected.size||!confirm('Approve '+selected.size+' saved drafts? Approved posts may publish automatically at their scheduled time while the agent is enabled.'))return;
    run(async()=>{let count=0;for(const id of [...selected]){await api('/posts/'+id+'/approve','POST');selected.delete(id);count++;}return count;},count=>count+' posts approved.');
});
function openEditor(post){
    if(!['draft','approved'].includes(post.status)){showView('review');$('search').value=post.campaign;renderPosts();return;}
    editingId=post.id;const form=$('editForm');form.elements.text.value=post.text;form.elements.imageUrl.value=post.imageUrl||'';
    form.elements.scheduledAt.value=post.scheduledAt?new Date(Date.parse(post.scheduledAt)+3*3600000).toISOString().slice(0,16):'';
    $('editCheck').textContent=quality(post).blockers.join(' · ')||'Saving changes returns this post to draft and removes approval.';
    $('editor').showModal();
}
document.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button||busy)return;
    const id=button.dataset.id||button.closest('[data-id]')?.dataset.id,post=posts.find(p=>p.id===id);if(!post)return;
    const action=button.dataset.action;
    if(action==='edit'||action==='inspect'){openEditor(post);return;}
    if(action==='find-image'){notice('Looking for a matching product photo…');run(()=>api('/posts/'+id+'/find-image','POST'),result=>result.imageUrl?'Matching image selected. The post is back in draft for review.':result.imageNote||'No suitable photo found.');return;}
    if(action==='copy'){navigator.clipboard.writeText(post.text).then(()=>notice('Post copied. Nothing was published.')).catch(()=>notice('Open the editor to select and copy the text.',true));return;}
    if(action==='publish'&&!confirm('Publish this saved story to '+platformName(post.platform)+' now?\n\n'+post.text))return;
    if(action==='approve'&&!confirm('Approve this saved story? It may publish at its scheduled time while the agent is enabled.'))return;
    if(action==='cancel'&&!confirm('Cancel this unpublished post?'))return;
    run(()=>api('/posts/'+id+'/'+action,'POST'),'Post '+(action==='approve'?'approved':action==='cancel'?'cancelled':'publication confirmed')+'.');
});
$('editForm').addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    const values={text:form.elements.text.value,imageUrl:form.elements.imageUrl.value,scheduledAt:form.elements.scheduledAt.value?new Date(form.elements.scheduledAt.value+':00+03:00').toISOString():null};
    run(async()=>{await api('/posts/'+editingId,'PUT',values);$('editor').close();},'Story saved as a draft.');
});
$('automationForm').addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    const values={enabled:form.elements.enabled.checked,mode:form.elements.mode.value,provider:form.elements.provider.value,language:form.elements.language.value,dailyHour:Number(form.elements.dailyHour.value),brandBrief:form.elements.brandBrief.value,platforms:[...form.querySelectorAll('[name=platforms]:checked')].map(el=>el.value)};
    if(values.mode==='autopublish'&&!confirm('Allow the agent to approve and publish eligible future posts to the configured social accounts without a per-post review? You can pause the agent here.'))return;
    run(async()=>{await api('/automation','PUT',values);formLoaded=false;},'Agent direction saved.');
});
$('campaignForm').addEventListener('submit',event=>{
    event.preventDefault();const values=Object.fromEntries(new FormData(event.target));values.days=Number(values.days);
    run(()=>api('/campaigns','POST',values),'Campaign drafts created. Find them in your review inbox.');
});
function initialize(){
    if(!window.auth)return;
    window.auth.onAuthStateChanged(async current=>{
        user=current;formLoaded=false;
        document.querySelectorAll('button:not([data-view]):not([data-close])').forEach(b=>b.disabled=!user);
        if(!user){notice('Sign in at /login with your platform admin account, then return to the studio.');posts=[];renderPosts();return;}
        await run(async()=>{},'Your studio is up to date. Daily activity and publication outcomes are shown below.');
    });
}
if(window.auth)initialize();else document.addEventListener('firebase-initialized',initialize,{once:true});
showView(location.hash.slice(1)||'overview');
setInterval(()=>{if(user&&!busy&&!document.querySelector('dialog[open]')&&!document.activeElement?.closest('form'))refresh().catch(()=>{});},60000);
