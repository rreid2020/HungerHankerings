import { addNavMenuItem } from "@vendure/admin-ui/core";

export default [
  addNavMenuItem(
    {
      id: "shipping-rates",
      label: "Shipping rates",
      routerLink: ["/extensions", "shipping-rates"],
      icon: "truck",
      requiresPermission: "ReadSettings",
    },
    "settings"
  ),
];
