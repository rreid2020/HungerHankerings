import { registerRouteComponent } from "@vendure/admin-ui/core";
import { ShippingRatesPageComponent } from "./shipping-rates-page.component";

export default [
  registerRouteComponent({
    path: "",
    component: ShippingRatesPageComponent,
    breadcrumb: "Shipping rates",
  }),
];
