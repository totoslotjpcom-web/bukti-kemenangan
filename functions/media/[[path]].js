export async function onRequestGet({params,env}){
 const path=Array.isArray(params.path)?params.path.join("/"):params.path;
 if(!path)return new Response("Not found",{status:404});
 const obj=await env.MEDIA.get(path);if(!obj)return new Response("Not found",{status:404});
 const h=new Headers();obj.writeHttpMetadata(h);h.set("etag",obj.httpEtag);h.set("cache-control","public, max-age=31536000, immutable");
 return new Response(obj.body,{headers:h});
}
