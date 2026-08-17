export async function onRequestGet({request,env}){
 const u=new URL(request.url), page=Math.max(1,Number(u.searchParams.get("page")||1)),limit=Math.min(50,Math.max(1,Number(u.searchParams.get("limit")||12)));
 const q=(u.searchParams.get("q")||"").trim(),badge=(u.searchParams.get("badge")||"").trim(),off=(page-1)*limit;
 const clauses=["status='published'"],vals=[];if(q){clauses.push("(title LIKE ? OR username LIKE ? OR game LIKE ?)");const x=`%${q}%`;vals.push(x,x,x)}if(badge){clauses.push("badge=?");vals.push(badge)}
 const where=clauses.join(" AND ");
 const total=(await env.DB.prepare(`SELECT COUNT(*) c FROM posts WHERE ${where}`).bind(...vals).first()).c;
 const {results}=await env.DB.prepare(`SELECT id,slug,title,username,amount,game,badge,banner_url,created_at,published_at FROM posts WHERE ${where} ORDER BY COALESCE(published_at,created_at) DESC LIMIT ? OFFSET ?`).bind(...vals,limit,off).all();
 return Response.json({posts:results,total,page,limit});
}
