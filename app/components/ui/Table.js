'use client';
import { useState } from 'react';

export default function Table({ columns, data, onRowClick, emptyMessage = 'Aucune donnée' }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1F2937]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left text-xs text-gray-400 uppercase tracking-wider py-3 px-3 ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-[#1F2937]/50 ${onRowClick ? 'cursor-pointer hover:bg-[#1F2937]/50' : ''} transition-colors`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-3 ${col.align === 'right' ? 'text-right' : ''} ${col.className || ''}`}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
