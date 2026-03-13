import { Controller, Get, Res } from "@nestjs/common";
import { Response } from "express";
import { shippingRatesPageHtml } from "./shipping-rates-page.html";

/**
 * Serves a simple admin UI for editing postal code zone shipping rates.
 * Open this page while logged in to the Vendure Admin; it uses the same session to call the Admin API.
 */
@Controller("shipping-rates")
export class ShippingRatesUiController {
  @Get()
  page(@Res() res: Response): void {
    res.type("text/html").send(shippingRatesPageHtml);
  }
}
