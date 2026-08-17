export function slugify(s){return String(s).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80)||"winner"}
export async function uniqueSlug(db,title,ignoreId=null){
 const base=slugify(title);let s=base,i=2;
 while(true){const row=await db.prepare("SELECT id FROM posts WHERE slug=?").bind(s).first();if(!row||String(row.id)===String(ignoreId))return s;s=`${base}-${i++}`}
}
