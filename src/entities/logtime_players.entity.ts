import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LogtimePlayers {
	@PrimaryGeneratedColumn('rowid')
	id: number;

	@Column({ nullable: false })
	username: string;

	@Column({ nullable: false })
	logtime: number;
}
