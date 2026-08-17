import {validSession,unauthorized} from "../../../_lib/auth.js";
import {uniqueSlug} from "../../../_lib/db.js";
export async function onRequestGet({request,env,params}){
 if(!await validSession(request,env))return unauthorized();const p=await env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(params.id).first();if(!p)return Response.json({error:"Not found"},{status:404});
 const {results}=await env.DB.prepare("SELECT id,media_type,image_url,sort_order FROM post_media WHERE post_id=? ORDER BY sort_order,id").bind(params.id).all();p.media=results;return Response.json(p)
}
export async function onRequestPut({request,env,params}){
 if(!await validSession(request,env))return unauthorized();const b=await request.json(),old=await env.DB.prepare("SELECT * FROM posts WHERE id=?").bind(params.id).first();if(!old)return Response.json({error:"Not found"},{status:404});
 const slug=await uniqueSlug(env.DB,b.title,params.id),now=new Date().toISOString(),pub=b.published_at?new Date(b.published_at).toISOString():(b.status==="published"?(old.published_at||now):null);
 await env.DB.prepare("UPDATE posts SET slug=?,title=?,username=?,amount=?,game=?,badge=?,description=?,banner_url=?,status=?,updated_at=?,published_at=? WHERE id=?")
 .bind(slug,b.title,b.username,Number(b.amount||0),b.game||"",b.badge||"",b.description||"",b.banner_url||"",b.status==="draft"?"draft":"published",now,pub,params.id).run();
 await env.DB.prepare("DELETE FROM post_media WHERE post_id=?").bind(params.id).run();for(let i=0;i<(b.media||[]).length;i++){const m=b.media[i];await env.DB.prepare("INSERT INTO post_media(post_id,media_type,image_url,sort_order) VALUES(?,?,?,?)").bind(params.id,m.media_type,m.image_url,i).run()}
 return Response.json({ok:true,id:params.id,slug})
}
export async function onRequestDelete({request,env,params}){
 if(!await validSession(request,env))return unauthorized();await env.DB.prepare("DELETE FROM post_media WHERE post_id=?").bind(params.id).run();await env.DB.prepare("DELETE FROM posts WHERE id=?").bind(params.id).run();return Response.json({ok:true})
}
