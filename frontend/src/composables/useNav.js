import { ref } from 'vue'

// Shared top-level page navigation state, so any component (not just App.vue)
// can send the user to a different page — e.g. ManagementView linking to the
// attendance page, or AttendancePage returning to 賽程管理 when done.
const currentPage = ref('game')

export function useNav() {
  return { currentPage }
}
