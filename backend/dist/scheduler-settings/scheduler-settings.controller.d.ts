import { SchedulerSettingsService } from './scheduler-settings.service';
import { UpdateSchedulerSettingsDto } from './scheduler-settings.dto';
export declare class SchedulerSettingsController {
    private readonly settingsService;
    constructor(settingsService: SchedulerSettingsService);
    find(req: any): Promise<import("./scheduler-settings.entity").SchedulerSettings>;
    update(req: any, dto: UpdateSchedulerSettingsDto): Promise<import("./scheduler-settings.entity").SchedulerSettings>;
}
