import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * Reusable table for displaying activity attempts and their results.

 * />
 */
export default function ResultsTable({ columns, rows }) {
  if (!columns || columns.length === 0) {
    return null;
  }

  return (
    <View style={styles.table}>
      {/* Header row */}
      <View style={[styles.row, styles.headerRow]}>
        {columns.map((col, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.headerText}>{col}</Text>
          </View>
        ))}
      </View>

      {/* Data rows */}
      {rows && rows.length > 0 ? (
        rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cellValue, cellIndex) => (
              <View key={cellIndex} style={styles.cell}>
                <Text
                  style={[
                    styles.cellText,
                    cellValue === null && styles.cellEmpty,
                    isCorrectCell(cellValue) && styles.cellCorrect,
                    isIncorrectCell(cellValue) && styles.cellIncorrect,
                  ]}
                >
                  {cellValue === null ? '—' : String(cellValue)}
                </Text>
              </View>
            ))}
          </View>
        ))
      ) : (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>No attempts yet</Text>
        </View>
      )}
    </View>
  );
}

// Helpers to colour the "OK?" column based on value
function isCorrectCell(value) {
  if (typeof value !== 'string') return false;
  const v = value.toLowerCase();
  return v === 'yes' || v === '✓' || v === 'correct';
}

function isIncorrectCell(value) {
  if (typeof value !== 'string') return false;
  const v = value.toLowerCase();
  return v === 'no' || v === '✗' || v === 'incorrect';
}

const styles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  headerRow: {
    backgroundColor: '#F9FAFB',
    borderTopWidth: 0,
  },
  cell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  cellText: {
    fontSize: 12,
    color: '#1A1A1A',
  },
  cellEmpty: {
    color: '#D1D5DB',
  },
  cellCorrect: {
    color: '#1D9E75',
    fontWeight: '500',
  },
  cellIncorrect: {
    color: '#D85A30',
    fontWeight: '500',
  },
  emptyRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});