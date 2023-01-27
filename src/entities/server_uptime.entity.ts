import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ServerUptime {
	@PrimaryGeneratedColumn('rowid')
	id: number;

	@Column({ nullable: false })
	itime: Date;

	@Column({ nullable: false })
	value: boolean;
}
