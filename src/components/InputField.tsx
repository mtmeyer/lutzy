import { TextField } from '@kobalte/core/text-field'
import { type Component } from 'solid-js'

interface InputFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  error?: string
  description?: string
  class?: string
}

const InputField: Component<InputFieldProps> = props => {
  return (
    <TextField
      value={props.value}
      onChange={props.onChange}
      validationState={props.error ? 'invalid' : undefined}
      disabled={props.disabled}
      class={`flex flex-col gap-1 ${props.class ?? ''}`}
    >
      {props.label && (
        <TextField.Label class="text-xs font-semibold uppercase tracking-wider text-text-2">
          {props.label}
        </TextField.Label>
      )}
      <TextField.Input
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        class="w-full rounded-lg bg-surface-hover px-3 py-2 text-sm text-body placeholder:text-text-3 focus:ring-2 focus:ring-accent/30 focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40"
      />
      {props.description && (
        <TextField.Description class="text-xs text-text-3">
          {props.description}
        </TextField.Description>
      )}
      <TextField.ErrorMessage class="text-xs text-error">
        {props.error}
      </TextField.ErrorMessage>
    </TextField>
  )
}

export default InputField
