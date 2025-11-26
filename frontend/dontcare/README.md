# Don't Care - Frontend

이 문서는 `Don't Care` 프론트엔드 프로젝트를 로컬 환경에서 설정하고 실행하는 방법을 안내합니다.

## 🛠️ 사전 요구사항 및 환경 설정

프로젝트를 시작하기 전에 다음 개발 환경을 설정해야 합니다.

### 1. 필수 도구 설치

- **Git**: 코드 버전 관리를 위해 필요합니다.
- **Node.js**: v22.17.1 버전이 필요합니다. Node.js 버전 관리를 위해 `nvm-windows` 사용을 강력히 권장합니다.
- **pnpm**: v10.15.1 버전의 패키지 관리자를 사용합니다.

---

### 2. 환경 설정 상세 가이드

#### Git 설치

1. [Git 공식 사이트](https://git-scm.com/download/win)에 접속하여 설치 파일을 다운로드합니다.
2. 설치 프로그램을 실행하고, 기본 설정값으로 설치를 진행합니다.
3. 설치 완료 후, 터미널(Git Bash 또는 Command Prompt)에서 아래 명령어로 설치를 확인합니다.

   ```bash
   git --version
   ```

#### Node.js 및 pnpm 설치 (nvm-windows 사용)

`nvm(Node Version Manager)`을 사용하면 여러 Node.js 버전을 쉽게 전환하며 관리할 수 있습니다.

1. **nvm-windows 설치**
   - [nvm-windows 최신 릴리스 페이지](https://github.com/coreybutler/nvm-windows/releases)에 접속합니다.
   - `nvm-setup.exe` 파일을 다운로드하여 실행합니다.
   - 설치 경로 등을 설정하고 설치를 완료합니다.

2. **Node.js 설치 및 적용**
   - 새로운 터미널을 열고, 아래 명령어를 실행하여 프로젝트에서 사용할 Node.js 버전을 설치합니다.

     ```bash
     nvm install 22.17.1
     ```

   - 설치된 버전을 사용하도록 설정합니다.

     ```bash
     nvm use 22.17.1
     ```

3. **pnpm 설치**
   - Node.js가 설치된 환경에서 아래 명령어로 `pnpm`을 전역으로 설치합니다.

4. **설치 확인**
   - 모든 도구가 올바르게 설치되었는지 아래 명령어로 버전을 확인합니다.

     ```bash
     node --version # v22.17.1
     pnpm --version # v10.15.1
     git --version
     ```

---

## 🚀 프로젝트 실행 방법

### 1. 프로젝트 클론

Git을 사용하여 원격 저장소의 프로젝트를 로컬로 복제합니다.

```bash
git clone https://lab.ssafy.com/s13-webmobile1-sub2/S13P21E107.git
cd S13P21E107/frontend/dontcare
```

### 2. 의존성 패키지 설치

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 필요한 모든 의존성 패키지를 설치합니다.

```bash
pnpm install
```

### 3. 개발 서버 실행

의존성 설치가 완료되면, 다음 명령어를 사용하여 개발 서버를 시작합니다.

```bash
pnpm dev
```

서버가 성공적으로 실행되면, 터미널에 표시된 URL (기본값: `http://localhost:5173`)을 통해 애플리케이션에 접속할 수 있습니다.

## 주요 스크립트

`package.json` 파일에 정의된 주요 스크립트 목록입니다.

- **`pnpm dev`**: 개발 모드로 Vite 서버를 실행합니다. Hot Module Replacement (HMR)가 활성화되어 코드 변경 시 즉시 반영됩니다.
- **`pnpm build`**: 프로덕션용으로 프로젝트를 빌드합니다. 결과물은 `dist` 디렉토리에 생성됩니다.
- **`pnpm lint`**: ESLint를 사용하여 코드의 정적 분석을 수행하고 잠재적인 오류를 찾습니다.
- **`pnpm lint:fix`**: ESLint가 자동으로 수정할 수 있는 문제를 해결합니다.
- **`pnpm format`**: Prettier를 사용하여 코드 포맷을 검사합니다.
- **`pnpm format:fix`**: Prettier를 사용하여 코드 포맷을 자동으로 수정합니다.
- **`pnpm preview`**: 프로덕션 빌드 결과물을 로컬에서 미리 확인합니다.

## ✅ 코드 스타일 및 커밋 컨벤션

### 코드 스타일

프로젝트의 일관된 코드 스타일을 유지하기 위해 `ESLint`와 `Prettier`가 설정되어 있습니다. 커밋하기 전에 `lint`와 `format` 관련 스크립트를 실행하여 코드 품질을 확인하는 것을 권장합니다.
