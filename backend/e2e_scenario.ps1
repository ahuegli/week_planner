$ErrorActionPreference = "Stop"
function Invoke-Api {
  param([string]$Method,[string]$Uri,$Body=$null,[hashtable]$Headers=@{})
  if ($null -ne $Body) {
    Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 10)
  } else {
    Invoke-RestMethod -Method $Method -Uri $Uri -Headers $Headers
  }
}
$base='http://localhost:3000/api/v1'
$loginResp = Invoke-Api -Method 'POST' -Uri "$base/auth/login" -Body @{ email='demo@example.com'; password='demo123' }
$token = $loginResp.access_token
if ([string]::IsNullOrWhiteSpace($token)) { throw 'Token missing' }
$auth=@{ Authorization="Bearer $token" }

$plansResp = Invoke-Api -Method 'GET' -Uri "$base/plans" -Headers $auth
$plans = if ($plansResp.data) { @($plansResp.data) } else { @($plansResp) }
if ($plans.Count -eq 0) { throw 'No plans found' }
$selectedPlan = $plans | Sort-Object -Property @{Expression={ if ($_.updatedAt) { [datetime]$_.updatedAt } elseif ($_.createdAt) { [datetime]$_.createdAt } else { [datetime]'1900-01-01' } }; Descending=$true } | Select-Object -First 1
$planId = $selectedPlan.id

Invoke-Api -Method 'PUT' -Uri "$base/scheduler-settings" -Headers $auth -Body @{ preferredWorkoutTimes=@('Evening'); autoPlaceEarliestTime='07:00'; autoPlaceLatestTime='22:00' } | Out-Null

$eventsResp = Invoke-Api -Method 'GET' -Uri "$base/calendar-events" -Headers $auth
$events = if ($eventsResp.data) { @($eventsResp.data) } else { @($eventsResp) }
$toDelete = $events | Where-Object { $_.type -eq 'shift' -and $_.isRepeatingWeekly -eq $true }
$deletedShiftIds = @()
foreach ($ev in $toDelete) {
  if ($ev.id) {
    Invoke-Api -Method 'DELETE' -Uri "$base/calendar-events/$($ev.id)" -Headers $auth | Out-Null
    $deletedShiftIds += $ev.id
  }
}
$createdShiftIds = @()
for ($d=0; $d -le 4; $d++) {
  $created = Invoke-Api -Method 'POST' -Uri "$base/calendar-events" -Headers $auth -Body @{ title='Work Shift'; type='shift'; dayOfWeek=$d; startTime='08:00'; endTime='17:00'; commuteMinutes=30; isRepeatingWeekly=$true }
  if ($created.id) { $createdShiftIds += $created.id }
}

Invoke-Api -Method 'POST' -Uri "$base/scheduler/generate-plan" -Headers $auth -Body @{ planId=$planId } | Out-Null

$weeksResp = Invoke-Api -Method 'GET' -Uri "$base/plans/$planId/weeks" -Headers $auth
$weeks = if ($weeksResp.data) { @($weeksResp.data) } else { @($weeksResp) }
$week1 = $weeks | Where-Object { $_.weekNumber -eq 1 } | Select-Object -First 1
if (-not $week1) { throw 'Week 1 not found' }
$startDate=[string]$week1.startDate
$endDate=[string]$week1.endDate

$weekEventsResp = Invoke-Api -Method 'GET' -Uri "$base/calendar-events?startDate=$startDate&endDate=$endDate" -Headers $auth
$weekEvents = if ($weekEventsResp.data) { @($weekEventsResp.data) } else { @($weekEventsResp) }
$workouts = $weekEvents | Where-Object { $_.type -eq 'workout' }
$context = $weekEvents | Where-Object { $_.type -ne 'workout' }

$dayNames=@('Sun','Mon','Tue','Wed','Thu','Fri','Sat')
$workoutRows = $workouts | ForEach-Object {
  [pscustomobject]@{
    title=$_.title
    day=if($null -ne $_.dayOfWeek){$dayNames[[int]$_.dayOfWeek]}else{''}
    dayOfWeek=$_.dayOfWeek
    date=$_.date
    startTime=$_.startTime
    endTime=$_.endTime
  }
}
$contextRows = $context | ForEach-Object {
  [pscustomobject]@{
    title=$_.title
    type=$_.type
    day=if($null -ne $_.dayOfWeek){$dayNames[[int]$_.dayOfWeek]}else{''}
    date=$_.date
    time="$($_.startTime)-$($_.endTime)"
  }
}

function InEveningWindow([string]$time) {
  if ([string]::IsNullOrWhiteSpace($time)) { return $false }
  $t=[datetime]::ParseExact($time,'HH:mm',$null)
  $s=[datetime]::ParseExact('17:00','HH:mm',$null)
  $e=[datetime]::ParseExact('19:00','HH:mm',$null)
  return ($t -ge $s -and $t -le $e)
}

$easyStrength = $workouts | Where-Object { $_.title -match '(?i)easy|strength' }
$easyStrengthWeekday1700to1900 = (@($easyStrength).Count -gt 0) -and (@($easyStrength | Where-Object { $_.dayOfWeek -ge 1 -and $_.dayOfWeek -le 5 -and (InEveningWindow $_.startTime) }).Count -eq @($easyStrength).Count)

$longRun = $workouts | Where-Object { $_.title -match '(?i)long\s*run' }
$longRunSundayMorning = @($longRun | Where-Object { $_.dayOfWeek -eq 6 -and ([datetime]::ParseExact($_.startTime,'HH:mm',$null) -lt [datetime]::ParseExact('12:00','HH:mm',$null)) }).Count -gt 0

$report = [pscustomobject]@{
  planId = $planId
  week1 = [pscustomobject]@{ startDate=$startDate; endDate=$endDate }
  workoutPlacements = $workoutRows | Select-Object title,day,date,startTime,endTime
  checks = [pscustomobject]@{
    easyStrengthWeekday1700to1900 = $easyStrengthWeekday1700to1900
    longRunSundayMorning = $longRunSundayMorning
  }
  housekeeping = [pscustomobject]@{
    deletedRepeatingShiftCount = @($deletedShiftIds).Count
    createdRepeatingShiftCount = @($createdShiftIds).Count
  }
}

"=== JSON REPORT ==="
$report | ConvertTo-Json -Depth 8
"=== WORKOUTS TABLE ==="
$workoutRows | Sort-Object date,startTime | Format-Table title,day,date,startTime,endTime -AutoSize
"=== NON-WORKOUT CONTEXT TABLE ==="
$contextRows | Sort-Object date,time | Format-Table title,type,day,date,time -AutoSize
