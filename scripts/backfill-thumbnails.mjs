// Makes the small copy (800px WebP, "<name>.thumb.webp") for every photo saved
// before small copies existed, in both photo buckets. New uploads get one
// automatically, so this only needs to run once.
//
//   node scripts/backfill-thumbnails.mjs           counts what's missing, changes nothing
//   node scripts/backfill-thumbnails.mjs --write   makes and uploads the missing copies
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.

import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.");
  process.exit(1);
}

const write = process.argv.includes("--write");
const supabase = createClient(url, key, { auth: { persistSession: false } });
const BUCKETS = ["vehicle-photos", "community-photos"];
const IMAGE = /\.(webp|jpe?g|png)$/i;
const isThumb = (name) => name.endsWith(".thumb.webp");
const thumbOf = (path) => `${path.replace(/\.[^./]+$/, "")}.thumb.webp`;

// Files are stored as <user>/<car or post>/<file>.
async function list(bucket, prefix) {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) return all;
  }
}

async function folderFiles(bucket) {
  const files = [];
  for (const user of await list(bucket, "")) {
    if (user.id) continue; // a loose file, not a folder
    for (const folder of await list(bucket, user.name)) {
      if (folder.id) continue;
      const prefix = `${user.name}/${folder.name}`;
      const names = (await list(bucket, prefix)).filter((f) => f.id).map((f) => f.name);
      files.push({ prefix, names });
    }
  }
  return files;
}

let missing = 0;
let made = 0;
let failed = 0;
let fullBytes = 0;
let thumbBytes = 0;

for (const bucket of BUCKETS) {
  for (const { prefix, names } of await folderFiles(bucket)) {
    const have = new Set(names);
    for (const name of names) {
      if (isThumb(name) || !IMAGE.test(name)) continue;
      const path = `${prefix}/${name}`;
      const thumbName = thumbOf(name);
      if (have.has(thumbName)) continue;
      missing++;
      if (!write) continue;
      try {
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (error) throw error;
        const input = Buffer.from(await data.arrayBuffer());
        const output = await sharp(input)
          .rotate()
          .resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer();
        const { error: upError } = await supabase.storage
          .from(bucket)
          .upload(thumbOf(path), output, { contentType: "image/webp", cacheControl: "31536000" });
        if (upError) throw upError;
        made++;
        fullBytes += input.length;
        thumbBytes += output.length;
        if (made % 25 === 0) console.log(`  ${made} made so far...`);
      } catch (err) {
        failed++;
        console.error(`  couldn't make one in ${bucket}: ${err.message ?? err}`);
      }
    }
  }
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
if (!write) {
  console.log(`${missing} photos need a small copy. Run with --write to make them.`);
} else {
  console.log(`Made ${made} small copies (${failed} failed) out of ${missing} missing.`);
  if (made > 0) {
    console.log(
      `Those photos: ${mb(fullBytes)} full, ${mb(thumbBytes)} as small copies ` +
        `(${Math.round((1 - thumbBytes / fullBytes) * 100)}% less to load in grids).`,
    );
  }
}
