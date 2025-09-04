# ====================================================================
#  1단계: 애플리케이션 '빌드'만을 위한 건설 현장 (Builder Stage)
# ====================================================================
# 이 단계의 목적은 소스 코드를 실제 실행 가능한 파일 묶음으로 만드는 것입니다.
# 최종 결과물에는 포함되지 않는, 빌드에만 필요한 무거운 도구(컴파일러 등)들이 사용됩니다.

# 'node:18-alpine' 이미지를 기반으로 시작합니다. 'AS builder' 라는 별명을 붙여줍니다.
# node: Node.js가 설치된 이미지
# 18: Node.js의 18 버전을 의미 (LTS - 장기 지원 버전)
# alpine: 매우 가벼운 버전의 리눅스. 이미지 크기를 작게 유지하는 데 도움이 됩니다.
FROM node:18-alpine AS builder

# 컨테이너 내부에 '/app'이라는 작업 폴더를 만들고, 앞으로의 모든 명령을 이 폴더 안에서 실행합니다.
WORKDIR /app

# 'package.json'과 'package-lock.json' 파일을 먼저 복사합니다.
# (이유: Docker는 레이어(layer) 기반 캐싱을 사용합니다. 소스 코드는 자주 바뀌지만,
# 의존성(package.json)은 잘 바뀌지 않습니다. 이 파일들을 먼저 복사해서 `npm install`을 실행하면,
# 나중에 소스 코드만 바뀌었을 때 이 비싼 `npm install` 과정을 건너뛰고 캐시를 재사용하여 빌드 속도를 엄청나게 높일 수 있습니다.)
COPY package.json ./
COPY package-lock.json ./

# package.json에 명시된 모든 라이브러리(의존성)를 다운로드하고 설치합니다.
RUN npm install

# 1. 외부에서 NEXT_PUBLIC_API_BASE_URL 라는 이름의 빌드 인자를 받겠다고 선언합니다.
ARG NEXT_PUBLIC_API_BASE_URL
# 2. 받은 빌드 인자를 다음 RUN 명령어에서 사용할 수 있는 환경 변수로 설정합니다.
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL


# 현재 로컬 폴더의 모든 파일(소스 코드 등)을 컨테이너의 /app 폴더로 복사합니다.
COPY . .

# 'npm run build' 스크립트를 실행하여 Next.js 애플리케이션을 프로덕션용으로 빌드합니다.
# 이 과정이 끝나면 /app 폴더 안에 '.next' 라는 결과물 폴더가 생성됩니다.
RUN npm run build

# ====================================================================
#  2단계: 실제 '실행'만을 위한 깨끗한 최종 환경 (Runner/Final Stage)
# ====================================================================
# 이 단계의 목적은 1단계에서 만들어진 결과물을 최소한의 환경에서 실행하는 것입니다.
# 빌드에 사용되었던 무거운 도구들은 모두 버리고, 오직 실행에 필요한 파일들만 가져와서
# 최종 이미지를 매우 가볍고 안전하게 만듭니다.

# 다시 깨끗한 'node:18-alpine' 이미지를 기반으로 시작합니다. 'AS runner' 라는 별명을 붙여줍니다.
# (이전 builder 스테이지의 모든 것은 이제 버려지고, 여기서부터 새로 시작합니다.)
FROM node:18-alpine AS runner

# 컨테이너 내부에 '/app'이라는 작업 폴더를 만들고 이동합니다.
WORKDIR /app

# --- 멀티 스테이지 빌드의 핵심 부분 ---
# --from=builder: "1단계(builder)의 컨테이너로부터 파일을 가져오겠다"는 의미입니다.

# 1단계의 /app/public 폴더를 현재 스테이지의 /app/public으로 복사합니다. (이미지, 폰트 등)
COPY --from=builder /app/public ./public

# 1단계의 빌드 결과물인 /app/.next 폴더를 현재 스테이지의 /app/.next로 복사합니다.
COPY --from=builder /app/.next ./.next

# 1단계에서 설치된 node_modules 폴더를 현재 스테이지의 /app/node_modules로 복사합니다. (실행에 필요)
COPY --from=builder /app/node_modules ./node_modules

# 1단계의 package.json 파일을 현재 스테이지의 /app/package.json으로 복사합니다. ('npm start' 실행에 필요)
COPY --from=builder /app/package.json ./package.json

# 이 컨테이너가 3000번 포트를 사용하여 외부와 통신할 것임을 Docker에게 알려줍니다. (문서화 목적)
EXPOSE 3000

# 이 컨테이너가 시작될 때 최종적으로 실행할 기본 명령어입니다.
# package.json에 정의된 "start" 스크립트(보통 "next start")를 실행하여 Next.js 프로덕션 서버를 구동합니다.
CMD ["npm", "start"]
