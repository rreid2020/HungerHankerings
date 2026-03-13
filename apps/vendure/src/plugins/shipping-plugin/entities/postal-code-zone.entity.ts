import { VendureEntity } from "@vendure/core";
import { Column, Entity } from "typeorm";

/**
 * Shipping rate by postal code prefix (e.g. first letter in Canada).
 * Seeded with Canadian first-letter zones; one row per prefix or "default" for country.
 */
@Entity()
export class PostalCodeZone extends VendureEntity {
  /** Country code (e.g. CA, US). */
  @Column({ length: 2 })
  countryCode!: string;

  /** First character of postal code (e.g. M, T) or empty for country default. */
  @Column({ length: 1, default: "" })
  prefix!: string;

  /** Human-readable zone name (e.g. Toronto Metro, Alberta). */
  @Column({ length: 128 })
  zoneName!: string;

  /** Shipping rate in cents (CAD). */
  @Column({ type: "int" })
  rateCents!: number;

  constructor(input?: Partial<PostalCodeZone>) {
    super(input);
  }
}
