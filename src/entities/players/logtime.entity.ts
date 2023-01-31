import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { PlayersSessions } from './sessions.entity';

@Entity()
export class PlayersLogtime {
	@PrimaryColumn('uuid')
	uuid: string;

	@Column({ nullable: false })
	username: string;

	@Column({ nullable: false })
	logtime: number;
}
