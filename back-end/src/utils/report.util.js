const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

/** ASCII-safe filename for Content-Disposition (no em dashes / unicode). */
const safeFilename = (title, ext) => {
  const base = String(title || 'Report')
    .replace(/[—–−]/g, '-') // em/en dashes → hyphen
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80) || 'Report';
  return `${base}_${Date.now()}.${ext}`;
};

const generatePDFReport = (res, title, headers, rows) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(title, 'pdf')}"`);

  doc.pipe(res);

  doc.fontSize(18).fillColor('#c8a96e').text(title, { align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(9).fillColor('#666').text(`Generated on: ${new Date().toLocaleString()}`, {
    align: 'center',
  });
  doc.moveDown(1.2);

  const marginX = 30;
  const tableWidth = doc.page.width - marginX * 2;
  const colCount = Math.max(headers.length, 1);
  const colWidth = tableWidth / colCount;
  const cellPad = 3;
  const bottomLimit = doc.page.height - 40;

  const drawTableRow = (cells, opts = {}) => {
    const { bold = false, header = false, stripe = false } = opts;
    const fontSize = header ? 9 : 8;
    doc.font(bold || header ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

    const texts = cells.map((c) => String(c ?? ''));
    let rowHeight = 14;
    texts.forEach((text) => {
      const h = doc.heightOfString(text, { width: colWidth - cellPad * 2 });
      rowHeight = Math.max(rowHeight, h + 6);
    });

    if (doc.y + rowHeight > bottomLimit) {
      doc.addPage();
    }

    const rowY = doc.y;

    if (header) {
      doc.rect(marginX, rowY - 2, tableWidth, rowHeight).fill('#c8a96e');
    } else if (stripe) {
      doc.rect(marginX, rowY - 2, tableWidth, rowHeight).fill('#f5f5f5');
    }

    texts.forEach((text, i) => {
      const x = marginX + i * colWidth + cellPad;
      doc
        .fillColor(header ? '#ffffff' : '#333333')
        .text(text, x, rowY, {
          width: colWidth - cellPad * 2,
          height: rowHeight,
          ellipsis: true,
          lineBreak: true,
        });
      // Keep cursor on this row — reset y after each cell
      doc.y = rowY;
      doc.x = marginX;
    });

    doc.y = rowY + rowHeight + 2;
  };

  drawTableRow(headers, { header: true, bold: true });

  rows.forEach((row, idx) => {
    const cells = headers.map((_, i) => row[i] ?? '');
    drawTableRow(cells, { stripe: idx % 2 === 0 });
  });

  doc.end();
};

const generateExcelReport = async (res, title, headers, rows, sheetName = 'Report') => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.mergeCells(1, 1, 1, headers.length);
  const titleCell = sheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFC8A96E' } };
  titleCell.alignment = { horizontal: 'center' };

  sheet.addRow([]);

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8A96E' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      bottom: { style: 'thin' },
    };
  });

  rows.forEach((row, idx) => {
    const dataRow = sheet.addRow(row);
    if (idx % 2 === 0) {
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9F3EA' } };
      });
    }
  });

  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(title, 'xlsx')}"`);

  await workbook.xlsx.write(res);
  res.end();
};

const writeSection = (doc, heading, body) => {
  if (!body) return;
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#c8a96e').text(heading);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#333').text(String(body), {
    align: 'left',
    lineGap: 2,
  });
};

const writeBulletSection = (doc, heading, items = []) => {
  if (!items.length) return;
  if (doc.y > doc.page.height - 120) doc.addPage();
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#c8a96e').text(heading);
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  items.forEach((item) => {
    if (doc.y > doc.page.height - 80) doc.addPage();
    doc.text(`• ${item}`, { indent: 10, lineGap: 2 });
  });
};

const generateBusinessAnalysisPDF = (res, report) => {
  const safeTitle = (report.title || 'Business_Analysis_Report').replace(/[^\w\s-]/g, '').trim();
  const filename = `${safeTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.fontSize(22).fillColor('#c8a96e').text('Aura Salone', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(16).fillColor('#1a1a1a').text(report.title || 'Business Analysis Report', {
    align: 'center',
  });
  doc.moveDown(0.5);
  doc.fontSize(9).fillColor('#666').text(
    [
      report.periodLabel || 'Business period',
      `Generated: ${report.createdAt ? new Date(report.createdAt).toLocaleString() : new Date().toLocaleString()}`,
      report.generatedBy?.name ? `By: ${report.generatedBy.name}` : null,
      report.modelUsed ? `Model: ${report.modelUsed}` : null,
    ]
      .filter(Boolean)
      .join('  |  '),
    { align: 'center' }
  );

  doc.moveDown(1);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#e5e5e5').stroke();

  const predicted =
    report.predictions?.predictedRevenueNextMonth != null
      ? `LKR ${Number(report.predictions.predictedRevenueNextMonth).toLocaleString('en-LK')}`
      : 'N/A';

  writeSection(doc, 'Executive Summary', report.summary);
  writeSection(
    doc,
    'Prediction Snapshot',
    [
      `Predicted next-month revenue: ${predicted}`,
      `Demand trend: ${report.predictions?.demandTrend || 'N/A'}`,
      `Confidence: ${report.predictions?.confidence || 'N/A'}`,
      `Revenue outlook: ${report.predictions?.revenueOutlook || 'N/A'}`,
    ].join('\n')
  );
  writeBulletSection(doc, 'Key Drivers', report.predictions?.keyDrivers || []);
  writeSection(doc, 'Detailed Analysis', report.analysis);
  writeBulletSection(doc, 'Key Insights', report.insights || []);
  writeBulletSection(doc, 'Recommendations', report.recommendations || []);
  writeBulletSection(doc, 'Opportunities', report.opportunities || []);
  writeBulletSection(doc, 'Risks', report.risks || []);

  const m = report.metricsSnapshot || {};
  if (m.revenue || m.appointments) {
    writeSection(
      doc,
      'Metrics Snapshot',
      [
        m.revenue
          ? `Revenue last 30 days: LKR ${Number(m.revenue.last30Days || 0).toLocaleString('en-LK')}`
          : null,
        m.revenue
          ? `This month: LKR ${Number(m.revenue.thisMonth || 0).toLocaleString('en-LK')}`
          : null,
        m.revenue
          ? `Last month: LKR ${Number(m.revenue.lastMonth || 0).toLocaleString('en-LK')}`
          : null,
        m.appointments
          ? `Appointments (30d): ${m.appointments.last30Days || 0} | Completed: ${m.appointments.completedLast30 || 0}`
          : null,
        m.customers
          ? `Customers: ${m.customers.total || 0} | Returning: ${m.customers.returning || 0}`
          : null,
        m.reviews
          ? `Reviews: ${m.reviews.total || 0} | Avg rating: ${m.reviews.avgServiceRating || 0}`
          : null,
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  doc.moveDown(2);
  doc.fontSize(8).fillColor('#999').text('Confidential — Aura Salone Business Intelligence', {
    align: 'center',
  });

  doc.end();
};

const generateBusinessAnalysisExcel = async (res, report) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('AI Analysis');

  const addHeading = (text) => {
    const row = sheet.addRow([text]);
    row.font = { bold: true, size: 12, color: { argb: 'FFC8A96E' } };
  };

  const addLine = (label, value) => {
    sheet.addRow([label, value ?? '']);
  };

  sheet.mergeCells('A1:B1');
  sheet.getCell('A1').value = report.title || 'Aura Salone Business Analysis';
  sheet.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FFC8A96E' } };

  sheet.addRow([]);
  addLine('Generated', report.createdAt ? new Date(report.createdAt).toLocaleString() : '');
  addLine('Period', report.periodLabel || '');
  addLine('Created by', report.generatedBy?.name || '');
  addLine('Model', report.modelUsed || '');
  sheet.addRow([]);

  addHeading('Executive Summary');
  sheet.addRow([report.summary || '']);
  sheet.addRow([]);

  addHeading('Predictions');
  addLine(
    'Predicted next-month revenue (LKR)',
    report.predictions?.predictedRevenueNextMonth ?? ''
  );
  addLine('Demand trend', report.predictions?.demandTrend || '');
  addLine('Confidence', report.predictions?.confidence || '');
  addLine('Revenue outlook', report.predictions?.revenueOutlook || '');
  sheet.addRow([]);

  const listSection = (title, items = []) => {
    addHeading(title);
    if (!items.length) {
      sheet.addRow(['None']);
    } else {
      items.forEach((item, idx) => sheet.addRow([`${idx + 1}. ${item}`]));
    }
    sheet.addRow([]);
  };

  listSection('Key Drivers', report.predictions?.keyDrivers || []);
  addHeading('Detailed Analysis');
  sheet.addRow([report.analysis || '']);
  sheet.addRow([]);
  listSection('Insights', report.insights || []);
  listSection('Recommendations', report.recommendations || []);
  listSection('Opportunities', report.opportunities || []);
  listSection('Risks', report.risks || []);

  sheet.getColumn(1).width = 36;
  sheet.getColumn(2).width = 70;

  const safeTitle = (report.title || 'Business_Analysis_Report').replace(/[^\w\s-]/g, '').trim();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeTitle.replace(/\s+/g, '_')}_${Date.now()}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  generatePDFReport,
  generateExcelReport,
  generateBusinessAnalysisPDF,
  generateBusinessAnalysisExcel,
};
