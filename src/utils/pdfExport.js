import jsPDF from 'jspdf';

export const exportToPDF = (data) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Sanitize text to prevent jsPDF character-spacing bugs
  const sanitize = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // zero-width & soft-hyphen
      .replace(/\s+/g, ' ')                          // collapse whitespace
      .trim();
  };

  // Helper function to add text with automatic page breaks
  const addText = (text, fontSize = 11, isBold = false) => {
    const clean = sanitize(String(text));
    if (!clean) return;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(clean, maxWidth);
    
    lines.forEach(line => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(sanitize(line), margin, yPosition);
      yPosition += fontSize * 0.5;
    });
    
    yPosition += 3;
  };

  const addSection = (title, items) => {
    yPosition += 5;
    addText(title, 14, true);
    
    if (Array.isArray(items)) {
      items.forEach(item => {
        addText(`• ${item}`, 11);
      });
    } else if (items) {
      addText(items, 11);
    } else {
      addText('(Inte ifyllt ännu)', 11);
    }
  };

  // Title
  pdf.setFillColor(255, 102, 0);
  pdf.rect(0, 0, pageWidth, 30, 'F');
  pdf.setTextColor(255, 255, 255);
  addText('High Level Design', 20, true);
  addText('Din utbildningsdesign', 12);
  
  pdf.setTextColor(0, 0, 0);
  yPosition += 10;

  // Content
  addSection('Vår nuvarande utmaning är...', data.challenges);
  addSection('Denna utbildning kommer ses som framgångsrik om...', data.success);
  addSection('Målgruppen', data.targetAudience);
  addSection('Vad ska deltagarna lära sig?', data.learningGoals);
  addSection('Vad motiverar dem att lära sig om ämnet?', data.motivation);
  addSection('Vilka beteenden vill vi se mer av?', data.behaviors);
  addSection('Vilka konkreta scenarion är det deltagarna har svårt för idag?', data.scenarios);

  // Footer
  const timestamp = new Date().toLocaleString('sv-SE');
  pdf.setFontSize(9);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Skapad: ${timestamp}`, margin, pageHeight - 10);
  pdf.text('LearningDesigner', pageWidth - margin - 40, pageHeight - 10);

  // Save
  pdf.save('High-Level-Design.pdf');
};

export const exportSpecToPDF = (specText, dashboardData) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // --- Design constants ---
  const colors = {
    primary: [0, 90, 160],
    accent: [255, 102, 0],
    heading: [0, 70, 130],
    subheading: [50, 50, 50],
    body: [40, 40, 40],
    muted: [120, 120, 120],
    divider: [200, 215, 230],
    white: [255, 255, 255],
  };

  const ensureSpace = (needed) => {
    if (yPosition + needed > pageHeight - 20) {
      pdf.addPage();
      yPosition = margin;
    }
  };

  // Sanitize text to prevent jsPDF character-spacing bugs
  const sanitize = (str) => {
    if (!str) return '';
    return str
      .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '') // zero-width & soft-hyphen
      .replace(/\s+/g, ' ')                          // collapse whitespace
      .trim();
  };

  const addText = (text, fontSize = 10, isBold = false, color = colors.body, indent = 0) => {
    const clean = sanitize(String(text));
    if (!clean) return;
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(clean, maxWidth - indent);
    lines.forEach(line => {
      ensureSpace(fontSize * 0.45);
      pdf.text(sanitize(line), margin + indent, yPosition);
      yPosition += fontSize * 0.42;
    });
    yPosition += 1.5;
  };

  const addDivider = () => {
    yPosition += 3;
    pdf.setDrawColor(...colors.divider);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
  };

  const addSectionHeading = (text) => {
    ensureSpace(18);
    yPosition += 6;
    pdf.setFillColor(...colors.accent);
    pdf.rect(margin, yPosition - 4, 3, 7, 'F');
    addText(text, 14, true, colors.heading, 7);
    yPosition += 2;
  };

  const addSubHeading = (text) => {
    ensureSpace(12);
    yPosition += 3;
    addText(text, 11.5, true, colors.subheading);
    yPosition += 1;
  };

  // === TITLE ===
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  pdf.setFillColor(...colors.accent);
  pdf.rect(0, 45, pageWidth, 3, 'F');

  yPosition = 18;
  addText('E-learning Specifikation', 24, true, colors.white);
  addText('Komplett underlag för utbildningsproduktion', 12, false, [180, 210, 240]);

  yPosition = 58;
  const timestamp = new Date().toLocaleString('sv-SE');
  addText('Genererad: ' + timestamp, 9, false, colors.muted);
  addText('Skapad med LearningDesigner', 9, false, colors.muted);
  yPosition += 5;

  // === RAW DATA ===
  addSectionHeading('Underlag från behovsanalysen');

  const rawSections = [
    { label: 'Målgrupp', value: dashboardData?.targetAudience },
    { label: 'Nuvarande utmaningar', value: dashboardData?.challenges },
    { label: 'Framgångskriterier', value: dashboardData?.success },
    { label: 'Lärandemål', value: dashboardData?.learningGoals },
    { label: 'Motivation', value: dashboardData?.motivation },
    { label: 'Önskade beteenden', value: dashboardData?.behaviors },
    { label: 'Konkreta scenarion', value: dashboardData?.scenarios },
  ];

  rawSections.forEach(({ label, value }) => {
    const raw = Array.isArray(value)
      ? (value.length > 0 ? value.join('; ') : '(ej ifyllt)')
      : (value && String(value).trim() ? String(value) : '(ej ifyllt)');
    const displayValue = sanitize(raw);
    ensureSpace(14);
    addText(label, 9.5, true, colors.heading, 2);
    addText(displayValue, 9.5, false, colors.body, 2);
    yPosition += 1;
  });

  addDivider();

  // === AI CONTENT ===
  const mdLines = specText.split('\n');

  for (const mdLine of mdLines) {
    const trimmed = mdLine.trim();

    if (!trimmed) {
      yPosition += 2;
      continue;
    }

    if (trimmed === '---') {
      addDivider();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      addSectionHeading(trimmed.replace(/^## \d+\.\s*/, '').replace(/^## /, ''));
      continue;
    }

    if (trimmed.startsWith('### ')) {
      addSubHeading(trimmed.replace('### ', ''));
      continue;
    }

    // Bold bullet: - **Label:** text
    const boldMatch = trimmed.match(/^[-]\s*\*\*(.+?)\*\*\s*(.*)/);
    if (boldMatch) {
      ensureSpace(10);
      addText('- ' + boldMatch[1], 10, true, colors.subheading, 4);
      if (boldMatch[2]) {
        yPosition -= 1.5;
        addText('  ' + boldMatch[2], 10, false, colors.body, 8);
      }
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ')) {
      ensureSpace(8);
      const cleaned = trimmed.replace(/^- /, '').replace(/\*\*/g, '');
      addText('-  ' + cleaned, 10, false, colors.body, 4);
      continue;
    }

    // Numbered items
    if (/^\d+\./.test(trimmed)) {
      ensureSpace(8);
      addText(trimmed.replace(/\*\*/g, ''), 10, false, colors.body, 2);
      continue;
    }

    // Regular text
    addText(trimmed.replace(/\*\*/g, ''), 10, false, colors.body);
  }

  // === FOOTER ===
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.setDrawColor(...colors.divider);
    pdf.setLineWidth(0.2);
    pdf.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    pdf.text('LearningDesigner', margin, pageHeight - 8);
    pdf.text('Sida ' + i + ' av ' + totalPages, pageWidth - margin - 22, pageHeight - 8);
  }

  pdf.save('E-learning-Specifikation.pdf');
};
