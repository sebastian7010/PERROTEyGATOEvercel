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

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
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

function collectFolderImages(imgDir) {
  const files = [];
  walkFiles(imgDir, files);

  const byName = new Map();
  for (const filePath of files) {
    const name = path.basename(filePath);
    const list = byName.get(name) || [];
    list.push(filePath);
    byName.set(name, list);
  }

  return byName;
}

function extractImageRefs(jsonPath) {
  const raw = fs.readFileSync(jsonPath, "utf8");
  const data = JSON.parse(raw);
  const refs = [];

  const pushRef = (field, value, itemIndex, imageIndex) => {
    if (typeof value !== "string") return;
    let name = null;
    try {
      const url = new URL(value);
      name = decodeURIComponent(path.posix.basename(url.pathname));
    } catch {
      if (IMAGE_EXT_RE.test(value)) name = path.basename(value);
    }
    if (!name || !IMAGE_EXT_RE.test(name)) return;
    refs.push({
      field,
      itemIndex,
      imageIndex,
      value,
      name,
    });
  };

  const rows = Array.isArray(data) ? data : [];
  rows.forEach((item, itemIndex) => {
    pushRef("url", item.url, itemIndex, null);

    if (Array.isArray(item.imagenes)) {
      item.imagenes.forEach((value, imageIndex) => {
        pushRef("imagenes", value, itemIndex, imageIndex);
      });
    }

    if (Array.isArray(item.images)) {
      item.images.forEach((value, imageIndex) => {
        pushRef("images", value, itemIndex, imageIndex);
      });
    }
  });

  return refs;
}

function writeLines(filePath, values) {
  fs.writeFileSync(filePath, values.join("\n") + (values.length ? "\n" : ""), "utf8");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const jsonPath = args.json ? path.resolve(args.json) : null;
  const imgDir = args["img-dir"] ? path.resolve(args["img-dir"]) : null;
  const outDir = path.resolve(args.out || path.join(process.cwd(), "check_imgs_report"));

  if (!jsonPath || !imgDir) {
    console.error("Uso: node check-json-vs-folder.js --json <ruta> --img-dir <ruta> [--out <carpeta>]");
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

  mkdirp(outDir);

  const folderImages = collectFolderImages(imgDir);
  const refs = extractImageRefs(jsonPath);
  const uniqueJsonNames = [...new Set(refs.map((ref) => ref.name))].sort((a, b) => a.localeCompare(b));
  const folderNames = [...folderImages.keys()].sort((a, b) => a.localeCompare(b));

  const matches = [];
  const missing = [];
  const weirdNames = [];

  for (const name of uniqueJsonNames) {
    if (folderImages.has(name)) matches.push(name);
    else missing.push(name);

    if (/^\-/.test(name) || /[() ]/.test(name)) {
      weirdNames.push(name);
    }
  }

  const unused = folderNames.filter((name) => !uniqueJsonNames.includes(name));

  const duplicateJson = [...new Set(
    refs
      .map((ref) => ref.name)
      .filter((name, index, all) => all.indexOf(name) !== index)
  )].sort((a, b) => a.localeCompare(b));

  const duplicateFolder = folderNames.filter((name) => (folderImages.get(name) || []).length > 1);

  writeLines(path.join(outDir, "json_imgs.txt"), uniqueJsonNames);
  writeLines(path.join(outDir, "folder_imgs.txt"), folderNames);
  writeLines(path.join(outDir, "coinciden.txt"), matches);
  writeLines(path.join(outDir, "faltantes.txt"), missing);
  writeLines(path.join(outDir, "sobrantes.txt"), unused);
  writeLines(path.join(outDir, "duplicados_json.txt"), duplicateJson);
  writeLines(path.join(outDir, "duplicados_carpeta.txt"), duplicateFolder);
  writeLines(path.join(outDir, "nombres_raros.txt"), weirdNames);

  console.log(`JSON: ${jsonPath}`);
  console.log(`IMG_DIR: ${imgDir}`);
  console.log(`Salida: ${outDir}`);
  console.log("");
  console.log(`Referencias unicas en JSON: ${uniqueJsonNames.length}`);
  console.log(`Imagenes unicas en carpeta: ${folderNames.length}`);
  console.log(`Coinciden: ${matches.length}`);
  console.log(`Faltantes: ${missing.length}`);
  console.log(`Sobrantes: ${unused.length}`);
  console.log(`Duplicados en JSON: ${duplicateJson.length}`);
  console.log(`Duplicados en carpeta: ${duplicateFolder.length}`);
  console.log(`Nombres raros: ${weirdNames.length}`);
}

main();
