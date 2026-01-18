// src/components/MaskEditor.js
import React, {useEffect,useRef,useState,forwardRef,useImperativeHandle,} from "react";

const MaskEditor = forwardRef(function MaskEditor({ imageFile, brushSize, mode }, ref) {
  const baseCanvasRef = useRef(null); // 원본 이미지용
  const maskCanvasRef = useRef(null); // 마스크용(위 레이어)

  const [status, setStatus] = useState("이미지를 업로드하세요.");
  const [imgInfo, setImgInfo] = useState(null); // { w, h }

  // 드로잉 상태(리렌더 없이 관리)
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // 이미지 업로드되면: 캔버스 크기 맞추고 baseCanvas에 그림, maskCanvas 초기화
  useEffect(() => {
    isDrawingRef.current = false;

    if (!imageFile) {
      setStatus("이미지를 업로드하세요.");
      setImgInfo(null);

      // 캔버스 비우기
      [baseCanvasRef.current, maskCanvasRef.current].forEach((c) => {
        if (!c) return;
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
      });
      return;
    }

    const url = URL.createObjectURL(imageFile);
    const img = new Image();

    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      setImgInfo({ w, h });
      setStatus(`로드됨: ${w} x ${h}px`);

      const base = baseCanvasRef.current;
      const mask = maskCanvasRef.current;
      if (!base || !mask) return;

      // 캔버스 내부 픽셀 크기 = 원본 픽셀 크기
      base.width = w;
      base.height = h;
      mask.width = w;
      mask.height = h;

      // 원본 이미지 그리기
      const bctx = base.getContext("2d");
      bctx.clearRect(0, 0, w, h);
      bctx.drawImage(img, 0, 0, w, h);

      // 마스크 초기화
      const mctx = mask.getContext("2d");
      mctx.clearRect(0, 0, w, h);

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      setStatus("이미지 로드 실패(파일 형식 확인).");
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }, [imageFile]);

  // 화면 표시 크기(보이는 크기)를 적당히 제한(내부 픽셀은 원본 유지)
  const displayMaxWidth = 640;
  const displayW = imgInfo ? Math.min(displayMaxWidth, imgInfo.w) : displayMaxWidth;
  const displayH = imgInfo ? Math.round((displayW * imgInfo.h) / imgInfo.w) : 360;

  // 화면 좌표 -> 캔버스 내부 픽셀 좌표 변환
  const getCanvasPos = (e) => {
    const canvas = maskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const strokeLine = (from, to) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // 모드별 합성 방식
    if (mode === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(255,255,255,1)";
    }

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const handlePointerDown = (e) => {
    // 이미지 없으면 그리기 금지
    if (!imageFile) return;

    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    // 우클릭 방지(선택)
    if (e.button === 2) return;

    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);

    isDrawingRef.current = true;
    const p = getCanvasPos(e);
    lastPosRef.current = p;

    // 점 찍기(클릭만 해도 찍히게)
    strokeLine(p, { x: p.x + 0.01, y: p.y + 0.01 });
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();

    const cur = getCanvasPos(e);
    const prev = lastPosRef.current;

    strokeLine(prev, cur);
    lastPosRef.current = cur;
  };

  const endDrawing = (e) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
  };

 

  useImperativeHandle(ref, () => ({
      clearMask() {
        const c = maskCanvasRef.current;
        if (!c) return;
        c.getContext("2d").clearRect(0, 0, c.width, c.height);
      },

      async getMaskBlob() {
        const c = maskCanvasRef.current;
        if (!c) return null;

        return new Promise((resolve) => {
          c.toBlob((blob) => resolve(blob), "image/png");
        });
      },
    }));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="small text-secondary">{status}</div>
        <div className="small text-secondary">
          브러시: <span className="fw-semibold">{brushSize}px</span> / 모드:{" "}
          <span className="fw-semibold">{mode}</span>
        </div>
      </div>

      <div
        className="border rounded position-relative bg-light overflow-hidden"
        style={{ width: displayW, height: displayH, maxWidth: "100%" }}
      >
        {/* 원본 이미지 캔버스 */}
        <canvas
          ref={baseCanvasRef}
          className="position-absolute top-0 start-0"
          style={{ width: "100%", height: "100%" }}
        />

        {/* 마스크 캔버스(위 레이어) */}
        <canvas
          ref={maskCanvasRef}
          className="position-absolute top-0 start-0"
          style={{
            width: "100%",
            height: "100%",
            cursor: "crosshair",
            touchAction: "none", // 모바일 스크롤 방지(포인터 이벤트 안정)
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrawing}
          onPointerCancel={endDrawing}
          onPointerLeave={endDrawing}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>

      <div className="mt-2 small text-secondary">
        마우스로 지울 영역을 칠하세요!
      </div>
    </div>
  );
});

export default MaskEditor;