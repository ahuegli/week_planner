import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1778183419004 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Baseline migration — schema already exists via synchronize: true.
        // All future schema changes must be proper migrations.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Cannot revert baseline — would require dropping all tables.
    }

}
