import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class PlayersLogtime {
	@PrimaryColumn('uuid')
	uuid: string;

	@Column({ nullable: false })
	username: string;

	@Column({ nullable: false })
	logtime: number;
}
