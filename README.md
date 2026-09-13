# BokBulBok

점심 메뉴 고르기 + 커피 값 내기 사다리타기. 태블릿(Termux)에 띄워서 URL만 있으면 누구나 접속해 참여하는 사내용 서버입니다.

## 기능

- **🍚 점심 투표**: 메뉴는 고정 목록이 아니라 참여자가 직접 입력. 하루 한 사람당 한 표, 다시 누르면 변경 가능. 4초마다 자동 새로고침으로 실시간 집계.
- **☕ 커피 사다리**: 이름 입력 → 사다리 생성 → 큰 "시작" 버튼으로 전원이 동시에 사다리를 타고 내려가는 애니메이션 → 완료 시 당첨자(커피 쏠 사람) 팝업.
- **📅 기록**: 달력에서 날짜를 클릭하면 그날의 메뉴 득표 현황과 커피 당첨자를 조회. 서버가 켜져 있는 한 데이터는 계속 쌓이며, 첫 방문자도 동일하게 조회 가능.

## 기술 스택

- **프론트엔드**: Vue 3 + Vite (SFC 컴포넌트)
- **백엔드**: Express (`server.js`)
- **DB**: SQLite (`sql.js` — WASM 빌드라 네이티브 컴파일 없이 Termux/ARM에서도 바로 동작)

## API

| Method | 경로 | 기능 |
|---|---|---|
| GET | `/api/menus` | 오늘 등록된 메뉴 + 득표수 조회 |
| POST | `/api/menus` | 메뉴 추가 (`{ name }`) |
| DELETE | `/api/menus/:id` | 메뉴 삭제 (해당 투표 기록도 함께 삭제) |
| GET | `/api/my-vote?clientId=` | 내가 오늘 투표한 메뉴 조회 |
| POST | `/api/vote` | 투표/변경 (`{ clientId, menuId }`) |
| POST | `/api/coffee-result` | 커피 사다리 결과 저장 (`{ winnerName, participants }`) |
| GET | `/api/history?year=&month=` | 특정 월의 날짜별 메뉴/커피당첨자 조회 |

데이터는 `data/app.db`(SQLite 파일)에 저장되며 git에는 포함되지 않습니다. `git pull`로는 절대 지워지지 않고, 서버를 계속 같은 폴더에서 돌리는 한 무기한 보존됩니다.

## 로컬 실행

```bash
npm install
npm run build   # Vue 앱 빌드 (dist/ 생성)
npm start        # node server.js — API + 빌드된 앱을 8080 포트로 서빙
```

개발 중 핫리로드가 필요하면 `npm run dev` (Vite 개발 서버, `/api`는 8080으로 자동 프록시).

## 태블릿(Termux) 배포

```bash
pkg update && pkg upgrade
pkg install nodejs git

git clone https://github.com/upsc208/BokBulBok.git
cd BokBulBok
npm install
npm run build
node server.js
```

같은 와이파이의 다른 기기에서 `http://<태블릿IP>:8080` 접속 확인.

### 외부(다른 지역 포함) 접속용 공개 URL

```bash
pkg install cloudflared
cloudflared tunnel --url http://localhost:8080
```
출력되는 `https://xxxx.trycloudflare.com` 주소는 와이파이/셀룰러/타 지역 어디서든 접속 가능합니다. 단, 이 무료 방식은 cloudflared를 재시작할 때마다 URL이 바뀝니다 — 서버와 터널을 계속 켜두면 URL이 유지됩니다.

### 화면 꺼져도 서버 유지

1. Termux 배터리 최적화 해제: 설정 → 앱 → Termux → 배터리 → "제한 없음"
2. `termux-wake-lock` 실행
3. 백그라운드로 실행 (tmux 프리픽스 키가 안 먹히면 `nohup` 사용):
   ```bash
   nohup node server.js > server.log 2>&1 &
   cloudflared tunnel --url http://localhost:8080
   ```
4. (선택) 재부팅 후 자동 시작하려면 Termux:Boot 앱 설치 후 시작 스크립트 등록

### 코드 업데이트 반영

```bash
git pull
npm install      # package.json이 바뀐 경우에만 필요
npm run build
# 기존 node server.js 프로세스 재시작
```

`data/app.db`는 git 추적 대상이 아니라서 업데이트해도 기존 투표/사다리 기록은 그대로 유지됩니다.
