import { Dialog } from '@kobalte/core/dialog'
import { createMemo, Show, type Component } from 'solid-js'
import Modal from './Modal'

interface ExportCompleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileProgress: Record<string, { state: string; percent: number }>
  totalFiles: number
  onNewBatch: () => void
}

const ExportCompleteModal: Component<ExportCompleteModalProps> = props => {
  const successCount = createMemo(
    () => Object.values(props.fileProgress).filter(e => e.state === 'done').length
  )

  const errorCount = createMemo(
    () =>
      Object.values(props.fileProgress).filter(e => e.state.startsWith('error')).length
  )

  const allSucceeded = createMemo(
    () => errorCount() === 0 && successCount() === props.totalFiles
  )

  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange}>
      <div class="flex flex-col items-center px-6 pt-8 pb-6">
        <Show
          when={allSucceeded()}
          fallback={
            <div class="flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <svg
                class="size-7 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          }
        >
          <div class="flex size-14 items-center justify-center rounded-full bg-accent-soft">
            <svg
              class="size-7 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
        </Show>

        <Dialog.Title class="mt-4 text-lg font-bold text-heading">
          {allSucceeded() ? 'Export Complete' : 'Export Finished'}
        </Dialog.Title>

        <p class="mt-2 text-center text-sm text-text-2">
          <Show when={errorCount() === 0}>
            {successCount()} of {props.totalFiles} clip
            {props.totalFiles !== 1 ? 's' : ''} exported successfully.
          </Show>
          <Show when={errorCount() > 0}>
            {successCount()} of {props.totalFiles} clip
            {props.totalFiles !== 1 ? 's' : ''} exported.
            <br />
            <span class="text-error">{errorCount()} failed.</span>
          </Show>
        </p>

        <div class="mt-6 flex w-full flex-col gap-2">
          <button
            onClick={props.onNewBatch}
            class="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover active:scale-[0.98]"
          >
            Start New Batch
          </button>
          <Dialog.CloseButton class="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-text-2 hover:text-body hover:bg-surface-hover">
            Close
          </Dialog.CloseButton>
        </div>
      </div>
    </Modal>
  )
}

export default ExportCompleteModal
