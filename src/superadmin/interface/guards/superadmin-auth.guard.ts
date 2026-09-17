import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SuperadminAuthGuard extends AuthGuard('superadmin-jwt') {}
