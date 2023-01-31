import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class HistoryPlayersOnline {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Column({ nullable: false })
	time: Date;

	@Column({ nullable: false })
	value: number;
}
