// src/components/ResultPanel.js
import React from "react";

export default function ResultPanel({ resultUrl }) {
  if (!resultUrl) {
    return (
      <div className="text-secondary">
        결과 없음. 
      </div>
    );
  }

  return (
    <div>
      <img src={resultUrl} alt="result" className="img-fluid rounded" />
      <a className="btn btn-sm btn-outline-secondary mt-2" href={resultUrl} download="result.png">
        다운로드
      </a>
    </div>
  );
}
