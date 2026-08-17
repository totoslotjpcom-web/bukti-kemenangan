import {createSession,cookie} from "../../_lib/auth.js";
export async function onRequestPost({request,env}){
 const {id,password}=await request.json().catch(()=>({}));
 if(!env.ADMIN_ID||!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return Response.json({error:"Secret admin belum dikonfigurasi."},{status:500});
 if(id!==env.ADMIN_ID||password!==env.ADMIN_PASSWORD)return Response.json({error:"ID atau password salah."},{status:401});
 const token=await createSession(env);return new Response(JSON.stringify({ok:true}),{headers:{"content-type":"application/json","Set-Cookie":cookie(token)}});
}
