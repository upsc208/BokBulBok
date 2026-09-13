<script setup>
import { ref } from 'vue';
import LunchVote from './components/LunchVote.vue';
import LadderGame from './components/LadderGame.vue';
import HistoryCalendar from './components/HistoryCalendar.vue';

const tab = ref('vote');
</script>

<template>
  <div class="page">
    <div class="tabs">
      <button :class="{ active: tab === 'vote' }" @click="tab = 'vote'">🍚 점심 투표</button>
      <button :class="{ active: tab === 'ladder' }" @click="tab = 'ladder'">☕ 커피 사다리</button>
      <button :class="{ active: tab === 'history' }" @click="tab = 'history'">📅 기록</button>
    </div>

    <LunchVote v-if="tab === 'vote'" />
    <LadderGame v-else-if="tab === 'ladder'" />
    <HistoryCalendar v-else />
  </div>
</template>

<style scoped>
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px 16px 40px;
}
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.tabs button {
  flex: 1;
  padding: 10px 4px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-muted);
  cursor: pointer;
  white-space: nowrap;
}
.tabs button.active {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}
</style>
