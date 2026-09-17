import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/auth/login.use-case';
import { LoginDto } from '../dto/login.dto';
import { toSuperadminHttpException } from '../http/superadmin-error-mapper';

@Controller('admin/auth')
export class SuperadminAuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    try {
      return await this.loginUseCase.execute(dto);
    } catch (error) {
      throw toSuperadminHttpException(error);
    }
  }
}
