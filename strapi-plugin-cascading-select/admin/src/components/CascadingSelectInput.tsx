import type { ReactNode } from 'react';
import { Field, Flex, Grid, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useQueryParams } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import { useCascadeOptions } from '../hooks/useCascadeOptions';
import type { CascadingSelectOptions, CascadingSelectValue, SelectOption } from '../types';
import { getTranslation } from '../utils/getTranslation';

interface CascadingSelectInputProps {
  attribute: { type: string; options?: CascadingSelectOptions };
  disabled?: boolean;
  error?: string;
  hint?: ReactNode;
  label: ReactNode;
  labelAction?: ReactNode;
  name: string;
  onChange: (event: { target: { name: string; value: unknown; type: string } }) => void;
  required?: boolean;
  value?: unknown;
}

const EMPTY: CascadingSelectValue = { parent: null, child: null };

const toSelection = (value: unknown): CascadingSelectValue => {
  if (typeof value !== 'object' || value === null) {
    return EMPTY;
  }

  const { parent, child } = value as Record<string, unknown>;

  return {
    parent: typeof parent === 'string' && parent ? parent : null,
    child: typeof child === 'string' && child ? child : null,
  };
};

const CascadingSelectInput = ({
  attribute,
  disabled = false,
  error,
  hint,
  label,
  labelAction,
  name,
  onChange,
  required = false,
  value,
}: CascadingSelectInputProps) => {
  const { formatMessage } = useIntl();
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const locale = query?.plugins?.i18n?.locale;

  const fieldOptions = attribute.options ?? {};
  const selection = toSelection(value);

  const parents = useCascadeOptions('parents', fieldOptions, { locale });
  const children = useCascadeOptions('children', fieldOptions, {
    locale,
    parent: selection.parent,
  });

  const update = (next: CascadingSelectValue | null) =>
    onChange({ target: { name, value: next, type: attribute.type } });

  const handleParentChange = (parent: string | null) => {
    if (parent !== selection.parent) {
      // A new parent invalidates the child.
      update(parent ? { parent, child: null } : null);
    }
  };

  const handleChildChange = (child: string | null) => update({ parent: selection.parent, child });

  // The saved child can stop matching when it is moved to another parent.
  const isChildStale =
    Boolean(selection.child) &&
    !children.isLoading &&
    !children.error &&
    children.total === children.options.length &&
    !children.options.some((option) => option.value === selection.child);

  return (
    <Field.Root
      name={name}
      id={name}
      error={error ?? parents.error ?? children.error}
      hint={hint}
      required={required}
    >
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Field.Label action={labelAction}>{label}</Field.Label>
        <Grid.Root gap={4}>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <LevelSelect
              id={`${name}.parent`}
              label={parents.label}
              placeholder={formatMessage(
                { id: getTranslation('input.placeholder'), defaultMessage: 'Select {label}' },
                { label: parents.label }
              )}
              options={parents.options}
              total={parents.total}
              value={selection.parent}
              onChange={handleParentChange}
              disabled={disabled}
              loading={parents.isLoading}
              hasError={Boolean(error)}
            />
          </Grid.Item>
          <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
            <LevelSelect
              id={`${name}.child`}
              label={children.label}
              placeholder={
                selection.parent
                  ? formatMessage(
                      { id: getTranslation('input.placeholder'), defaultMessage: 'Select {label}' },
                      { label: children.label }
                    )
                  : formatMessage(
                      {
                        id: getTranslation('input.placeholder.parentFirst'),
                        defaultMessage: 'Select {label} first',
                      },
                      { label: parents.label }
                    )
              }
              options={children.options}
              total={children.total}
              value={selection.child}
              onChange={handleChildChange}
              disabled={disabled || !selection.parent}
              loading={Boolean(selection.parent) && children.isLoading}
              hasError={Boolean(error) || isChildStale}
              warning={
                isChildStale
                  ? formatMessage(
                      {
                        id: getTranslation('input.stale'),
                        defaultMessage: 'The saved {child} is no longer part of this {parent}',
                      },
                      { child: children.label, parent: parents.label }
                    )
                  : undefined
              }
            />
          </Grid.Item>
        </Grid.Root>
        <Field.Hint />
        <Field.Error />
      </Flex>
    </Field.Root>
  );
};

interface LevelSelectProps {
  id: string;
  label: string;
  placeholder: string;
  options: SelectOption[];
  total: number;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled: boolean;
  loading: boolean;
  hasError: boolean;
  warning?: string;
}

const LevelSelect = ({
  id,
  label,
  placeholder,
  options,
  total,
  value,
  onChange,
  disabled,
  loading,
  hasError,
  warning,
}: LevelSelectProps) => {
  const { formatMessage } = useIntl();
  const truncated =
    total > options.length
      ? formatMessage(
          {
            id: getTranslation('input.truncated'),
            defaultMessage: 'Showing the first {count} of {total} options',
          },
          { count: options.length, total }
        )
      : undefined;

  return (
    <Field.Root id={id} name={id} error={warning} hint={truncated}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect
        value={value}
        placeholder={placeholder}
        onChange={(next: string | number) => onChange(String(next))}
        onClear={() => onChange(null)}
        clearLabel={formatMessage({ id: getTranslation('input.clear'), defaultMessage: 'Clear' })}
        disabled={disabled}
        loading={loading}
        hasError={hasError}
      >
        {options.map((option) => (
          <SingleSelectOption key={option.value} value={option.value}>
            {option.label}
          </SingleSelectOption>
        ))}
      </SingleSelect>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default CascadingSelectInput;
