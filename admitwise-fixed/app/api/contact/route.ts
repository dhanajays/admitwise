import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/email"
import { z } from "zod"

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  subject: z.string().min(2, "Subject is required"),
  message: z.string().min(5, "Message must be at least 5 characters"),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = contactSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", issues: result.error.issues },
        { status: 400 }
      )
    }

    const { name, email, phone, subject, message } = result.data

    // Store in Database
    const contactMsg = await db.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        status: "Pending",
      },
    })

    // Log Activity
    await db.activityLog.create({
      data: {
        action: "CONTACT_SUBMIT",
        details: `Contact request submitted by ${name} (${email}) re: ${subject}`,
      },
    })

    // Send acknowledgement email to student
    await sendMail({
      to: email,
      subject: `We received your inquiry - AdmitWise`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #0c1844;">Dear ${name},</h2>
          <p>Thank you for reaching out to AdmitWise! We have received your inquiry regarding <strong>"${subject}"</strong>.</p>
          <p>Our counselling team will review your message and get back to you within one business day.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #777;">This is an automated receipt. Please do not reply directly to this email.</p>
        </div>
      `,
      text: `Dear ${name},\n\nThank you for reaching out to AdmitWise! We have received your inquiry regarding "${subject}". Our counselling team will review your message and get back to you within one business day.\n\nBest regards,\nAdmitWise Support Team`,
    })

    // Send alert email to admins
    await sendMail({
      to: "admitwisehelp@gmail.com",
      subject: `[New Contact Inquiry] ${subject} - from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
          <h2 style="color: #0c1844;">New Inbound Contact Form</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="background: #f9f9f9; border-left: 5px solid #0c1844; padding: 10px 15px; margin: 0;">${message}</blockquote>
          <p style="margin-top: 20px;"><a href="${process.env.NEXTAUTH_URL}/admin/contact" style="background: #0c1844; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">View in Admin Panel</a></p>
        </div>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "Contact message saved successfully",
      id: contactMsg.id,
    })
  } catch (error) {
    console.error("Error in /api/contact POST:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
