const enc = new TextEncoder();
function b64url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function sign(secret,payload){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64url(await crypto.subtle.sign("HMAC",key,enc.encode(payload)))}
export async function createSession(env){
 const payload=btoa(JSON.stringify({exp:Date.now()+1000*60*60*12})).replace(/=+$/,"");
 return `${payload}.${await sign(env.SESSION_SECRET,payload)}`
}
export async function validSession(request,env){
 const c=request.headers.get("Cookie")||"";const m=c.match(/(?:^|;\s*)admin_session=([^;]+)/);if(!m)return false;
 const [p,s]=m[1].split(".");if(!p||!s)return false;if((await sign(env.SESSION_SECRET,p))!==s)return false;
 try{return JSON.parse(atob(p)).exp>Date.now()}catch{return false}
}
export function cookie(token){return `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`}
export const clearCookie=()=>`admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export const unauthorized=()=>new Response(JSON.stringify({error:"Unauthorized"}),{status:401,headers:{"content-type":"application/json"}});
