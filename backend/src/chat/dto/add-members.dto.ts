import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class AddMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  memberIds: string[];
}
