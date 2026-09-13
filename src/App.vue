<script setup>
import { ref } from 'vue';
import LunchVote from './components/LunchVote.vue';
import LadderGame from './components/LadderGame.vue';

const tab = ref('vote');
</script>

<template>
  <div class="page">
    <div class="tabs">
      <button :class="{ active: tab === 'vote' }" @click="tab = 'vote'">🍚 점심 투표</button>
      <button :class="{ active: tab === 'ladder' }" @click="tab = 'ladder'">☕ 커피 사다리</button>
    </div>

    <LunchVote v-if="tab === 'vote'" />
    <LadderGame v-else />
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
  padding: 12px 8px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
}
.tabs button.active {
  border-color: #2f6fed;
  background: #2f6fed;
  color: #fff;
}
</style>
