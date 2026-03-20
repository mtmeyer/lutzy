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
          class="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm text-gray-800 outline-none transition-colors hover:bg-gray-100 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700"
        >
          <Select.ItemLabel>{itemProps.item.rawValue.label}</Select.ItemLabel>
          <Select.ItemIndicator class="text-blue-600">
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
        class="flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 transition-colors hover:bg-gray-100 focus:border-blue-400 focus:outline-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
        aria-label="Dropdown"
      >
        <Select.Value<DropdownOption>>
          {state => {
            const selected = state.selectedOption()
            return selected ? (
              selected.label
            ) : (
              <span class="text-gray-400">{props.placeholder ?? 'Select…'}</span>
            )
          }}
        </Select.Value>
        <Select.Icon>
          <svg
            class="ml-2 size-3.5 shrink-0 text-gray-400 ui-expanded:rotate-180"
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
        <Select.Content class="z-50 rounded-md border border-gray-200 bg-white shadow-lg">
          <Select.Listbox class="max-h-60 overflow-y-auto p-1" />
        </Select.Content>
      </Select.Portal>
    </Select>
  )
}

export default Dropdown
