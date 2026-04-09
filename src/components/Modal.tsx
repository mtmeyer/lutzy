import { Dialog } from '@kobalte/core/dialog'
import { mergeProps, type Component, type JSX } from 'solid-js'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  class?: string
  children: JSX.Element
}

const Modal: Component<ModalProps> = props => {
  const merged = mergeProps({ class: '' }, props)

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content class="fixed inset-0 z-50 flex items-center justify-center">
          <div
            class={`mx-4 w-full max-w-sm rounded-2xl bg-surface shadow-elevated ${merged.class}`}
          >
            {props.children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}

export default Modal
