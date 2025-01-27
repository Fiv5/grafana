import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { Field, GrafanaTheme2, LogLevel, LogRowModel, MutableDataFrame } from '@grafana/data';

import { LogDetails, Props } from './LogDetails';
import { expect } from '../../../../../public/test/lib/common';

const setup = (propOverrides?: Partial<Props>, rowOverrides?: Partial<LogRowModel>) => {
  const props: Props = {
    theme: {} as GrafanaTheme2,
    showDuplicates: false,
    wrapLogMessage: false,
    row: {
      dataFrame: new MutableDataFrame(),
      entryFieldIndex: 0,
      rowIndex: 0,
      logLevel: 'error' as LogLevel,
      timeFromNow: '',
      timeEpochMs: 1546297200000,
      timeEpochNs: '1546297200000000000',
      timeLocal: '',
      timeUtc: '',
      hasAnsi: false,
      hasUnescapedContent: false,
      entry: '',
      raw: '',
      uid: '0',
      labels: {},
      ...(rowOverrides || {}),
    },
    getRows: () => [],
    onClickFilterLabel: () => {},
    onClickFilterOutLabel: () => {},
    ...(propOverrides || {}),
  };

  render(
    <table>
      <tbody>
        <LogDetails {...props} />
      </tbody>
    </table>
  );
};

describe('LogDetails', () => {
  describe('when labels are present', () => {
    it('should render heading', () => {
      setup(undefined, { labels: { key1: 'label1', key2: 'label2' } });
      expect(screen.getAllByLabelText('Log labels')).toHaveLength(1);
    });
    it('should render labels', () => {
      setup(undefined, { labels: { key1: 'label1', key2: 'label2' } });
      expect(screen.getByRole('cell', { name: 'key1' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'label1' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'key2' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'label2' })).toBeInTheDocument();
    });
  });
  describe('when log row has error', () => {
    it('should not render log level border', () => {
      // Is this a good test case for RTL??
      setup({ hasError: true }, undefined);
      expect(screen.getByLabelText('Log level').classList.toString()).not.toContain('logs-row__level');
    });
  });
  describe('when row entry has parsable fields', () => {
    it('should render heading ', () => {
      setup(undefined, { entry: 'test=successful' });
      expect(screen.getAllByTitle('Ad-hoc statistics')).toHaveLength(1);
    });
    it('should render detected fields', () => {
      setup(undefined, { entry: 'test=successful' });
      expect(screen.getByRole('cell', { name: 'test' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'successful' })).toBeInTheDocument();
    });
  });
  describe('when row entry have parsable fields and labels are present', () => {
    it('should render all headings', () => {
      setup(undefined, { entry: 'test=successful', labels: { key: 'label' } });
      expect(screen.getAllByLabelText('Log labels')).toHaveLength(1);
      expect(screen.getAllByLabelText('Detected fields')).toHaveLength(1);
    });
    it('should render all labels and detected fields', () => {
      setup(undefined, { entry: 'test=successful', labels: { key: 'label' } });
      expect(screen.getByRole('cell', { name: 'key' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'label' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'test' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'successful' })).toBeInTheDocument();
    });
  });
  describe('when row entry and labels are not present', () => {
    it('should render no details available message', () => {
      setup(undefined, { entry: '' });
      expect(screen.getByText('No details available')).toBeInTheDocument();
    });
    it('should not render headings', () => {
      setup(undefined, { entry: '' });
      expect(screen.queryAllByLabelText('Log labels')).toHaveLength(0);
      expect(screen.queryAllByLabelText('Detected fields')).toHaveLength(0);
    });
  });

  it('should render fields from dataframe with links', () => {
    const entry = 'traceId=1234 msg="some message"';
    const dataFrame = new MutableDataFrame({
      fields: [
        { name: 'entry', values: [entry] },
        // As we have traceId in message already this will shadow it.
        {
          name: 'traceId',
          values: ['1234'],
          config: { links: [{ title: 'link', url: 'localhost:3210/${__value.text}' }] },
        },
        { name: 'userId', values: ['5678'] },
      ],
    });
    setup(
      {
        getFieldLinks: (field: Field, rowIndex: number) => {
          if (field.config && field.config.links) {
            return field.config.links.map((link) => {
              return {
                href: link.url.replace('${__value.text}', field.values.get(rowIndex)),
                title: link.title,
                target: '_blank',
                origin: field,
              };
            });
          }
          return [];
        },
      },
      { entry, dataFrame, entryFieldIndex: 0, rowIndex: 0 }
    );
    expect(screen.getAllByRole('table')).toHaveLength(2);
    const rowDetailsTable = screen.getAllByRole('table')[1];
    const rowDetailRows = within(rowDetailsTable).getAllByRole('row');
    expect(rowDetailRows).toHaveLength(4); // 3 LogDetailsRow + 1 header
    const traceIdRow = within(rowDetailsTable).getByRole('cell', { name: 'traceId' }).closest('tr');
    expect(traceIdRow).toBeInTheDocument();
    const link = within(traceIdRow!).getByRole('link', { name: 'link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'localhost:3210/1234');
  });
});
