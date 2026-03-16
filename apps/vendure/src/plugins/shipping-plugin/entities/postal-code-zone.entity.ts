import { VendureEntity } from "@vendure/core";
import { Column, Entity } from "typeorm";

/**
 * Shipping zone by 3-character postal prefix (Canadian FSA) or country default.
 * You set your own rate per zone. Optional city/region for display; lookup uses prefix only.
 */
@Entity()
export class PostalCodeZone extends VendureEntity {
  /** Country code (e.g. CA, US). */
  @Column({ length: 2 })
  countryCode!: string;

  /** 3-char FSA (e.g. K0K, M5V) or empty for country default. */
  @Column({ length: 6, default: "" })
  prefix!: string;

  /** Human-readable zone name (e.g. FSA K0K). */
  @Column({ length: 128 })
  zoneName!: string;

  /** City name when available (for display; not used in lookup). */
  @Column({ length: 128, nullable: true })
  city!: string | null;

  /** Region/province when available (e.g. Ontario; for display). */
  @Column({ length: 128, nullable: true })
  region!: string | null;

  /** Your shipping rate in cents (CAD). Set per zone after seed. */
  @Column({ type: "int" })
  rateCents!: number;

  constructor(input?: Partial<PostalCodeZone>) {
    super(input);
  }
}
