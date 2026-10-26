# HopHDND network stability monitor — Windows PowerShell 5.1+.
# Default: 60 minutes, once every 5 seconds; transport timing (HTTP headers), not app UI performance.
# Read-only HTTP GET to public/synthetic endpoints. Never sends tokens or business data.
param(
    [double]$Minutes = 60,
    [int]$IntervalSeconds = 5,
    [int]$TimeoutSeconds = 4,
    [string]$LocalUrl = "http://127.0.0.1:5173/pages.html",
    [string]$SelfHostUrl = "",
    [string]$OutputRoot = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "HopHDND-NetworkReports")
)
$ErrorActionPreference = "Stop"
if ($Minutes -le 0 -or $IntervalSeconds -lt 1 -or $TimeoutSeconds -lt 1) {
    throw "Minutes, IntervalSeconds and TimeoutSeconds must be positive."
}
if ($TimeoutSeconds -ge $IntervalSeconds) {
    throw "TimeoutSeconds must be smaller than IntervalSeconds so probe rounds do not overlap."
}
function Assert-SafeTarget([string]$Url, [bool]$IsLocal) {
    $uri = $null
    if (-not [Uri]::TryCreate($Url,[UriKind]::Absolute,[ref]$uri)) { throw "Invalid target URL." }
    if ($uri.Scheme -notin @("http","https") -or $uri.UserInfo -or $uri.Query -or $uri.Fragment) {
        throw "Target URLs may not have credentials, query parameters, or fragments."
    }
    if (-not $IsLocal -and $uri.Scheme -ne "https") { throw "Remote targets must use HTTPS." }
    return $uri.AbsoluteUri
}
$targets = @(
    [pscustomobject]@{Name="github-pages"; Url="https://cavoixanh638.github.io/HopHDND-WebApp/"},
    [pscustomobject]@{Name="cloudflare-edge-baseline"; Url="https://www.cloudflare.com/cdn-cgi/trace"},
    [pscustomobject]@{Name="firebase-rtdb-transport"; Url="https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app/.info/serverTimeOffset.json"},
    [pscustomobject]@{Name="supabase-staging-auth-health"; Url="https://uguhyunuzsdrkykqgdmq.supabase.co/auth/v1/health"},
    [pscustomobject]@{Name="localhost-webapp"; Url=(Assert-SafeTarget $LocalUrl $true)}
)
if ($SelfHostUrl.Trim()) {
    $targets += [pscustomobject]@{Name="self-host-reachable-url"; Url=(Assert-SafeTarget $SelfHostUrl $false)}
}
# Use per-request async tasks so 5 targets are measured in PARALLEL, not serially.
# Stopwatch stops when response HEADERS arrive: reliable first-response timing, not JS rendering.
Add-Type -ReferencedAssemblies @("System.Net.Http") -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Net.Http;
using System.Threading.Tasks;
public sealed class HopProbeResult {
    public string Name;
    public string Url;
    public int HttpStatus;
    public string Status;
    public string ErrorKind;
    public double LatencyMs;
}
public static class HopProbeRunner {
    public static async Task<HopProbeResult> Run(HttpClient client, string name, string url) {
        var r = new HopProbeResult { Name=name, Url=url, HttpStatus=0, Status="ERROR", ErrorKind="", LatencyMs=0 };
        var clock = Stopwatch.StartNew();
        try {
            using (var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead).ConfigureAwait(false)) {
                clock.Stop();
                r.LatencyMs = Math.Round(clock.Elapsed.TotalMilliseconds, 1);
                r.HttpStatus = (int) response.StatusCode;
                if (r.HttpStatus >= 200 && r.HttpStatus < 400) r.Status = "OK";
                else if (r.HttpStatus == 401 || r.HttpStatus == 403) r.Status = "AUTH_REQUIRED";
                else r.Status = "HTTP_ERROR";
            }
        } catch (TaskCanceledException) {
            clock.Stop(); r.LatencyMs = Math.Round(clock.Elapsed.TotalMilliseconds,1);
            r.Status="TIMEOUT"; r.ErrorKind="TaskCanceledException";
        } catch (Exception ex) {
            clock.Stop(); r.LatencyMs = Math.Round(clock.Elapsed.TotalMilliseconds,1);
            r.Status="TRANSPORT_ERROR"; r.ErrorKind=ex.GetBaseException().GetType().Name;
        }
        return r;
    }
}
'@
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$handler = [System.Net.Http.HttpClientHandler]::new()
$handler.AllowAutoRedirect = $true
$handler.UseCookies = $false
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromSeconds($TimeoutSeconds)
$client.DefaultRequestHeaders.UserAgent.ParseAdd("HopHDND-NetworkProbe/1.0")
$runDir = Join-Path $OutputRoot ("run-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $runDir -Force | Out-Null
$rawCsv = Join-Path $runDir "samples.csv"
$summaryCsv = Join-Path $runDir "summary.csv"
$htmlFile = Join-Path $runDir "report.html"
$samples = [System.Collections.Generic.List[object]]::new()
$rounds = [int][Math]::Ceiling($Minutes*60.0/$IntervalSeconds)
$timer = [Diagnostics.Stopwatch]::StartNew()
$startTime = Get-Date
Write-Host "HopHDND stability: $rounds rounds x $IntervalSeconds seconds, $($targets.Count) targets" -ForegroundColor Cyan
Write-Host "Reports: $runDir"
try {
    for ($round=0; $round -lt $rounds; $round++) {
        $sleepMs = [int][Math]::Max(0, [Math]::Floor(($round*$IntervalSeconds-$timer.Elapsed.TotalSeconds)*1000))
        if ($sleepMs -gt 0) { Start-Sleep -Milliseconds $sleepMs }
        $startedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss.fff zzz")
        $jobs = @($targets | ForEach-Object { [HopProbeRunner]::Run($client,$_.Name,$_.Url) })
        [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$jobs)
        $rows = foreach ($job in $jobs) {
            $r = $job.Result
            [pscustomobject]@{
                Time = $startedAt
                Round = $round + 1
                Target = $r.Name
                Url = $r.Url
                Status = $r.Status
                HttpStatus = $r.HttpStatus
                LatencyMs = $r.LatencyMs
                ErrorKind = $r.ErrorKind
            }
        }
        foreach ($row in $rows) { $samples.Add($row) }
        if (Test-Path -LiteralPath $rawCsv) {
            $rows | Export-Csv -LiteralPath $rawCsv -Append -NoTypeInformation -Encoding UTF8
        } else {
            $rows | Export-Csv -LiteralPath $rawCsv -NoTypeInformation -Encoding UTF8
        }
        $ok = @($rows | Where-Object Status -eq "OK").Count
        Write-Host ("Round {0}/{1}: {2}/{3} HTTP OK; elapsed {4:n0}s" -f ($round+1),$rounds,$ok,$targets.Count,$timer.Elapsed.TotalSeconds)
    }
}
finally {
    $timer.Stop()
    function Percentile([double[]]$Values, [double]$Fraction) {
        if ($Values.Count -eq 0) { return $null }
        $v = @($Values | Sort-Object)
        $index = [Math]::Max(0,[Math]::Ceiling($v.Count*$Fraction)-1)
        return [Math]::Round($v[$index],1)
    }
    $summary = foreach ($target in $targets) {
        $data = @($samples | Where-Object Target -eq $target.Name)
        if ($data.Count -eq 0) { continue }
        $reachable = @($data | Where-Object { $_.Status -in @("OK","AUTH_REQUIRED","HTTP_ERROR") })
        $healthy = @($data | Where-Object Status -eq "OK")
        $latencies = [double[]]@($reachable | ForEach-Object {[double]$_.LatencyMs})
        $maxStreak = 0; $streak = 0
        foreach ($d in $data) {
            if ($d.Status -eq "OK") { $streak = 0 }
            else { $streak++; $maxStreak = [Math]::Max($maxStreak,$streak) }
        }
        $jitterSum = 0.0
        for($i=1;$i -lt $latencies.Length;$i++) {
            $jitterSum += [Math]::Abs($latencies[$i]-$latencies[$i-1])
        }
        [pscustomobject]@{
            Target = $target.Name
            Samples = $data.Count
            TransportReachablePct = [Math]::Round(100*$reachable.Count/$data.Count,2)
            HttpHealthyPct = [Math]::Round(100*$healthy.Count/$data.Count,2)
            P50Ms = (Percentile $latencies 0.50)
            P95Ms = (Percentile $latencies 0.95)
            MaxNonOkStreak = $maxStreak
            Timeouts = @($data | Where-Object Status -eq "TIMEOUT").Count
            TransportErrors = @($data | Where-Object Status -eq "TRANSPORT_ERROR").Count
            AuthOrHttpErrors = @($data | Where-Object { $_.Status -in @("AUTH_REQUIRED","HTTP_ERROR") }).Count
            AvgAbsLatencyDeltaMs = if($latencies.Length -gt 1){[Math]::Round($jitterSum/($latencies.Length-1),1)}else{$null}
        }
    }
    $summary | Export-Csv -LiteralPath $summaryCsv -NoTypeInformation -Encoding UTF8
    $style = @'
<style>
body { font-family: Segoe UI, Arial, sans-serif; margin: 30px; color:#18212a; }
table { border-collapse:collapse; margin:20px 0; font-size:14px; }
th,td { border:1px solid #ccc; padding:8px; text-align:right; }
th:first-child,td:first-child { text-align:left; }
th { background:#e8eef4; }
.small { color:#495767; max-width:980px; line-height:1.5; }
</style>
'@
    $pre = "<h1>HopHDND — Network Stability</h1><p>From $($startTime.ToString('yyyy-MM-dd HH:mm:ss')) to $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss')); interval $IntervalSeconds s; timeout $TimeoutSeconds s.</p>"
    $post = "<p class='small'>TransportReachablePct = HTTP response received, including 401/403. HttpHealthyPct = HTTP 2xx/3xx. P50/P95 = time to response headers, not whole-page render, database read, or write ACK. Cloudflare is a CDN network baseline, NOT a deployed HopHDND Cloudflare Worker. localhost measures only this Windows computer; a remote user's connection to self-host must also be probed from that user's network. Failed localhost means no service on configured port, not necessarily unstable Internet. Results cannot prove database correctness or production readiness.</p>"
    $html = ConvertTo-Html -Title "HopHDND 1h stability" -Head $style -Body ($pre + (($summary | ConvertTo-Html -Fragment) -join "") + $post)
    [System.IO.File]::WriteAllText($htmlFile,($html -join [Environment]::NewLine),[System.Text.UTF8Encoding]::new($true))
    $client.Dispose(); $handler.Dispose()
    Write-Host "Samples: $rawCsv" -ForegroundColor Green
    Write-Host "Summary: $summaryCsv" -ForegroundColor Green
    Write-Host "HTML: $htmlFile" -ForegroundColor Green
    if (Test-Path -LiteralPath $htmlFile) { Start-Process $htmlFile }
}
