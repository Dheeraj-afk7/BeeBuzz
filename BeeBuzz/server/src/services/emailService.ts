import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;
  
  // Dynamically create a test account on Ethereal.email 
  // This avoids needing real SMTP credentials during development/interview demo
  const testAccount = await nodemailer.createTestAccount();
  
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });
  
  console.log('✅ Ethereal Email initialized. Emails can be previewed in the console.');
  return transporter;
}

export const emailService = {
  sendOTP: async (to: string, otp: string): Promise<void> => {
    try {
      const mailer = await getTransporter();
      
      const info = await mailer.sendMail({
        from: '"BeeBuzz Escrow" <escrow@beebuzz.app>',
        to,
        subject: "Your Payment Release OTP",
        text: `Your OTP to release the escrow payment is: ${otp}\n\nThis OTP will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #FACC15;">BeeBuzz Escrow</h2>
            <p>You have requested to verify a delivery and release payment to the driver.</p>
            <p>Your verification OTP is:</p>
            <h1 style="font-size: 36px; letter-spacing: 5px; background: #f4f4f5; padding: 10px; text-align: center; border-radius: 6px;">${otp}</h1>
            <p style="color: #666; font-size: 12px;">This OTP will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      
      console.log("Message sent: %s", info.messageId);
      console.log("📧 OTP EMAIL PREVIEW URL: %s", nodemailer.getTestMessageUrl(info));
      console.log("👉 CLICK THE LINK ABOVE TO SEE THE OTP EMAIL");
      
    } catch (error) {
      console.error('Error sending OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }
};
