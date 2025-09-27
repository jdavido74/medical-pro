// components/dashboard/modals/PDFPreviewModal.js
import React, { useState, useEffect } from 'react';
import { X, Download, Eye, FileText, Printer } from 'lucide-react';
import { useCountryConfig } from '../../../config/ConfigManager';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const PDFPreviewModal = ({ isOpen, onClose, data, type = 'invoice' }) => {
  const { config } = useCountryConfig();
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    if (isOpen && data) {
      generatePDF();
    }
    
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [isOpen, data]);

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      // Génération du template HTML
      const htmlContent = generateHTMLTemplate();

      // Création d'un élément temporaire pour le rendu
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '794px'; // Largeur A4 en pixels (210mm à 96 DPI * 2.835)
      tempDiv.style.minHeight = '1123px'; // Hauteur minimale A4
      tempDiv.style.background = 'white';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '12px';
      tempDiv.style.lineHeight = '1.4';
      document.body.appendChild(tempDiv);

      // Attendre que le DOM soit rendu et les polices chargées
      await new Promise(resolve => setTimeout(resolve, 200));

      // Conversion HTML vers Canvas avec dimensions exactes
      const canvas = await html2canvas(tempDiv, {
        scale: 1.5, // Qualité équilibrée
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        foreignObjectRendering: false,
        imageTimeout: 0,
        removeContainer: true
      });

      // Nettoyage de l'élément temporaire
      document.body.removeChild(tempDiv);

      // Création du PDF avec jsPDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Dimensions PDF A4
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const contentWidth = 170; // Largeur utile (marges 20mm)
      const contentHeight = 257; // Hauteur utile (marges 20mm haut + 20mm bas pour footer)

      // Calcul des dimensions canvas vers mm (1px = 0.264583mm à 96 DPI)
      const canvasToMmRatio = 0.264583 / 1.5; // Divisé par scale html2canvas
      const imgWidthMm = canvas.width * canvasToMmRatio;
      const imgHeightMm = canvas.height * canvasToMmRatio;

      // Calcul du ratio pour ajuster le contenu dans la zone utile
      const scaleRatio = Math.min(contentWidth / imgWidthMm, contentHeight / imgHeightMm);
      const finalWidth = imgWidthMm * scaleRatio;
      const finalHeight = imgHeightMm * scaleRatio;

      // Position centrée horizontalement, alignée en haut
      const x = (pdfWidth - finalWidth) / 2;
      const y = 20; // Marge haute de 20mm

      // Gestion multi-pages si le contenu dépasse
      if (finalHeight > contentHeight) {
        const pagesNeeded = Math.ceil(finalHeight / contentHeight);

        for (let pageIndex = 0; pageIndex < pagesNeeded; pageIndex++) {
          if (pageIndex > 0) pdf.addPage();

          // Calcul de la portion du canvas pour cette page
          const sourceY = (canvas.height / pagesNeeded) * pageIndex;
          const sourceHeight = Math.min(canvas.height / pagesNeeded, canvas.height - sourceY);

          // Créer un canvas temporaire pour cette page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');

          // Dessiner la portion correspondante
          pageCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

          const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          const pageHeightMm = sourceHeight * canvasToMmRatio * scaleRatio;

          // Ajouter l'image de la page
          pdf.addImage(pageImgData, 'JPEG', x, y, finalWidth, pageHeightMm);

          // Ajouter le footer à chaque page
          addPageFooter(pdf, pageIndex + 1, pagesNeeded);
        }
      } else {
        // Document tient sur une page
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);

        // Ajouter le footer
        addPageFooter(pdf, 1, 1);
      }

      // Conversion en blob pour aperçu
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);

    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Fonction pour ajouter le pied de page à chaque page
  const addPageFooter = (pdf, currentPage, totalPages) => {
    const pdfWidth = 210;
    const pdfHeight = 297;
    const footerY = pdfHeight - 15; // Position à 15mm du bas

    // Ligne de séparation
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, footerY - 5, pdfWidth - 20, footerY - 5);

    // Texte du footer
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);

    // Informations à gauche
    const isInvoice = type === 'invoice';
    const docType = isInvoice ? 'Facture' : 'Devis';
    const docNumber = data.number || 'N/A';
    pdf.text(`${docType} ${docNumber}`, 20, footerY);

    // Numéro de page au centre
    pdf.text(`Page ${currentPage} sur ${totalPages}`, pdfWidth / 2, footerY, { align: 'center' });

    // Date de génération à droite
    const generationDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    pdf.text(`Généré le ${generationDate}`, pdfWidth - 20, footerY, { align: 'right' });

    // Ligne du bas avec conformité
    pdf.setFontSize(7);
    pdf.text('Document conforme à la norme EN 16931 - FacturePro', pdfWidth / 2, footerY + 4, { align: 'center' });
  };

  const generateHTMLTemplate = () => {
    const isInvoice = type === 'invoice';
    const documentTitle = isInvoice ? 'FACTURE' : 'DEVIS';
    const documentNumber = data.number || 'N/A';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${documentTitle} ${documentNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.5;
            color: #333;
            background: white;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          .container {
            width: 794px;
            min-height: 1000px;
            margin: 0;
            padding: 60px;
            background: white;
            box-sizing: border-box;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            align-items: flex-start;
          }
          .company-info { flex: 1; max-width: 45%; }
          .company-name {
            font-size: 18px;
            font-weight: bold;
            color: #1a56db;
            margin-bottom: 8px;
            line-height: 1.2;
          }
          .company-details { font-size: 11px; line-height: 1.4; color: #4b5563; }
          .document-info { text-align: right; max-width: 45%; }
          .document-title {
            font-size: 22px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 8px;
            text-transform: uppercase;
          }
          .document-number { font-size: 14px; color: #6b7280; font-weight: 600; }
          .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            gap: 20px;
          }
          .party { flex: 1; }
          .party-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #374151;
            font-size: 13px;
            text-transform: uppercase;
          }
          .party-details {
            margin-left: 0px;
            font-size: 11px;
            line-height: 1.4;
            color: #4b5563;
          }
          .dates-section {
            margin: 25px 0;
            background: #f8fafc;
            padding: 12px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
          }
          .dates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
          }
          .date-item { }
          .date-label {
            font-weight: bold;
            color: #374151;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .date-value { color: #1f2937; font-size: 11px; font-weight: 500; }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            font-size: 11px;
          }
          .items-table th {
            background: #f1f5f9;
            padding: 10px 8px;
            text-align: left;
            border: 1px solid #cbd5e1;
            font-weight: bold;
            color: #334155;
            font-size: 10px;
            text-transform: uppercase;
          }
          .items-table td {
            padding: 8px;
            border: 1px solid #e2e8f0;
            vertical-align: top;
            color: #1f2937;
          }
          .items-table .text-right { text-align: right; }
          .totals-section { margin: 20px 0; }
          .totals-table {
            width: 60%;
            margin-left: auto;
            border-collapse: collapse;
          }
          .totals-table td {
            padding: 6px 12px;
            font-size: 11px;
            color: #374151;
          }
          .totals-table .label { font-weight: 500; }
          .totals-table .amount { text-align: right; font-weight: 600; }
          .totals-row { border-bottom: 1px solid #e5e7eb; }
          .total-final {
            font-weight: bold;
            font-size: 13px;
            background: #f1f5f9;
            color: #1a56db;
          }
          .total-final td { padding: 10px 12px; }
          .conditions {
            margin: 30px 0;
            font-size: 10px;
            color: #4b5563;
            line-height: 1.4;
          }
          .conditions-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: #374151;
            text-transform: uppercase;
          }
          .legal-mentions {
            margin-top: 30px;
            padding-top: 15px;
            padding-bottom: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #6b7280;
            line-height: 1.3;
          }
          .legal-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #4b5563;
            text-transform: uppercase;
          }
          @media print {
            .container {
              margin: 0;
              box-shadow: none;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${generateHeader(documentTitle, documentNumber)}
          ${generateParties()}
          ${generateDates(isInvoice)}
          ${generateItemsTable()}
          ${generateTotals()}
          ${generateConditions(isInvoice)}
          ${generateLegalMentions()}
        </div>
      </body>
      </html>
    `;
  };

  const generateHeader = (title, number) => `
    <div class="header">
      <div class="company-info">
        <div class="company-name">Mon Entreprise SARL</div>
        <div class="company-details">
          <div>123 Rue de la République</div>
          <div>75001 Paris, France</div>
          <div>SIRET: 12345678901234</div>
          <div>contact@monentreprise.fr</div>
        </div>
      </div>
      <div class="document-info">
        <div class="document-title">${title}</div>
        <div class="document-number">${number}</div>
      </div>
    </div>
  `;

  const generateParties = () => `
    <div class="parties">
      <div class="party">
        <div class="party-title">Émetteur :</div>
        <div class="party-details">
          <div>Mon Entreprise SARL</div>
          <div>123 Rue de la République</div>
          <div>75001 Paris</div>
          <div>France</div>
        </div>
      </div>
      <div class="party">
        <div class="party-title">Client :</div>
        <div class="party-details">
          <div>${data.clientName || 'Client inconnu'}</div>
          <div>Adresse client</div>
          <div>Code postal Ville</div>
          <div>Pays</div>
        </div>
      </div>
    </div>
  `;

  const generateDates = (isInvoice) => {
    const dateLabel = isInvoice ? 'Date de facture' : 'Date du devis';
    const endLabel = isInvoice ? 'Date d\'échéance' : 'Valable jusqu\'au';
    const dateValue = isInvoice ? data.invoiceDate : data.quoteDate;
    const endValue = isInvoice ? data.dueDate : data.validUntil;

    return `
      <div class="dates-section">
        <div class="dates-grid">
          <div class="date-item">
            <div class="date-label">${dateLabel} :</div>
            <div class="date-value">${dateValue ? new Date(dateValue).toLocaleDateString('fr-FR') : 'N/A'}</div>
          </div>
          <div class="date-item">
            <div class="date-label">${endLabel} :</div>
            <div class="date-value">${endValue ? new Date(endValue).toLocaleDateString('fr-FR') : 'N/A'}</div>
          </div>
          ${data.purchaseOrderNumber ? `
            <div class="date-item">
              <div class="date-label">Bon de commande :</div>
              <div class="date-value">${data.purchaseOrderNumber}</div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  const generateItemsTable = () => {
    const items = data.items || [];
    const vatLabel = config?.taxation?.vatLabel || 'TVA';
    
    return `
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>Prix unitaire</th>
            <th>${vatLabel} %</th>
            <th class="text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${item.description || ''}</td>
              <td>${item.quantity || 0}</td>
              <td>${(item.unitPrice || 0).toFixed(2)}€</td>
              <td>${item.taxRate !== null ? item.taxRate : (config?.taxation?.defaultRate || 20)}%</td>
              <td class="text-right">${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}€</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateTotals = () => {
    const vatLabel = config?.taxation?.vatLabel || 'TVA';

    return `
      <div class="totals-section">
        <table class="totals-table">
          <tr class="totals-row">
            <td class="label">Sous-total HT :</td>
            <td class="amount">${(data.subtotal || 0).toFixed(2)}€</td>
          </tr>
          ${data.discountAmount > 0 ? `
            <tr class="totals-row">
              <td class="label">Remise :</td>
              <td class="amount">-${(data.discountAmount || 0).toFixed(2)}€</td>
            </tr>
          ` : ''}
          <tr class="totals-row">
            <td class="label">Total ${vatLabel} :</td>
            <td class="amount">${(data.taxAmount || 0).toFixed(2)}€</td>
          </tr>
          <tr class="total-final">
            <td>Total TTC :</td>
            <td class="amount">${(data.total || 0).toFixed(2)}€</td>
          </tr>
        </table>
      </div>
    `;
  };

  const generateConditions = (isInvoice) => {
    const defaultConditions = isInvoice
      ? `Facture payable dans les ${data.paymentTerms || 30} jours suivant la date d'émission.`
      : `Devis valable ${data.validityDays || 30} jours. Prix et disponibilité sous réserve de confirmation.`;

    const conditions = data.terms || data.notes || defaultConditions;

    return `
      <div class="conditions">
        <div class="conditions-title">Conditions :</div>
        <div>${conditions}</div>
      </div>
    `;
  };

  const generateLegalMentions = () => {
    const mentions = config?.invoice?.legalMentions || [
      'TVA non applicable, art. 293 B du CGI',
      'Dispensé d\'immatriculation au RCS'
    ];

    return `
      <div class="legal-mentions">
        <div class="legal-title">Mentions légales :</div>
        ${mentions.map(mention => `<div>• ${mention}</div>`).join('')}
      </div>
    `;
  };



  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${type === 'invoice' ? 'facture' : 'devis'}_${data.number || 'document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Aperçu {type === 'invoice' ? 'Facture' : 'Devis'} - {data.number}
            </h2>
          </div>
          <div className="flex items-center space-x-3">
            {!isGenerating && pdfUrl && (
              <>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Télécharger</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-hidden">
          {isGenerating ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Génération du PDF en cours...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Application de la mise en forme selon la norme EN 16931
                </p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Aperçu ${type === 'invoice' ? 'facture' : 'devis'}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Eye className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Erreur lors de la génération du PDF</p>
                <button
                  onClick={generatePDF}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer informatif */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Format: PDF/A-3 conforme</span>
              <span>•</span>
              <span>Norme: EN 16931</span>
              <span>•</span>
              <span>Pays: {config?.country?.name || 'France'}</span>
            </div>
            <div>
              Généré le {new Date().toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFPreviewModal;