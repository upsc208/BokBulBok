<script setup>
import { ref, reactive, computed } from 'vue';

const names = ref(['철수', '영희', '민수']);
const newName = ref('');
const started = ref(false);
const rungs = ref([]); // rungs[row][col] = true if a rung connects col and col+1
const rows = ref(0);
const outcomeIndex = ref(0);
const revealed = reactive({}); // { [startIndex]: { points, finalCol } }

const COL_WIDTH = 64;
const ROW_HEIGHT = 26;
const TOP_MARGIN = 34;
const BOTTOM_MARGIN = 34;

const svgWidth = computed(() => names.value.length * COL_WIDTH);
const svgHeight = computed(() => TOP_MARGIN + rows.value * ROW_HEIGHT + BOTTOM_MARGIN);

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

function startLadder() {
  const n = names.value.length;
  if (n < 2) return;
  rows.value = Math.min(Math.max(n * 3, 8), 20);
  rungs.value = generateRungs(n, rows.value);
  outcomeIndex.value = Math.floor(Math.random() * n);
  for (const key of Object.keys(revealed)) delete revealed[key];
  started.value = true;
}

function reshuffle() {
  startLadder();
}

function editNames() {
  started.value = false;
  for (const key of Object.keys(revealed)) delete revealed[key];
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

function reveal(i) {
  if (revealed[i]) return;
  revealed[i] = tracePath(i);
}
function revealAll() {
  names.value.forEach((_, i) => reveal(i));
}

function pointsToStr(points) {
  return points.map((p) => p.join(',')).join(' ');
}
function colorFor(i) {
  return `hsl(${(i * 67) % 360}, 70%, 45%)`;
}
function resultLabel(i) {
  const r = revealed[i];
  if (!r) return '';
  return r.finalCol === outcomeIndex.value ? '☕ 커피 당첨' : '통과';
}
</script>

<template>
  <div>
    <div v-if="!started">
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
      <button class="start-btn" :disabled="names.length < 2" @click="startLadder">
        사다리 타기 시작 ({{ names.length }}명)
      </button>
    </div>

    <div v-else>
      <div class="actions">
        <button @click="revealAll">전체 결과 공개</button>
        <button @click="reshuffle">다시 섞기</button>
        <button @click="editNames">이름 다시 입력</button>
      </div>

      <div class="ladder-wrap">
        <svg :viewBox="`0 0 ${svgWidth} ${svgHeight}`" :width="svgWidth" class="ladder-svg">
          <line
            v-for="(n, col) in names"
            :key="'v' + col"
            :x1="x(col)" :y1="y(0)" :x2="x(col)" :y2="y(rows)"
            stroke="#ccc" stroke-width="2"
          />
          <template v-for="(row, r) in rungs" :key="'r' + r">
            <line
              v-for="(has, c) in row"
              v-show="has"
              :key="'rung' + r + '-' + c"
              :x1="x(c)" :y1="y(r) + ROW_HEIGHT / 2"
              :x2="x(c + 1)" :y2="y(r) + ROW_HEIGHT / 2"
              stroke="#ccc" stroke-width="2"
            />
          </template>

          <polyline
            v-for="(path, i) in revealed"
            :key="'path' + i"
            :points="pointsToStr(path.points)"
            fill="none"
            :stroke="colorFor(i)"
            stroke-width="3"
            stroke-linecap="round"
          />

          <text
            v-for="(n, col) in names"
            :key="'nametag' + col"
            :x="x(col)" :y="18"
            text-anchor="middle"
            font-size="12"
            :fill="revealed[col] ? colorFor(col) : '#333'"
            style="cursor:pointer; font-weight:600"
            @click="reveal(col)"
          >{{ n }}</text>

          <text
            v-for="(n, col) in names"
            :key="'outcome' + col"
            :x="x(col)" :y="svgHeight - 10"
            text-anchor="middle"
            font-size="12"
            :fill="col === outcomeIndex ? '#e0521f' : '#999'"
            font-weight="600"
          >{{ col === outcomeIndex ? '☕ 커피' : '통과' }}</text>
        </svg>
      </div>

      <p class="tip">이름을 눌러서 결과를 확인하세요.</p>

      <div v-if="Object.keys(revealed).length" class="results">
        <div v-for="(path, i) in revealed" :key="'result' + i" class="result-row">
          <span :style="{ color: colorFor(i) }">{{ names[i] }}</span>
          <span :class="{ hit: path.finalCol === outcomeIndex }">{{ resultLabel(i) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hint { color: #666; font-size: 14px; margin-bottom: 16px; }
.add-row { display: flex; gap: 8px; margin-bottom: 14px; }
.add-row input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 15px;
}
.add-row button, .start-btn, .actions button {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: #2f6fed;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.chip {
  background: #eef3ff;
  color: #2f6fed;
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
  color: #2f6fed;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}
.start-btn { width: 100%; }
.start-btn:disabled { background: #aac0ee; cursor: default; }
.actions { display: flex; gap: 8px; margin-bottom: 16px; }
.actions button { flex: 1; background: #fff; color: #2f6fed; border: 1px solid #2f6fed; }
.ladder-wrap {
  overflow-x: auto;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 8px 0;
}
.ladder-svg { display: block; margin: 0 auto; }
.tip { text-align: center; color: #999; font-size: 12px; margin: 10px 0; }
.results { margin-top: 12px; }
.result-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 14px;
}
.result-row .hit { color: #e0521f; font-weight: 700; }
</style>
