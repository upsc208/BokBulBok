<script setup>
import { ref } from 'vue';

const names = ref([]);
const newName = ref('');
const phase = ref('edit'); // 'edit' | 'ready' | 'playing' | 'done'
const rungs = ref([]);
const rows = ref(0);
const outcomeIndex = ref(0);
const tokenPos = ref([]); // [[x,y], ...] per name
const revealedPaths = ref([]); // path per name, filled once game has been played
const winnerName = ref('');
const showPopup = ref(false);

const COL_WIDTH = 64;
const ROW_HEIGHT = 26;
const TOP_MARGIN = 34;
const BOTTOM_MARGIN = 34;

const svgWidth = () => names.value.length * COL_WIDTH;
const svgHeight = () => TOP_MARGIN + rows.value * ROW_HEIGHT + BOTTOM_MARGIN;

function x(col) {
  return col * COL_WIDTH + COL_WIDTH / 2;
}
function y(level) {
  return TOP_MARGIN + level * ROW_HEIGHT;
}

function addName() {
  const name = newName.value.trim();
  if (!name || names.value.includes(name)) return;
  names.value.push(name);
  newName.value = '';
}
function removeName(i) {
  names.value.splice(i, 1);
}

function generateRungs(n, rowCount) {
  const grid = Array.from({ length: rowCount }, () => Array(Math.max(n - 1, 0)).fill(false));
  for (let r = 0; r < rowCount; r++) {
    let col = 0;
    while (col < n - 1) {
      if (Math.random() < 0.55) {
        grid[r][col] = true;
        col += 2;
      } else {
        col += 1;
      }
    }
  }
  return grid;
}

function setupLadder() {
  const n = names.value.length;
  if (n < 2) return;
  rows.value = Math.min(Math.max(n * 3, 8), 20);
  rungs.value = generateRungs(n, rows.value);
  outcomeIndex.value = Math.floor(Math.random() * n);
  tokenPos.value = names.value.map((_, i) => [x(i), y(0)]);
  revealedPaths.value = [];
  winnerName.value = '';
  showPopup.value = false;
  phase.value = 'ready';
}

function reshuffle() {
  setupLadder();
}

function editNames() {
  phase.value = 'edit';
}

function tracePath(startCol) {
  let col = startCol;
  const points = [[x(col), y(0)]];
  for (let r = 0; r < rows.value; r++) {
    const midY = y(r) + ROW_HEIGHT / 2;
    if (rungs.value[r][col]) {
      points.push([x(col), midY]);
      points.push([x(col + 1), midY]);
      col += 1;
    } else if (col > 0 && rungs.value[r][col - 1]) {
      points.push([x(col), midY]);
      points.push([x(col - 1), midY]);
      col -= 1;
    }
    points.push([x(col), y(r + 1)]);
  }
  return { points, finalCol: col };
}

function pointAt(points, t) {
  const segLens = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1][0] - points[i][0];
    const dy = points[i + 1][1] - points[i][1];
    const len = Math.hypot(dx, dy);
    segLens.push(len);
    total += len;
  }
  if (total === 0) return points[0];
  const target = t * total;
  let acc = 0;
  for (let i = 0; i < segLens.length; i++) {
    if (acc + segLens[i] >= target) {
      const segT = segLens[i] === 0 ? 0 : (target - acc) / segLens[i];
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * segT,
        points[i][1] + (points[i + 1][1] - points[i][1]) * segT
      ];
    }
    acc += segLens[i];
  }
  return points[points.length - 1];
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function playGame() {
  if (phase.value !== 'ready') return;
  phase.value = 'playing';

  const paths = names.value.map((_, i) => tracePath(i));
  const winnerIdx = paths.findIndex((p) => p.finalCol === outcomeIndex.value);
  const duration = Math.max(2200, rows.value * 260);
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const eased = easeInOutQuad(t);
    tokenPos.value = paths.map((p) => pointAt(p.points, eased));
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      revealedPaths.value = paths;
      phase.value = 'done';
      winnerName.value = names.value[winnerIdx];
      showPopup.value = true;
      saveResult(winnerName.value, names.value);
    }
  }
  requestAnimationFrame(frame);
}

function closePopup() {
  showPopup.value = false;
}

async function saveResult(winner, participants) {
  try {
    await fetch('/api/coffee-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerName: winner, participants })
    });
  } catch {
    // 기록 저장 실패는 게임 진행에 영향 주지 않음
  }
}

function pointsToStr(points) {
  return points.map((p) => p.join(',')).join(' ');
}
function colorFor(i) {
  return `hsl(${(i * 67) % 360}, 65%, 42%)`;
}
</script>

<template>
  <div>
    <div v-if="phase === 'edit'">
      <p class="hint">커피값 낼 사람을 정해요. 이름을 입력하고 2명 이상 모이면 시작할 수 있어요.</p>
      <div class="add-row">
        <input
          v-model="newName"
          type="text"
          placeholder="이름 입력"
          maxlength="10"
          @keydown.enter="addName"
        >
        <button @click="addName">추가</button>
      </div>
      <div class="chips">
        <span v-for="(n, i) in names" :key="n" class="chip">
          {{ n }} <button class="remove" @click="removeName(i)">×</button>
        </span>
      </div>
      <button class="big-btn" :disabled="names.length < 2" @click="setupLadder">
        사다리 만들기 ({{ names.length }}명)
      </button>
    </div>

    <div v-else>
      <div class="actions">
        <button :disabled="phase === 'playing'" @click="reshuffle">다시 섞기</button>
        <button :disabled="phase === 'playing'" @click="editNames">이름 다시 입력</button>
      </div>

      <div class="ladder-wrap">
        <svg :viewBox="`0 0 ${svgWidth()} ${svgHeight()}`" :width="svgWidth()" class="ladder-svg">
          <line
            v-for="(n, col) in names"
            :key="'v' + col"
            :x1="x(col)" :y1="y(0)" :x2="x(col)" :y2="y(rows)"
            stroke="#f0ddc9" stroke-width="2"
          />
          <template v-for="(row, r) in rungs" :key="'r' + r">
            <line
              v-for="(has, c) in row"
              v-show="has"
              :key="'rung' + r + '-' + c"
              :x1="x(c)" :y1="y(r) + ROW_HEIGHT / 2"
              :x2="x(c + 1)" :y2="y(r) + ROW_HEIGHT / 2"
              stroke="#f0ddc9" stroke-width="2"
            />
          </template>

          <polyline
            v-for="(path, i) in revealedPaths"
            :key="'path' + i"
            :points="pointsToStr(path.points)"
            fill="none"
            :stroke="colorFor(i)"
            stroke-width="2.5"
            stroke-linecap="round"
            opacity="0.55"
          />

          <text
            v-for="(n, col) in names"
            :key="'nametag' + col"
            :x="x(col)" :y="18"
            text-anchor="middle"
            font-size="12"
            :fill="colorFor(col)"
            font-weight="600"
          >{{ n }}</text>

          <text
            v-for="(n, col) in names"
            :key="'outcome' + col"
            :x="x(col)" :y="svgHeight() - 10"
            text-anchor="middle"
            font-size="12"
            :fill="col === outcomeIndex ? 'var(--color-danger)' : 'var(--color-muted)'"
            font-weight="600"
          >{{ col === outcomeIndex ? '☕ 커피' : '통과' }}</text>

          <circle
            v-for="(pos, i) in tokenPos"
            :key="'token' + i"
            :cx="pos[0]" :cy="pos[1]" r="5"
            :fill="colorFor(i)"
            stroke="#fff" stroke-width="1.5"
          />
        </svg>
      </div>

      <button
        class="big-btn play-btn"
        :disabled="phase === 'playing'"
        @click="phase === 'done' ? reshuffle() : playGame()"
      >
        {{ phase === 'ready' ? '시작' : phase === 'playing' ? '내려가는 중...' : '다시 하기' }}
      </button>
    </div>

    <div v-if="showPopup" class="popup-backdrop" @click.self="closePopup">
      <div class="popup">
        <div class="popup-emoji">☕</div>
        <div class="popup-title">오늘의 당첨자</div>
        <div class="popup-name">{{ winnerName }}</div>
        <div class="popup-sub">커피는 {{ winnerName }}님이 쏩니다 🎉</div>
        <button class="big-btn" @click="closePopup">확인</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint { color: var(--color-muted); font-size: 14px; margin-bottom: 16px; }
.add-row { display: flex; gap: 8px; margin-bottom: 14px; }
.add-row input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 15px;
  background: var(--color-surface);
  color: var(--color-text);
}
.add-row button {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.chip {
  background: var(--color-selected-bg);
  color: var(--color-primary-dark);
  border-radius: 999px;
  padding: 6px 10px 6px 14px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.chip .remove {
  border: none;
  background: none;
  color: var(--color-primary-dark);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.big-btn {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(232, 89, 12, 0.35);
}
.big-btn:disabled {
  background: var(--color-primary-light);
  box-shadow: none;
  cursor: default;
}
.play-btn { margin-top: 16px; }
.actions { display: flex; gap: 8px; margin-bottom: 16px; }
.actions button {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-primary-dark);
  border: 1px solid var(--color-primary-light);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.actions button:disabled { opacity: 0.5; cursor: default; }
.ladder-wrap {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 8px 0;
}
.ladder-svg { display: block; margin: 0 auto; }

.popup-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(59, 42, 30, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 100;
}
.popup {
  background: var(--color-surface);
  border-radius: 18px;
  padding: 32px 24px;
  width: 100%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
}
.popup-emoji { font-size: 40px; margin-bottom: 8px; }
.popup-title { font-size: 14px; color: var(--color-muted); font-weight: 600; }
.popup-name { font-size: 28px; font-weight: 800; color: var(--color-primary-dark); margin: 8px 0; }
.popup-sub { font-size: 14px; color: var(--color-text); margin-bottom: 20px; }
</style>
