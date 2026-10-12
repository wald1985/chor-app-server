import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CommunityMemberGuard,
  CommunityPermission,
  JwtAuthGuard,
  RequirePermission,
} from '../../../identity';
import { ArchivePersonUseCase } from '../../application/use-cases/archive-person.use-case';
import { CreatePersonUseCase } from '../../application/use-cases/create-person.use-case';
import { GetPersonUseCase } from '../../application/use-cases/get-person.use-case';
import { ListPeopleUseCase } from '../../application/use-cases/list-people.use-case';
import { RestorePersonUseCase } from '../../application/use-cases/restore-person.use-case';
import { UpdatePersonUseCase } from '../../application/use-cases/update-person.use-case';
import { Person } from '../../domain/entities/person.entity';
import {
  CreatePersonDto,
  ListPeopleQueryDto,
  UpdatePersonDto,
} from '../dto/people.dto';
import { toPeopleHttpException } from '../http/people-error-mapper';

const toView = (person: Person) => ({
  id: person.id,
  name: person.nameValue,
  roles: [...person.roles],
  archived: person.isArchived,
  archivedAt: person.archivedAt,
  createdAt: person.createdAt,
  updatedAt: person.updatedAt,
});

@Controller('communities/:communityId/people')
@UseGuards(JwtAuthGuard, CommunityMemberGuard)
export class PeopleController {
  // eslint-disable-next-line max-params -- one use case per endpoint
  constructor(
    private readonly listPeopleUseCase: ListPeopleUseCase,
    private readonly getPersonUseCase: GetPersonUseCase,
    private readonly createPersonUseCase: CreatePersonUseCase,
    private readonly updatePersonUseCase: UpdatePersonUseCase,
    private readonly archivePersonUseCase: ArchivePersonUseCase,
    private readonly restorePersonUseCase: RestorePersonUseCase,
  ) {}

  @Get()
  async list(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Query() query: ListPeopleQueryDto,
  ) {
    try {
      const people = await this.listPeopleUseCase.execute({
        communityId,
        role: query.role,
        includeArchived: query.includeArchived,
      });
      return people.map(toView);
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }

  @Get(':personId')
  async get(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    try {
      return toView(
        await this.getPersonUseCase.execute({ communityId, personId }),
      );
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }

  @Post()
  @RequirePermission(CommunityPermission.PEOPLE_MANAGE)
  async create(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Body() dto: CreatePersonDto,
  ) {
    try {
      const person = await this.createPersonUseCase.execute({
        communityId,
        name: dto.name,
        roles: dto.roles,
      });
      return toView(person);
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }

  @Patch(':personId')
  @RequirePermission(CommunityPermission.PEOPLE_MANAGE)
  async update(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
    @Body() dto: UpdatePersonDto,
  ) {
    try {
      const person = await this.updatePersonUseCase.execute({
        communityId,
        personId,
        name: dto.name,
        roles: dto.roles,
      });
      return toView(person);
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }

  @Post(':personId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(CommunityPermission.PEOPLE_MANAGE)
  async archive(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    try {
      return toView(
        await this.archivePersonUseCase.execute({ communityId, personId }),
      );
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }

  @Post(':personId/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission(CommunityPermission.PEOPLE_MANAGE)
  async restore(
    @Param('communityId', ParseUUIDPipe) communityId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    try {
      return toView(
        await this.restorePersonUseCase.execute({ communityId, personId }),
      );
    } catch (error) {
      throw toPeopleHttpException(error);
    }
  }
}
