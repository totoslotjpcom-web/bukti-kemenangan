export async function onRequestGet({params,env}){
 const p=await env.DB.prepare("SELECT * FROM posts WHERE slug=? AND status='published'").bind(params.slug).first();
 if(!p)return Response.json({error:"Not found"},{status:404});
 const {results}=await env.DB.prepare("SELECT id,media_type,image_url,sort_order FROM post_media WHERE post_id=? ORDER BY sort_order,id").bind(p.id).all();p.media=results;return Response.json(p);
}
