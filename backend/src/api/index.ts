import { Router } from "express"
import cors from "cors"
import storeLeads from "./store/leads"
import adminLeads from "./admin/leads"

export default (rootDirectory: string, app: Router): Router => {
  const storeRouter = Router()
  const adminRouter = Router()

  const { projectConfig } = require(`${rootDirectory}/medusa-config`)

  app.use("/store", storeRouter)
  app.use("/admin", adminRouter)

  storeRouter.use(
    cors({
      origin: projectConfig.store_cors || "*",
      credentials: true
    })
  )
  adminRouter.use(
    cors({
      origin: projectConfig.admin_cors || "*",
      credentials: true
    })
  )

  storeLeads(storeRouter)
  adminLeads(adminRouter)

  return app
}
