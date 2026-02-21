import { dataSource } from "@medusajs/medusa/dist/loaders/database"
import LeadSubmission from "../models/lead-submission"

export const LeadSubmissionRepository = dataSource.getRepository(LeadSubmission)
export default LeadSubmissionRepository
