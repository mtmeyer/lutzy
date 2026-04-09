import { Dialog } from '@kobalte/core/dialog'
import { For, type Component } from 'solid-js'
import Modal from './Modal'

interface FilenameCollisionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paths: string[]
  onDismiss: () => void
}

const FilenameCollisionModal: Component<FilenameCollisionModalProps> = props => {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange}>
      <div class="flex flex-col items-center px-6 pt-8 pb-6">
        <div class="flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            class="size-7 text-error"
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

        <Dialog.Title class="mt-4 text-lg font-bold text-heading">
          Filename conflict
        </Dialog.Title>

        <p class="mt-2 text-center text-sm text-text-2">
          Some output files would overwrite existing files or resolve to the same
          filename. Please update the Filename or Output format settings to avoid
          collisions.
        </p>

        <div class="mt-3 max-h-40 w-full overflow-y-auto rounded-xl bg-surface-2 px-3 py-2">
          <ul class="space-y-1">
            <For each={props.paths}>
              {path => (
                <li class="truncate text-xs text-text-3" title={path}>
                  {path.split('/').pop() ?? path}
                </li>
              )}
            </For>
          </ul>
        </div>

        <div class="mt-6 w-full">
          <button
            onClick={props.onDismiss}
            class="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover active:scale-[0.98]"
          >
            OK
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default FilenameCollisionModal
