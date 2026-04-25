SELECT COUNT(*) AS total FROM planned_sessions;
SELECT COUNT(*) AS with_rules FROM planned_sessions WHERE "cyclePhaseRules" IS NOT NULL;
SELECT "sessionType", "cyclePhaseRules" FROM planned_sessions WHERE "cyclePhaseRules" IS NOT NULL LIMIT 3;
