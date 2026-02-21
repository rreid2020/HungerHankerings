# Saleor setup: Snack box sizes and gift option

The storefront supports **Size** (Small, Medium, Large, X-Large) and **Gift option** (Standard vs Gift Box with wrapping + gift card for an extra charge). Configure these in Saleor so the product page shows separate dropdowns and the correct variant/price.

## 1. Create attributes in Saleor Dashboard

1. Go to **Catalog → Attributes** and create two attributes (if not already present):

   - **Size**
     - Type: Dropdown
     - Values: `Small`, `Medium`, `Large`, `X-Large` (add each as an attribute value)

   - **Gift option** (or “Gift”)
     - Type: Dropdown
     - Values: `Standard`, `Gift Box` (or “With gift wrapping & card”)

2. Assign both attributes to your **Product type** (e.g. “Snack Box”):
   - Edit the product type → **Attributes** → add **Size** and **Gift option** as variant attributes.

## 2. Create variants for each product

For each snack box product:

1. Edit the product → **Variants**.
2. Create one variant for each combination you want to sell, for example:
   - Size = Small, Gift option = Standard → set base price.
   - Size = Small, Gift option = Gift Box → set higher price (base + gift fee).
   - Repeat for Medium, Large, X-Large × Standard / Gift Box (8 variants per product if you offer both options).

3. Set the **price** for each variant in the channel (e.g. `default-channel`). Gift Box variants should have a higher price to reflect gift wrapping and gift card.

## 3. How the storefront uses this

- The product page loads variants and their **attributes** from Saleor.
- If a product has multiple attributes (e.g. Size and Gift option), the UI shows **one dropdown per attribute** (“Size”, “Gift option”) instead of a single “Choose a variant” list.
- The selected combination (e.g. Large + Gift Box) is matched to the correct variant; **Add to cart** uses that variant ID and its price. Cart and checkout show the chosen variant name and price.

## 4. Optional: only sizes (no gift option)

If you only want sizes:

- Create only the **Size** attribute and assign it to the product type.
- Create one variant per size (Small, Medium, Large, X-Large) with the right price.
- The storefront will show a single “Size” dropdown and resolve the variant from that.

## 5. Optional: gift as separate add-on product

Alternatively, you can sell “Gift wrapping + card” as a **separate product** (e.g. “Gift Box Add-on”) and add it to the cart when the customer checks a “Add gift wrapping” option. That approach does not use variant attributes; it requires the frontend to add the add-on product to the checkout when the option is selected. The variant-based approach above keeps everything as one product with a clear price per combination.
