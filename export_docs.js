// Export documentation ERB files to .docx for Google Drive
// Usage: node export_docs.js

const fs = require("fs");
const path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");

const DRIVE_DOCS = "G:/My Drive/ExpenseTracker/Documentation";
const LOCAL_DOCS = path.join(__dirname, "documentation");
const VIEWS_DIR = path.join(__dirname, "app", "views", "documentation");

const FILES = [
  { erb: "claude_prompt.html.erb", docx: "claude_prompt.docx", title: "Claude Prompt" },
  { erb: "database_schema.html.erb", docx: "database_schema.docx", title: "Database Schema" },
  { erb: "architecture_overview.html.erb", docx: "architecture_overview.docx", title: "Architecture Overview" },
  { erb: "database_visualization.html.erb", docx: "database_visualization.docx", title: "Database Visualization" },
  { erb: "deployment_runbook.html.erb", docx: "deployment_runbook.docx", title: "Deployment Runbook" },
  { erb: "environment_variables.html.erb", docx: "environment_variables.docx", title: "Environment Variables" },
  { erb: "release_notes.html.erb", docx: "release_notes.docx", title: "Release Notes" },
  { erb: "ruby_project_breakdown.html.erb", docx: "ruby_project_breakdown.docx", title: "Ruby Project Breakdown" },
  { erb: "test_coverage.html.erb", docx: "test_coverage.docx", title: "Test Coverage" },
];

function stripHtml(html) {
  // Remove ERB tags
  let text = html.replace(/<%.*?%>/gs, "");
  // Convert <br> and block-level tags to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(div|p|li|tr|h[1-6]|pre|blockquote)>/gi, "\n");
  text = text.replace(/<(hr)\s*\/?>/gi, "\n---\n");
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  // Collapse excessive blank lines
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function textToParagraphs(text, title) {
  const lines = text.split("\n");
  const paragraphs = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Exported: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
          italics: true,
          size: 20,
          color: "888888",
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (trimmed.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^## /, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (trimmed.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: trimmed.replace(/^### /, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 100 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: trimmed, font: "Consolas", size: 20 })],
          spacing: { after: 40 },
        })
      );
    }
  }

  return paragraphs;
}

async function exportFile({ erb, docx, title }) {
  const erbPath = path.join(VIEWS_DIR, erb);
  const docxPath = path.join(DRIVE_DOCS, docx);

  console.log(`Reading ${erb}...`);
  const raw = fs.readFileSync(erbPath, "utf-8");
  const text = stripHtml(raw);

  console.log(`  Stripped to ${text.length} chars`);

  const doc = new Document({
    sections: [{ children: textToParagraphs(text, title) }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(docxPath, buffer);
  console.log(`  Written: ${docxPath}`);

  // Also save to local documentation folder
  const localPath = path.join(LOCAL_DOCS, docx);
  fs.writeFileSync(localPath, buffer);
  console.log(`  Written: ${localPath}`);
}

async function main() {
  if (!fs.existsSync(DRIVE_DOCS)) {
    console.error(`Google Drive folder not found: ${DRIVE_DOCS}`);
    process.exit(1);
  }

  if (!fs.existsSync(LOCAL_DOCS)) {
    fs.mkdirSync(LOCAL_DOCS, { recursive: true });
  }

  for (const file of FILES) {
    await exportFile(file);
  }

  console.log(`\nDone! ${FILES.length} docs exported to Google Drive and local documentation folder.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
