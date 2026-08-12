/** @file
  Copyright (c) 2026, The Videre Project Authors. All rights reserved.
  SPDX-License-Identifier: Apache-2.0
**/

export type Column = {
  key: string;
  label: string;
  align?: Alignment,
  separator?: boolean;
}

export type Alignment = 'left' | 'right' | 'center';

export function formatTable(columns: Column[], rows: Record<string, any>[]) {
  // Determine the maximum length of each column
  const maxLengths = columns.reduce((acc, { label, key }) => {
    const values = rows.map((row) => String(row[key]));
    const max = Math.max(...values.map((value) => value.length), label.length);
    return { ...acc, [key]: max };
  }, {} as Record<string, number>);

  // Create a helper function to align column values
  function pad(key: string, value: any, align?: Alignment, padding: number = 1) {
    value = value?.toString();
    const column = columns.find((column) => column.key === key)!;
    const cpad = maxLengths[key] - value.length;
    switch (align || column.align) {
      case 'left':
        value = ' '.repeat(padding) + value + ' '.repeat(cpad + padding);
        break;
      case 'right':
        value = ' '.repeat(cpad + padding) + value + ' '.repeat(padding);
        break;
      case 'center': {
        const leftPad = Math.floor(cpad / 2) + padding;
        const rightPad = Math.ceil(cpad / 2) + padding;
        value = ' '.repeat(leftPad) + value + ' '.repeat(rightPad);
        break;
      }
    }
    return value;
  }

  // Create the header row and divider
  let divider = '';
  const header = columns.reduce((acc, { key, label, separator }, i) => {
    let header_row = pad(key, label, 'center');
    divider += '═'.repeat(header_row.length);
    if (i !== columns.length - 1) {
      header_row += separator ? '│' : ' ';
      if (separator) divider += '╪';
    }

    acc += header_row;
    divider += '═'.repeat(Math.max(0, acc.length - divider.length));

    return acc;
  }, '' as any);

  // Create the body rows
  const body = rows.reduce((acc, row, i) => {
    let body_row = '';
    columns.forEach(({ key, separator }, j) => {
      body_row += pad(key, row[key]);
      if (j !== columns.length - 1) {
        const rpad = separator ? '│' : ' ';
        body_row += rpad;
      }
    });

    if (i != rows.length - 1)
      body_row += '\n';

    return acc + body_row;
  }, '');

  // Join the header, divider, and body
  return `\`\`\`\n${header}\n${divider}\n${body}\n\`\`\``;
}
