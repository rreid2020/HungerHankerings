import { Router, Request, Response } from "express"
import auth from "basic-auth"

const router = Router()

const requireBasicAuth = (req: Request, res: Response): boolean => {
  const credentials = auth(req)
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASS

  if (!credentials || credentials.name !== user || credentials.pass !== pass) {
    res.set("WWW-Authenticate", "Basic realm=\"admin\"")
    res.status(401).json({ message: "Unauthorized" })
    return false
  }

  return true
}

router.get("/", async (req: Request, res: Response) => {
  if (!requireBasicAuth(req, res)) {
    return
  }

  const leadSubmissionService = req.scope.resolve("leadSubmissionService")
  const leads = await leadSubmissionService.listLeads()

  res.json({ leads })
})

export default (app: Router): Router => {
  app.use("/leads", router)
  return app
}
