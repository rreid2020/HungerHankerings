import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { Allow, Ctx, Permission, RequestContext, Transaction } from "@vendure/core";
import { PostalCodeZone } from "../entities/postal-code-zone.entity";
import { PostalCodeZoneService } from "../postal-code-zone.service";

@Resolver()
export class PostalZoneAdminResolver {
  constructor(private postalZoneService: PostalCodeZoneService) {}

  @Allow(Permission.ReadSettings)
  @Query()
  postalCodeZones(@Ctx() ctx: RequestContext): Promise<PostalCodeZone[]> {
    return this.postalZoneService.findAll(ctx);
  }

  @Allow(Permission.UpdateSettings)
  @Transaction()
  @Mutation()
  updatePostalCodeZone(
    @Ctx() ctx: RequestContext,
    @Args("id") id: string,
    @Args("rateCents") rateCents: number
  ): Promise<PostalCodeZone | null> {
    return this.postalZoneService.updateRate(ctx, id, rateCents);
  }
}
