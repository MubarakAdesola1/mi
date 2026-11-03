const dns = require("dns");
try { dns.setDefaultResultOrder("ipv4first"); } catch (e) {}
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
require("dotenv").config({ path: ".env.local" });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-2",
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const DEFAULT_BUCKET = "assets";

/**
 * Uploads a buffer directly to Neon Object Storage
 */
async function uploadToStorage(buffer, key, contentType = "application/pdf") {
  const bucket = DEFAULT_BUCKET;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Construct URL
  const endpoint = process.env.AWS_ENDPOINT_URL_S3.replace(/\/+$/, "");
  const publicUrl = `${endpoint}/${bucket}/${key}`;

  return {
    key,
    bucket,
    publicUrl,
  };
}

/**
 * Gets a presigned read URL (useful if bucket is private)
 */
async function getPresignedReadUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: DEFAULT_BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

/**
 * Generates an executive, branded PDF document from text
 */
async function generateBrandedPdf({ title, author, category, text }) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Palette: Teal #0d9488, Slate #1e293b, Gray #64748b
  const tealColor = rgb(13 / 255, 148 / 255, 136 / 255);
  const slateDark = rgb(30 / 255, 41 / 255, 59 / 255);
  const grayMuted = rgb(100 / 255, 116 / 255, 139 / 255);
  const lineDivider = rgb(226 / 255, 232 / 255, 240 / 255);

  const margin = 54; // 0.75 in
  const pageWidth = 595.28; // standard A4
  const pageHeight = 841.89;
  const contentWidth = pageWidth - margin * 2;

  // Split text into paragraphs and wrap lines
  const paragraphs = (text || "").split(/\r?\n/);

  function wrapText(txt, font, fontSize, maxWidth) {
    if (!txt.trim()) return [""];
    const words = txt.split(" ");
    const lines = [];
    let currentLine = "";

    for (const w of words) {
      const testLine = currentLine ? `${currentLine} ${w}` : w;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Draw Header on first page
  currentPage.drawText("MARYAM IREKEOLA, PhD", {
    x: margin,
    y: y,
    size: 11,
    font: fontBold,
    color: tealColor,
  });

  currentPage.drawText("OFFICIAL PUBLICATION & RESEARCH ARCHIVE", {
    x: margin + fontBold.widthOfTextAtSize("MARYAM IREKEOLA, PhD", 11) + 12,
    y: y,
    size: 9,
    font: fontRegular,
    color: grayMuted,
  });

  y -= 14;
  currentPage.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 1.5,
    color: tealColor,
  });

  y -= 30;

  // Category Badge
  const catText = (category || "PUBLICATION").toUpperCase();
  currentPage.drawRectangle({
    x: margin,
    y: y - 3,
    width: fontBold.widthOfTextAtSize(catText, 8) + 14,
    height: 16,
    color: rgb(240 / 255, 253 / 255, 250 / 255),
    borderColor: tealColor,
    borderWidth: 1,
  });
  currentPage.drawText(catText, {
    x: margin + 7,
    y: y + 2,
    size: 8,
    font: fontBold,
    color: tealColor,
  });

  y -= 26;

  // Document Title
  const titleLines = wrapText(title || "Untitled Publication", fontBold, 20, contentWidth);
  for (const tl of titleLines) {
    currentPage.drawText(tl, {
      x: margin,
      y: y,
      size: 20,
      font: fontBold,
      color: slateDark,
    });
    y -= 26;
  }

  // Author & Date metadata
  y -= 6;
  const authorName = author || "Maryam Irekeola, PhD";
  const dateStr = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  currentPage.drawText(`By ${authorName}  •  Published on ${dateStr}`, {
    x: margin,
    y: y,
    size: 10,
    font: fontOblique,
    color: grayMuted,
  });

  y -= 18;
  currentPage.drawLine({
    start: { x: margin, y: y },
    end: { x: pageWidth - margin, y: y },
    thickness: 0.75,
    color: lineDivider,
  });

  y -= 26;

  // Content Paragraphs
  const bodyFontSize = 10.5;
  const lineHeight = 17;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) {
      y -= 12;
      continue;
    }

    // Check if header format (e.g. ## Heading or **Heading**)
    const isHeading = trimmed.startsWith("#") || (trimmed.startsWith("**") && trimmed.endsWith("**"));
    const cleanText = trimmed.replace(/^#+\s*/, "").replace(/^\*\*/, "").replace(/\*\*$/, "");

    const pFont = isHeading ? fontBold : fontRegular;
    const pSize = isHeading ? 13 : bodyFontSize;
    const pColor = isHeading ? slateDark : rgb(51 / 255, 65 / 255, 85 / 255);
    const pLineHeight = isHeading ? 22 : lineHeight;

    if (isHeading) {
      y -= 8;
    }

    const lines = wrapText(cleanText, pFont, pSize, contentWidth);
    for (const line of lines) {
      if (y < margin + 40) {
        // Add new page
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;

        // Running header
        currentPage.drawText("Maryam Irekeola, PhD — " + (title || "Publication"), {
          x: margin,
          y: y,
          size: 8,
          font: fontRegular,
          color: grayMuted,
        });
        y -= 8;
        currentPage.drawLine({
          start: { x: margin, y: y },
          end: { x: pageWidth - margin, y: y },
          thickness: 0.5,
          color: lineDivider,
        });
        y -= 24;
      }

      currentPage.drawText(line, {
        x: margin,
        y: y,
        size: pSize,
        font: pFont,
        color: pColor,
      });
      y -= pLineHeight;
    }

    y -= 8; // paragraph spacing
  }

  // Number all pages in footer
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i);
    const footerText = `Page ${i + 1} of ${totalPages}`;
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, 8);

    page.drawLine({
      start: { x: margin, y: margin - 10 },
      end: { x: pageWidth - margin, y: margin - 10 },
      thickness: 0.5,
      color: lineDivider,
    });

    page.drawText("Maryam Irekeola Official Library — All Rights Reserved", {
      x: margin,
      y: margin - 22,
      size: 8,
      font: fontRegular,
      color: grayMuted,
    });

    page.drawText(footerText, {
      x: pageWidth - margin - footerWidth,
      y: margin - 22,
      size: 8,
      font: fontRegular,
      color: grayMuted,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    pageCount: totalPages,
  };
}

async function getObjectStream(key) {
  const command = new GetObjectCommand({
    Bucket: DEFAULT_BUCKET,
    Key: key,
  });
  return await s3Client.send(command);
}

module.exports = {
  s3Client,
  uploadToStorage,
  getPresignedReadUrl,
  generateBrandedPdf,
  getObjectStream,
};
