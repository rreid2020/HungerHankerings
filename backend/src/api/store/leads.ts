import { Router, Request, Response } from "express"
import nodemailer from "nodemailer"

const router = Router()

type LeadPayload = {
  type: string
  company?: string
  name: string
  email: string
  phone?: string
  message?: string
}

const sendLeadEmail = async (payload: LeadPayload) => {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const port = Number(process.env.SMTP_PORT || 587)
  const to = process.env.ADMIN_EMAIL

  if (!host || !user || !pass || !to) {
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })

  const lines = [
    `Type: ${payload.type}`,
    `Company: ${payload.company || ""}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || ""}`,
    `Message: ${payload.message || ""}`
  ]

  await transporter.sendMail({
    from: `Hunger Hankerings <${user}>`,
    to,
    subject: `New lead submission: ${payload.type}`,
    text: lines.join("\n")
  })
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as LeadPayload & Record<string, string>

  if (!body?.type || !body?.name || !body?.email) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  const leadSubmissionService = req.scope.resolve("leadSubmissionService")

  const knownFields = new Set([
    "type",
    "company",
    "name",
    "email",
    "phone",
    "message"
  ])

  const extraFields = Object.entries(body)
    .filter(([key]) => !knownFields.has(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")

  const composedMessage = [body.message, extraFields].filter(Boolean).join("\n")

  const lead = await leadSubmissionService.createLead({
    type: body.type,
    company: body.company || null,
    name: body.name,
    email: body.email,
    phone: body.phone || null,
    message: composedMessage || null
  })

  await sendLeadEmail(body)

  return res.json({ lead })
})

export default (app: Router): Router => {
  app.use("/leads", router)
  return app
}
