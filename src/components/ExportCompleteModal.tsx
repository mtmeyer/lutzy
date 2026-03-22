import { createMemo, Show, type Component } from 'solid-js'

interface ExportCompleteModalProps {
  fileProgress: Record<string, { state: string; percent: number }>
  totalFiles: number
  onNewBatch: () => void
  onClose: () => void
}

const ExportCompleteModal: Component<ExportCompleteModalProps> = props => {
  const successCount = createMemo(() =>
    Object.values(props.fileProgress).filter(e => e.state === 'done').length
  )

  const errorCount = createMemo(() =>
    Object.values(props.fileProgress).filter(e => e.state.startsWith('error')).length
  )

  const allSucceeded = createMemo(() => errorCount() === 0 && successCount() === props.totalFiles)

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={props.onClose}
    >
      <div
        class="mx-4 w-full max-w-sm rounded-xl bg-white shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div class="flex flex-col items-center px-6 pt-8 pb-6">
          {/* Icon */}
          <Show
            when={allSucceeded()}
            fallback={
              <div class="flex size-12 items-center justify-center rounded-full bg-amber-100">
                <svg
                  class="size-6 text-amber-600"
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
            <div class="flex size-12 items-center justify-center rounded-full bg-green-100">
              <svg
                class="size-6 text-green-600"
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

          {/* Heading */}
          <h2 class="mt-4 text-lg font-semibold text-gray-900">
            {allSucceeded() ? 'Export Complete' : 'Export Finished'}
          </h2>

          {/* Summary */}
          <p class="mt-2 text-center text-sm text-gray-500">
            <Show when={errorCount() === 0}>
              {successCount()} of {props.totalFiles} clip
              {props.totalFiles !== 1 ? 's' : ''} exported successfully.
            </Show>
            <Show when={errorCount() > 0}>
              {successCount()} of {props.totalFiles} clip
              {props.totalFiles !== 1 ? 's' : ''} exported.
              <br />
              <span class="text-red-500">
                {errorCount()} failed.
              </span>
            </Show>
          </p>

          {/* Actions */}
          <div class="mt-6 flex w-full flex-col gap-2">
            <button
              onClick={props.onNewBatch}
              class="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Start New Batch
            </button>
            <button
              onClick={props.onClose}
              class="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportCompleteModal
