import { createRouter, createWebHistory } from 'vue-router'
import WorkflowList from '../components/WorkflowList.vue'
import FlowCanvas from '../components/FlowCanvas.vue'
import KnowledgeBaseManager from '../components/KnowledgeBaseManager.vue'

const routes = [
  {
    path: '/',
    redirect: '/workflow'
  },
  {
    path: '/workflow',
    name: 'WorkflowList',
    component: WorkflowList
  },
  {
    path: '/workflow/editor',
    name: 'WorkflowEditor',
    component: FlowCanvas
  },
  {
    path: '/knowledge',
    name: 'KnowledgeBase',
    component: KnowledgeBaseManager
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
