import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class LogtimeHistory {
	@PrimaryGeneratedColumn('rowid')
	id: number;

	@Column({ nullable: false })
	username: string;

	@Column({ nullable: false })
	logtime: number;

	@Column({ nullable: false })
	itime: Date;
}
