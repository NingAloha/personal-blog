#!/usr/bin/env bash

set -Eeuo pipefail

release_sha=${1:?release SHA is required}
archive_path=${2:?release archive path is required}

readonly releases_dir=/srv/personal-blog/releases
readonly incoming_dir=/srv/personal-blog/.incoming
readonly current_link=/srv/personal-blog/current
readonly current_new_link=/srv/personal-blog/current.new
site_url=${SITE_URL:?SITE_URL must be set}
site_url=${site_url%/}
readonly site_url
readonly release_dir="${releases_dir}/${release_sha}"

if [[ ! "${release_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid release SHA: ${release_sha}" >&2
  exit 2
fi

if [[ ! -f "${archive_path}" ]]; then
  echo "Release archive is missing: ${archive_path}" >&2
  exit 2
fi

switched_current=0
staging_dir=''

exec 9>/srv/personal-blog/deploy.lock
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 75
fi

previous_release=$(readlink -f "${current_link}")
case "${previous_release}" in
  "${releases_dir}"/*) ;;
  *)
    echo "Current release target is outside ${releases_dir}: ${previous_release}" >&2
    exit 2
    ;;
esac

if [[ ! -d "${previous_release}" ]]; then
  echo "Current release target is not a directory: ${previous_release}" >&2
  exit 2
fi

verify_release() {
  local candidate_dir=$1

  test -f "${candidate_dir}/frontend/dist/index.html"
  test -f "${candidate_dir}/backend/server.js"
  test -d "${candidate_dir}/backend/content"
  test -d "${candidate_dir}/backend/node_modules"
  /usr/bin/node --check "${candidate_dir}/backend/server.js"
}

check_service() {
  local state
  state=$(sudo -n /usr/bin/systemctl is-active personal-blog-backend.service)
  if [[ "${state}" != active ]]; then
    echo "Backend service state is ${state}, expected active" >&2
    return 1
  fi
  echo "Backend service state: ${state}"
}

check_local_backend() {
  curl --fail --silent --show-error \
    --retry 5 --retry-all-errors --retry-delay 2 --max-time 15 \
    http://127.0.0.1:3000/api/projects >/dev/null
}

check_public_health() {
  curl --fail --silent --show-error --location \
    --retry 5 --retry-all-errors --retry-delay 2 --max-time 15 \
    "${site_url}/" >/dev/null
  curl --fail --silent --show-error --location \
    --retry 5 --retry-all-errors --retry-delay 2 --max-time 15 \
    "${site_url}/api/projects" >/dev/null
}

rollback() {
  local reason=$1
  local status=$2
  trap - ERR INT TERM HUP
  set +e

  if [[ -n "${staging_dir}" && -d "${staging_dir}" ]]; then
    case "${staging_dir}" in
      "${incoming_dir}"/release-"${release_sha}".*)
        rm -rf -- "${staging_dir}"
        echo "Removed failed staging directory: ${staging_dir}" >&2
        ;;
      *)
        echo "Refusing to remove unexpected staging directory: ${staging_dir}" >&2
        ;;
    esac
  fi

  if [[ "${switched_current}" -eq 1 ]]; then
    echo "Release ${release_sha} failed (${reason}); rolling back to ${previous_release}" >&2
    if ln -sTfn "${previous_release}" "${current_new_link}" \
      && mv -Tf "${current_new_link}" "${current_link}"; then
      echo "Rollback symlink switch completed: ${previous_release}" >&2
      if sudo -n /usr/bin/systemctl restart personal-blog-backend.service \
        && check_service; then
        if check_local_backend && check_public_health; then
          echo "Rollback health checks completed successfully." >&2
        else
          echo "Rollback completed, but one or more health checks failed." >&2
        fi
      else
        echo "Rollback symlink switch completed, but backend restart failed." >&2
      fi
    else
      echo "Rollback symlink switch failed." >&2
    fi
  else
    echo "Release ${release_sha} failed before current was switched." >&2
  fi

  exit "${status}"
}

on_error() {
  rollback ERR "$?"
}

on_signal() {
  local signal=$1
  local status=1
  case "${signal}" in
    HUP) status=129 ;;
    INT) status=130 ;;
    TERM) status=143 ;;
  esac
  rollback "signal ${signal}" "${status}"
}

trap on_error ERR
trap 'on_signal HUP' HUP
trap 'on_signal INT' INT
trap 'on_signal TERM' TERM

mkdir -p "${releases_dir}"
mkdir -p "${incoming_dir}"

if [[ -e "${release_dir}" || -L "${release_dir}" ]]; then
  if ! verify_release "${release_dir}"; then
    echo "Existing release failed validation and will not be reused: ${release_dir}" >&2
    exit 2
  fi
  echo "Reusing validated immutable release: ${release_dir}"
else
  staging_dir=$(mktemp -d "${incoming_dir}/release-${release_sha}.XXXXXX")
  tar -xzf "${archive_path}" --no-same-owner --no-same-permissions -C "${staging_dir}"
  verify_release "${staging_dir}"
  # mktemp -d defaults to 0700; Caddy needs execute/traverse access to the release root.
  chmod 755 "${staging_dir}"
  mv -T "${staging_dir}" "${release_dir}"
  echo "Promoted validated release: ${release_dir}"
fi

ln -sTfn "${release_dir}" "${current_new_link}"
switched_current=1
mv -Tf "${current_new_link}" "${current_link}"

sudo -n /usr/bin/systemctl restart personal-blog-backend.service
check_service
check_local_backend
check_public_health

trap - ERR INT TERM HUP
echo "Release ${release_sha} deployed successfully."
