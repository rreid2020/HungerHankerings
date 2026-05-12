-- Expand starter shipping seed to province/territory-specific zones.
-- Keep this additive so existing environments can migrate safely.

INSERT INTO "shipping_zones" (
    "zone_code", "zone_name", "province", "urban_rural", "region_band",
    "flat_rate", "free_shipping_threshold", "active", "sort_order"
) VALUES
    -- Atlantic provinces (replace generic ATLANTIC_* usage with province-specific zones)
    ('NB_URBAN', 'New Brunswick Urban', 'NB', 'urban', 'atlantic', 14.99, 150.00, true, 141),
    ('NB_RURAL', 'New Brunswick Rural', 'NB', 'rural', 'atlantic', 19.99, 150.00, true, 142),
    ('NS_URBAN', 'Nova Scotia Urban', 'NS', 'urban', 'atlantic', 14.99, 150.00, true, 143),
    ('NS_RURAL', 'Nova Scotia Rural', 'NS', 'rural', 'atlantic', 19.99, 150.00, true, 144),
    ('NL_URBAN', 'Newfoundland and Labrador Urban', 'NL', 'urban', 'atlantic', 16.99, 150.00, true, 145),
    ('NL_RURAL', 'Newfoundland and Labrador Rural', 'NL', 'rural', 'atlantic', 21.99, 150.00, true, 146),
    ('PE_URBAN', 'Prince Edward Island Urban', 'PE', 'urban', 'atlantic', 15.99, 150.00, true, 147),
    ('PE_RURAL', 'Prince Edward Island Rural', 'PE', 'rural', 'atlantic', 20.99, 150.00, true, 148),

    -- Territories (standard + remote; territories are always far north bands)
    ('YT_STANDARD', 'Yukon Standard', 'YT', 'far_north', 'far_north', 29.99, 150.00, true, 171),
    ('YT_REMOTE', 'Yukon Remote', 'YT', 'far_north', 'remote', 34.99, 150.00, true, 172),
    ('NT_STANDARD', 'Northwest Territories Standard', 'NT', 'far_north', 'far_north', 32.99, 150.00, true, 173),
    ('NT_REMOTE', 'Northwest Territories Remote', 'NT', 'far_north', 'remote', 37.99, 150.00, true, 174),
    ('NU_STANDARD', 'Nunavut Standard', 'NU', 'far_north', 'far_north', 39.99, 150.00, true, 175),
    ('NU_REMOTE', 'Nunavut Remote', 'NU', 'far_north', 'remote', 44.99, 150.00, true, 176)
ON CONFLICT ("zone_code") DO NOTHING;

-- Re-map existing Atlantic starter FSAs from generic ATLANTIC_* to province-specific zones.
UPDATE "postal_fsa_regions"
SET "shipping_zone_code" = CASE
    WHEN "province" = 'NB' AND "urban_rural" = 'urban' THEN 'NB_URBAN'
    WHEN "province" = 'NB' THEN 'NB_RURAL'
    WHEN "province" = 'NS' AND "urban_rural" = 'urban' THEN 'NS_URBAN'
    WHEN "province" = 'NS' THEN 'NS_RURAL'
    WHEN "province" = 'NL' AND "urban_rural" = 'urban' THEN 'NL_URBAN'
    WHEN "province" = 'NL' THEN 'NL_RURAL'
    WHEN "province" = 'PE' AND "urban_rural" = 'urban' THEN 'PE_URBAN'
    WHEN "province" = 'PE' THEN 'PE_RURAL'
    ELSE "shipping_zone_code"
END
WHERE "province" IN ('NB', 'NS', 'NL', 'PE')
  AND "shipping_zone_code" IN ('ATLANTIC_URBAN', 'ATLANTIC_RURAL');

-- Re-map existing territory starter FSAs from REMOTE_NORTH/FAR_NORTH to territory-specific zones.
UPDATE "postal_fsa_regions"
SET "shipping_zone_code" = CASE
    WHEN "province" = 'YT' AND "urban_rural" IN ('remote', 'far_north') THEN 'YT_REMOTE'
    WHEN "province" = 'YT' THEN 'YT_STANDARD'
    WHEN "province" = 'NT' AND "urban_rural" IN ('remote', 'far_north') THEN 'NT_REMOTE'
    WHEN "province" = 'NT' THEN 'NT_STANDARD'
    WHEN "province" = 'NU' AND "urban_rural" IN ('remote', 'far_north') THEN 'NU_REMOTE'
    WHEN "province" = 'NU' THEN 'NU_STANDARD'
    ELSE "shipping_zone_code"
END
WHERE "province" IN ('YT', 'NT', 'NU')
  AND "shipping_zone_code" IN ('REMOTE_NORTH', 'FAR_NORTH');

-- Add additional territorial starter FSAs showing that some far-north areas are more remote.
INSERT INTO "postal_fsa_regions" (
    "fsa", "province", "city", "urban_rural", "region_band", "shipping_zone_code", "active", "notes"
) VALUES
    ('Y0A', 'YT', 'Yukon Rural', 'far_north', 'remote', 'YT_REMOTE', true, 'Starter Yukon remote'),
    ('X0E', 'NT', 'Northwest Territories Remote', 'far_north', 'remote', 'NT_REMOTE', true, 'Starter NWT remote'),
    ('X0G', 'NT', 'Northwest Territories Remote', 'far_north', 'remote', 'NT_REMOTE', true, 'Starter NWT remote'),
    ('X0B', 'NU', 'Nunavut Remote', 'far_north', 'remote', 'NU_REMOTE', true, 'Starter Nunavut remote'),
    ('X0C', 'NU', 'Nunavut Remote', 'far_north', 'remote', 'NU_REMOTE', true, 'Starter Nunavut remote')
ON CONFLICT ("fsa") DO UPDATE
SET
    "province" = EXCLUDED."province",
    "city" = EXCLUDED."city",
    "urban_rural" = EXCLUDED."urban_rural",
    "region_band" = EXCLUDED."region_band",
    "shipping_zone_code" = EXCLUDED."shipping_zone_code",
    "active" = EXCLUDED."active",
    "notes" = EXCLUDED."notes",
    "updated_at" = CURRENT_TIMESTAMP;

-- Retire generic catch-all regional zones now that province/territory zones exist.
UPDATE "shipping_zones"
SET "active" = false
WHERE "zone_code" IN ('ATLANTIC_URBAN', 'ATLANTIC_RURAL', 'REMOTE_NORTH', 'FAR_NORTH');
