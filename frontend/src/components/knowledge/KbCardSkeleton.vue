<template>
  <div class="kb-card-skeleton">
    <div class="skeleton-header">
      <div class="skeleton-icon"></div>
      <div class="skeleton-meta">
        <div class="skeleton-title"></div>
        <div class="skeleton-desc"></div>
        <div class="skeleton-tag"></div>
      </div>
    </div>
    <div class="skeleton-actions">
      <div class="skeleton-btn"></div>
      <div class="skeleton-btn-icon"></div>
      <div class="skeleton-btn-icon"></div>
    </div>
  </div>
</template>

<style scoped>
.kb-card-skeleton {
  padding: 24px;
  border-radius: 20px;
  border: 2px solid var(--border-subtle);
  background: white;
}

.skeleton-header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.skeleton-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  flex-shrink: 0;
}

.skeleton-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.skeleton-title {
  height: 22px;
  width: 70%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-desc {
  height: 16px;
  width: 90%;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.1s;
}

.skeleton-tag {
  height: 20px;
  width: 60px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.2s;
}

.skeleton-actions {
  display: flex;
  gap: 12px;
}

.skeleton-btn {
  flex: 1;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.3s;
}

.skeleton-btn-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
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
