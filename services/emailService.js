const sendEmail = async (to, subject, body) => {
    console.log('Email service not configured. Would send:', { to, subject, body });
    return { success: true, message: 'Email queued (service not configured)' };
};

const sendContactNotification = async (contactData) => {
    const { email, phone, message } = contactData;
    const subject = 'New Contact Form Submission';
    const body = `
    New contact form submission received:
    
    Email: ${email}
    Phone: ${phone}
    Message: ${message}
    
    Submitted at: ${new Date().toISOString()}
  `;
    return await sendEmail(process.env.ADMIN_EMAIL || 'admin@swiftex.com', subject, body);
};

const sendBugReportNotification = async (bugData) => {
    const { bugName, bugDescription, deviceType } = bugData;
    const subject = `Bug Report: ${bugName}`;
    const body = `
    New bug report received:
    
    Bug Name: ${bugName}
    Description: ${bugDescription}
    Device Type: ${deviceType}
    
    Submitted at: ${new Date().toISOString()}
  `;
    return await sendEmail(process.env.ADMIN_EMAIL || 'admin@swiftex.com', subject, body);
};

module.exports = { sendEmail, sendContactNotification, sendBugReportNotification };
