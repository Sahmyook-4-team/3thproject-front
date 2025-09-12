# ⚙️ VisiDoc 설치 최종 가이드 (상황별 맞춤 설정 포함)

이 문서는 VisiDoc 프로젝트를 로컬 개발 환경에 설정하는 모든 단계를 상세하게 안내합니다. 프로젝트의 고유한 **Multi-Datasource 아키텍처**와 **Spring Profile**에 대한 이해를 바탕으로, 자신의 개발 환경에 맞는 최적의 실행 방법을 선택할 수 있습니다.

### 📂 프로젝트 구조

원활한 실행을 위해, 아래와 같이 하나의 상위 폴더(`3thproject-local` 등) 안에 백엔드와 프론트엔드 프로젝트를 클론하는 것을 권장합니다.

```
3thproject-local/
├── 3thproject-back/      # 백엔드 레포지토리 클론
│   ├── .github/
│   ├── src/
│   └── Dockerfile
├── 3thproject-front/     # 프론트엔드 레포지토리 클론
│   ├── .github/
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml    # (직접 생성)
└── .env                  # (직접 생성)
```

<br><br><br>

## 1. Docker를 이용한 설치 (권장)

### Part 1. 설치 시나리오 선택

설치를 시작하기 전, 자신의 개발 환경에 맞는 시나리오를 먼저 선택하세요.

#### **시나리오 A: 통합 개발 환경 (Oracle DB 연결 가능)**
*   **대상**: 로컬 PC 또는 원격 서버에 접속 가능한 Oracle 데이터베이스가 있는 개발자.
*   **목표**: VisiDoc의 모든 기능(환자 조회, 뷰어 등)을 실제 데이터와 연동하여 완벽하게 테스트합니다.
*   **필요 프로필**: `prod` (또는 Oracle/PostgreSQL 모두 연결되도록 설정된 `local` 프로필)

#### **시나리오 B: 부분 개발 환경 (Oracle DB 연결 불가능)**
*   **대상**: Oracle 데이터베이스에 접근할 수 없는 개발자. (예: 프론트엔드 UI 개발, 소견서 작성 API 개발 등 Oracle 비의존적인 기능 담당)
*   **목표**: Oracle DB 연동을 제외한 **나머지 기능(로그인, 회원 관리, PostgreSQL 연동 기능 등)**을 테스트하고 개발합니다.
*   **필요 프로필**: `localDev`

---

### Part 2. 공통 준비 사항

어떤 시나리오를 선택하든 아래 준비는 동일하게 필요합니다.

#### 1. 사전 요구사항
-   **Git**: 소스 코드 다운로드
-   **Docker & Docker Compose**: [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 권장

#### 2. 디렉토리 구조 설정
프로젝트 관리를 위해, 아래와 같이 하나의 상위 폴더(`visidoc-local`) 안에 모든 프로젝트와 설정 파일을 위치시키는 것을 강력히 권장합니다.

```bash
# 1. 최상위 폴더 생성 및 이동
mkdir visidoc-local
cd visidoc-local

# 2. 백엔드와 프론트엔드 레포지토리 클론
# [GitHub 사용자명] 부분은 실제 프로젝트가 있는 곳으로 수정해주세요.
git clone https://github.com/Sahmyook-4-team/3thproject-back.git
git clone https://github.com/Sahmyook-4-team/3thproject-front.git
```


## Part 3. `docker-compose.yml` 설정

`visidoc-local` 폴더 최상단에 `docker-compose.yml` 파일을 생성하고 아래 내용을 그대로 붙여넣습니다. 이 파일은 **두 시나리오 모두에서 동일하게 사용**되며, 실제 동작은 `.env` 파일의 프로필 설정에 따라 달라집니다.

> **이 파일의 역할?**
> VisiDoc을 구성하는 서비스(백엔드, 프론트엔드, PostgreSQL DB)를 어떻게 만들고 연결할지 정의하는 통합 설계도입니다. `.env` 파일의 설정을 읽어와 유연하게 동작합니다.

```yaml
# docker-compose.yml (Final Version)
version: '3.8'

services:
  backend:
    build: ./3thproject-back
    container_name: visidoc-backend
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_ORACLE_ENABLED=${SPRING_DATASOURCE_ORACLE_ENABLED}
      - SPRING_DATASOURCE_POSTGRES_URL=jdbc:postgresql://db:5432/${POSTGRES_DB}
      - SPRING_DATASOURCE_POSTGRES_USERNAME=${POSTGRES_USER}
      - SPRING_DATASOURCE_POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - SPRING_DATASOURCE_ORACLE_URL=jdbc:oracle:thin:@${ORACLE_HOST}:${ORACLE_PORT}:${ORACLE_SID}
      - SPRING_DATASOURCE_ORACLE_USERNAME=${ORACLE_USER}
      - SPRING_DATASOURCE_ORACLE_PASSWORD=${ORACLE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - PACS_STORAGE_URL=${PACS_STORAGE_URL}
      - PACS_STORAGE_USERNAME=${PACS_STORAGE_USERNAME}
      - PACS_STORAGE_PASSWORD=${PACS_STORAGE_PASSWORD}
      - CORS_ALLOWED_ORIGINS=${CORS_ALLOWED_ORIGINS}
    depends_on:
      - db
    extra_hosts:
      - "host.docker.internal:host-gateway"

  frontend:
    build: ./3thproject-front
    container_name: visidoc-frontend
    restart: always
    ports:
      - "80:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    depends_on:
      - backend

  db:
    image: postgres:15
    container_name: visidoc-db
    restart: always
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

### Part 4. 시나리오별 `.env` 파일 설정

이제 자신의 시나리오에 맞는 `.env` 파일을 설정할 차례입니다. `visidoc-local` 폴더에 `.env` 파일을 생성하고 **아래 두 가지 템플릿 중 하나를 선택하여** 내용을 채워주세요.

### ✅ 시나리오 A: 통합 개발 환경용 `.env`

Oracle DB에 연결하여 **모든 기능**을 사용하려면 이 설정을 사용하세요.

```env
# .env (For Full Integrated Environment)
SPRING_DATASOURCE_ORACLE_ENABLED=true

# --- PostgreSQL & Oracle DB Settings ---
POSTGRES_USER=visidoc_user
POSTGRES_PASSWORD=your_strong_postgres_password
POSTGRES_DB=visidoc
ORACLE_HOST=host.docker.internal
ORACLE_PORT=1521
ORACLE_SID=ORCL
ORACLE_USER=your_oracle_username
ORACLE_PASSWORD=your_oracle_password

# --- JWT Secret Key (application.properties에서 그대로 복사) ---
JWT_SECRET=V293ISB0aGlzIGlzIGEgdmVyeSB2ZXJ5IHZlcnkgbG9uZyBzZWNyZXQga2V5IGZvciBqd3QgZ3JhY2VmdWxseSBoYW5kbGluZyB0aGUgZGF0YS4=

# --- PACS & CORS Settings ---
PACS_STORAGE_URL=smb://your_pacs_server_ip/share_folder
PACS_STORAGE_USERNAME=your_pacs_username
PACS_STORAGE_PASSWORD=your_pacs_password
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:3000
```

### ✅ 시나리오 B: 부분 개발 환경용 `.env`

Oracle DB 없이 **부분 기능**만 개발하려면 이 설정을 사용하세요.

```env
# .env (For Partial Environment without Oracle)
SPRING_DATASOURCE_ORACLE_ENABLED=false

# --- PostgreSQL Settings ---
POSTGRES_USER=visidoc_user
POSTGRES_PASSWORD=your_strong_postgres_password
POSTGRES_DB=visidoc

# --- Oracle (사용 안 함) ---
ORACLE_HOST=
ORACLE_PORT=
ORACLE_SID=
ORACLE_USER=
ORACLE_PASSWORD=

# --- JWT Secret Key (application.properties에서 그대로 복사) ---
JWT_SECRET=V293ISB0aGlzIGlzIGEgdmVyeSB2ZXJ5IHZlcnkgbG9uZyBzZWNyZXQga2V5IGZvciBqd3QgZ3JhY2VmdWxseSBoYW5kbGluZyB0aGUgZGF0YS4=

# --- PACS (사용 안 함) & CORS Settings ---
PACS_STORAGE_URL=
PACS_STORAGE_USERNAME=
PACS_STORAGE_PASSWORD=
CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:3000
```

---

## Part 5. 애플리케이션 실행 및 확인

`.env` 파일 설정까지 마쳤다면, 이제 애플리케이션을 실행할 준비가 모두 끝났습니다.

#### 1. Docker 컨테이너 실행
터미널에서 아래 명령어를 실행하여 모든 서비스를 빌드하고 백그라운드에서 실행합니다.

```bash
docker-compose up --build -d
```

#### 2. 실행 상태 확인
빌드가 완료된 후, 아래 명령어로 모든 컨테이너가 정상적으로 `running` 또는 `up` 상태인지 확인합니다.

```bash
docker-compose ps
```

#### 3. 로그 확인 (문제 발생 시)
만약 `backend` 컨테이너가 실행되지 않고 자꾸 재시작된다면, 로그를 확인하여 원인을 파악해야 합니다.
-   **시나리오 A**: `.env` 파일의 Oracle 접속 정보가 잘못되었을 가능성이 높습니다.
-   **시나리오 B**: `SPRING_PROFILES_ACTIVE`가 `localDev`로 정확히 설정되었는지 확인합니다.

```bash
# 백엔드 컨테이너의 실시간 로그를 확인합니다.
docker-compose logs -f backend
```

#### 4. 애플리케이션 접속
모든 컨테이너가 정상 실행되면 웹 브라우저로 접속합니다.
-   **프론트엔드**: `http://localhost` (또는 `http://localhost:80`)
-   **백엔드 API 문서**: `http://localhost:8080/swagger-ui/index.html`



---
<br><br><br><br>

## 2. 수동 설치

Docker 없이 각 서버를 직접 실행하는 방법입니다.

**사전 요구사항**
-   Git
-   Node.js v18 이상 & npm
-   Java 21 (JDK)
-   (로컬에 DB가 설치되어 있어야 합니다)

**Backend (Spring Boot)**

1.  백엔드 레포지토리를 클론하고 해당 디렉토리로 이동합니다.
    ```bash
    git clone https://github.com/Sahmyook-4-team/3thproject-back.git 3thproject-back
    cd 3thproject-back
    ```

2.  `src/main/resources/application.properties` 파일에 로컬 DB 접속 정보 등 필요한 설정을 직접 수정합니다.

3.  Gradle을 사용하여 프로젝트를 빌드합니다. (테스트 제외)
    ```bash
    ./gradlew build -x test
    ```

4.  빌드된 `.jar` 파일을 실행합니다.
    ```bash
    java -jar build/libs/*.jar
    ```
    서버가 `http://localhost:8080`에서 실행됩니다.

**Frontend (Next.js)**

1.  새 터미널을 열고 프론트엔드 레포지토리를 클론하여 이동합니다.
    ```bash
    git clone https://github.com/Sahmyook-4-team/3thproject-front.git 3thproject-front
    cd 3thproject-front
    ```

2.  프로젝트에 필요한 라이브러리를 설치합니다.
    ```bash
    npm install
    ```

3.  개발 서버를 실행합니다.
    ```bash
    npm run dev
    ```
    개발 서버가 `http://localhost:3000`에서 실행됩니다.
