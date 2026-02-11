const JSZip = require("jszip");
const fs = require("fs");

async function extract(filePath) {
  const data = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(data);
  const xml = await zip.file("word/document.xml").async("string");
  const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  console.log(text);
}

extract(process.argv[2]).catch((e) => {
  console.error(e.message);
  process.exit(1);
});
