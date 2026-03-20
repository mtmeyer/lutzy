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
        <TextField.Label class="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {props.label}
        </TextField.Label>
      )}
      <TextField.Input
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        class="w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
      />
      {props.description && (
        <TextField.Description class="text-xs text-gray-400">
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
