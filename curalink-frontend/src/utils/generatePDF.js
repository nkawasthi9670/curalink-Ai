
/* eslint-disable no-unused-vars */
import jsPDF from 'jspdf';

export async function generatePDF({ messages, sources, context }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const colors = {
    primary: [59, 158, 255],
    teal: [45, 212, 180],
    dark: [17, 24, 39],
    text: [226, 232, 240],
    muted: [100, 116, 139],
    white: [255, 255, 255],
    cardBg: [26, 34, 53],
  };

  // Background
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Helper functions
  const checkNewPage = (neededSpace = 20) => {
    if (y + neededSpace > pageHeight - margin) {
      doc.addPage();
      doc.setFillColor(...colors.dark);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    }
  };

  const addText = (text, x, fontSize, color, style = 'normal', maxWidth = contentWidth) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    doc.setFont('helvetica', style);
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    lines.forEach(line => {
      checkNewPage(fontSize * 0.5);
      doc.text(line, x, y);
      y += fontSize * 0.45;
    });
    return lines.length;
  };

  // ── HEADER ──────────────────────────────────────────────
  // Logo background
  doc.setFillColor(...colors.primary);
  doc.roundedRect(margin, y, 12, 12, 2, 2, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CL', margin + 3, y + 8);

  // Title
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.white);
  doc.text('Cura', margin + 16, y + 9);
  doc.setTextColor(...colors.primary);
  doc.text('link', margin + 33, y + 9);

  // Subtitle
  doc.setFontSize(9);
  doc.setTextColor(...colors.muted);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Medical Research Report', margin + 16, y + 14);

  // Date
  const date = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  doc.text(date, pageWidth - margin, y + 9, { align: 'right' });

  y += 22;

  // Divider
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ── PATIENT INFO ─────────────────────────────────────────
  if (context?.patientName || context?.disease) {
    doc.setFillColor(...colors.cardBg);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'F');
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 22, 3, 3, 'S');

    y += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('PATIENT CONTEXT', margin + 6, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.text);
    doc.setFontSize(8.5);

    const info = [
      context.patientName && `Patient: ${context.patientName}`,
      context.disease && `Condition: ${context.disease}`,
      context.location && `Location: ${context.location}`,
    ].filter(Boolean);

    info.forEach((item, i) => {
      doc.text(item, margin + 6 + (i * 60), y);
    });
    y += 10;
  }

  y += 4;

  // ── AI RESPONSES ─────────────────────────────────────────
  const aiMessages = messages.filter(m => m.role === 'assistant' && m.content && !m.content.includes('Hello') && !m.content.includes('temporarily unavailable'));
  const userMessages = messages.filter(m => m.role === 'user');

  if (aiMessages.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.teal);
    doc.text('RESEARCH FINDINGS', margin, y);
    y += 8;

    aiMessages.forEach((msg, idx) => {
      checkNewPage(30);

      // User question
      if (userMessages[idx]) {
        doc.setFillColor(59, 158, 255, 0.1);
        doc.setFillColor(30, 45, 69);
        doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...colors.primary);
        doc.text('Q: ', margin + 4, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.text);
        const qLines = doc.splitTextToSize(userMessages[idx].content, contentWidth - 15);
        doc.text(qLines[0], margin + 10, y + 6);
        y += 14;
      }

      // AI response — parse markdown sections
      const content = msg.content || '';
      const sections = content.split(/##\s+/);

      sections.forEach(section => {
        if (!section.trim()) return;
        checkNewPage(20);

        const lines = section.split('\n');
        const heading = lines[0].trim();
        const body = lines.slice(1).join('\n').trim();

        if (heading) {
          // Section heading
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...colors.teal);
          doc.text(heading.toUpperCase(), margin, y);
          y += 5;

          // Underline
          doc.setDrawColor(...colors.teal);
          doc.setLineWidth(0.2);
          doc.line(margin, y, margin + doc.getTextWidth(heading.toUpperCase()), y);
          y += 4;
        }

        if (body) {
          // Clean markdown
          const cleanBody = body
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/^\s*[-•]\s+/gm, '  • ');

          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...colors.text);

          const bodyLines = doc.splitTextToSize(cleanBody, contentWidth);
          bodyLines.forEach(line => {
            checkNewPage(6);
            doc.text(line, margin, y);
            y += 4.5;
          });
          y += 3;
        }
      });

      y += 4;
    });
  }

  // ── PUBLICATIONS ─────────────────────────────────────────
  const pubs = sources?.publications || [];
  if (pubs.length > 0) {
    checkNewPage(30);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.primary);
    doc.text('RETRIEVED PUBLICATIONS', margin, y);
    y += 8;

    pubs.forEach((pub, i) => {
      checkNewPage(28);

      doc.setFillColor(...colors.cardBg);
      const cardH = 26;
      doc.roundedRect(margin, y, contentWidth, cardH, 2, 2, 'F');
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentWidth, cardH, 2, 2, 'S');

      // P badge
      doc.setFillColor(...colors.primary);
      doc.roundedRect(margin + 3, y + 3, 8, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      doc.text(`P${i + 1}`, margin + 4.5, y + 7.5);

      // Title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      const titleLines = doc.splitTextToSize(pub.title || '', contentWidth - 20);
      doc.text(titleLines[0], margin + 14, y + 7);

      // Meta
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.muted);
      const meta = [
        pub.source,
        pub.year,
        pub.authors?.[0] ? `${pub.authors[0]}${pub.authors.length > 1 ? ` +${pub.authors.length - 1}` : ''}` : ''
      ].filter(Boolean).join('  ·  ');
      doc.text(meta, margin + 14, y + 13);

      // Snippet
      if (pub.snippet) {
        doc.setFontSize(7);
        doc.setTextColor(150, 170, 190);
        const snipLines = doc.splitTextToSize(pub.snippet, contentWidth - 20);
        doc.text(snipLines[0], margin + 14, y + 19);
      }

      // URL
      if (pub.url) {
        doc.setFontSize(6.5);
        doc.setTextColor(...colors.primary);
        doc.text(pub.url.substring(0, 60), margin + 14, y + 24);
      }

      y += cardH + 3;
    });
  }

  // ── CLINICAL TRIALS ──────────────────────────────────────
  const trials = sources?.clinicalTrials || [];
  if (trials.length > 0) {
    checkNewPage(30);

    y += 4;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.teal);
    doc.text('CLINICAL TRIALS', margin, y);
    y += 8;

    trials.forEach((trial, i) => {
      checkNewPage(28);

      doc.setFillColor(26, 45, 40);
      doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'F');
      doc.setDrawColor(...colors.teal);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'S');

      // T badge
      doc.setFillColor(...colors.teal);
      doc.roundedRect(margin + 3, y + 3, 8, 6, 1, 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.dark);
      doc.text(`T${i + 1}`, margin + 4.5, y + 7.5);

      // Title
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.white);
      const tTitle = doc.splitTextToSize(trial.title || '', contentWidth - 20);
      doc.text(tTitle[0], margin + 14, y + 7);

      // Status + Phase
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.teal);
      doc.text(`${trial.recruitingStatus || ''}  ·  ${trial.phase || ''}`, margin + 14, y + 13);

      // Sponsor
      if (trial.sponsor) {
        doc.setTextColor(...colors.muted);
        doc.text(`Sponsor: ${trial.sponsor}`, margin + 14, y + 19);
      }

      // NCT ID
      if (trial.nctId) {
        doc.setTextColor(...colors.primary);
        doc.text(trial.nctId, margin + 14, y + 24);
      }

      y += 29;
    });
  }

  // ── FOOTER ───────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(17, 24, 39);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text('Curalink — AI Medical Research Assistant', margin, pageHeight - 5);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    doc.text('Not a substitute for professional medical advice', pageWidth / 2, pageHeight - 5, { align: 'center' });
  }

  // Save
  const fileName = `curalink-report-${context?.patientName?.replace(/\s+/g, '-') || 'research'}-${Date.now()}.pdf`;
  doc.save(fileName);
}