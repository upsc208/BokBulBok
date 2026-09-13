<script setup>
import { ref, computed, watch, onMounted } from 'vue';

const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth() + 1); // 1-12
const history = ref({});
const selectedDate = ref(toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate()));

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function pad(n) {
  return String(n).padStart(2, '0');
}
function toDateStr(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

const cells = computed(() => {
  const firstWeekday = new Date(viewYear.value, viewMonth.value - 1, 1).getDay();
  const daysInMonth = new Date(viewYear.value, viewMonth.value, 0).getDate();
  const list = [];
  for (let i = 0; i < firstWeekday; i++) list.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    list.push({ day: d, dateStr: toDateStr(viewYear.value, viewMonth.value, d) });
  }
  return list;
});

const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

const selectedInfo = computed(() => history.value[selectedDate.value] || null);

async function loadHistory() {
  const res = await fetch(`/api/history?year=${viewYear.value}&month=${viewMonth.value}`);
  const data = await res.json();
  history.value = data.history || {};
}

function prevMonth() {
  viewMonth.value -= 1;
  if (viewMonth.value < 1) {
    viewMonth.value = 12;
    viewYear.value -= 1;
  }
}
function nextMonth() {
  viewMonth.value += 1;
  if (viewMonth.value > 12) {
    viewMonth.value = 1;
    viewYear.value += 1;
  }
}

function selectDate(dateStr) {
  selectedDate.value = dateStr;
}

function topMenu(dateStr) {
  const info = history.value[dateStr];
  return info && info.menus.length ? info.menus[0] : null;
}
function hasCoffee(dateStr) {
  const info = history.value[dateStr];
  return !!(info && info.coffeeWinners.length);
}

watch([viewYear, viewMonth], loadHistory);
onMounted(loadHistory);
</script>

<template>
  <div>
    <div class="nav">
      <button @click="prevMonth">‹</button>
      <div class="month-label">{{ viewYear }}년 {{ viewMonth }}월</div>
      <button @click="nextMonth">›</button>
    </div>

    <div class="weekdays">
      <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
    </div>

    <div class="grid">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="cell"
        :class="{
          empty: !cell,
          today: cell && cell.dateStr === todayStr,
          selected: cell && cell.dateStr === selectedDate,
          hasData: cell && topMenu(cell.dateStr)
        }"
        @click="cell && selectDate(cell.dateStr)"
      >
        <template v-if="cell">
          <div class="day-num">{{ cell.day }}</div>
          <div v-if="topMenu(cell.dateStr)" class="menu-tag">{{ topMenu(cell.dateStr).name }}</div>
          <div v-if="hasCoffee(cell.dateStr)" class="coffee-tag">☕</div>
        </template>
      </div>
    </div>

    <div class="detail">
      <div class="detail-date">{{ selectedDate }}</div>
      <template v-if="selectedInfo">
        <div class="detail-section">
          <div class="detail-label">메뉴</div>
          <div v-for="m in selectedInfo.menus" :key="m.name" class="detail-row">
            <span>{{ m.name }}</span>
            <span class="muted">{{ m.votes }}표</span>
          </div>
        </div>
        <div class="detail-section" v-if="selectedInfo.coffeeWinners.length">
          <div class="detail-label">☕ 커피 쏜 사람</div>
          <div v-for="(w, i) in selectedInfo.coffeeWinners" :key="i" class="detail-row">
            <span>{{ w }}</span>
          </div>
        </div>
      </template>
      <div v-else class="empty-msg">이 날은 기록이 없어요.</div>
    </div>
  </div>
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.nav button {
  border: none;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 18px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  color: var(--color-primary-dark);
}
.month-label { font-size: 16px; font-weight: 700; }
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 12px;
  color: var(--color-muted);
  margin-bottom: 4px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 20px;
}
.cell {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 4px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.cell.empty { cursor: default; }
.cell.hasData { background: var(--color-selected-bg); }
.cell.today .day-num {
  background: var(--color-primary);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cell.selected { border-color: var(--color-primary); }
.day-num { font-weight: 600; margin-bottom: 2px; }
.menu-tag {
  font-size: 10px;
  color: var(--color-primary-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.coffee-tag { font-size: 10px; }
.detail {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 16px;
}
.detail-date { font-weight: 700; margin-bottom: 10px; }
.detail-section { margin-bottom: 12px; }
.detail-label { font-size: 12px; color: var(--color-muted); margin-bottom: 6px; font-weight: 600; }
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  border-bottom: 1px solid var(--color-border);
}
.detail-row .muted { color: var(--color-muted); }
.empty-msg { color: var(--color-muted); font-size: 14px; text-align: center; padding: 12px 0; }
</style>
