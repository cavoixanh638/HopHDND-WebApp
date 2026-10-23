#!/usr/bin/env bash
# HopHDND — keyless Cloud Shell deployment: Office Excel XLSX -> Firebase RTDB.
# Runs a LIVE import first; enables minute scheduler ONLY on a successful import.
set -Eeuo pipefail

PROJECT="hophdnd-8b7b2"
REGION="asia-southeast1"
JOB="hophdnd-excel-mirror"
TRIGGER="hophdnd-excel-mirror-minute"
RUNNER_ID="hophdnd-excel-mirror"
SCHED_ID="hophdnd-mirror-scheduler"
SOURCE_FILE_ID="1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp"
SOURCE_GID="60961344"
SOURCE_SHEET_NAME="Các nội dung trình HĐND"
RTDB_URL="https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app"
RUNNER="${RUNNER_ID}${PROJECT:+@}${PROJECT}.iam.gserviceaccount.com"
SCHEDULER="${SCHED_ID}@${PROJECT}.iam.gserviceaccount.com"
MIRROR_PATH="hdnd/mirrors/${SOURCE_FILE_ID}/${SOURCE_GID}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-install}"

function explain() {
  echo
  echo "=== HopHDND / ${MODE} ==="
  echo "Project: ${PROJECT} | Region: ${REGION}"
  echo "Excel: ${SOURCE_FILE_ID} | GID: ${SOURCE_GID} | Tab: ${SOURCE_SHEET_NAME}"
  echo "Runner: ${RUNNER}"
  echo "Firebase branch: ${MIRROR_PATH}"
  echo
}

function preflight() {
  command -v gcloud >/dev/null || { echo "ERROR: Run inside Google Cloud Shell."; exit 2; }
  local actual
  actual="$(gcloud config get-value project 2>/dev/null)"
  if [[ "$actual" != "$PROJECT" ]]; then
    echo "WRONG PROJECT: '$actual'. This installer only accepts '$PROJECT'."
    echo "Open https://console.cloud.google.com/?project=$PROJECT, use Cloud Shell and run:"
    echo "  gcloud config set project $PROJECT"
    exit 2
  fi
}

function status() {
  preflight
  explain
  gcloud run jobs describe "$JOB" --region "$REGION" --format="value(metadata.name)" 2>/dev/null \
    || echo "Cloud Run Job is not deployed yet."
  gcloud scheduler jobs describe "$TRIGGER" --location "$REGION" \
    --format="yaml(name,state,schedule,timeZone,httpTarget.uri)" 2>/dev/null \
    || echo "Cloud Scheduler job is not installed yet."
  echo "Mirror data: Firebase Console -> Realtime Database -> ${MIRROR_PATH}"
  echo "Cloud Run logs: https://console.cloud.google.com/run/jobs/details/${REGION}/${JOB}?project=${PROJECT}"
}
function pause() {
  preflight
  gcloud scheduler jobs pause "$TRIGGER" --location="$REGION" --quiet
  echo "PAUSED: Cron stopped. Last valid snapshot remains in Firebase."
}
function resume() {
  preflight
  gcloud scheduler jobs resume "$TRIGGER" --location="$REGION" --quiet
  echo "RESUMED: Scheduled every minute."
}
function fail_hint() {
  echo >&2
  echo >&2 "FAILED. This script has not enabled any new schedule."
  echo >&2 "If Drive returns 403/404, share ONLY the source Excel file (Reader) with:"
  echo >&2 "  $RUNNER"
  echo >&2 "Then rerun the same install command."
  echo >&2 "Job logs: https://console.cloud.google.com/run/jobs/details/${REGION}/${JOB}?project=${PROJECT}"
}
trap fail_hint ERR

if [[ "$MODE" == "status" ]]; then status; exit 0; fi
if [[ "$MODE" == "pause" ]]; then pause; exit 0; fi
if [[ "$MODE" == "resume" ]]; then resume; exit 0; fi
[[ "$MODE" == "install" ]] || { echo "Usage: bash $0 [install|status|pause|resume]"; exit 2; }
preflight
explain
cat <<TEXT
This action:
  1. Enables Cloud Run / Scheduler / Cloud Build APIs (billable services).
  2. Creates two dedicated service accounts WITHOUT private key files.
  3. Grants runner Realtime Database Admin (project-wide IAM; cannot
     restrict this OAuth credential to one JSON subtree via Rules).
  4. Builds and runs a job that reads XLSX and writes ONLY
     '$MIRROR_PATH' after schema, conditional ETag and readback checks.
  5. Enables a 1-minute schedule ONLY after first import succeeds.
It does NOT modify Excel, Firebase Database Rules, the WebApp data source,
or any existing Firebase administration profile.
TEXT
if [[ -t 0 ]]; then
  read -r -p "Type ACTIVATE to allow cloud charges and first production import: " approve
  [[ "$approve" == "ACTIVATE" ]] || { echo "Cancelled."; exit 2; }
fi

echo "[1/6] Enable Google Cloud APIs..."
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com \
  iam.googleapis.com drive.googleapis.com --project="$PROJECT" --quiet

echo "[2/6] Create service accounts if needed..."
for ident in "$RUNNER_ID" "$SCHED_ID"; do
  if ! gcloud iam service-accounts describe \
    "${ident}${PROJECT:+@}${PROJECT}.iam.gserviceaccount.com" --project="$PROJECT" >/dev/null 2>&1; then
    gcloud iam service-accounts create "$ident" --project="$PROJECT" \
      --display-name="HopHDND $ident" --quiet
  fi
done

echo "[3/6] Authorize runner IAM (no secret keys)..."
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:$RUNNER" --role="roles/firebasedatabase.admin" \
  --condition=None --quiet >/dev/null

ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
cat > "$ENV_FILE" <<VARS
SOURCE_FILE_ID: "$SOURCE_FILE_ID"
SOURCE_GID: "$SOURCE_GID"
SOURCE_SHEET_NAME: "$SOURCE_SHEET_NAME"
RTDB_URL: "$RTDB_URL"
VARS

echo "[4/6] Build source/mirror_sync and deploy Cloud Run Job..."
gcloud run jobs deploy "$JOB" --source "$ROOT" \
  --region "$REGION" --project "$PROJECT" \
  --service-account "$RUNNER" --tasks 1 --parallelism 1 \
  --max-retries 0 --task-timeout 180s --cpu 1 --memory 512Mi \
  --env-vars-file "$ENV_FILE" --quiet

echo "[5/6] First live import + database readback (stop on failure)..."
if ! gcloud run jobs execute "$JOB" --region "$REGION" --project "$PROJECT" \
    --wait --quiet; then
  fail_hint
  exit 1
fi

echo "[6/6] Create or update 60s Cloud Scheduler trigger..."
gcloud run jobs add-iam-policy-binding "$JOB" --region "$REGION" \
  --project "$PROJECT" --member="serviceAccount:$SCHEDULER" \
  --role="roles/run.invoker" --quiet >/dev/null

URI="https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/${JOB}:run"
schedule_args=(
  --location="$REGION" --project="$PROJECT"
  --schedule="* * * * *" --time-zone="Asia/Bangkok"
  --uri="$URI" --http-method=POST
  --oauth-service-account-email="$SCHEDULER"
  --headers="Content-Type=application/json" --message-body="{}"
  --attempt-deadline=60s --max-retry-attempts=0
  --description="HopHDND Excel XLSX -> Firebase RTDB mirror"
  --quiet
)
if gcloud scheduler jobs describe "$TRIGGER" --location "$REGION" \
  --project "$PROJECT" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$TRIGGER" "${schedule_args[@]}"
else
  gcloud scheduler jobs create http "$TRIGGER" "${schedule_args[@]}"
fi
echo
echo "SUCCESS: initial Excel import and Firebase readback confirmed by Cloud Run."
echo "SUCCESS: Cloud Scheduler every 60 seconds configured."
echo "RUNNER: $RUNNER"
echo "SCHEDULER: https://console.cloud.google.com/cloudscheduler?project=$PROJECT"
echo "FIREBASE: https://console.firebase.google.com/project/$PROJECT/database"
echo "When verified, admin selects Firebase Database as WebApp data source."
echo "PAUSE: bash source/mirror_sync/bootstrap_cloud_shell.sh pause"
