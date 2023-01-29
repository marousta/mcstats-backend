import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ServerUptime {
	@PrimaryGeneratedColumn('uuid')
	uuid: string;

	@Column({ nullable: false })
	time: Date;

	@Column({ nullable: false })
	value: boolean;
}
