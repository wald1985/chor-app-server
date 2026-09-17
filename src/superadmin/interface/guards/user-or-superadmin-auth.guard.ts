import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UserOrSuperadminAuthGuard extends AuthGuard([
  'jwt',
  'superadmin-jwt',
]) {}
