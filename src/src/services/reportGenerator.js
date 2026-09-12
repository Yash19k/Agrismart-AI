import { jsPDF } from 'jspdf';

/**
 * Generate and download a formatted PDF Disease Diagnostic Report for farmers.
 *
 * @param {object} data - The analysis result object from diseaseDemoData or API
 */
export function generateDiseasePdfReport(data) {
  if (!data) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryGreen = [4, 120, 87];     // #047857
  const darkGreen = [6, 95, 70];         // #065f46
  const bgLight = [238, 252, 243];       // #eefcf3
  const textDark = [23, 35, 27];         // #17231b
  const textMuted = [100, 112, 103];     // #647067
  const borderGray = [226, 232, 240];    // #e2e8f0
  const amberColor = [245, 158, 11];     // #f59e0b
  const redColor = [239, 68, 68];        // #ef4444

  let y = 15;

  // ── 1. Top Header Banner ──
  doc.setFillColor(...primaryGreen);
  doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

  // Title inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('AgriSmart AI — Crop Disease Diagnostic Report', margin + 6, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(210, 245, 225);
  doc.text('Farmer-First Agricultural Intelligence & Disease Management Plan', margin + 6, y + 17);

  // Metadata right-aligned in banner
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const reportDate = data.analyzedAt || new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Report Date: ${reportDate}`, pageWidth - margin - 6, y + 10, { align: 'right' });
  doc.text('Location: Pune, Maharashtra', pageWidth - margin - 6, y + 17, { align: 'right' });

  y += 30;

  // ── 2. Diagnostic Summary Box ──
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setTextColor(...primaryGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PRIMARY DIAGNOSTIC SUMMARY', margin + 5, y + 7);

  // Grid fields
  const col1 = margin + 5;
  const col2 = margin + 55;
  const col3 = margin + 115;

  // Row 1
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  doc.text('Crop Species:', col1, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.setFontSize(10);
  doc.text(data.prediction?.cropName || 'Tomato', col1, y + 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Identified Disease:', col2, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red
  doc.setFontSize(10);
  doc.text(`${data.prediction?.diseaseName || 'Early Blight'} (${data.prediction?.pathogen || 'Alternaria solani'})`, col2, y + 20);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Model Confidence:', col3, y + 15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryGreen);
  doc.setFontSize(10);
  doc.text(`${data.prediction?.confidence || 91.4}%`, col3, y + 20);

  // Row 2
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Crop Health Score:', col1, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.setFontSize(9.5);
  doc.text(`${data.cropHealth?.score || 72}/100 (${data.cropHealth?.status || 'Moderate Risk'})`, col1, y + 31.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Infection Severity:', col2, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...amberColor);
  doc.setFontSize(9.5);
  doc.text(data.severity?.level || 'Moderate', col2, y + 31.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Spread Risk:', col3, y + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...redColor);
  doc.setFontSize(9.5);
  doc.text(`${data.spreadRisk?.level || 'High'} Spread Risk`, col3, y + 31.5);

  y += 40;

  // ── 3. Environmental & Weather Intelligence ──
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...textDark);
  doc.text('Live Microclimate at Scan Time:', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...textMuted);
  const temp = `${data.weather?.temperature || 28.6}°C Temperature`;
  const hum = `${data.weather?.humidity || 68}% Humidity`;
  const rainP = `${data.weather?.rainProbability || 32}% Rain Probability`;
  const rainA = `${data.weather?.rainfall || 0.5}mm Precipitation`;
  doc.text(`${temp}   |   ${hum}   |   ${rainP}   |   ${rainA}`, margin + 5, y + 13);

  y += 24;

  // ── 4. About Disease & Symptoms ──
  doc.setTextColor(...primaryGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Disease Description & Biological Characteristics', margin, y);
  y += 4.5;

  doc.setTextColor(...textDark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const desc = data.diseaseInformation?.description ||
    'Early blight is a common fungal disease caused by Alternaria solani. It affects tomato plants and can reduce yield if not managed properly. The disease usually appears as dark, circular spots with yellow halos on older leaves and can spread to stems and fruits.';
  const splitDesc = doc.splitTextToSize(desc, contentWidth);
  doc.text(splitDesc, margin, y);
  y += splitDesc.length * 4 + 4;

  // Symptoms & Causes in 2 columns
  const boxWidth = (contentWidth - 4) / 2;

  // Left: Symptoms
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderGray);
  doc.roundedRect(margin, y, boxWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryGreen);
  doc.text('Observed & Common Symptoms:', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...textDark);
  const symptoms = data.symptoms || [
    'Dark brown circular spots on leaves',
    'Yellow halo around the spots',
    'Older leaves turn yellow and dry',
    'Spots may increase in size over time',
    'Can spread to stems and fruits',
  ];
  let symY = y + 11.5;
  symptoms.slice(0, 5).forEach((sym) => {
    const textStr = typeof sym === 'string' ? sym : sym.title;
    doc.text(`• ${textStr}`, margin + 4, symY);
    symY += 4.5;
  });

  // Right: Possible Causes
  doc.roundedRect(margin + boxWidth + 4, y, boxWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(217, 119, 6); // Amber
  doc.text('Associated Contributing Factors:', margin + boxWidth + 8, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...textDark);
  const causes = data.possibleCauses || [
    'High canopy humidity (> 80%)',
    'Warm daytime temperature (25–30°C)',
    'Poor air circulation in planting rows',
    'Overhead sprinkler watering splashing spores',
    'Infected plant debris left in soil',
  ];
  let causeY = y + 11.5;
  causes.slice(0, 5).forEach((cs) => {
    const textStr = typeof cs === 'string' ? cs : cs.title;
    doc.text(`• ${textStr}`, margin + boxWidth + 8, causeY);
    causeY += 4.5;
  });

  y += 44;

  // ── 5. Recommended Action Plan (Chronological Timeline) ──
  doc.setTextColor(...primaryGreen);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Recommended Field Action Timeline', margin, y);
  y += 4.5;

  const timelineCols = 4;
  const colW = (contentWidth - (timelineCols - 1) * 3) / timelineCols;

  const timelineSteps = Array.isArray(data.actionTimeline)
    ? data.actionTimeline
    : [
        { period: 'Today', priority: 'High Priority', items: ['Remove infected leaves', 'Inspect nearby plants', 'Avoid overhead watering'] },
        { period: 'Next 24h', priority: 'Medium Priority', items: ['Monitor for symptoms', 'Check humidity levels', 'Air circulation'] },
        { period: 'Next 3 Days', priority: 'Medium Priority', items: ['Apply fungicide (expert)', 'Monitor disease spread', 'Check weather'] },
        { period: 'Next Week', priority: 'Low Priority', items: ['Reassess crop health', 'Compare new leaf photos', 'Preventive care'] },
      ];

  timelineSteps.forEach((step, i) => {
    const cardX = margin + i * (colW + 3);
    doc.setFillColor(250, 252, 250);
    doc.setDrawColor(...borderGray);
    doc.roundedRect(cardX, y, colW, 36, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkGreen);
    doc.text(step.period, cardX + colW / 2, y + 5.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...textDark);
    let itemY = y + 11;
    (step.items || []).slice(0, 3).forEach((it) => {
      const itLines = doc.splitTextToSize(`• ${it}`, colW - 4);
      doc.text(itLines, cardX + 2, itemY);
      itemY += itLines.length * 3.5 + 1;
    });

    // Priority pill at bottom
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...(i === 0 ? redColor : primaryGreen));
    doc.text(step.priority || 'Action', cardX + colW / 2, y + 32, { align: 'center' });
  });

  y += 42;

  // ── 6. Smart Irrigation & Agronomist Memo ──
  doc.setFillColor(...bgLight);
  doc.setDrawColor(...primaryGreen);
  doc.roundedRect(margin, y, contentWidth, 25, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkGreen);
  doc.text('Smart Irrigation Advisory:', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('Recommendation: DELAY OVERHEAD IRRIGATION. Apply water strictly via soil-level drip to prevent leaf wetness.', margin + 5, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkGreen);
  doc.text('AI Agronomist Key Directive:', margin + 5, y + 17.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textDark);
  doc.text('Immediately prune lower symptomatic foliage, sanitize pruning tools, and inspect adjacent rows within 5 meters.', margin + 5, y + 22.5);

  y += 30;

  // ── 7. Official Agricultural Disclaimer & Footer ──
  doc.setDrawColor(...borderGray);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...textMuted);
  const disclaimer =
    'Notice: This AI diagnostic report provides decision support and preventive crop management guidance based on visual pattern analysis. Always consult certified agricultural extension officers or agronomists before applying commercial chemical fungicides or synthetic treatments.';
  const splitDisc = doc.splitTextToSize(disclaimer, contentWidth);
  doc.text(splitDisc, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Generated by AgriSmart AI Platform  |  Official Farmer Diagnostic Record', margin, 290);
  doc.text(`Page 1 of 1`, pageWidth - margin, 290, { align: 'right' });

  // Save the PDF file
  const fileName = `AgriSmart_Disease_Report_${data.prediction?.cropName || 'Crop'}_${data.prediction?.diseaseName?.replace(/\s+/g, '_') || 'Diagnosis'}.pdf`;
  doc.save(fileName);
}
