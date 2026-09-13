<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

function getClientId() {
  let id = localStorage.getItem('lunchVoteClientId');
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : 'c-' + Date.now() + '-' + Math.random().toString(16).slice(2))
      .replace(/[^a-zA-Z0-9-]/g, '');
    localStorage.setItem('lunchVoteClientId', id);
  }
  return id;
}

const clientId = getClientId();
const date = ref('');
const menus = ref([]);
const myVote = ref(null);
const newMenuName = ref('');
const adding = ref(false);
let timer = null;

const total = computed(() => menus.value.reduce((s, m) => s + m.votes, 0) || 1);

async function loadMyVote() {
  const res = await fetch('/api/my-vote?clientId=' + encodeURIComponent(clientId));
  const data = await res.json();
  myVote.value = data.menuId;
}

async function loadMenus() {
  const res = await fetch('/api/menus');
  const data = await res.json();
  date.value = data.date;
  menus.value = data.menus;
}

async function refresh() {
  await loadMyVote();
  await loadMenus();
}

async function vote(menuId) {
  await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, menuId })
  });
  myVote.value = menuId;
  await loadMenus();
}

async function addMenu() {
  const name = newMenuName.value.trim();
  if (!name) return;
  adding.value = true;
  try {
    await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    newMenuName.value = '';
    await loadMenus();
  } finally {
    adding.value = false;
  }
}

function pct(m) {
  return Math.round((m.votes / total.value) * 100);
}

onMounted(() => {
  refresh();
  timer = setInterval(refresh, 4000);
});
onUnmounted(() => clearInterval(timer));
</script>

<template>
  <div>
    <div class="date">{{ date }}</div>

    <div class="add-row">
      <input
        v-model="newMenuName"
        type="text"
        placeholder="메뉴 이름 입력 (예: 김치찌개)"
        maxlength="30"
        @keydown.enter="addMenu"
      >
      <button :disabled="adding" @click="addMenu">추가</button>
    </div>

    <div v-if="menus.length === 0" class="empty">
      아직 등록된 메뉴가 없어요. 위에서 추가해보세요!
    </div>

    <div
      v-for="m in menus"
      :key="m.id"
      class="menu-item"
      :class="{ selected: m.id === myVote }"
      @click="vote(m.id)"
    >
      <div style="flex:1">
        <div class="row">
          <span class="menu-name">{{ m.name }}</span>
          <span class="menu-votes">{{ m.votes }}표</span>
        </div>
        <div class="bar-track"><div class="bar" :style="{ width: pct(m) + '%' }"></div></div>
      </div>
    </div>

    <div class="footer">한 사람당 하루 한 표, 다시 누르면 변경돼요</div>
  </div>
</template>

<style scoped>
.date { color: #888; font-size: 13px; margin-bottom: 20px; }
.add-row { display: flex; gap: 8px; margin-bottom: 20px; }
.add-row input {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  font-size: 15px;
}
.add-row button {
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: #2f6fed;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.add-row button:disabled { background: #aac0ee; cursor: default; }
.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color .15s, background .15s;
}
.menu-item:hover { border-color: #bbb; }
.menu-item.selected { border-color: #2f6fed; background: #eef3ff; }
.row { display: flex; justify-content: space-between; }
.menu-name { font-size: 16px; font-weight: 500; }
.menu-votes { font-size: 14px; color: #666; }
.bar-track { background: #eee; border-radius: 2px; margin-top: 8px; }
.bar { height: 4px; background: #2f6fed; border-radius: 2px; transition: width .2s; }
.empty { color: #999; font-size: 14px; text-align: center; padding: 24px 0; }
.footer { text-align: center; color: #aaa; font-size: 12px; margin-top: 24px; }
</style>
