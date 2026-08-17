let currentMedia=[], currentBanner="";
const $=id=>document.getElementById(id);
const TOKEN_KEY="winner_admin_session";

function notice(el,msg,ok=false){
  el.textContent=msg;
  el.className="notice show "+(ok?"ok":"err");
}

function getToken(){
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token){
  if(token) sessionStorage.setItem(TOKEN_KEY,token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function api(url,opt={}){
  const headers=new Headers(opt.headers||{});
  const token=getToken();
  if(token) headers.set("Authorization","Bearer "+token);

  const r=await fetch(url,{...opt,headers});

  let d={};
  try{ d=await r.json(); }catch{}

  if(r.status===401){
    setToken("");
    showLogin();
    throw new Error(d.error==="Unauthorized" ? "Session berakhir. Silakan login kembali." : (d.error||"Unauthorized"));
  }

  if(!r.ok) throw new Error(d.error||"Request gagal");
  return d;
}

function showLogin(){
  $("loginView").classList.remove("hidden");
  $("adminView").classList.add("hidden");
}

function showAdmin(){
  $("loginView").classList.add("hidden");
  $("adminView").classList.remove("hidden");
}

async function check(){
  if(!getToken()){
    showLogin();
    return;
  }

  try{
    await api("/api/admin/me");
    showAdmin();
    await refresh();
  }catch{
    showLogin();
  }
}

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("loginNotice").className="notice";

  try{
    const r=await fetch("/api/admin/login",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        id:$("loginId").value,
        password:$("loginPass").value
      })
    });

    const d=await r.json().catch(()=>({}));

    if(!r.ok) throw new Error(d.error||"Login gagal.");
    if(!d.token) throw new Error("Token login tidak diterima.");

    setToken(d.token);
    await api("/api/admin/me");
    showAdmin();
    await refresh();
  }catch(err){
    setToken("");
    notice($("loginNotice"),err.message);
  }
};

$("logoutBtn").onclick=async()=>{
  setToken("");
  showLogin();
};

document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

function showTab(n){
  ["dashboard","posts","new"].forEach(x=>$("tab-"+x).classList.toggle("hidden",x!==n));
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===n));
  if(n==="new"&&!$("postId").value) resetForm(false);
}
window.showTab=showTab;

async function refresh(){
  const d=await api("/api/admin/posts");
  const p=d.posts||[];

  $("sTotal").textContent=d.stats.total;
  $("sPub").textContent=d.stats.published;
  $("sDraft").textContent=d.stats.draft;
  $("sMedia").textContent=d.stats.media;

  $("recent").innerHTML=p.slice(0,5).map(x=>`
    <div style="padding:11px 0;border-bottom:1px solid #282318">
      <b>${esc(x.title)}</b>
      <div class="meta">${esc(x.username)} • ${money(x.amount)} • ${esc(x.status)}</div>
    </div>`).join("")||'<div style="color:#888">Belum ada posting.</div>';

  $("postsRows").innerHTML=p.map(x=>`
    <tr>
      <td>${esc(x.title)}</td>
      <td>${esc(x.username)}</td>
      <td>${money(x.amount)}</td>
      <td>${esc(x.status)}</td>
      <td>${dateFmt(x.published_at||x.created_at)}</td>
      <td>
        <button class="btn small secondary" onclick="editPost(${x.id})">Edit</button>
        <button class="btn small danger" onclick="deletePost(${x.id})">Hapus</button>
      </td>
    </tr>`).join("");
}

async function upload(file,type){
  const fd=new FormData();
  fd.append("file",file);
  fd.append("type",type);
  return await api("/api/admin/upload",{method:"POST",body:fd});
}

function previews(input,target){
  target.innerHTML=[...input.files].map(f=>`<img class="thumb" src="${URL.createObjectURL(f)}">`).join("");
}

$("banner").onchange=()=>previews($("banner"),$("bannerPreview"));
$("wins").onchange=()=>previews($("wins"),$("winPreview"));
$("transfers").onchange=()=>previews($("transfers"),$("transferPreview"));

$("postForm").onsubmit=async e=>{
  e.preventDefault();
  $("saveBtn").disabled=true;
  $("saveBtn").textContent="MENYIMPAN...";

  try{
    let banner=currentBanner, media=[...currentMedia];

    if($("banner").files[0]){
      banner=(await upload($("banner").files[0],"banner")).url;
    }

    for(const f of $("wins").files){
      const u=await upload(f,"win_proof");
      media.push({media_type:"win_proof",image_url:u.url});
    }

    for(const f of $("transfers").files){
      const u=await upload(f,"transfer_proof");
      media.push({media_type:"transfer_proof",image_url:u.url});
    }

    const body={
      title:$("title").value,
      username:$("username").value,
      amount:Number($("amount").value),
      game:$("game").value,
      badge:$("badgeF").value,
      status:$("status").value,
      published_at:$("publishedAt").value||null,
      description:$("description").value,
      banner_url:banner,
      media
    };

    const id=$("postId").value;

    await api(id?"/api/admin/posts/"+id:"/api/admin/posts",{
      method:id?"PUT":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });

    notice($("formNotice"),"Posting berhasil disimpan.",true);
    await refresh();
    setTimeout(()=>showTab("posts"),500);
  }catch(err){
    notice($("formNotice"),err.message);
  }finally{
    $("saveBtn").disabled=false;
    $("saveBtn").textContent="SIMPAN POSTINGAN";
  }
};

async function editPost(id){
  const p=await api("/api/admin/posts/"+id);

  resetForm(false);
  $("postId").value=p.id;
  $("formTitle").textContent="Edit Postingan";
  $("title").value=p.title;
  $("username").value=p.username;
  $("amount").value=p.amount;
  $("game").value=p.game||"";
  $("badgeF").value=p.badge||"";
  $("status").value=p.status;
  $("description").value=p.description||"";
  $("publishedAt").value=p.published_at?p.published_at.slice(0,16):"";

  currentBanner=p.banner_url||"";
  currentMedia=p.media||[];

  $("bannerPreview").innerHTML=currentBanner?`<img class="thumb" src="${esc(currentBanner)}">`:"";
  $("winPreview").innerHTML=currentMedia.filter(x=>x.media_type==="win_proof").map(x=>`<img class="thumb" src="${esc(x.image_url)}">`).join("");
  $("transferPreview").innerHTML=currentMedia.filter(x=>x.media_type==="transfer_proof").map(x=>`<img class="thumb" src="${esc(x.image_url)}">`).join("");

  showTab("new");
}
window.editPost=editPost;

async function deletePost(id){
  if(!confirm("Hapus postingan ini?")) return;

  try{
    await api("/api/admin/posts/"+id,{method:"DELETE"});
    await refresh();
  }catch(e){
    alert(e.message);
  }
}
window.deletePost=deletePost;

function resetForm(clear=true){
  $("postForm").reset();
  $("postId").value="";
  $("formTitle").textContent="Tambah Postingan";
  currentMedia=[];
  currentBanner="";
  ["bannerPreview","winPreview","transferPreview"].forEach(x=>$(x).innerHTML="");
  $("formNotice").className="notice";
  if(clear) $("publishedAt").value="";
}
window.resetForm=resetForm;

check();
let currentMedia=[], currentBanner="";
const $=id=>document.getElementById(id);
const TOKEN_KEY="winner_admin_session";

function notice(el,msg,ok=false){
  el.textContent=msg;
  el.className="notice show "+(ok?"ok":"err");
}

function getToken(){
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

function setToken(token){
  if(token) sessionStorage.setItem(TOKEN_KEY,token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function api(url,opt={}){
  const headers=new Headers(opt.headers||{});
  const token=getToken();
  if(token) headers.set("Authorization","Bearer "+token);

  const r=await fetch(url,{...opt,headers});

  let d={};
  try{ d=await r.json(); }catch{}

  if(r.status===401){
    setToken("");
    showLogin();
    throw new Error(d.error==="Unauthorized" ? "Session berakhir. Silakan login kembali." : (d.error||"Unauthorized"));
  }

  if(!r.ok) throw new Error(d.error||"Request gagal");
  return d;
}

function showLogin(){
  $("loginView").classList.remove("hidden");
  $("adminView").classList.add("hidden");
}

function showAdmin(){
  $("loginView").classList.add("hidden");
  $("adminView").classList.remove("hidden");
}

async function check(){
  if(!getToken()){
    showLogin();
    return;
  }

  try{
    await api("/api/admin/me");
    showAdmin();
    await refresh();
  }catch{
    showLogin();
  }
}

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("loginNotice").className="notice";

  try{
    const r=await fetch("/api/admin/login",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        id:$("loginId").value,
        password:$("loginPass").value
      })
    });

    const d=await r.json().catch(()=>({}));

    if(!r.ok) throw new Error(d.error||"Login gagal.");
    if(!d.token) throw new Error("Token login tidak diterima.");

    setToken(d.token);
    await api("/api/admin/me");
    showAdmin();
    await refresh();
  }catch(err){
    setToken("");
    notice($("loginNotice"),err.message);
  }
};

$("logoutBtn").onclick=async()=>{
  setToken("");
  showLogin();
};

document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

function showTab(n){
  ["dashboard","posts","new"].forEach(x=>$("tab-"+x).classList.toggle("hidden",x!==n));
  document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===n));
  if(n==="new"&&!$("postId").value) resetForm(false);
}
window.showTab=showTab;

async function refresh(){
  const d=await api("/api/admin/posts");
  const p=d.posts||[];

  $("sTotal").textContent=d.stats.total;
  $("sPub").textContent=d.stats.published;
  $("sDraft").textContent=d.stats.draft;
  $("sMedia").textContent=d.stats.media;

  $("recent").innerHTML=p.slice(0,5).map(x=>`
    <div style="padding:11px 0;border-bottom:1px solid #282318">
      <b>${esc(x.title)}</b>
      <div class="meta">${esc(x.username)} • ${money(x.amount)} • ${esc(x.status)}</div>
    </div>`).join("")||'<div style="color:#888">Belum ada posting.</div>';

  $("postsRows").innerHTML=p.map(x=>`
    <tr>
      <td>${esc(x.title)}</td>
      <td>${esc(x.username)}</td>
      <td>${money(x.amount)}</td>
      <td>${esc(x.status)}</td>
      <td>${dateFmt(x.published_at||x.created_at)}</td>
      <td>
        <button class="btn small secondary" onclick="editPost(${x.id})">Edit</button>
        <button class="btn small danger" onclick="deletePost(${x.id})">Hapus</button>
      </td>
    </tr>`).join("");
}

async function upload(file,type){
  const fd=new FormData();
  fd.append("file",file);
  fd.append("type",type);
  return await api("/api/admin/upload",{method:"POST",body:fd});
}

function previews(input,target){
  target.innerHTML=[...input.files].map(f=>`<img class="thumb" src="${URL.createObjectURL(f)}">`).join("");
}

$("banner").onchange=()=>previews($("banner"),$("bannerPreview"));
$("wins").onchange=()=>previews($("wins"),$("winPreview"));
$("transfers").onchange=()=>previews($("transfers"),$("transferPreview"));

$("postForm").onsubmit=async e=>{
  e.preventDefault();
  $("saveBtn").disabled=true;
  $("saveBtn").textContent="MENYIMPAN...";

  try{
    let banner=currentBanner, media=[...currentMedia];

    if($("banner").files[0]){
      banner=(await upload($("banner").files[0],"banner")).url;
    }

    for(const f of $("wins").files){
      const u=await upload(f,"win_proof");
      media.push({media_type:"win_proof",image_url:u.url});
    }

    for(const f of $("transfers").files){
      const u=await upload(f,"transfer_proof");
      media.push({media_type:"transfer_proof",image_url:u.url});
    }

    const body={
      title:$("title").value,
      username:$("username").value,
      amount:Number($("amount").value),
      game:$("game").value,
      badge:$("badgeF").value,
      status:$("status").value,
      published_at:$("publishedAt").value||null,
      description:$("description").value,
      banner_url:banner,
      media
    };

    const id=$("postId").value;

    await api(id?"/api/admin/posts/"+id:"/api/admin/posts",{
      method:id?"PUT":"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });

    notice($("formNotice"),"Posting berhasil disimpan.",true);
    await refresh();
    setTimeout(()=>showTab("posts"),500);
  }catch(err){
    notice($("formNotice"),err.message);
  }finally{
    $("saveBtn").disabled=false;
    $("saveBtn").textContent="SIMPAN POSTINGAN";
  }
};

async function editPost(id){
  const p=await api("/api/admin/posts/"+id);

  resetForm(false);
  $("postId").value=p.id;
  $("formTitle").textContent="Edit Postingan";
  $("title").value=p.title;
  $("username").value=p.username;
  $("amount").value=p.amount;
  $("game").value=p.game||"";
  $("badgeF").value=p.badge||"";
  $("status").value=p.status;
  $("description").value=p.description||"";
  $("publishedAt").value=p.published_at?p.published_at.slice(0,16):"";

  currentBanner=p.banner_url||"";
  currentMedia=p.media||[];

  $("bannerPreview").innerHTML=currentBanner?`<img class="thumb" src="${esc(currentBanner)}">`:"";
  $("winPreview").innerHTML=currentMedia.filter(x=>x.media_type==="win_proof").map(x=>`<img class="thumb" src="${esc(x.image_url)}">`).join("");
  $("transferPreview").innerHTML=currentMedia.filter(x=>x.media_type==="transfer_proof").map(x=>`<img class="thumb" src="${esc(x.image_url)}">`).join("");

  showTab("new");
}
window.editPost=editPost;

async function deletePost(id){
  if(!confirm("Hapus postingan ini?")) return;

  try{
    await api("/api/admin/posts/"+id,{method:"DELETE"});
    await refresh();
  }catch(e){
    alert(e.message);
  }
}
window.deletePost=deletePost;

function resetForm(clear=true){
  $("postForm").reset();
  $("postId").value="";
  $("formTitle").textContent="Tambah Postingan";
  currentMedia=[];
  currentBanner="";
  ["bannerPreview","winPreview","transferPreview"].forEach(x=>$(x).innerHTML="");
  $("formNotice").className="notice";
  if(clear) $("publishedAt").value="";
}
window.resetForm=resetForm;

check();
