// Task lifecycle:
//   UPLOADING -> UPLOADED -> QUEUED -> WAITING -> PROCESSING -> COMPLETED
// with FAILED and CANCELLED as terminal off-ramps.
export const TaskState = Object.freeze({
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  QUEUED: 'QUEUED',
  WAITING: 'WAITING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

export const TERMINAL_STATES = new Set([
  TaskState.COMPLETED,
  TaskState.FAILED,
  TaskState.CANCELLED,
]);

// Allowed transitions. Anything else throws (see Task.transition).
export const TRANSITIONS = Object.freeze({
  [TaskState.UPLOADING]: [TaskState.UPLOADED, TaskState.FAILED, TaskState.CANCELLED],
  [TaskState.UPLOADED]: [TaskState.QUEUED, TaskState.FAILED, TaskState.CANCELLED],
  [TaskState.QUEUED]: [TaskState.WAITING, TaskState.CANCELLED, TaskState.FAILED],
  [TaskState.WAITING]: [TaskState.PROCESSING, TaskState.CANCELLED, TaskState.FAILED],
  [TaskState.PROCESSING]: [TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED],
  [TaskState.COMPLETED]: [],
  [TaskState.FAILED]: [],
  [TaskState.CANCELLED]: [],
});

export function canTransition(from, to) {
  return TRANSITIONS[from]?.includes(to) ?? false;
}
