import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/admin.guard';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
