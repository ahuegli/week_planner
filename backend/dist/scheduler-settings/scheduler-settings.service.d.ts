import { Repository } from 'typeorm';
import { SchedulerSettings } from './scheduler-settings.entity';
import { UpdateSchedulerSettingsDto } from './scheduler-settings.dto';
export declare class SchedulerSettingsService {
    private readonly settingsRepository;
    constructor(settingsRepository: Repository<SchedulerSettings>);
    findByUser(userId: string): Promise<SchedulerSettings>;
    create(userId: string): Promise<SchedulerSettings>;
    update(userId: string, dto: UpdateSchedulerSettingsDto): Promise<SchedulerSettings>;
}
