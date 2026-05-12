-- Add provincial fallback zones used when an FSA has no explicit mapping.
-- Global fallback FALLBACK_CANADA remains the final safety net.
INSERT INTO "shipping_zones" (
    "zone_code", "zone_name", "province", "urban_rural", "region_band",
    "flat_rate", "free_shipping_threshold", "active", "sort_order"
) VALUES
    ('FALLBACK_AB', 'Fallback Alberta Shipping', 'AB', 'fallback', 'fallback', 16.99, 150.00, true, 901),
    ('FALLBACK_BC', 'Fallback British Columbia Shipping', 'BC', 'fallback', 'fallback', 17.99, 150.00, true, 902),
    ('FALLBACK_MB', 'Fallback Manitoba Shipping', 'MB', 'fallback', 'fallback', 17.99, 150.00, true, 903),
    ('FALLBACK_NB', 'Fallback New Brunswick Shipping', 'NB', 'fallback', 'fallback', 19.99, 150.00, true, 904),
    ('FALLBACK_NL', 'Fallback Newfoundland and Labrador Shipping', 'NL', 'fallback', 'fallback', 21.99, 150.00, true, 905),
    ('FALLBACK_NS', 'Fallback Nova Scotia Shipping', 'NS', 'fallback', 'fallback', 19.99, 150.00, true, 906),
    ('FALLBACK_NT', 'Fallback Northwest Territories Shipping', 'NT', 'fallback', 'fallback', 29.99, 150.00, true, 907),
    ('FALLBACK_NU', 'Fallback Nunavut Shipping', 'NU', 'fallback', 'fallback', 39.99, 150.00, true, 908),
    ('FALLBACK_ON', 'Fallback Ontario Shipping', 'ON', 'fallback', 'fallback', 14.99, 150.00, true, 909),
    ('FALLBACK_PE', 'Fallback Prince Edward Island Shipping', 'PE', 'fallback', 'fallback', 19.99, 150.00, true, 910),
    ('FALLBACK_QC', 'Fallback Quebec Shipping', 'QC', 'fallback', 'fallback', 17.99, 150.00, true, 911),
    ('FALLBACK_SK', 'Fallback Saskatchewan Shipping', 'SK', 'fallback', 'fallback', 17.99, 150.00, true, 912),
    ('FALLBACK_YT', 'Fallback Yukon Shipping', 'YT', 'fallback', 'fallback', 29.99, 150.00, true, 913)
ON CONFLICT ("zone_code") DO NOTHING;
