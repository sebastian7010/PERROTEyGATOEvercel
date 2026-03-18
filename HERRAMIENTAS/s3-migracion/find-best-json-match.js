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

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.isFile() && entry.name === "products.json") {
      out.push(full);
    }
  }
}

function readImageNames(imgDir) {
  const seen = new Set();

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      if (entry.isFile() && IMAGE_EXT_RE.test(entry.name)) {
        seen.add(entry.name);
      }
    }
  }

  visit(imgDir);
  return seen;
}

function extractImageNamesFromJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const names = [];

  const addUrl = (value) => {
    if (typeof value !== "string") return;
    try {
      const url = new URL(value);
      const baseName = decodeURIComponent(path.posix.basename(url.pathname));
      if (IMAGE_EXT_RE.test(baseName)) names.push(baseName);
    } catch {
      if (IMAGE_EXT_RE.test(value)) names.push(path.basename(value));
    }
  };

  const rows = Array.isArray(data) ? data : [];
  for (const item of rows) {
    addUrl(item.url);
    if (Array.isArray(item.imagenes)) {
      for (const value of item.imagenes) addUrl(value);
    }
    if (Array.isArray(item.images)) {
      for (const value of item.images) addUrl(value);
    }
  }

  return [...new Set(names)];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(args.root || process.cwd());
  const imgDir = args["img-dir"] ? path.resolve(args["img-dir"]) : null;

  if (!imgDir) {
    console.error("Falta --img-dir");
    process.exit(1);
  }

  if (!fs.existsSync(imgDir)) {
    console.error(`No existe la carpeta de imagenes: ${imgDir}`);
    process.exit(1);
  }

  const jsonFiles = [];
  walk(repoRoot, jsonFiles);

  const imageNames = readImageNames(imgDir);
  const results = jsonFiles
    .map((filePath) => {
      const refs = extractImageNamesFromJson(filePath);
      let matches = 0;
      for (const ref of refs) {
        if (imageNames.has(ref)) matches += 1;
      }
      return {
        file: path.relative(repoRoot, filePath),
        matches,
        refs: refs.length,
      };
    })
    .sort((a, b) => b.matches - a.matches || a.file.localeCompare(b.file));

  console.log("matches\trefs\tfile");
  for (const row of results) {
    console.log(`${row.matches}\t${row.refs}\t${row.file}`);
  }
}

main();
