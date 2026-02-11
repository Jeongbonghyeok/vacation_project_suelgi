// src/pages/Main.js
import React, { useState, useRef } from "react";
import Uploader from "../components/Uploader";
import MaskEditor from "../components/MaskEditor";
import ResultPanel from "../components/ResultPanel";
import Header from "./Header";
import logo from "../nfulogo.png"; 

export default function Main() {
  const [imageFile, setImageFile] = useState(null);

  // editor controls
  const [brushSize, setBrushSize] = useState(24);
  const [mode, setMode] = useState("draw"); // "draw" | "erase"

  // result
  const [resultUrl, setResultUrl] = useState("");

  // ui state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const editorRef = useRef(null);


    
/*
    const toDataURL = (blobOrFile) =>
      new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result); // "data:image/png;base64,...."
        r.onerror = reject;
        r.readAsDataURL(blobOrFile);
      });
*/

      // 1) 파일을 리사이즈해서 캔버스 + dataURL + (w,h) 반환
    const fileToResizedCanvas = (file, maxSide = 1536) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        const objUrl = URL.createObjectURL(file);
      
        img.onload = () => {
          const { width, height } = img;
          const scale = Math.min(1, maxSide / Math.max(width, height));
          const w = Math.round(width * scale);
          const h = Math.round(height * scale);
        
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
        
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
        
          URL.revokeObjectURL(objUrl);
          resolve({ canvas, w, h });
        };
      
        img.onerror = (e) => {
          URL.revokeObjectURL(objUrl);
          reject(e);
        };
      
        img.src = objUrl;
      });
    
    // 2) 이미지/마스크(Blob)를 target (w,h)로 리사이즈해서 dataURL 반환
      const blobToResizedDataURL = (blob, w, h, mime = "image/png", quality) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          const objUrl = URL.createObjectURL(blob);
        
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
          
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
          
            URL.revokeObjectURL(objUrl);
          
            // png는 quality 무시됨(상관없음)
            resolve(quality != null ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime));
          };
        
          img.onerror = (e) => {
            URL.revokeObjectURL(objUrl);
            reject(e);
          };
        
          img.src = objUrl;
        });
      

      
/*

      const toResizedDataURL = (file, maxSide = 1536, mime = "image/jpeg", quality = 0.85) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          const objUrl = URL.createObjectURL(file);
        
          img.onload = () => {
            const { width, height } = img;
            const scale = Math.min(1, maxSide / Math.max(width, height));
            const w = Math.round(width * scale);
            const h = Math.round(height * scale);
          
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
          
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
          
            URL.revokeObjectURL(objUrl);
            resolve(canvas.toDataURL(mime, quality));
          };
        
          img.onerror = (e) => {
            URL.revokeObjectURL(objUrl);
            reject(e);
          };
        
          img.src = objUrl;
        });


*/

    const handleRemove = async () => {
      if (!imageFile) return;
        
      try {
        setError("");
        setLoading(true);
    
        const maskBlob = await editorRef.current?.getMaskBlob();
        if (!maskBlob) throw new Error("마스크를 만들 수 없어.");
    
        // 이미지 리사이즈 캔버스 만들고 그 크기를 기준으로 마스크도 맞춤
        const { canvas, w, h } = await fileToResizedCanvas(imageFile, 1536);
        // 이미지 dataURL (jpeg로 압축)
        const imageB64 = canvas.toDataURL("image/jpeg", 0.85);
        // 마스크를 (w,h)로 리사이즈해서 PNG로
        const maskB64 = await blobToResizedDataURL(maskBlob, w, h, "image/png");

        const payload = {
          image: imageB64,
          mask: maskB64,
          // erase 모델(lama)라서 아래는 사실 기본값이긴 한데 명시해도 됨
          hd_strategy: "Crop",
        };

        //"http://127.0.0.1:8090/api/v1/inpaint"
        const res = await fetch("/api/inpaint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`IOPaint API 실패: ${res.status} ${text}`);
        }
    
        const outBlob = await res.blob();
        const url = URL.createObjectURL(outBlob);
    
        // (선택) 기존 결과 url 있으면 메모리 정리
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch (e) {
        setError(e.message || "Remove 실패");
      } finally {
        setLoading(false);
      }
    };


 


  return (<>
    <div className="nfu-header">
        <h1 className="h3 "><b> Not For U</b></h1>
    </div>
    <div className="container py-4">
     
      {/* Header */}
      
      


      <div className="row g-3 align-items-start mt-5 mb-5">
        {/* Left: Editor */}
        <div className="col-12 col-lg-7">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="fw-bold">Editor</div>
            {loading && (
              <div className="d-flex align-items-center gap-2 text-secondary small">
                <div className="spinner-border spinner-border-sm" role="status" />
                처리 중...
              </div>
            )}
          </div>

          {/* Uploader Card */}
          <div className="card shadow-sm mb-3">
            <div className="card-body">
              <Uploader
                imageFile={imageFile}
                onPick={(file) => {
                  setError("");
                  setResultUrl("");
                  setImageFile(file);
                }}
                onClear={() => {
                  setError("");
                  setResultUrl("");
                  setImageFile(null);
                }}
              />
            </div>
          </div>

          {/* Controls + Editor Card */}
          <div className="card shadow-sm">
            <div className="card-body">
              {/* Controls */}
              <div className="d-flex flex-column gap-3 mb-3">
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-2 fw-semibold">브러시</div>
                  <div className="col-12 col-md-8">
                    <input
                      type="range"
                      className="form-range"
                      min={4}
                      max={80}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-12 col-md-2 text-md-end text-secondary small">
                    {brushSize}px
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <div className="btn-group" role="group" aria-label="mode">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        mode === "draw" ? "btn-primary" : "btn-outline-primary"
                      }`}
                      onClick={() => setMode("draw")}
                    >
                      그리기
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        mode === "erase" ? "btn-primary" : "btn-outline-primary"
                      }`}
                      onClick={() => setMode("erase")}
                    >
                      지우개
                    </button>
                  </div>

                  <div className="btn-group ms-auto" role="group" aria-label="actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => editorRef.current?.clearMask()}
                      disabled={!imageFile}
                    >
                      마스크 초기화
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-dark"
                      onClick={handleRemove}
                      disabled={!imageFile || loading}
                    >
                      {loading ? "Removing..." : "Remove"}
                    </button>

                  </div>
                </div>
              </div>

              {/* Editor */}
              <MaskEditor ref={editorRef} imageFile={imageFile} brushSize={brushSize} mode={mode} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger mt-3 mb-0" role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Right: Result */}
        <div className="col-12 col-lg-5">
          <div className="fw-bold mb-2">Result</div>
          <div className="card shadow-sm">
            <div className="card-body">
              <ResultPanel resultUrl={resultUrl} />
              <div className="text-secondary small mt-3">
              </div>
            </div>
          </div>
        </div>
      </div>
      {/*설명*/}
      <div className ="infor mt-5">
          <p>본 페이지는 상업적 목적을 위한 것이 아닌 학습용임을 알립니다.</p>
          <p>무단 배포는 하지 않아주시면 감사하겠습니다.</p>
      </div>
    </div>
  </>);
}
