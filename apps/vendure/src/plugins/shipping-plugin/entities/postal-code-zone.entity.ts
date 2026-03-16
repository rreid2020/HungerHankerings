import { VendureEntity } from "@vendure/core";
import { Column, Entity } from "typeorm";

/**
 * Shipping rate by 3-character postal prefix (Canadian FSA) or country default.
 * Canada: lookup uses first 3 chars (e.g. K0K, M5V); add rows for FSAs that need a specific rate (e.g. remote).
 * US: prefix "" only.
 */
@Entity()
export class PostalCodeZone extends VendureEntity {
  /** Country code (e.g. CA, US). */
  @Column({ length: 2 })
  countryCode!: string;

  /** 3-char FSA (e.g. K0K, M5V) or empty for country default. */
  @Column({ length: 6, default: "" })
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
