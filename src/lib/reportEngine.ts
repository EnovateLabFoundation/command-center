/**
 * generateReport — PDF Generation Engine
 *
 * Creates branded PDF reports using jspdf + html2canvas.
 * Applies LBD branding: header with logo text, "CONFIDENTIAL" watermark,
 * footer with page numbers, engagement name, and date.
 *
 * @param reportType - Type of report for filename
 * @param sections   - Array of { title, html } to render as pages
 * @param config     - Branding config (clientName, engagementName, date)
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ReportSection {
  title: string;
  /** HTML string to render in an off-screen div for capture */
  html: string;
}

export interface ReportConfig {
  clientName: string;
  engagementName: string;
  date: string;
  reportTitle: string;
}

/**
 * Capture an HTML element to a canvas image for PDF embedding.
 * Creates a temporary off-screen container, renders, captures, then removes.
 */
async function captureHtml(htmlContent: string): Promise<HTMLCanvasElement> {
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:700px;padding:24px;' +
    'background:#ffffff;color:#111;font-family:system-ui,sans-serif;font-size:13px;line-height:1.6;';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(container);
  return canvas;
}

/**
 * Add LBD branding to a PDF page:
 *   - Header: "LBD" logo text + "CONFIDENTIAL"
 *   - Footer: page number, engagement name, date
 */
function addBranding(
  doc: jsPDF,
  config: ReportConfig,
  pageNum: number,
  totalPages: number,
) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Header background
  doc.setFillColor(15, 15, 26); // --background
  doc.rect(0, 0, w, 22, 'F');

  // LBD logo text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(201, 168, 76); // --accent gold
  doc.text('LBD', 14, 14);

  // Report title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 210);
  doc.text(config.reportTitle.toUpperCase(), 35, 14);

  // CONFIDENTIAL watermark
  doc.setFontSize(7);
  doc.setTextColor(201, 168, 76);
  doc.text('CONFIDENTIAL', w - 14, 14, { align: 'right' });

  // Footer
  doc.setFillColor(15, 15, 26);
  doc.rect(0, h - 16, w, 16, 'F');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 176);
  doc.text(`${config.engagementName} — ${config.clientName}`, 14, h - 6);
  doc.text(config.date, w / 2, h - 6, { align: 'center' });
  doc.text(`Page ${pageNum} of ${totalPages}`, w - 14, h - 6, { align: 'right' });
}

/**
 * Generate a multi-section PDF report.
 * Returns the jsPDF document instance for download or further manipulation.
 */
export async function generateReport(
  reportType: string,
  sections: ReportSection[],
  config: ReportConfig,
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 28; // 14mm margins
  const contentTop = 28; // below header
  const contentBottom = doc.internal.pageSize.getHeight() - 22; // above footer
  const contentH = contentBottom - contentTop;

  // Capture all sections first
  const canvases: { title: string; canvas: HTMLCanvasElement }[] = [];
  for (const section of sections) {
    const canvas = await captureHtml(
      `<h2 style="font-size:16px;font-weight:700;margin-bottom:12px;color:#111;">${section.title}</h2>${section.html}`,
    );
    canvases.push({ title: section.title, canvas });
  }

  // Add title page
  doc.setFillColor(15, 15, 26);
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F');
  doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text('LBD', pageW / 2, 80, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 210);
  doc.text('LEAD BY DARTH — STRATEGIC ADVISORY', pageW / 2, 92, { align: 'center' });
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(config.reportTitle, pageW / 2, 120, { align: 'center' });
  doc.setFontSize(11);
  doc.setTextColor(160, 160, 176);
  doc.text(config.clientName, pageW / 2, 135, { align: 'center' });
  doc.text(config.engagementName, pageW / 2, 145, { align: 'center' });
  doc.text(config.date, pageW / 2, 160, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(201, 168, 76);
  doc.text('CONFIDENTIAL', pageW / 2, 180, { align: 'center' });

  // Add content pages
  const totalPages = canvases.length + 1; // +1 for title page
  for (let i = 0; i < canvases.length; i++) {
    doc.addPage();
    const { canvas } = canvases[i];
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const ratio = canvas.width / canvas.height;
    let imgW = contentW;
    let imgH = imgW / ratio;

    // If image is too tall, scale down
    if (imgH > contentH) {
      imgH = contentH;
      imgW = imgH * ratio;
    }

    doc.addImage(imgData, 'JPEG', 14, contentTop, imgW, imgH);
    addBranding(doc, config, i + 2, totalPages + 1);
  }

  return doc;
}

/**
 * Download a jsPDF document with LBD naming convention.
 */
export function downloadReport(
  doc: jsPDF,
  clientName: string,
  reportType: string,
  date: string,
) {
  const safeName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
  const safeType = reportType.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${safeName}_${safeType}_${date}.pdf`);
}

/**
 * Export a chart element as JPEG.
 */
export async function exportChartAsJpeg(
  element: HTMLElement,
  filename: string,
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });
  const url = canvas.toDataURL('image/jpeg', 0.95);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Export a chart element as single-page PDF with LBD header.
 */
export async function exportChartAsPdf(
  element: HTMLElement,
  filename: string,
  title: string,
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 15, 26);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(201, 168, 76);
  doc.text('LBD', 10, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 210);
  doc.text(title, 28, 12);

  // Chart image
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const maxW = pageW - 20;
  const ratio = canvas.width / canvas.height;
  let imgW = maxW;
  let imgH = imgW / ratio;
  const maxH = doc.internal.pageSize.getHeight() - 30;
  if (imgH > maxH) {
    imgH = maxH;
    imgW = imgH * ratio;
  }
  doc.addImage(imgData, 'JPEG', 10, 22, imgW, imgH);

  doc.save(`${filename}.pdf`);
}

/**
 * Copy a chart element to clipboard as PNG.
 */
export async function copyChartToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    );
    if (!blob) return false;
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a jsPDF document to a Blob for storage upload.
 */
export function reportToBlob(doc: jsPDF): Blob {
  return doc.output('blob');
}
