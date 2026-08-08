import { BillTransaction } from './types'

export interface ReceiptData {
  transaction: BillTransaction
  companyInfo: {
    name: string
    address: string
    phone: string
    email: string
    website: string
  }
}

export function generateReceiptHTML(data: ReceiptData): string {
  const { transaction, companyInfo } = data

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bill Payment Receipt - ${transaction.reference}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .receipt-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .receipt-header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .receipt-header p {
      opacity: 0.9;
      font-size: 14px;
    }
    .receipt-body {
      padding: 30px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    .status-completed {
      background: #d4edda;
      color: #155724;
    }
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin: 30px 0;
    }
    .info-item {
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .info-label {
      font-size: 12px;
      color: #6c757d;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #212529;
    }
    .amount-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #dee2e6;
    }
    .amount-row:last-child {
      border-bottom: none;
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
      padding-top: 15px;
    }
    .timeline {
      margin: 30px 0;
    }
    .timeline-item {
      display: flex;
      align-items: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 10px;
    }
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #667eea;
      margin-right: 15px;
    }
    .timeline-label {
      flex: 1;
      font-size: 14px;
    }
    .timeline-time {
      font-size: 12px;
      color: #6c757d;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #6c757d;
    }
    .footer-links {
      margin-top: 10px;
    }
    .footer-links a {
      color: #667eea;
      text-decoration: none;
      margin: 0 10px;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .receipt-container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>Payment Receipt</h1>
      <p>Transaction Reference: ${transaction.reference}</p>
    </div>
    
    <div class="receipt-body">
      <div style="text-align: center;">
        <span class="status-badge status-${transaction.status}">
          ${transaction.status.toUpperCase()}
        </span>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Biller</div>
          <div class="info-value">${transaction.biller}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Category</div>
          <div class="info-value">${transaction.billerCategory}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Account Number</div>
          <div class="info-value">${transaction.accountNumber}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Account Name</div>
          <div class="info-value">${transaction.accountLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Payment Method</div>
          <div class="info-value">${transaction.paymentMethod}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date & Time</div>
          <div class="info-value">${new Date(transaction.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div class="amount-section">
        <div class="amount-row">
          <span>Bill Amount</span>
          <span>${transaction.currency} ${transaction.amount.toLocaleString()}</span>
        </div>
        <div class="amount-row">
          <span>Service Fee</span>
          <span>${transaction.currency} ${transaction.fee.toLocaleString()}</span>
        </div>
        <div class="amount-row">
          <span>Total Paid</span>
          <span>${transaction.currency} ${(transaction.amount + transaction.fee).toLocaleString()}</span>
        </div>
      </div>

      ${transaction.timeline && transaction.timeline.length > 0 ? `
      <div class="timeline">
        <h3 style="margin-bottom: 15px; font-size: 18px;">Transaction Timeline</h3>
        ${transaction.timeline.map(item => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-label">${item.label}</div>
            <div class="timeline-time">${item.timestamp || ''}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${transaction.gatewayReference ? `
      <div class="info-item" style="margin-top: 20px;">
        <div class="info-label">Gateway Reference</div>
        <div class="info-value" style="font-family: monospace; font-size: 14px;">${transaction.gatewayReference}</div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p><strong>${companyInfo.name}</strong></p>
      <p>${companyInfo.address}</p>
      <p>Email: ${companyInfo.email} | Phone: ${companyInfo.phone}</p>
      <div class="footer-links">
        <a href="${companyInfo.website}">Visit Website</a>
        <a href="mailto:${companyInfo.email}">Contact Support</a>
      </div>
      <p style="margin-top: 15px; font-size: 11px;">
        This is an automated receipt. For any queries, please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>
  `
}

export function generateReceiptText(data: ReceiptData): string {
  const { transaction, companyInfo } = data

  return `
========================================
        BILL PAYMENT RECEIPT
========================================

${companyInfo.name}
${companyInfo.address}
Email: ${companyInfo.email}
Phone: ${companyInfo.phone}

========================================
TRANSACTION DETAILS
========================================

Reference: ${transaction.reference}
Status: ${transaction.status.toUpperCase()}
Date: ${new Date(transaction.createdAt).toLocaleString()}

Biller: ${transaction.biller}
Category: ${transaction.billerCategory}
Account Number: ${transaction.accountNumber}
Account Name: ${transaction.accountLabel}
Payment Method: ${transaction.paymentMethod}

========================================
AMOUNT BREAKDOWN
========================================

Bill Amount:     ${transaction.currency} ${transaction.amount.toLocaleString()}
Service Fee:     ${transaction.currency} ${transaction.fee.toLocaleString()}
                 --------------------------------
Total Paid:      ${transaction.currency} ${(transaction.amount + transaction.fee).toLocaleString()}

${transaction.gatewayReference ? `
Gateway Reference: ${transaction.gatewayReference}
` : ''}

========================================
TRANSACTION TIMELINE
========================================

${transaction.timeline?.map(item => `${item.label}: ${item.timestamp || 'Pending'}`).join('\n') || 'No timeline available'}

========================================

Thank you for using ${companyInfo.name}!
For support, contact: ${companyInfo.email}

========================================
  `.trim()
}
