#!/bin/sh
# husky v9.0.11

# 출처: https://github.com/typicode/husky/blob/main/sh/husky.sh

# 실험적인 기능
# set -e

# node와 pnpm이 필요합니다
command -v node >/dev/null 2>&1 || {
  echo >&2 "Info: node is not in PATH. Skipping husky."
  exit 0
}

# Check for package manager (optional - only warn if needed)
if [ ! -z "${HUSKY_REQUIRE_PNPM}" ]; then
  command -v pnpm >/dev/null 2>&1 || {
    echo >&2 "Info: pnpm is not in PATH. Skipping husky."
    exit 0
  }
fi

# HUSKY_GIT_PARAMS를 설정합니다
if [ -z "${HUSKY_GIT_PARAMS+x}" ]; then
  HUSKY_GIT_PARAMS="$*"
fi
export HUSKY_GIT_PARAMS

# HUSKY_GIT_STDIN을 설정합니다
if [ -t 0 ]; then
  HUSKY_GIT_STDIN=""
else
  # Capture piped stdin if any (can be empty)
  HUSKY_GIT_STDIN="$(cat -)"
fi

# HUSKY_HOOK_NAME을 설정합니다
if [ -z "${HUSKY_HOOK_NAME+x}" ]; then
  HUSKY_HOOK_NAME="$(basename "$0")"
fi
export HUSKY_HOOK_NAME

# 스크립트의 절대 디렉터리를 계산해 하위 프로세스에 전달합니다
HUSKY_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
export HUSKY_DIR

# Husky는 직접 source해서 사용하도록 설계되지 않았습니다.
# 아래는 사용자가 잘못 사용하고 있음을 알려주기 위한 것입니다.
if [ "$HUSKY_HOOK_NAME" = "husky.sh" ]; then
  echo >&2 "Warning: husky.sh should not be sourced directly.
  It's used by Husky's hooks.
  If you're trying to run a hook, use: 

  husky run <hook_name> [...args]"
fi

# 'prepare-commit-msg'를 위한 특별 처리
# 이 훅은 Git이 stdin 없이 실행할 수 있는 유일한 훅입니다.
if [ "$HUSKY_HOOK_NAME" = "prepare-commit-msg" ] && [ -z "$HUSKY_GIT_STDIN" ]; then
  if [ -t 0 ]; then
    exec < /dev/tty
  else
    # /dev/null에서 읽어오는 것으로 대체합니다
    exec < /dev/null
  fi
fi

# HUSKY_GIT_STDIN을 내보냅니다
export HUSKY_GIT_STDIN

# 훅 실행
node -e "
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const hook = path.join(process.env.HUSKY_DIR, process.env.HUSKY_HOOK_NAME);

  if (!fs.existsSync(hook)) {
    console.error(\`Husky: hook not found: \${hook}\`);
    process.exit(0);
  }

  const child = spawn(hook, process.argv.slice(3), {
    stdio: 'inherit',
    shell: process.platform === 'win32' // improve Windows compat for shell scripts
  });

  child.on('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(\`Husky: hook terminated by signal \${signal}\`);
      process.exit(1);
    }
    process.exit(code ?? 1);
  });
" "$@"