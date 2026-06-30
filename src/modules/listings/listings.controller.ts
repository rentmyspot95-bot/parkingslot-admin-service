import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListingsService } from './listings.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('listings')
@ApiBearerAuth()
@Controller('admin')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get('listings')
  @RequirePermissions('listing.read')
  list(@Query() query: PaginationQueryDto, @Query('bookingMode') bookingMode?: string) {
    return this.listings.list(query, bookingMode);
  }

  @Get('listings/:id')
  @RequirePermissions('listing.read')
  getOne(@Param('id') id: string) {
    return this.listings.getOne(id);
  }

  @Post('listings/:id/moderate')
  @RequirePermissions('listing.approve', 'listing.takedown')
  moderate(@Param('id') id: string, @Body() body: { action: string; note?: string }) {
    return this.listings.moderate(id, body);
  }

  @Patch('listings/:id')
  @RequirePermissions('listing.edit')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.listings.update(id, body);
  }
}
