import nodemailer from "nodemailer"

// Create carrier transporter
const createTransporter = () => {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT) || 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  // Check if credentials exist and are not defaults
  if (!host || !user || !pass || pass.includes("mock")) {
    console.log("⚠️ SMTP configuration is missing or mocked. Email will log to console.")
    return null
  }

  try {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })
  } catch (error) {
    console.error("❌ Failed to initialize Nodemailer SMTP transporter:", error)
    return null
  }
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string
  subject: string
  html: string
  text?: string
}) {
  const transporter = createTransporter()
  const from = process.env.SMTP_FROM || "AdmitWise Support <admitwisehelp@gmail.com>"

  if (!transporter) {
    console.log("=========================================")
    console.log(`✉️ MOCK EMAIL SENT:`)
    console.log(`TO:      ${to}`)
    console.log(`FROM:    ${from}`)
    console.log(`SUBJECT: ${subject}`)
    console.log(`CONTENT: ${text || html.slice(0, 100) + "..."}`)
    console.log("=========================================")
    return { mock: true, messageId: `mock-${Date.now()}` }
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    })
    console.log(`✉️ Email successfully sent to ${to}: ${info.messageId}`)
    return info
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error)
    // Return dummy response so it does not block execution in case of SMTP failure
    return { error, mock: true, messageId: `failed-mock-${Date.now()}` }
  }
}
