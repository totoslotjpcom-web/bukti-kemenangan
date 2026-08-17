import {validSession,unauthorized} from "../../../_lib/auth.js";
import {uniqueSlug} from "../../../_lib/db.js";
export async function onRequestGet({request,env}){
 if(!await validSession(request,env))return unauthorized();
 const {results}=await env.DB.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
 const s=await env.DB.prepare("SELECT COUNT(*) total,SUM(status='published') published,SUM(status='draft') draft FROM posts").first();
 const m=await env.DB.prepare("SELECT COUNT(*) media FROM post_media").first();
 return Response.json({posts:results,stats:{total:s.total||0,published:s.published||0,draft:s.draft||0,media:m.media||0}});
}
export async function onRequestPost({request,env}){
 if(!await validSession(request,env))return unauthorized();const b=await request.json();
 if(!b.title||!b.username)return Response.json({error:"Judul dan username wajib diisi."},{status:400});
 const slug=await uniqueSlug(env.DB,b.title),now=new Date().toISOString(),pub=b.published_at?new Date(b.published_at).toISOString():(b.status==="published"?now:null);
 const r=await env.DB.prepare("INSERT INTO posts(slug,title,username,amount,game,badge,description,banner_url,status,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
 .bind(slug,b.title,b.username,Number(b.amount||0),b.game||"",b.badge||"",b.description||"",b.banner_url||"",b.status==="draft"?"draft":"published",now,now,pub).run();
 const id=r.meta.last_row_id;for(let i=0;i<(b.media||[]).length;i++){const m=b.media[i];await env.DB.prepare("INSERT INTO post_media(post_id,media_type,image_url,sort_order) VALUES(?,?,?,?)").bind(id,m.media_type,m.image_url,i).run()}
 return Response.json({ok:true,id,slug});
}
