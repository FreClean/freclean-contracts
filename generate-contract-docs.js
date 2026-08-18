/**
 * Converts each markdown file in legal-templates/ into a polished .docx in
 * dist/. A small, purpose-built parser (not a general markdown converter)
 * handles these four source files, which share one predictable structure, so
 * this stays simple rather than pulling in a heavier markdown-to-docx dependency.
 */
const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  TabStopType,
  TabStopPosition,
} = require("docx");

const SRC_DIR = __dirname;
const OUT_DIR = __dirname;
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Splits a line into TextRun[] handling **bold** spans.
function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part });
  });
}

function buildDoc(markdown) {
  const lines = markdown.split("\n");
  const children = [];
  let title = "FreClean Agreement";

  for (let raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
      );
      continue;
    }

    if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.slice(3).trim(),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 120 },
        }),
      );
      continue;
    }

    if (line.trim() === "---") {
      children.push(
        new Paragraph({
          text: "",
          border: { bottom: { color: "AAAAAA", space: 1, style: BorderStyle.SINGLE, size: 6 } },
          spacing: { before: 200, after: 200 },
        }),
      );
      continue;
    }

    if (line.trim() === "") {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    if (line.trim().startsWith("- ")) {
      children.push(
        new Paragraph({
          children: parseInline(line.trim().slice(2)),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }),
      );
      continue;
    }

    // Default: body paragraph. Render *(italic notes)* as italic runs.
    const withItalics = line.split(/(\*\([^)]+\)\*)/g).filter(Boolean);
    const runs = [];
    for (const seg of withItalics) {
      if (seg.startsWith("*(") && seg.endsWith(")*")) {
        runs.push(new TextRun({ text: seg.slice(1, -1), italics: true, color: "666666" }));
      } else {
        runs.push(...parseInline(seg));
      }
    }
    children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
  }

  return { title, children };
}

function buildDocument(markdown) {
  const { title, children } = buildDoc(markdown);

  return {
    title,
    doc: new Document({
      sections: [
        {
          properties: {
            page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "FreClean", bold: true, color: "084F80" })],
                  border: { bottom: { color: "0B72B9", space: 4, style: BorderStyle.SINGLE, size: 8 } },
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
                  children: [
                    new TextRun({ text: "FreClean · Léogâne, Ouest, Haiti, template pending legal review", size: 16, color: "888888" }),
                    new TextRun({ text: "\t" }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "888888" }),
                  ],
                }),
              ],
            }),
          },
          children,
        },
      ],
    }),
  };
}

async function main() {
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    const markdown = fs.readFileSync(path.join(SRC_DIR, file), "utf8");
    const { title, doc } = buildDocument(markdown);
    const outName = file.replace(/\.md$/, ".docx");
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(OUT_DIR, outName), buffer);
    console.log(`✅ ${outName}  (${title})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
