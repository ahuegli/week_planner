export type ReminderCategory = 'pre-workout' | 'recovery' | 'nutrition' | 'motivation' | 'cycle-aware';

export interface Reminder {
  id: string;
  category: ReminderCategory;
  text: string;
  condition?: string;
}

export const REMINDERS: Reminder[] = [
  // ── Pre-workout ───────────────────────────────────────────────────────────
  {
    id: 'pw-01',
    category: 'pre-workout',
    text: "Pack your gear — you have a tempo run after your shift today.",
    condition: 'has_workout_after_shift',
  },
  {
    id: 'pw-02',
    category: 'pre-workout',
    text: "Don't forget your water bottle. Hydration starts before you lace up.",
    condition: 'has_workout_today',
  },
  {
    id: 'pw-03',
    category: 'pre-workout',
    text: "Your long run is in the morning — lay your kit out tonight.",
    condition: 'has_long_run_tomorrow',
  },
  {
    id: 'pw-04',
    category: 'pre-workout',
    text: "Warm up for at least 10 minutes before your intervals. Cold muscles snap.",
    condition: 'has_interval_today',
  },
  {
    id: 'pw-05',
    category: 'pre-workout',
    text: "You have back-to-back sessions this week — prioritise sleep tonight.",
    condition: 'has_consecutive_days',
  },
  {
    id: 'pw-06',
    category: 'pre-workout',
    text: "Strength session today — remember to log your weights so you can beat them next week.",
    condition: 'has_strength_today',
  },
  {
    id: 'pw-07',
    category: 'pre-workout',
    text: "Swim day — pack goggles, cap, and your pull buoy if you have one.",
    condition: 'has_swim_today',
  },
  {
    id: 'pw-08',
    category: 'pre-workout',
    text: "You're working out within 2 hours of your shift. Keep it short and easy.",
    condition: 'workout_close_to_shift',
  },
  {
    id: 'pw-09',
    category: 'pre-workout',
    text: "Check the weather — your outdoor ride is this afternoon.",
    condition: 'has_outdoor_ride_today',
  },
  {
    id: 'pw-10',
    category: 'pre-workout',
    text: "Early morning session tomorrow — set two alarms and prep your breakfast tonight.",
    condition: 'has_early_morning_session',
  },

  // ── Recovery ──────────────────────────────────────────────────────────────
  {
    id: 'rc-01',
    category: 'recovery',
    text: "Rest day tomorrow — your body adapts while you sleep, not while you train.",
    condition: 'is_day_before_rest',
  },
  {
    id: 'rc-02',
    category: 'recovery',
    text: "Big effort yesterday. 10 minutes of stretching today will pay off in three days.",
    condition: 'day_after_long_session',
  },
  {
    id: 'rc-03',
    category: 'recovery',
    text: "Today is a rest day. A 20-minute walk still counts as active recovery.",
    condition: 'is_rest_day',
  },
  {
    id: 'rc-04',
    category: 'recovery',
    text: "Legs feeling heavy? That's week-over-week load accumulating — it's normal. Trust the plan.",
    condition: 'high_weekly_load',
  },
  {
    id: 'rc-05',
    category: 'recovery',
    text: "You've completed every session this week. Protect that streak with a full night's sleep.",
    condition: 'week_all_sessions_done',
  },

  // ── Nutrition ─────────────────────────────────────────────────────────────
  {
    id: 'nu-01',
    category: 'nutrition',
    text: "Long run tomorrow — eat extra carbs tonight. Pasta, rice, or potatoes work well.",
    condition: 'has_long_run_tomorrow',
  },
  {
    id: 'nu-02',
    category: 'nutrition',
    text: "Strength day today — aim for 25–30 g of protein within 30 minutes of finishing.",
    condition: 'has_strength_today',
  },
  {
    id: 'nu-03',
    category: 'nutrition',
    text: "Race week loading: keep meals familiar and avoid anything new in the last 48 hours.",
    condition: 'is_race_week',
  },
  {
    id: 'nu-04',
    category: 'nutrition',
    text: "Meal prep is scheduled for today — batch cooking your lunches saves 30 minutes every day this week.",
    condition: 'has_mealprep_today',
  },
  {
    id: 'nu-05',
    category: 'nutrition',
    text: "You have two sessions today. Eat a light snack between them — banana, rice cake, or a handful of nuts.",
    condition: 'has_double_session_day',
  },

  // ── Motivation ────────────────────────────────────────────────────────────
  {
    id: 'mo-01',
    category: 'motivation',
    text: "Week 8 of 12 — you're in the hardest phase. It gets easier from here.",
    condition: 'is_week_8_of_12',
  },
  {
    id: 'mo-02',
    category: 'motivation',
    text: "You've logged more sessions this month than last. That's the only stat that matters.",
  },
  {
    id: 'mo-03',
    category: 'motivation',
    text: "Every session you do when you don't feel like it is worth three sessions when you do.",
  },
  {
    id: 'mo-04',
    category: 'motivation',
    text: "Halfway through the plan. The first half teaches your body. The second half reveals it.",
    condition: 'is_plan_halfway',
  },
  {
    id: 'mo-05',
    category: 'motivation',
    text: "You completed your long run last week. That distance is already in your legs permanently.",
    condition: 'completed_long_run_last_week',
  },
  {
    id: 'mo-06',
    category: 'motivation',
    text: "Three sessions in a row. Consistency is the compounding interest of training.",
    condition: 'streak_3',
  },
  {
    id: 'mo-07',
    category: 'motivation',
    text: "A skipped session isn't a failure — it's a data point. Adjust and keep going.",
    condition: 'has_skipped_session',
  },
  {
    id: 'mo-08',
    category: 'motivation',
    text: "Taper week — trust the work you've already put in. Less is more right now.",
    condition: 'is_taper_week',
  },
  {
    id: 'mo-09',
    category: 'motivation',
    text: "You've worked around shift work all plan long. Most people wouldn't even try.",
    condition: 'has_shift_pattern',
  },
  {
    id: 'mo-10',
    category: 'motivation',
    text: "Final week of the plan. Every session from here is a bonus — you've already done the work.",
    condition: 'is_final_week',
  },

  // ── Cycle-aware ───────────────────────────────────────────────────────────
  {
    id: 'cy-01',
    category: 'cycle-aware',
    text: "Follicular phase — great window for your intervals today. Energy and recovery are at their peak.",
    condition: 'cycle_follicular',
  },
  {
    id: 'cy-02',
    category: 'cycle-aware',
    text: "Ovulation window — your strength and pain threshold are highest this week. Push the session.",
    condition: 'cycle_ovulation',
  },
  {
    id: 'cy-03',
    category: 'cycle-aware',
    text: "Luteal phase — you may feel heavier than normal. Stick to the plan; the effort still counts.",
    condition: 'cycle_luteal',
  },
  {
    id: 'cy-04',
    category: 'cycle-aware',
    text: "Menstrual phase — a short, easy session today is better than nothing and better than pushing hard.",
    condition: 'cycle_menstrual',
  },
  {
    id: 'cy-05',
    category: 'cycle-aware',
    text: "Late luteal phase — prioritise sleep and iron-rich foods today. Your body is doing extra work.",
    condition: 'cycle_late_luteal',
  },
];
