import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('admin')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('reviews')
  @RequirePermissions('review.read')
  list(@Query() query: PaginationQueryDto) {
    return this.reviews.list(query);
  }

  @Post('reviews/:id/moderate')
  @RequirePermissions('review.moderate')
  moderate(@Param('id') id: string, @Body() body: { action: string; reason: string }) {
    return this.reviews.moderate(id, body);
  }
}
