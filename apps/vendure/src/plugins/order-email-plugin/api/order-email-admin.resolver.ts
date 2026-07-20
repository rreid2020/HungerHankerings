import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { Allow, Ctx, Permission, RequestContext } from "@vendure/core";
import {
  OrderEmailResendService,
  type ResendOrderConfirmationResult,
} from "../order-email-resend.service";

@Resolver()
export class OrderEmailAdminResolver {
  constructor(private orderEmailResendService: OrderEmailResendService) {}

  @Allow(Permission.UpdateOrder)
  @Mutation()
  resendOrderConfirmationEmail(
    @Ctx() ctx: RequestContext,
    @Args("orderCode") orderCode: string,
  ): Promise<ResendOrderConfirmationResult> {
    return this.orderEmailResendService.resendConfirmation(ctx, orderCode);
  }
}
