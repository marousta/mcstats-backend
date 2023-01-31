import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryPlayersLogtime {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Column('text', { nullable: false, array: true })
	uuids: string[];

	@Column('int', { nullable: false, array: true })
	logtimes: number[];

	@Column({ nullable: false })
	time: Date;
}

export class HistoryPlayersLogtimeMapped extends HistoryPlayersLogtime {
	usernames: string[];
}
