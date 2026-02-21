"use client"

import { useEffect, useRef } from "react"

export type AddressAutocompleteResult = {
  address_1: string
  city: string
  province: string
  postal_code: string
  country: string
}

type AddressAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  onAddressSelect: (address: AddressAutocompleteResult) => void
  className?: string
  placeholder?: string
  required?: boolean
  id?: string
  disabled?: boolean
  /** When true, the Places API is loaded and autocomplete will be attached. Pass from useGooglePlacesScript().isLoaded */
  placesReady?: boolean
}

/** Minimal type for Google Places address components to avoid build-time google namespace dependency */
type GeocoderComponent = { types: string[]; long_name: string; short_name: string }

function getComponent(
  components: GeocoderComponent[],
  type: string
): string {
  const c = components.find((c) => c.types.includes(type))
  return c?.long_name ?? ""
}

function getShortComponent(
  components: GeocoderComponent[],
  type: string
): string {
  const c = components.find((c) => c.types.includes(type))
  return c?.short_name ?? ""
}

/**
 * Input with Google Places Autocomplete. On place select, fills address_1, city, province, postal_code, country via onAddressSelect.
 * Restricts to Canada and US. If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set, renders a normal input.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  className,
  placeholder = "Address",
  required,
  id,
  disabled,
  placesReady = true
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const onAddressSelectRef = useRef(onAddressSelect)
  onAddressSelectRef.current = onAddressSelect

  useEffect(() => {
    if (!placesReady || typeof window === "undefined" || !window.google?.maps?.places) return
    const input = inputRef.current
    if (!input) return

    const autocomplete = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: ["ca", "us"] },
      types: ["address"],
      fields: ["place_id", "formatted_address", "address_components"]
    })

    const listener = () => {
      const place = autocomplete.getPlace()
      if (!place?.place_id || !place.address_components?.length) return

      const comp = place.address_components
      const streetNumber = getComponent(comp, "street_number")
      const route = getComponent(comp, "route")
      const address_1 = ([streetNumber, route].filter(Boolean).join(" ") || place.formatted_address) ?? ""
      const city = getComponent(comp, "locality") || getComponent(comp, "sublocality")
      const province = getShortComponent(comp, "administrative_area_level_1")
      const postal_code = getComponent(comp, "postal_code")
      const country = getShortComponent(comp, "country").toUpperCase() || ""

      onAddressSelectRef.current({
        address_1: address_1.trim(),
        city: city.trim(),
        province: province.trim(),
        postal_code: postal_code.trim(),
        country: country === "CA" || country === "US" ? country : "CA"
      })
    }

    autocomplete.addListener("place_changed", listener)
    return () => {
      google.maps.event.clearInstanceListeners(autocomplete)
    }
  }, [placesReady])

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      className={className}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
    />
  )
}
