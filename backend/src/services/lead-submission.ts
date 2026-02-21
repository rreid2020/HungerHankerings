import { TransactionBaseService } from "@medusajs/medusa"
import { LeadSubmissionRepository } from "../repositories/lead-submission"
import LeadSubmission from "../models/lead-submission"

type LeadInput = {
  type: string
  company?: string | null
  name: string
  email: string
  phone?: string | null
  message?: string | null
}

class LeadSubmissionService extends TransactionBaseService {
  protected leadRepository_: typeof LeadSubmissionRepository

  constructor(container) {
    super(container)
    this.leadRepository_ = container.leadSubmissionRepository
  }

  async createLead(data: LeadInput): Promise<LeadSubmission> {
    const repo = this.activeManager_.withRepository(this.leadRepository_)
    const lead = repo.create(data)
    return await repo.save(lead)
  }

  async listLeads(): Promise<LeadSubmission[]> {
    const repo = this.activeManager_.withRepository(this.leadRepository_)
    return await repo.find({ order: { created_at: "DESC" } })
  }
}

export default LeadSubmissionService
