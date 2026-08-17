import {validSession,unauthorized} from "../../_lib/auth.js";
export async function onRequestGet({request,env}){if(!await validSession(request,env))return unauthorized();return Response.json({ok:true,id:env.ADMIN_ID})}
