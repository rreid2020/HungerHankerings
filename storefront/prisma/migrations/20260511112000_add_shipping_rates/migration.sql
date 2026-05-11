-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zone_code" VARCHAR NOT NULL,
    "zone_name" VARCHAR NOT NULL,
    "province" VARCHAR(2),
    "urban_rural" VARCHAR NOT NULL,
    "region_band" VARCHAR,
    "flat_rate" NUMERIC(10,2) NOT NULL,
    "free_shipping_threshold" NUMERIC(10,2) NOT NULL DEFAULT 150.00,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_fsa_regions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fsa" VARCHAR(3) NOT NULL,
    "province" VARCHAR(2) NOT NULL,
    "city" VARCHAR,
    "urban_rural" VARCHAR NOT NULL,
    "region_band" VARCHAR,
    "shipping_zone_code" VARCHAR NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postal_fsa_regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_fsa_overrides" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fsa" VARCHAR(3) NOT NULL,
    "override_zone_code" VARCHAR NOT NULL,
    "reason" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_fsa_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rate_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" VARCHAR NOT NULL,
    "entity_type" VARCHAR NOT NULL,
    "entity_id" UUID,
    "before_data" JSONB,
    "after_data" JSONB,
    "changed_by" VARCHAR,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_rate_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_zones_zone_code_key" ON "shipping_zones"("zone_code");

-- CreateIndex
CREATE INDEX "idx_shipping_zones_active_sort" ON "shipping_zones"("active", "sort_order");

-- CreateIndex
CREATE INDEX "idx_shipping_zones_province" ON "shipping_zones"("province");

-- CreateIndex
CREATE UNIQUE INDEX "postal_fsa_regions_fsa_key" ON "postal_fsa_regions"("fsa");

-- CreateIndex
CREATE INDEX "idx_postal_fsa_regions_province" ON "postal_fsa_regions"("province");

-- CreateIndex
CREATE INDEX "idx_postal_fsa_regions_zone" ON "postal_fsa_regions"("shipping_zone_code");

-- CreateIndex
CREATE INDEX "idx_postal_fsa_regions_active" ON "postal_fsa_regions"("active");

-- CreateIndex
CREATE UNIQUE INDEX "shipping_fsa_overrides_fsa_key" ON "shipping_fsa_overrides"("fsa");

-- CreateIndex
CREATE INDEX "idx_shipping_fsa_overrides_zone" ON "shipping_fsa_overrides"("override_zone_code");

-- CreateIndex
CREATE INDEX "idx_shipping_fsa_overrides_active" ON "shipping_fsa_overrides"("active");

-- CreateIndex
CREATE INDEX "idx_shipping_rate_audit_entity" ON "shipping_rate_audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_shipping_rate_audit_created_at" ON "shipping_rate_audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "postal_fsa_regions" ADD CONSTRAINT "postal_fsa_regions_shipping_zone_code_fkey" FOREIGN KEY ("shipping_zone_code") REFERENCES "shipping_zones"("zone_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_fsa_overrides" ADD CONSTRAINT "shipping_fsa_overrides_override_zone_code_fkey" FOREIGN KEY ("override_zone_code") REFERENCES "shipping_zones"("zone_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed starter Canadian flat-rate zones. Admin users can edit these after migration.
INSERT INTO "shipping_zones" (
    "zone_code", "zone_name", "province", "urban_rural", "region_band",
    "flat_rate", "free_shipping_threshold", "active", "sort_order"
) VALUES
    ('ON_URBAN_SOUTH', 'Ontario Urban South', 'ON', 'urban', 'south', 9.99, 150.00, true, 10),
    ('ON_RURAL_SOUTH', 'Ontario Rural South', 'ON', 'rural', 'south', 14.99, 150.00, true, 20),
    ('ON_NORTH', 'Ontario North', 'ON', 'north', 'north', 19.99, 150.00, true, 30),
    ('BC_URBAN', 'British Columbia Urban', 'BC', 'urban', 'south', 12.99, 150.00, true, 40),
    ('BC_RURAL', 'British Columbia Rural / Interior', 'BC', 'rural', 'interior', 17.99, 150.00, true, 50),
    ('AB_URBAN', 'Alberta Urban', 'AB', 'urban', 'south', 12.99, 150.00, true, 60),
    ('AB_RURAL', 'Alberta Rural', 'AB', 'rural', 'south', 16.99, 150.00, true, 70),
    ('SK_URBAN', 'Saskatchewan Urban', 'SK', 'urban', 'south', 13.99, 150.00, true, 80),
    ('SK_RURAL', 'Saskatchewan Rural', 'SK', 'rural', 'south', 17.99, 150.00, true, 90),
    ('MB_URBAN', 'Manitoba Urban', 'MB', 'urban', 'south', 13.99, 150.00, true, 100),
    ('MB_RURAL', 'Manitoba Rural', 'MB', 'rural', 'south', 17.99, 150.00, true, 110),
    ('QC_URBAN', 'Quebec Urban', 'QC', 'urban', 'south', 12.99, 150.00, true, 120),
    ('QC_RURAL', 'Quebec Rural', 'QC', 'rural', 'south', 17.99, 150.00, true, 130),
    ('ATLANTIC_URBAN', 'Atlantic Canada Urban', NULL, 'urban', 'atlantic', 14.99, 150.00, true, 140),
    ('ATLANTIC_RURAL', 'Atlantic Canada Rural', NULL, 'rural', 'atlantic', 19.99, 150.00, true, 150),
    ('REMOTE_NORTH', 'Remote North', NULL, 'remote', 'remote', 29.99, 150.00, true, 160),
    ('FAR_NORTH', 'Far North', NULL, 'far_north', 'far_north', 39.99, 150.00, true, 170),
    ('FALLBACK_CANADA', 'Fallback Canada Shipping', NULL, 'fallback', 'fallback', 24.99, 150.00, true, 999)
ON CONFLICT ("zone_code") DO NOTHING;

-- Starter FSA mappings for major urban centers, rural regions, and northern examples.
INSERT INTO "postal_fsa_regions" (
    "fsa", "province", "city", "urban_rural", "region_band", "shipping_zone_code", "active", "notes"
) VALUES
    ('M4B', 'ON', 'Toronto', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Toronto east'),
    ('M5V', 'ON', 'Toronto', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Toronto downtown'),
    ('M6G', 'ON', 'Toronto', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Toronto west'),
    ('M2N', 'ON', 'Toronto', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter North York'),
    ('K1A', 'ON', 'Ottawa', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Ottawa'),
    ('K1P', 'ON', 'Ottawa', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Ottawa central'),
    ('N6A', 'ON', 'London', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter London'),
    ('N6G', 'ON', 'London', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter London north'),
    ('N8X', 'ON', 'Windsor', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Windsor'),
    ('N9A', 'ON', 'Windsor', 'urban', 'south', 'ON_URBAN_SOUTH', true, 'Starter Windsor central'),
    ('K0K', 'ON', 'Eastern Ontario', 'rural', 'south', 'ON_RURAL_SOUTH', true, 'Starter rural eastern Ontario'),
    ('P7B', 'ON', 'Thunder Bay', 'north', 'north', 'ON_NORTH', true, 'Starter Thunder Bay'),
    ('P3E', 'ON', 'Sudbury', 'north', 'north', 'ON_NORTH', true, 'Starter Sudbury'),
    ('V5K', 'BC', 'Vancouver', 'urban', 'south', 'BC_URBAN', true, 'Starter Vancouver east'),
    ('V6B', 'BC', 'Vancouver', 'urban', 'south', 'BC_URBAN', true, 'Starter Vancouver downtown'),
    ('V6E', 'BC', 'Vancouver', 'urban', 'south', 'BC_URBAN', true, 'Starter Vancouver west'),
    ('V0A', 'BC', 'BC Interior', 'rural', 'interior', 'BC_RURAL', true, 'Starter BC interior'),
    ('T2P', 'AB', 'Calgary', 'urban', 'south', 'AB_URBAN', true, 'Starter Calgary'),
    ('T3A', 'AB', 'Calgary', 'urban', 'south', 'AB_URBAN', true, 'Starter Calgary northwest'),
    ('T5J', 'AB', 'Edmonton', 'urban', 'south', 'AB_URBAN', true, 'Starter Edmonton'),
    ('T6G', 'AB', 'Edmonton', 'urban', 'south', 'AB_URBAN', true, 'Starter Edmonton university'),
    ('T0A', 'AB', 'Rural Alberta', 'rural', 'south', 'AB_RURAL', true, 'Starter rural Alberta'),
    ('S4P', 'SK', 'Regina', 'urban', 'south', 'SK_URBAN', true, 'Starter Regina'),
    ('S7K', 'SK', 'Saskatoon', 'urban', 'south', 'SK_URBAN', true, 'Starter Saskatoon'),
    ('S0A', 'SK', 'Rural Saskatchewan', 'rural', 'south', 'SK_RURAL', true, 'Starter rural Saskatchewan'),
    ('R3C', 'MB', 'Winnipeg', 'urban', 'south', 'MB_URBAN', true, 'Starter Winnipeg'),
    ('R2C', 'MB', 'Winnipeg', 'urban', 'south', 'MB_URBAN', true, 'Starter Winnipeg east'),
    ('R0A', 'MB', 'Rural Manitoba', 'rural', 'south', 'MB_RURAL', true, 'Starter rural Manitoba'),
    ('H2Y', 'QC', 'Montreal', 'urban', 'south', 'QC_URBAN', true, 'Starter Montreal old port'),
    ('H3A', 'QC', 'Montreal', 'urban', 'south', 'QC_URBAN', true, 'Starter Montreal downtown'),
    ('H4B', 'QC', 'Montreal', 'urban', 'south', 'QC_URBAN', true, 'Starter Montreal west'),
    ('G0A', 'QC', 'Rural Quebec', 'rural', 'south', 'QC_RURAL', true, 'Starter rural Quebec'),
    ('B3H', 'NS', 'Halifax', 'urban', 'atlantic', 'ATLANTIC_URBAN', true, 'Starter Halifax'),
    ('B4A', 'NS', 'Halifax Regional Municipality', 'urban', 'atlantic', 'ATLANTIC_URBAN', true, 'Starter Halifax suburbs'),
    ('A1A', 'NL', 'St. John''s', 'urban', 'atlantic', 'ATLANTIC_URBAN', true, 'Starter St. John''s'),
    ('C1A', 'PE', 'Charlottetown', 'urban', 'atlantic', 'ATLANTIC_URBAN', true, 'Starter Charlottetown'),
    ('E2L', 'NB', 'Saint John', 'urban', 'atlantic', 'ATLANTIC_URBAN', true, 'Starter Saint John'),
    ('B0J', 'NS', 'Rural Nova Scotia', 'rural', 'atlantic', 'ATLANTIC_RURAL', true, 'Starter rural Atlantic'),
    ('Y1A', 'YT', 'Whitehorse', 'remote', 'remote', 'REMOTE_NORTH', true, 'Starter Whitehorse'),
    ('X1A', 'NT', 'Yellowknife', 'remote', 'remote', 'REMOTE_NORTH', true, 'Starter Yellowknife'),
    ('Y0B', 'YT', 'Rural Yukon', 'far_north', 'far_north', 'FAR_NORTH', true, 'Starter far north Yukon'),
    ('X0A', 'NU', 'Nunavut', 'far_north', 'far_north', 'FAR_NORTH', true, 'Starter Nunavut')
ON CONFLICT ("fsa") DO NOTHING;
