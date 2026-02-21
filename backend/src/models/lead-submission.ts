import {
  BaseEntity,
  generateEntityId
} from "@medusajs/medusa"
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn
} from "typeorm"

@Entity()
export class LeadSubmission extends BaseEntity {
  @PrimaryColumn()
  id: string

  @Column()
  type: string

  @Column({ nullable: true })
  company: string | null

  @Column()
  name: string

  @Column()
  email: string

  @Column({ nullable: true })
  phone: string | null

  @Column({ type: "text", nullable: true })
  message: string | null

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date

  @BeforeInsert()
  private beforeInsert(): void {
    this.id = generateEntityId(this.id, "lead")
  }
}

export default LeadSubmission
