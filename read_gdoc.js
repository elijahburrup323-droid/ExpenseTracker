const fs = require("fs");
const path = require("path");
const http = require("http");
const { google } = require("googleapis");

const CREDS_PATH = path.join(__dirname, "documentation", "client_secret.json");
const TOKEN_PATH = path.join(__dirname, "documentation", "token.json");
const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

async function authorize() {
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, "utf8"));
  const { client_id, client_secret, redirect_uris } = creds.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, "http://localhost:3333");

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(token);

    // Check if token needs refresh
    if (token.expiry_date && token.expiry_date < Date.now()) {
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      } catch (e) {
        console.error("Token refresh failed, re-authorizing...");
        return getNewToken(oAuth2Client);
      }
    }
    return oAuth2Client;
  }

  return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });

    console.log("\n=== Google Authorization Required ===");
    console.log("Open this URL in your browser:\n");
    console.log(authUrl);
    console.log("\nWaiting for authorization...\n");

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost:3333");
        const code = url.searchParams.get("code");
        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<h1>No code received</h1>");
          return;
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<h1>Authorization successful!</h1><p>You can close this tab.</p>");
        server.close();
        resolve(oAuth2Client);
      } catch (e) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>Error</h1><p>" + e.message + "</p>");
        server.close();
        reject(e);
      }
    });

    server.listen(3333, () => {
      // Try to open browser automatically
      const { exec } = require("child_process");
      exec(`start "" "${authUrl}"`);
    });
  });
}

function extractDocId(gdocPath) {
  // .gdoc files are JSON with a "doc_id" or "url" field
  const content = fs.readFileSync(gdocPath, "utf8");
  try {
    const json = JSON.parse(content);
    if (json.doc_id) return json.doc_id;
    if (json.url) {
      const match = json.url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
  } catch (e) {
    // Maybe it's just a URL
    const match = content.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }
  throw new Error("Could not extract document ID from: " + gdocPath);
}

async function readGoogleDoc(auth, docId) {
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.get({ documentId: docId });
  const doc = res.data;

  let text = "";
  if (doc.body && doc.body.content) {
    for (const element of doc.body.content) {
      if (element.paragraph) {
        for (const part of element.paragraph.elements) {
          if (part.textRun && part.textRun.content) {
            text += part.textRun.content;
          }
        }
      } else if (element.table) {
        for (const row of element.table.tableRows) {
          const cells = [];
          for (const cell of row.tableCells) {
            let cellText = "";
            for (const cellContent of cell.content) {
              if (cellContent.paragraph) {
                for (const part of cellContent.paragraph.elements) {
                  if (part.textRun && part.textRun.content) {
                    cellText += part.textRun.content.trim();
                  }
                }
              }
            }
            cells.push(cellText);
          }
          text += cells.join(" | ") + "\n";
        }
      }
    }
  }
  return text;
}

async function searchByName(auth, fileName) {
  const drive = google.drive({ version: "v3", auth });
  const safeName = fileName.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name = '${safeName}' and mimeType = 'application/vnd.google-apps.document'`,
    fields: "files(id, name)",
    pageSize: 5,
  });
  if (!res.data.files || res.data.files.length === 0) {
    throw new Error("No Google Doc found with name: " + fileName);
  }
  return res.data.files[0].id;
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node read_gdoc.js <doc-name-or-path>");
    console.error("       node read_gdoc.js --auth   (just authorize)");
    console.error("       node read_gdoc.js --search <name>  (search by name)");
    process.exit(1);
  }

  const auth = await authorize();

  if (input === "--auth") {
    console.log("Authorization successful! Token saved to:", TOKEN_PATH);
    process.exit(0);
  }

  let docId;

  if (input === "--search" || input.endsWith(".gdoc")) {
    // Search by document name via Drive API
    const searchName = input === "--search"
      ? process.argv[3]
      : path.basename(input, ".gdoc");
    console.log("Searching for Google Doc:", searchName);
    docId = await searchByName(auth, searchName);
    console.log("Found doc ID:", docId);
  } else if (input.match(/^[a-zA-Z0-9_-]{20,}$/)) {
    // Direct doc ID
    docId = input;
  } else {
    // Treat as document name
    console.log("Searching for Google Doc:", input);
    docId = await searchByName(auth, input);
    console.log("Found doc ID:", docId);
  }

  const text = await readGoogleDoc(auth, docId);
  console.log("\n--- Document Content ---\n");
  console.log(text);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
