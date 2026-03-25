import { ToggleButton } from '@kobalte/core/toggle-button'
import { type Component } from 'solid-js'

interface ToggleProps {
  checked: boolean
  onChange: (pressed: boolean) => void
  disabled?: boolean
  label?: string
}

const Toggle: Component<ToggleProps> = props => {
  return (
    <label class="relative inline-flex cursor-pointer items-center gap-2">
      <ToggleButton
        pressed={props.checked}
        onChange={props.onChange}
        disabled={props.disabled}
        aria-label={props.label ?? 'Toggle'}
        class="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      >
        {state => (
          <div
            class="h-5 w-9 rounded-full bg-border transition-colors after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all"
            classList={{
              'bg-accent': state.pressed(),
              'after:translate-x-4': state.pressed()
            }}
          />
        )}
      </ToggleButton>
      {props.label && <span class="text-sm text-body">{props.label}</span>}
    </label>
  )
}

export default Toggle
