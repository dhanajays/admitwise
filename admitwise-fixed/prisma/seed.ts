import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import * as bcrypt from "bcryptjs"

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding started...")

  // 1. Seed Permissions
  const permissionsData = [
    { name: "manage_users", description: "Create, view, update, delete, suspend users" },
    { name: "manage_datasets", description: "Upload, download, replace, delete, deactivate CSV files" },
    { name: "manage_cms", description: "Edit website homepage sections, footer, pricing, settings" },
    { name: "view_logs", description: "View activity logs, error logs, and audit logs" },
    { name: "manage_payments", description: "View all payments, refunds, and logs" },
    { name: "manage_plans", description: "Add, edit, disable plan configurations" },
    { name: "reply_contact", description: "View and resolve contact inquiries and reply via email" },
    { name: "run_prediction", description: "Execute the predictor engine search" },
  ]

  const permissions: Record<string, any> = {}
  for (const perm of permissionsData) {
    permissions[perm.name] = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm,
    })
  }
  console.log("Permissions seeded.")

  // 2. Seed Roles and Associate Permissions
  const rolesData = [
    {
      name: "Super Admin",
      description: "Full control over all administrative tools and system operations",
      perms: Object.keys(permissions), // All permissions
    },
    {
      name: "Manager",
      description: "Manage users, datasets, plans, and website settings",
      perms: ["manage_users", "manage_datasets", "manage_cms", "view_logs", "manage_payments", "manage_plans", "reply_contact"],
    },
    {
      name: "Support Executive",
      description: "Review payments, logs, and respond to contact requests",
      perms: ["view_logs", "manage_payments", "reply_contact"],
    },
    {
      name: "Counsellor",
      description: "Access student prediction history and reply to contact requests",
      perms: ["reply_contact"],
    },
    {
      name: "Student",
      description: "Predict college admission chances and manage their saved profiles",
      perms: ["run_prediction"],
    },
  ]

  const roles: Record<string, any> = {}
  for (const roleDef of rolesData) {
    const permConnect = roleDef.perms.map((p) => ({ id: permissions[p].id }))
    roles[roleDef.name] = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        description: roleDef.description,
        permissions: {
          set: permConnect,
        },
      },
      create: {
        name: roleDef.name,
        description: roleDef.description,
        permissions: {
          connect: permConnect,
        },
      },
    })
  }
  console.log("Roles seeded and permissions mapped.")

  // 3. Seed Subscription Plans
  const plansData = [
    {
      id: "single",
      name: "Single Predictor",
      price: 499.0,
      description: "Access to any ONE CAP Round (I, II, III or IV). Valid for one selected round only.",
      maxProfiles: 1,
      features: JSON.stringify([
        "1 Percentile Prediction",
        "Access to any ONE CAP Round",
        "Valid for one selected round only",
        "Unlimited College Predictions",
        "Unlimited Branch Comparison",
        "Unlimited Category Comparison",
        "Unlimited Home University Comparison",
        "AI Admission Chance Analysis",
        "Closing Percentile & Rank Analysis",
        "Save & Download Prediction Report",
      ]),
      isEnabled: true,
    },
    {
      id: "multi_round",
      name: "Multi-Round Predictor",
      price: 1800.0,
      description: "Perfect for students who want to compare and predict across all 4 CAP Rounds.",
      maxProfiles: 2,
      features: JSON.stringify([
        "2 Percentile Profiles",
        "Access to ALL FOUR CAP Rounds",
        "Predict colleges in CAP Round I, II, III & IV",
        "Full filtering & comparisons",
        "Unlimited predictions using saved profiles",
        "Save preference list",
        "Compare all rounds",
      ]),
      isEnabled: true,
    },
    {
      id: "premium",
      name: "Premium CAP Support",
      price: 5000.0,
      description: "Complete guidance throughout CAP Round I, II & III.",
      maxProfiles: 3,
      features: JSON.stringify([
        "3 Percentile Profiles",
        "1:1 Personal Counselling",
        "Complete Support till CAP Round I, II & III",
        "Personalized College & Branch Selection",
        "Preference List Preparation",
        "CAP Form Filling Guidance",
        "24×7 WhatsApp Assistance",
        "Doubt Solving & Admission Strategy",
        "Unlimited Predictions for Saved Percentiles",
      ]),
      isEnabled: true,
    },
    {
      id: "elite",
      name: "Elite Admission Support",
      price: 6000.0,
      description: "Complete admission guidance till final admission.",
      maxProfiles: 4,
      features: JSON.stringify([
        "Everything included in Premium CAP Support",
        "4 Percentile Profiles",
        "Spot Round Support",
        "Institute Level Round Guidance",
        "Management Round Guidance",
        "Personalized Admission Strategy",
        "Continuous Follow-up till Admission Confirmation",
        "Priority WhatsApp Support",
        "Complete End-to-End Admission Assistance",
      ]),
      isEnabled: true,
    },
  ]

  for (const plan of plansData) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        description: plan.description,
        maxProfiles: plan.maxProfiles,
        features: plan.features,
        isEnabled: plan.isEnabled,
      },
      create: plan,
    })
  }
  console.log("Plans seeded.")

  // 4. Seed Website Settings (CMS content)
  const defaultCmsSettings = [
    {
      key: "hero",
      value: JSON.stringify({
        title: "Maharashtra College Predictor",
        subtitle: "AdmitWise College Predictor",
        description: "Predict your engineering college admission chances based on official cutoffs from previous CAP rounds. Get category-wise recommendations and expert 1:1 guidance.",
        badgeText: "🔥 AI-Powered Predictor for 2026",
        ctaPredict: "Predict Your College",
        ctaCounselling: "Book 1:1 Counselling",
      }),
    },
    {
      key: "about",
      value: JSON.stringify({
        heading: "Empowering students in their college admissions journey",
        description: "AdmitWise is Maharashtra's leading digital platform for engineering admission counselling. We build advanced data-driven tools that analyze official cutoffs and ranks, helping students secure the best possible college seat based on their percentile.",
        stats: [
          { value: "15K+", label: "Predictions Made" },
          { value: "98.5%", label: "Accuracy Rate" },
          { value: "400+", label: "Colleges Tracked" },
          { value: "1:1", label: "Expert Support" },
        ],
      }),
    },
    {
      key: "contact",
      value: JSON.stringify({
        email: "admitwisehelp@gmail.com",
        phone: "+91 9209568186",
        address: "Pune, Maharashtra, India",
        businessHours: "Mon–Sat, 10am – 7pm IST",
      }),
    },
    {
      key: "faq",
      value: JSON.stringify([
        {
          question: "How accurate is the college prediction?",
          answer: "Our predictor matches your percentile, category, gender, and university reservations against official historical cutoffs. While cutoff thresholds can shift slightly year-over-year, the predictions represent the most accurate indicator available.",
        },
        {
          question: "What is a Percentile Profile?",
          answer: "A Percentile Profile is one unique Exam + Percentile pair saved to your account. For example, 'MHT CET PCM' with '95.45 percentile' is one profile. Once saved, you can run unlimited predictions and filter by branches, colleges, and categories for that percentile.",
        },
        {
          question: "Can I upgrade my plan later?",
          answer: "Yes, you can upgrade from Single Predictor to Premium CAP Support or Elite Admission Support anytime by paying the difference, or purchase additional percentile slots (+1 profile) for ₹499.",
        },
        {
          question: "How does 1:1 counselling work?",
          answer: "Premium and Elite plan subscribers get assigned an expert counsellor who creates a personalized preference list, assists with form-filling online/offline, and provides 24/7 WhatsApp doubt solving.",
        },
      ]),
    },
    {
      key: "testimonials",
      value: JSON.stringify([
        {
          name: "Rohan Deshmukh",
          college: "Allotted COEP, Pune",
          role: "MHT CET Percentile: 99.42",
          text: "The AdmitWise predictor suggested COEP Computer Engineering in the moderate-to-high category for Round 2, and the counselling team guided me on preference filling. I got allotted in that round! Highly recommended.",
        },
        {
          name: "Pooja Patil",
          college: "Allotted VJTI, Mumbai",
          role: "MHT CET Percentile: 98.78",
          text: "I was confused between IT at VJTI or CS at SPIT. The predictor's cutoff rank margin analysis gave me clear direction. The +1 profile add-on also helped predict for my cousin.",
        },
        {
          name: "Aditya Joshi",
          college: "Allotted PICT, Pune",
          role: "MHT CET Percentile: 97.55",
          text: "The Elite Counselling plan is worth every rupee. The counsellor guided me during the Spot Round and helped me secure a seat in PICT ENTC when I had lost hope.",
        },
      ]),
    },
    {
      key: "footer",
      value: JSON.stringify({
        copyright: "© 2026 AdmitWise. All rights reserved.",
        tagline: "Making college admissions simple, structured, and stress-free.",
        facebook: "https://facebook.com/admitwise",
        instagram: "https://instagram.com/admitwise",
        twitter: "https://twitter.com/admitwise",
        linkedin: "https://linkedin.com/company/admitwise",
      }),
    },
  ]

  for (const setting of defaultCmsSettings) {
    await prisma.websiteSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    })
  }
  console.log("CMS website settings seeded.")

  // 5. Seed Default User Accounts
  const adminPassword = await bcrypt.hash("adminpassword", 10)
  const counsellorPassword = await bcrypt.hash("counsellorpassword", 10)
  const studentPassword = await bcrypt.hash("studentpassword", 10)

  // Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@admitwise.in" },
    update: {
      roleId: roles["Super Admin"].id,
    },
    create: {
      name: "AdmitWise Admin",
      email: "admin@admitwise.in",
      passwordHash: adminPassword,
      roleId: roles["Super Admin"].id,
      emailVerified: new Date(),
    },
  })

  // Counsellor
  await prisma.user.upsert({
    where: { email: "counsellor@admitwise.in" },
    update: {
      roleId: roles["Counsellor"].id,
    },
    create: {
      name: "Senior Counsellor",
      email: "counsellor@admitwise.in",
      passwordHash: counsellorPassword,
      roleId: roles["Counsellor"].id,
      emailVerified: new Date(),
    },
  })

  // Student (Subscribed user)
  const studentUser = await prisma.user.upsert({
    where: { email: "student@admitwise.in" },
    update: {
      roleId: roles["Student"].id,
    },
    create: {
      name: "Jayesh Kumar",
      email: "student@admitwise.in",
      passwordHash: studentPassword,
      roleId: roles["Student"].id,
      emailVerified: new Date(),
      currentPlan: "single",
      paymentStatus: "paid",
      profileLimit: 1,
      profilesUsed: 0,
    },
  })

  // Create an active subscription for the student
  await prisma.subscription.create({
    data: {
      userId: studentUser.id,
      planId: "single",
      maxProfiles: 1,
      status: "active",
      activatedAt: new Date(),
    },
  })

  console.log("Default users and active subscriptions seeded.")
  console.log("Seeding completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
