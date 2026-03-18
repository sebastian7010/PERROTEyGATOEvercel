#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function walkFiles(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    if (entry.isFile() && IMAGE_EXT_RE.test(entry.name)) {
      out.push(full);
    }
  }
}

function collectFolderNames(imgDir) {
  const files = [];
  walkFiles(imgDir, files);
  return new Set(files.map((filePath) => path.basename(filePath)));
}

function extractImageName(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const name = decodeURIComponent(path.posix.basename(url.pathname));
    return IMAGE_EXT_RE.test(name) ? name : null;
  } catch {
    const name = path.basename(value);
    return IMAGE_EXT_RE.test(name) ? name : null;
  }
}

function buildBaseUrl(args) {
  if (args["base-url"]) {
    return args["base-url"].replace(/\/+$/, "");
  }

  const bucket = args.bucket;
  const region = args.region;
  if (!bucket || !region) {
    console.error("Debes usar --base-url o bien --bucket y --region");
    process.exit(1);
  }

  return `https://${bucket}.s3.${region}.amazonaws.com`;
}

function encodeS3Key(prefix, name) {
  const parts = [];
  if (prefix) {
    const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
    if (cleanPrefix) parts.push(...cleanPrefix.split("/"));
  }
  parts.push(name);
  return parts.map((segment) => encodeURIComponent(segment)).join("/");
}

function rewriteValue(value, folderNames, baseUrl, prefix) {
  const name = extractImageName(value);
  if (!name || !folderNames.has(name)) {
    return { changed: false, nextValue: value, name, matched: false };
  }

  const key = encodeS3Key(prefix, name);
  const nextValue = `${baseUrl}/${key}`;
  return {
    changed: nextValue !== value,
    nextValue,
    name,
    matched: true,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const jsonPath = args.json ? path.resolve(args.json) : null;
  const imgDir = args["img-dir"] ? path.resolve(args["img-dir"]) : null;
  const prefix = args.prefix || "";
  const apply = Boolean(args.apply);
  const backup = args.backup !== "false";
  const baseUrl = buildBaseUrl(args);

  if (!jsonPath || !imgDir) {
    console.error("Uso: node rewrite-json-image-urls.js --json <ruta> --img-dir <ruta> --bucket <bucket> --region <region> [--prefix imagenes-webp] [--apply]");
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`No existe el JSON: ${jsonPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(imgDir)) {
    console.error(`No existe la carpeta de imagenes: ${imgDir}`);
    process.exit(1);
  }

  const folderNames = collectFolderNames(imgDir);
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);

  let changedCount = 0;
  let matchedCount = 0;
  let missingCount = 0;

  const rows = Array.isArray(data) ? data : [];
  for (const item of rows) {
    if (Object.prototype.hasOwnProperty.call(item, "url")) {
      const result = rewriteValue(item.url, folderNames, baseUrl, prefix);
      if (result.matched) matchedCount += 1;
      else if (extractImageName(item.url)) missingCount += 1;
      if (result.changed) {
        item.url = result.nextValue;
        changedCount += 1;
      }
    }

    for (const key of ["imagenes", "images"]) {
      if (!Array.isArray(item[key])) continue;
      item[key] = item[key].map((value) => {
        const result = rewriteValue(value, folderNames, baseUrl, prefix);
        if (result.matched) matchedCount += 1;
        else if (extractImageName(value)) missingCount += 1;
        if (result.changed) changedCount += 1;
        return result.nextValue;
      });
    }
  }

  console.log(`JSON: ${jsonPath}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Prefix: ${prefix || "(sin prefix)"}`);
  console.log(`Imagenes locales detectadas: ${folderNames.size}`);
  console.log(`Referencias encontradas en carpeta: ${matchedCount}`);
  console.log(`Referencias sin archivo local: ${missingCount}`);
  console.log(`Cambios a escribir: ${changedCount}`);

  if (!apply) {
    console.log("");
    console.log("Dry-run: no se escribio ningun cambio. Agrega --apply para guardar.");
    return;
  }

  if (backup) {
    const ext = path.extname(jsonPath);
    const base = jsonPath.slice(0, -ext.length);
    const backupPath = `${base}.backup-${timestamp()}${ext}`;
    fs.copyFileSync(jsonPath, backupPath);
    console.log(`Backup: ${backupPath}`);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 4) + "\n", "utf8");
  console.log("JSON actualizado.");
}

main();
