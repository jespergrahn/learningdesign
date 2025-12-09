import jsPDF from 'jspdf';

export const exportToPDF = (data) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with automatic page breaks
  const addText = (text, fontSize = 11, isBold = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(text, maxWidth);
    
    lines.forEach(line => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
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
