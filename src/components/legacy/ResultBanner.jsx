// src/components/ResultBanner.jsx
import React from 'react';

const ResultBanner = ({ result }) => {
  if (!result) return null;

  return (
    <div
      className={`result-banner ${
        result.type === 'success' ? 'success' : 'fail'
      }`}
    >
      <strong>{result.title}</strong> {result.message}{' '}
      {result.grade && <span>(등급: {result.grade})</span>}
    </div>
  );
};

export default ResultBanner;
