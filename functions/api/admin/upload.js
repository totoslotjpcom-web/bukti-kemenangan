import {validSession,unauthorized} from "../../_lib/auth.js";
export async function onRequestPost({request,env}){
 if(!await validSession(request,env))return unauthorized();
 const form=await request.formData();const file=form.get("file");const type=String(form.get("type")||"media");
 if(!file||typeof file==="string")return Response.json({error:"File tidak ditemukan."},{status:400});
 if(!file.type.startsWith("image/"))return Response.json({error:"Hanya file gambar yang diizinkan."},{status:400});
 if(file.size>10*1024*1024)return Response.json({error:"Ukuran maksimal 10 MB per gambar."},{status:400});
 const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
 const key=`${type}/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
 await env.MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type},customMetadata:{originalName:file.name}});
 return Response.json({key,url:`/media/${key}`});
}
