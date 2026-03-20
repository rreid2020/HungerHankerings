import { Component } from "@angular/core";
import { SharedModule } from "@vendure/admin-ui/core";

@Component({
  selector: "shipping-rates-page",
  standalone: true,
  imports: [SharedModule],
  template: `
    <vdr-page-block>
      <iframe
        src="/shipping-rates"
        title="Shipping rates (postal code zones)"
        style="width: 100%; height: calc(100vh - 180px); min-height: 400px; border: none; border-radius: 4px;"
      ></iframe>
    </vdr-page-block>
  `,
})
export class ShippingRatesPageComponent {}
