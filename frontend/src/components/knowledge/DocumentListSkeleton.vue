<template>
  <div class="doc-list-skeleton">
    <div v-for="i in 5" :key="i" class="doc-row-skeleton">
      <div class="doc-info-skeleton">
        <div class="doc-icon-skeleton"></div>
        <div class="doc-texts-skeleton">
          <div class="doc-name-skeleton"></div>
          <div class="doc-date-skeleton"></div>
        </div>
      </div>
      <div class="doc-actions-skeleton">
        <div class="doc-status-skeleton"></div>
        <div class="doc-btn-skeleton"></div>
        <div class="doc-btn-skeleton"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-list-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-row-skeleton {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

.doc-info-skeleton {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.doc-icon-skeleton {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.doc-texts-skeleton {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.doc-name-skeleton {
  height: 18px;
  width: 60%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.1s;
}

.doc-date-skeleton {
  height: 14px;
  width: 100px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.2s;
}

.doc-actions-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.doc-status-skeleton {
  width: 80px;
  height: 26px;
  border-radius: 20px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.3s;
}

.doc-btn-skeleton {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.4s;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
