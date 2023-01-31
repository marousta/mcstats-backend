import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { PlayersLogtime } from './logtime.entity';

@Entity()
export class PlayersSessions {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Column({ nullable: false })
	connection_time: Date;

	@ManyToOne((type) => PlayersLogtime, (user) => user.uuid, {
		onDelete: 'CASCADE',
		nullable: false,
	})
	user: PlayersLogtime;
}
