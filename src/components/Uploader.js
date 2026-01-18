// src/components/Uploader.js
import React, { useRef } from "react";

export default function Uploader({ imageFile, onPick, onClear }) {
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    onPick?.(file);
    // 같은 파일을 다시 선택해도 change가 발생하게 리셋
    e.target.value = "";
  };

  const handleClear = () => {
    onClear?.();
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center">
        <input
          ref={inputRef}
          type="file"
          className="form-control"
          accept="image/*"
          onChange={handleChange}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={handleClear}
          disabled={!imageFile}
        >
          Clear
        </button>
      </div>

      <div className="mt-2 small text-secondary">
        {imageFile ? (
          <>
            선택됨: <span className="fw-semibold">{imageFile.name}</span>{" "}
            <span className="text-muted">
              ({Math.round(imageFile.size / 1024).toLocaleString()} KB)
            </span>
          </>
        ) : (
          "이미지를 업로드하세요 (jpg/png/webp 등)."
        )}
      </div>
    </div>
  );
}
