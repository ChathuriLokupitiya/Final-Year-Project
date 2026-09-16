export const downloadProfessionalReceipt = (appointment, serviceName, amount) => {
  // Prevent multiple clicks by checking if script is already loading
  if (document.getElementById('html2pdf-script')) {
    return; // Already loading/processing
  }

  const script = document.createElement('script');
  script.id = 'html2pdf-script';
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
  
  const generatePDF = () => {
    // 1. Create a container for the receipt
    const container = document.createElement('div');
    // Hide it off-screen
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    
    // 2. Build the HTML layout
    container.innerHTML = `
      <div id="receipt-content" style="width: 700px; padding: 50px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1f2937; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f3f4f6; padding-bottom: 30px;">
          <div>
            <h1 style="font-size: 32px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; color: #111827;">AURA</h1>
            <p style="font-size: 12px; color: #6b7280; margin-top: 6px; letter-spacing: 0.1em; text-transform: uppercase;">Luxury Beauty</p>
          </div>
          <div style="text-align: right;">
            <h2 style="font-size: 24px; font-weight: 300; color: #9ca3af; margin: 0 0 10px 0; letter-spacing: 0.05em; text-transform: uppercase;">Receipt</h2>
            <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">Colombo, Sri Lanka</p>
            <p style="font-size: 12px; color: #6b7280; margin: 2px 0;">concierge@aura.lk</p>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div>
            <p style="font-size: 11px; color: #9ca3af; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Billed To</p>
            <p style="font-size: 14px; font-weight: 600; color: #111827; margin: 0 0 2px 0;">${appointment.customer?.name || 'Valued Client'}</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0;">${appointment.customer?.email || ''}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 11px; color: #9ca3af; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Receipt Info</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0 0 2px 0;"><span style="font-weight: 600; color: #111827;">Ref:</span> ${appointment.bookingReference || 'N/A'}</p>
            <p style="font-size: 14px; color: #4b5563; margin: 0;"><span style="font-weight: 600; color: #111827;">Date:</span> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        
        <div style="margin-bottom: 40px;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e5e7eb;">
                <th style="text-align: left; padding: 12px 0; font-size: 12px; color: #111827; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Description</th>
                <th style="text-align: right; padding: 12px 0; font-size: 12px; color: #111827; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 20px 0; border-bottom: 1px solid #f3f4f6;">
                   <div style="font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 4px;">${serviceName}</div>
                   <div style="font-size: 13px; color: #6b7280;">Appointment: ${new Date(appointment.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${appointment.startTime}</div>
                </td>
                <td style="padding: 20px 0; font-size: 15px; font-weight: 500; color: #111827; text-align: right; border-bottom: 1px solid #f3f4f6;">LKR ${amount}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div style="display: flex; justify-content: flex-end; margin-bottom: 60px;">
          <div style="width: 300px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
              <span style="color: #6b7280;">Subtotal</span>
              <span style="font-weight: 500; color: #374151;">LKR ${amount}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6;">
              <span style="color: #6b7280;">Tax (Included)</span>
              <span style="font-weight: 500; color: #374151;">LKR 0.00</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 16px 0; font-size: 18px; font-weight: 700; color: #111827;">
              <span>Total Paid</span>
              <span>LKR ${amount}</span>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: auto; padding-top: 30px;">
          <p style="font-size: 15px; font-weight: 600; color: #111827; margin: 0 0 8px 0;">Thank you for your visit!</p>
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">If you have any questions about this receipt, please contact us.</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);

    const element = document.getElementById('receipt-content');
    
    const opt = {
      margin:       0.5,
      filename:     `Aura_Receipt_${appointment.bookingReference || 'N_A'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      // Cleanup after generation
      document.body.removeChild(container);
    });
  };

  if (window.html2pdf) {
    generatePDF();
    return;
  }
  
  script.onload = generatePDF;
  document.body.appendChild(script);
};
