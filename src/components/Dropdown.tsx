import { Select } from '@kobalte/core/select'
import { type Component } from 'solid-js'

export interface DropdownOption {
  label: string
  value: string
}

interface DropdownProps {
  options: DropdownOption[]
  value: DropdownOption | null
  onChange: (option: DropdownOption | null) => void
  placeholder?: string
  disabled?: boolean
}

const Dropdown: Component<DropdownProps> = props => {
  return (
    <Select<DropdownOption>
      options={props.options}
      value={props.value}
      onChange={props.onChange}
      optionValue="value"
      optionTextValue="label"
      placeholder={props.placeholder ?? 'Select…'}
      disabled={props.disabled}
      gutter={4}
      itemComponent={itemProps => (
        <Select.Item
          item={itemProps.item}
          class="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm text-body outline-none transition-colors hover:bg-surface-3 data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent"
        >
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="text-accent">
            <svg
              class="size-3.5"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          </Select.ItemIndicator>
        </Select.Item>
      )}
    >
      <Select.Trigger
        class="flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm text-body transition-colors hover:bg-surface-3 focus:border-accent focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
        aria-label="Dropdown"
      >
        <Select.Value<DropdownOption>>
          {state => {
            const selected = state.selectedOption()
            return selected ? (
              selected.label
            ) : (
              <span class="text-text-3">{props.placeholder ?? 'Select…'}</span>
            )
          }}
        </Select.Value>
        <Select.Icon>
          <svg
            class="ml-2 size-3.5 shrink-0 text-text-3 ui-expanded:rotate-180"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2.5 4.5L6 8l3.5-3.5" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content class="z-50 rounded-md border border-border bg-surface-3 shadow-lg">
          <Select.Listbox class="max-h-60 overflow-y-auto p-1" />
        </Select.Content>
      </Select.Portal>
    </Select>
  )
}

export default Dropdown
