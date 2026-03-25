import { Dialog } from '@kobalte/core/dialog'
import { type Component } from 'solid-js'
import Modal from './Modal'

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: Component<ConfirmModalProps> = props => {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange}>
      <div class="flex flex-col items-center px-6 pt-8 pb-6">
        <Dialog.Title class="text-lg font-semibold text-heading">
          {props.title}
        </Dialog.Title>

        <p class="mt-2 text-center text-sm text-text-2">{props.message}</p>

        <div class="mt-6 flex w-full gap-2">
          <button
            onClick={props.onCancel}
            class="flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-text-2 hover:text-body transition-colors"
          >
            {props.cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={props.onConfirm}
            class={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
              props.destructive
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-accent hover:bg-accent-hover'
            }`}
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmModal
