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
        class="w-full rounded border border-border bg-surface-2 px-2 py-1 text-sm text-body placeholder:text-text-3 focus:border-accent focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      />
      {props.description && (
        <TextField.Description class="text-xs text-text-3">
          {props.description}
        </TextField.Description>
      )}
      <TextField.ErrorMessage class="text-xs text-red-500">
        {props.error}
      </TextField.ErrorMessage>
    </TextField>
  )
}

export default InputField
