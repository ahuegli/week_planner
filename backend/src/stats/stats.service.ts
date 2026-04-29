import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutLog } from '../workout-log/workout-log.entity';
import { PlannedSession } from '../planned-session/planned-session.entity';
import { PlanWeek } from '../plan-week/plan-week.entity';
import { TrainingPlan } from '../training-plan/training-plan.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(WorkoutLog)
    private readonly logRepo: Repository<WorkoutLog>,
    @InjectRepository(PlannedSession)
    private readonly sessionRepo: Repository<PlannedSession>,
    @InjectRepository(PlanWeek)
    private readonly weekRepo: Repository<PlanWeek>,
    @InjectRepository(TrainingPlan)
    private readonly planRepo: Repository<TrainingPlan>,
  ) {}

  private toDateString(date: Date): string {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private ratingToNum(r: string): number {
    return r === 'easy' ? 1 : r === 'hard' ? 3 : 2;
  }

  private numToRating(n: number): 'easy' | 'moderate' | 'hard' {
    return n < 1.5 ? 'easy' : n < 2.5 ? 'moderate' : 'hard';
  }

  private parsePaceSeconds(pace: string | null | undefined): number | null {
    if (!pace) return null;
    const [m, s] = pace.split(':').map(Number);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }

  private secondsToPace(s: number): string {
    return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  }

  async getSummary(userId: string) {
    const [logs, plan] = await Promise.all([
      this.logRepo.find({ where: { userId }, order: { completedAt: 'ASC' } }),
      this.planRepo.findOne({
        where: { userId, status: 'active' },
        relations: ['weeks', 'weeks.sessions'],
      }),
    ]);

    const allSessions: PlannedSession[] = plan?.weeks
      ? plan.weeks.flatMap(w => w.sessions ?? [])
      : await this.sessionRepo.find({ where: { userId } });

    const completed = allSessions.filter(s => s.status === 'completed').length;
    const skipped = allSessions.filter(s => s.status === 'skipped').length;
    const completionRate =
      completed + skipped > 0
        ? Math.round((completed / (completed + skipped)) * 100)
        : 0;

    const totalDuration = logs.reduce((sum, l) => sum + (l.actualDuration ?? l.plannedDuration ?? 0), 0);
    const totalDistance = logs.reduce((sum, l) => sum + (l.actualDistance ?? 0), 0);
    const totalCalories = logs.reduce((sum, l) => sum + (l.calories ?? 0), 0);

    const avgRating =
      logs.length > 0
        ? logs.reduce((sum, l) => sum + this.ratingToNum(l.energyRating), 0) / logs.length
        : 2;

    const todayStr = this.toDateString(new Date());
    let thisWeek = { completed: 0, total: 0, keySessionsHit: 0, keySessionsTotal: 0 };
    let currentPlanInfo: {
      mode: string; sportType: string; weekNumber: number;
      totalWeeks: number; phase: string;
    } | null = null;

    if (plan?.weeks) {
      const cw = plan.weeks.find(w => w.startDate <= todayStr && w.endDate >= todayStr);
      if (cw?.sessions) {
        const ws = cw.sessions;
        thisWeek = {
          completed: ws.filter(s => s.status === 'completed').length,
          total: ws.length,
          keySessionsHit: ws.filter(s => s.priority === 'key' && s.status === 'completed').length,
          keySessionsTotal: ws.filter(s => s.priority === 'key').length,
        };
      }
      currentPlanInfo = {
        mode: plan.mode,
        sportType: plan.sportType ?? '',
        weekNumber: cw?.weekNumber ?? plan.currentWeek ?? 1,
        totalWeeks: plan.totalWeeks,
        phase: cw?.phase ?? 'base',
      };
    }

    const now = new Date();
    const earlyBirdCount = logs.filter(l => new Date(l.completedAt).getHours() < 8).length;
    const nightOwlCount = logs.filter(l => new Date(l.completedAt).getHours() >= 20).length;

    const keyCompleted = allSessions.filter(s => s.priority === 'key' && s.status === 'completed').length;
    const keyTotal = allSessions.filter(s => s.priority === 'key' && (s.status === 'completed' || s.status === 'skipped')).length;
    const supportCompleted = allSessions.filter(s => s.priority === 'supporting' && s.status === 'completed').length;
    const supportTotal = allSessions.filter(s => s.priority === 'supporting' && (s.status === 'completed' || s.status === 'skipped')).length;
    const optCompleted = allSessions.filter(s => s.priority === 'optional' && s.status === 'completed').length;
    const optTotal = allSessions.filter(s => s.priority === 'optional' && (s.status === 'completed' || s.status === 'skipped')).length;

    return {
      totalWorkoutsCompleted: completed,
      totalDurationMinutes: Math.round(totalDuration),
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      totalCalories: Math.round(totalCalories),
      averageEnergyRating: this.numToRating(avgRating),
      completionRate,
      keyCompletionRate: keyTotal > 0 ? Math.round((keyCompleted / keyTotal) * 100) : 0,
      supportingCompletionRate: supportTotal > 0 ? Math.round((supportCompleted / supportTotal) * 100) : 0,
      optionalCompletionRate: optTotal > 0 ? Math.round((optCompleted / optTotal) * 100) : 0,
      keyCompleted,
      keyTotal,
      supportCompleted,
      supportTotal,
      optCompleted,
      optTotal,
      currentPlan: currentPlanInfo,
      thisWeek,
      activeSince: logs.length > 0 ? this.toDateString(logs[0].completedAt) : null,
      earlyBirdCount,
      nightOwlCount,
    };
  }

  async getWeekly(userId: string) {
    const [weeks, logs] = await Promise.all([
      this.weekRepo.find({
        where: { userId },
        relations: ['sessions'],
        order: { weekNumber: 'ASC' },
      }),
      this.logRepo.find({ where: { userId } }),
    ]);

    const recentWeeks = weeks.slice(-12);

    const weeklyData = recentWeeks.map(week => {
      const ws = week.sessions ?? [];
      const weekLogs = logs.filter(l => {
        const d = this.toDateString(new Date(l.completedAt));
        return d >= week.startDate && d <= week.endDate;
      });

      const completed = ws.filter(s => s.status === 'completed').length;
      const skipped = ws.filter(s => s.status === 'skipped').length;
      const totalDuration = weekLogs.reduce((sum, l) => sum + (l.actualDuration ?? l.plannedDuration ?? 0), 0);
      const totalDistance = weekLogs.reduce((sum, l) => sum + (l.actualDistance ?? 0), 0);
      const avgRating =
        weekLogs.length > 0
          ? weekLogs.reduce((sum, l) => sum + this.ratingToNum(l.energyRating), 0) / weekLogs.length
          : null;

      return {
        weekStart: week.startDate,
        weekNumber: week.weekNumber,
        phase: week.phase as string,
        completed,
        total: ws.length,
        skipped,
        totalDurationMinutes: Math.round(totalDuration),
        totalDistanceKm: Math.round(totalDistance * 10) / 10,
        keySessionsHit: ws.filter(s => s.priority === 'key' && s.status === 'completed').length,
        keySessionsTotal: ws.filter(s => s.priority === 'key').length,
        averageEnergyRating: avgRating !== null ? this.numToRating(avgRating) : null,
      };
    });

    return { weeks: weeklyData };
  }

  async getStreaks(userId: string) {
    const [logs, planWeeks] = await Promise.all([
      this.logRepo.find({ where: { userId } }),
      this.weekRepo.find({
        where: { userId },
        relations: ['sessions'],
        order: { weekNumber: 'ASC' },
      }),
    ]);

    const todayStr = this.toDateString(new Date());
    const pastWeeks = planWeeks.filter(w => w.startDate <= todayStr);

    // Week streak: consecutive weeks from end where all key sessions completed
    const weekHits = pastWeeks.map(week => {
      const keys = (week.sessions ?? []).filter(s => s.priority === 'key');
      if (keys.length === 0) return false;
      return keys.every(s => s.status === 'completed');
    });

    let currentWeekStreak = 0;
    for (let i = weekHits.length - 1; i >= 0; i--) {
      if (weekHits[i]) currentWeekStreak++;
      else break;
    }

    let bestWeekStreak = 0;
    let wRun = 0;
    for (const hit of weekHits) {
      if (hit) { wRun++; bestWeekStreak = Math.max(bestWeekStreak, wRun); }
      else wRun = 0;
    }

    // Day streak
    const logDates = [...new Set(logs.map(l => this.toDateString(new Date(l.completedAt))))].sort();

    let currentDayStreak = 0;
    const checkDate = new Date();
    while (true) {
      const dateStr = this.toDateString(checkDate);
      if (logDates.includes(dateStr)) {
        currentDayStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    }

    let bestDayStreak = 0;
    let dRun = logDates.length > 0 ? 1 : 0;
    for (let i = 1; i < logDates.length; i++) {
      const diff = Math.round(
        (new Date(logDates[i] + 'T00:00:00').getTime() -
          new Date(logDates[i - 1] + 'T00:00:00').getTime()) /
          86400000,
      );
      if (diff === 1) { dRun++; }
      else { bestDayStreak = Math.max(bestDayStreak, dRun); dRun = 1; }
    }
    bestDayStreak = Math.max(bestDayStreak, dRun);

    // Key session streak
    const allSessions = planWeeks.flatMap(w =>
      (w.sessions ?? [])
        .filter(s => s.priority === 'key' && (s.status === 'completed' || s.status === 'skipped'))
        .map(s => ({ status: s.status, weekNumber: w.weekNumber })),
    ).sort((a, b) => a.weekNumber - b.weekNumber);

    let currentKeySessionStreak = 0;
    for (let i = allSessions.length - 1; i >= 0; i--) {
      if (allSessions[i].status === 'completed') currentKeySessionStreak++;
      else break;
    }

    let bestKeySessionStreak = 0;
    let kRun = 0;
    for (const s of allSessions) {
      if (s.status === 'completed') { kRun++; bestKeySessionStreak = Math.max(bestKeySessionStreak, kRun); }
      else kRun = 0;
    }

    const lastLog = [...logs].sort((a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )[0];

    return {
      currentWeekStreak,
      bestWeekStreak,
      currentDayStreak,
      bestDayStreak,
      currentKeySessionStreak,
      bestKeySessionStreak,
      lastWorkoutDate: lastLog ? this.toDateString(new Date(lastLog.completedAt)) : null,
    };
  }

  async getSportStats(userId: string, sportType: string) {
    const logs = await this.logRepo.find({
      where: { userId, sportType },
      order: { completedAt: 'ASC' },
    });

    const totalDuration = logs.reduce((sum, l) => sum + (l.actualDuration ?? l.plannedDuration ?? 0), 0);
    const totalDistance = logs.reduce((sum, l) => sum + (l.actualDistance ?? 0), 0);

    const paceSeconds = logs
      .map(l => this.parsePaceSeconds(l.averagePace))
      .filter((s): s is number => s !== null);
    const avgPace =
      paceSeconds.length > 0
        ? this.secondsToPace(paceSeconds.reduce((a, b) => a + b, 0) / paceSeconds.length)
        : null;
    const bestPace =
      paceSeconds.length > 0 ? this.secondsToPace(Math.min(...paceSeconds)) : null;

    const speeds = logs.map(l => l.averageSpeed).filter((s): s is number => s != null);
    const avgSpeed =
      speeds.length > 0
        ? Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10
        : null;

    const longestDistLog = logs.reduce<WorkoutLog | null>(
      (best, l) =>
        (l.actualDistance ?? 0) > (best?.actualDistance ?? 0) ? l : best,
      null,
    );
    const longestDurLog = logs.reduce<WorkoutLog | null>(
      (best, l) =>
        (l.actualDuration ?? l.plannedDuration ?? 0) > (best?.actualDuration ?? best?.plannedDuration ?? 0)
          ? l
          : best,
      null,
    );

    // Weekly trend — last 8 Monday-based weeks
    const now = new Date();
    const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1; // Monday=0
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - todayDow);
    thisMonday.setHours(0, 0, 0, 0);

    const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - (7 * (7 - i)));
      const startStr = this.toDateString(weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const endStr = this.toDateString(weekEnd);

      const wl = logs.filter(l => {
        const d = this.toDateString(new Date(l.completedAt));
        return d >= startStr && d <= endStr;
      });

      const wPaces = wl
        .map(l => this.parsePaceSeconds(l.averagePace))
        .filter((s): s is number => s !== null);

      return {
        weekStart: startStr,
        distanceKm: Math.round(wl.reduce((sum, l) => sum + (l.actualDistance ?? 0), 0) * 10) / 10,
        durationMinutes: Math.round(wl.reduce((sum, l) => sum + (l.actualDuration ?? l.plannedDuration ?? 0), 0)),
        sessionsCount: wl.length,
        averagePace:
          wPaces.length > 0
            ? this.secondsToPace(wPaces.reduce((a, b) => a + b, 0) / wPaces.length)
            : null,
      };
    });

    return {
      sportType,
      totalSessions: logs.length,
      totalDurationMinutes: Math.round(totalDuration),
      totalDistanceKm: Math.round(totalDistance * 10) / 10,
      averagePaceMinPerKm: avgPace,
      averageSpeedKmh: avgSpeed,
      bestPace,
      longestSessionKm: longestDistLog?.actualDistance ?? null,
      longestSessionMinutes: longestDurLog
        ? Math.round(longestDurLog.actualDuration ?? longestDurLog.plannedDuration ?? 0)
        : null,
      weeklyTrend,
    };
  }
}
