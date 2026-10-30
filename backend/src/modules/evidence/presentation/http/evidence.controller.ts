import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SubmitEvidenceUseCase } from '../../application/use-cases/submit-evidence.use-case';
import { SubmitEvidenceDto } from './dto/submit-evidence.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReporterReputationEntity } from '../../infrastructure/persistence/entities/reporter-reputation.entity';

@ApiTags('Evidencias de Precio (OCR / comunidad)')
@Controller('evidences')
export class EvidenceController {
  constructor(
    private readonly submitEvidenceUseCase: SubmitEvidenceUseCase,
    @InjectRepository(ReporterReputationEntity)
    private readonly reputationRepo: Repository<ReporterReputationEntity>,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Enviar evidencia de precio (foto de ticket o gondola)',
    description:
      'Procesa el ticket, calcula el TrustScore y, si supera el umbral, aplica el precio ' +
      'reportado a la sucursal y lo registra en el historial de precios.',
  })
  @ApiResponse({ status: 201, description: 'Reporte procesado.' })
  async submit(@Body() dto: SubmitEvidenceDto) {
    const result = await this.submitEvidenceUseCase.execute(dto);
    return {
      success: true,
      statusCode: 201,
      data: result,
    };
  }

  @Get('reputation/:reporterId')
  @ApiOperation({ summary: 'Consultar la reputacion de un reportante' })
  async getReputation(@Param('reporterId') reporterId: string) {
    const reputation = await this.reputationRepo.findOne({ where: { reporterId } });

    return {
      success: true,
      statusCode: 200,
      data: reputation
        ? {
            reporterId: reputation.reporterId,
            points: reputation.points,
            reportsCount: reputation.reportsCount,
            acceptedCount: reputation.acceptedCount,
            rejectedCount: reputation.rejectedCount,
            acceptanceRate:
              reputation.reportsCount > 0
                ? Math.round((reputation.acceptedCount / reputation.reportsCount) * 1000) / 1000
                : 0,
          }
        : null,
    };
  }
}
