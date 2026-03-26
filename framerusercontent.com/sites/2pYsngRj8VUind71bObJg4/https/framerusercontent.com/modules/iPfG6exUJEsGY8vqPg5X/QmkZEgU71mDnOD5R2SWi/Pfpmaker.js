import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { addPropertyControls, ControlType } from "framer";
import { useState, useRef, useCallback, useEffect, useMemo } from "react"; // ─── Helpers ─────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const eventPos = (e) => {
  const t = e.touches?.[0] || e;
  return { x: t.clientX, y: t.clientY };
};
const loadImg = (src) =>
  new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  }); // ─── Component ───────────────────────────────
/**
 * PFP Maker
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 * @framerIntrinsicWidth 920
 * @framerIntrinsicHeight 620
 */ export default function PFPMaker(props) {
  const {
    assets = [],
    outputSize = 1024,
    canvasBg = "#0a0a0a",
    panelBg = "#0a0a0a",
    cardBg = "#141414",
    accent = "#F5A623",
    memeTextColor = "#ffffff",
    memeStrokeColor = "#000000",
    memeStrokeWidth = 3,
    memeFont = {
      fontFamily: "Impact, 'Arial Black', sans-serif",
      fontWeight: 900,
      fontSize: 32,
    },
    roundOutput = false,
    downloadLabel = "Download",
    copyLabel = "Copy",
    resetLabel = "Reset",
    uploadLabel = "Upload Image",
    assetsLabel = "Assets",
    style,
  } = props; // ─── State ───────────────────────────────
  const [avatar, setAvatar] = useState(null);
  const [layers, setLayers] = useState([]);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [showMemeText, setShowMemeText] = useState(false);
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);
  const fileRef = useRef(null); // ─── Obj helpers ─────────────────────────
  const getObj = useCallback(
    (id) => {
      if (!id) return null;
      if (id === "avatar") return avatar;
      return layers.find((l) => l.id === id) || null;
    },
    [avatar, layers]
  );
  const updateObj = useCallback((id, patch) => {
    if (id === "avatar") {
      setAvatar((p) => (p ? { ...p, ...patch } : null));
    } else {
      setLayers((p) => p.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    }
  }, []);
  const selObj = useMemo(() => getObj(selected), [selected, getObj]); // ─── Upload ──────────────────────────────
  const onFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar({ src: ev.target.result, x: 0, y: 0, scale: 1 });
      setSelected("avatar");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []); // ─── Layer ops ───────────────────────────
  const addAsset = useCallback((src) => {
    const id = uid();
    setLayers((p) => [
      ...p,
      { id, src, x: 0, y: 0, scale: 0.4, rotation: 0, flipX: false },
    ]);
    setSelected(id);
  }, []);
  const removeSelected = useCallback(() => {
    if (!selected || selected === "avatar") return;
    setLayers((p) => p.filter((l) => l.id !== selected));
    setSelected(null);
  }, [selected]);
  const bringForward = useCallback(() => {
    if (!selected || selected === "avatar") return;
    setLayers((p) => {
      const i = p.findIndex((l) => l.id === selected);
      if (i < 0 || i >= p.length - 1) return p;
      const n = [...p];
      [n[i], n[i + 1]] = [n[i + 1], n[i]];
      return n;
    });
  }, [selected]);
  const sendBack = useCallback(() => {
    if (!selected || selected === "avatar") return;
    setLayers((p) => {
      const i = p.findIndex((l) => l.id === selected);
      if (i <= 0) return p;
      const n = [...p];
      [n[i], n[i - 1]] = [n[i - 1], n[i]];
      return n;
    });
  }, [selected]);
  const reset = useCallback(() => {
    setAvatar(null);
    setLayers([]);
    setTopText("");
    setBottomText("");
    setSelected(null);
    setShowMemeText(false);
  }, []); // ─── Drag ────────────────────────────────
  const onDragStart = useCallback(
    (e, id) => {
      e.stopPropagation();
      e.preventDefault();
      const p = eventPos(e);
      const obj = id === "avatar" ? avatar : layers.find((l) => l.id === id);
      if (!obj) return;
      setSelected(id);
      setDrag({ id, sx: p.x, sy: p.y, ox: obj.x, oy: obj.y });
    },
    [avatar, layers]
  );
  useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      e.preventDefault();
      const p = eventPos(e);
      updateObj(drag.id, {
        x: drag.ox + (p.x - drag.sx),
        y: drag.oy + (p.y - drag.sy),
      });
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [drag, updateObj]); // ─── Scroll zoom ─────────────────────────
  const onWheel = useCallback(
    (e) => {
      if (!selected) return;
      e.preventDefault();
      const obj = getObj(selected);
      if (!obj) return;
      const d = e.deltaY > 0 ? -0.05 : 0.05;
      updateObj(selected, { scale: Math.max(0.05, (obj.scale || 1) + d) });
    },
    [selected, getObj, updateObj]
  ); // ─── Render to canvas ────────────────────
  const renderToCanvas = useCallback(async () => {
    const size = outputSize;
    const el = canvasRef.current;
    const actual = el?.getBoundingClientRect().width || 360;
    const ratio = size / actual;
    const cv = document.createElement("canvas");
    cv.width = size;
    cv.height = size;
    const ctx = cv.getContext("2d");
    if (roundOutput) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, size, size); // Avatar (cover)
    if (avatar) {
      try {
        const img = await loadImg(avatar.src);
        const ir = img.width / img.height;
        let dw, dh;
        if (ir > 1) {
          dh = size;
          dw = size * ir;
        } else {
          dw = size;
          dh = size / ir;
        }
        dw *= avatar.scale;
        dh *= avatar.scale;
        ctx.drawImage(
          img,
          (size - dw) / 2 + avatar.x * ratio,
          (size - dh) / 2 + avatar.y * ratio,
          dw,
          dh
        );
      } catch {}
    } // Layers
    for (const l of layers) {
      try {
        const img = await loadImg(l.src);
        const s = l.scale * ratio;
        const w = img.width * s;
        const h = img.height * s;
        ctx.save();
        ctx.translate(size / 2 + l.x * ratio, size / 2 + l.y * ratio);
        ctx.rotate((l.rotation * Math.PI) / 180);
        if (l.flipX) ctx.scale(-1, 1);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      } catch {}
    } // Meme text
    if (showMemeText) {
      const draw = (text, yR) => {
        if (!text) return;
        const fs = size * 0.07;
        const ff = memeFont?.fontFamily || "Impact, sans-serif";
        const fw = memeFont?.fontWeight || 900;
        ctx.save();
        ctx.font = `${fw} ${fs}px ${ff}`;
        ctx.textAlign = "center";
        ctx.lineWidth = memeStrokeWidth * ratio;
        ctx.strokeStyle = memeStrokeColor;
        ctx.fillStyle = memeTextColor;
        ctx.lineJoin = "round";
        ctx.strokeText(text.toUpperCase(), size / 2, size * yR);
        ctx.fillText(text.toUpperCase(), size / 2, size * yR);
        ctx.restore();
      };
      draw(topText, 0.09);
      draw(bottomText, 0.94);
    }
    return cv;
  }, [
    avatar,
    layers,
    topText,
    bottomText,
    showMemeText,
    outputSize,
    canvasBg,
    roundOutput,
    memeTextColor,
    memeStrokeColor,
    memeStrokeWidth,
    memeFont,
  ]); // ─── Download ────────────────────────────
  const onDownload = useCallback(async () => {
    const cv = await renderToCanvas();
    const a = document.createElement("a");
    a.download = "my-pfp.png";
    a.href = cv.toDataURL("image/png");
    a.click();
  }, [renderToCanvas]); // ─── Copy ────────────────────────────────
  const onCopy = useCallback(async () => {
    try {
      const cv = await renderToCanvas();
      const blob = await new Promise((r) =>
        cv.toBlob((b) => r(b), "image/png")
      );
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch (e) {
      console.warn("Copy failed", e);
    }
  }, [renderToCanvas]); // ─── Render ──────────────────────────────
  return /*#__PURE__*/ _jsxs("div", {
    style: {
      ...style,
      display: "flex",
      flexDirection: "column",
      backgroundColor: panelBg,
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      color: "#fff",
      borderRadius: 20,
      overflow: "hidden",
      boxSizing: "border-box",
      padding: 20,
      gap: 14,
    },
    children: [
      /*#__PURE__*/ _jsxs("div", {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          flex: 1,
          minHeight: 0,
        },
        children: [
          /*#__PURE__*/ _jsxs("div", {
            style: {
              flex: "1.2 1 320px",
              minWidth: 260,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            },
            children: [
              /*#__PURE__*/ _jsx("div", {
                ref: canvasRef,
                onClick: (e) => {
                  if (e.target === e.currentTarget) setSelected(null);
                },
                onWheel: onWheel,
                style: {
                  position: "relative",
                  width: "100%",
                  paddingBottom: "100%",
                  backgroundColor: canvasBg,
                  borderRadius: roundOutput ? "50%" : 16,
                  overflow: "hidden",
                  cursor: drag ? "grabbing" : "default",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  touchAction: "none",
                  border: "1px solid #1f1f1f",
                },
                children: /*#__PURE__*/ _jsxs("div", {
                  style: { position: "absolute", inset: 0 },
                  onClick: (e) => {
                    if (e.target === e.currentTarget) setSelected(null);
                  },
                  children: [
                    avatar &&
                      /*#__PURE__*/ _jsx("img", {
                        src: avatar.src,
                        draggable: false,
                        onMouseDown: (e) => onDragStart(e, "avatar"),
                        onTouchStart: (e) => onDragStart(e, "avatar"),
                        style: {
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          transform: `translate(calc(-50% + ${avatar.x}px), calc(-50% + ${avatar.y}px)) scale(${avatar.scale})`,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          cursor: drag?.id === "avatar" ? "grabbing" : "grab",
                          outline:
                            selected === "avatar"
                              ? `2px dashed ${accent}`
                              : "none",
                          outlineOffset: -2,
                        },
                      }),
                    layers.map((l) =>
                      /*#__PURE__*/ _jsx(
                        "img",
                        {
                          src: l.src,
                          draggable: false,
                          onMouseDown: (e) => onDragStart(e, l.id),
                          onTouchStart: (e) => onDragStart(e, l.id),
                          style: {
                            position: "absolute",
                            left: "50%",
                            top: "50%",
                            transform: `translate(calc(-50% + ${
                              l.x
                            }px), calc(-50% + ${l.y}px)) scale(${
                              l.scale
                            }) rotate(${l.rotation}deg) scaleX(${
                              l.flipX ? -1 : 1
                            })`,
                            cursor: drag?.id === l.id ? "grabbing" : "grab",
                            outline:
                              selected === l.id
                                ? `2px dashed ${accent}`
                                : "none",
                            outlineOffset: 2,
                            filter:
                              selected === l.id
                                ? `drop-shadow(0 0 8px ${accent}55)`
                                : "none",
                          },
                        },
                        l.id
                      )
                    ),
                    showMemeText &&
                      topText &&
                      /*#__PURE__*/ _jsx("div", {
                        style: memeCSS(
                          "top",
                          memeTextColor,
                          memeStrokeColor,
                          memeStrokeWidth,
                          memeFont
                        ),
                        children: topText.toUpperCase(),
                      }),
                    showMemeText &&
                      bottomText &&
                      /*#__PURE__*/ _jsx("div", {
                        style: memeCSS(
                          "bottom",
                          memeTextColor,
                          memeStrokeColor,
                          memeStrokeWidth,
                          memeFont
                        ),
                        children: bottomText.toUpperCase(),
                      }),
                    !avatar &&
                      layers.length === 0 &&
                      /*#__PURE__*/ _jsxs("div", {
                        onClick: () => fileRef.current?.click(),
                        style: {
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#444",
                          fontSize: 13,
                          gap: 8,
                          cursor: "pointer",
                        },
                        children: [
                          /*#__PURE__*/ _jsxs("svg", {
                            width: "48",
                            height: "48",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            strokeWidth: "1.5",
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            children: [
                              /*#__PURE__*/ _jsx("rect", {
                                x: "3",
                                y: "3",
                                width: "18",
                                height: "18",
                                rx: "2",
                              }),
                              /*#__PURE__*/ _jsx("circle", {
                                cx: "8.5",
                                cy: "8.5",
                                r: "1.5",
                              }),
                              /*#__PURE__*/ _jsx("path", {
                                d: "M21 15l-5-5L5 21",
                              }),
                            ],
                          }),
                          /*#__PURE__*/ _jsx("span", {
                            children: "Upload your avatar",
                          }),
                        ],
                      }),
                  ],
                }),
              }),
              selected &&
                selObj &&
                /*#__PURE__*/ _jsxs("div", {
                  style: {
                    display: "flex",
                    gap: 4,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  },
                  children: [
                    /*#__PURE__*/ _jsx("button", {
                      onClick: () =>
                        updateObj(selected, {
                          scale: (selObj.scale || 1) + 0.1,
                        }),
                      style: ctrl,
                      title: "Zoom in",
                      children: "+",
                    }),
                    /*#__PURE__*/ _jsx("button", {
                      onClick: () =>
                        updateObj(selected, {
                          scale: Math.max(0.05, (selObj.scale || 1) - 0.1),
                        }),
                      style: ctrl,
                      title: "Zoom out",
                      children: "−",
                    }),
                    selected !== "avatar" &&
                      /*#__PURE__*/ _jsxs(_Fragment, {
                        children: [
                          /*#__PURE__*/ _jsx("span", { style: sep }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: () =>
                              updateObj(selected, {
                                rotation: (selObj.rotation || 0) - 15,
                              }),
                            style: ctrl,
                            title: "Rotate left",
                            children: "↺",
                          }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: () =>
                              updateObj(selected, {
                                rotation: (selObj.rotation || 0) + 15,
                              }),
                            style: ctrl,
                            title: "Rotate right",
                            children: "↻",
                          }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: () =>
                              updateObj(selected, { flipX: !selObj.flipX }),
                            style: ctrl,
                            title: "Flip",
                            children: "⇔",
                          }),
                          /*#__PURE__*/ _jsx("span", { style: sep }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: sendBack,
                            style: ctrl,
                            title: "Send back",
                            children: "↓",
                          }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: bringForward,
                            style: ctrl,
                            title: "Bring forward",
                            children: "↑",
                          }),
                          /*#__PURE__*/ _jsx("span", { style: sep }),
                          /*#__PURE__*/ _jsx("button", {
                            onClick: removeSelected,
                            style: { ...ctrl, color: "#e74c3c" },
                            title: "Delete",
                            children: "✕",
                          }),
                        ],
                      }),
                  ],
                }),
            ],
          }),
          /*#__PURE__*/ _jsxs("div", {
            style: {
              flex: "1 1 260px",
              minWidth: 220,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 0,
            },
            children: [
              /*#__PURE__*/ _jsx("div", {
                style: {
                  alignSelf: "flex-start",
                  backgroundColor: "#e8e8e8",
                  color: "#111",
                  padding: "5px 16px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 700,
                },
                children: assetsLabel,
              }),
              /*#__PURE__*/ _jsxs("div", {
                style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                  gap: 8,
                  overflowY: "auto",
                  flex: 1,
                  paddingRight: 2,
                },
                children: [
                  /*#__PURE__*/ _jsxs("button", {
                    onClick: () => fileRef.current?.click(),
                    style: {
                      aspectRatio: "1",
                      borderRadius: 14,
                      border: `2px dashed #444`,
                      backgroundColor: cardBg,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      color: accent,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      padding: 4,
                      transition: "border-color 0.2s",
                    },
                    children: [
                      /*#__PURE__*/ _jsxs("svg", {
                        width: "22",
                        height: "22",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        children: [
                          /*#__PURE__*/ _jsx("path", {
                            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
                          }),
                          /*#__PURE__*/ _jsx("polyline", {
                            points: "17 8 12 3 7 8",
                          }),
                          /*#__PURE__*/ _jsx("line", {
                            x1: "12",
                            y1: "3",
                            x2: "12",
                            y2: "15",
                          }),
                        ],
                      }),
                      /*#__PURE__*/ _jsx("span", {
                        style: { lineHeight: 1.2, textAlign: "center" },
                        children: uploadLabel,
                      }),
                    ],
                  }),
                  assets.map((src, i) =>
                    /*#__PURE__*/ _jsx(
                      "button",
                      {
                        onClick: () => addAsset(src),
                        style: {
                          aspectRatio: "1",
                          borderRadius: 14,
                          border: "2px solid #222",
                          backgroundColor: cardBg,
                          cursor: "pointer",
                          padding: 6,
                          transition: "border-color 0.2s, transform 0.15s",
                          overflow: "hidden",
                        },
                        onMouseEnter: (e) => {
                          e.currentTarget.style.borderColor = accent;
                          e.currentTarget.style.transform = "scale(1.06)";
                        },
                        onMouseLeave: (e) => {
                          e.currentTarget.style.borderColor = "#222";
                          e.currentTarget.style.transform = "scale(1)";
                        },
                        children: /*#__PURE__*/ _jsx("img", {
                          src: src,
                          draggable: false,
                          style: {
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: 8,
                          },
                        }),
                      },
                      i
                    )
                  ),
                ],
              }),
            ],
          }),
          /*#__PURE__*/ _jsx("input", {
            ref: fileRef,
            type: "file",
            accept: "image/*",
            onChange: onFile,
            style: { display: "none" },
          }),
        ],
      }),
      /*#__PURE__*/ _jsxs("div", {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        },
        children: [
          /*#__PURE__*/ _jsxs("label", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#aaa",
              whiteSpace: "nowrap",
              userSelect: "none",
            },
            children: [
              /*#__PURE__*/ _jsx("div", {
                onClick: () => setShowMemeText(!showMemeText),
                style: {
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: showMemeText ? accent : "#333",
                  position: "relative",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  flexShrink: 0,
                },
                children: /*#__PURE__*/ _jsx("div", {
                  style: {
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    position: "absolute",
                    top: 2,
                    left: showMemeText ? 20 : 2,
                    transition: "left 0.2s",
                  },
                }),
              }),
              "Meme Text",
            ],
          }),
          showMemeText &&
            /*#__PURE__*/ _jsxs(_Fragment, {
              children: [
                /*#__PURE__*/ _jsx("input", {
                  type: "text",
                  placeholder: "Top text...",
                  value: topText,
                  onChange: (e) => setTopText(e.target.value),
                  style: textInput,
                }),
                /*#__PURE__*/ _jsx("input", {
                  type: "text",
                  placeholder: "Bottom text...",
                  value: bottomText,
                  onChange: (e) => setBottomText(e.target.value),
                  style: textInput,
                }),
              ],
            }),
        ],
      }),
      /*#__PURE__*/ _jsxs("div", {
        style: { display: "flex", gap: 10, flexWrap: "wrap" },
        children: [
          /*#__PURE__*/ _jsx("button", {
            onClick: onDownload,
            style: filledBtn(accent),
            children: downloadLabel,
          }),
          /*#__PURE__*/ _jsx("button", {
            onClick: onCopy,
            style: outlineBtn,
            children: copied ? "Copied!" : copyLabel,
          }),
          /*#__PURE__*/ _jsx("button", {
            onClick: reset,
            style: outlineBtn,
            children: resetLabel,
          }),
        ],
      }),
    ],
  });
} // ─── Default Props ───────────────────────────
PFPMaker.defaultProps = {
  assets: [],
  outputSize: 1024,
  canvasBg: "#0a0a0a",
  panelBg: "#0a0a0a",
  cardBg: "#141414",
  accent: "#F5A623",
  memeTextColor: "#ffffff",
  memeStrokeColor: "#000000",
  memeStrokeWidth: 3,
  memeFont: {
    fontFamily: "Impact, 'Arial Black', sans-serif",
    fontWeight: 900,
    fontSize: 32,
  },
  roundOutput: false,
  downloadLabel: "Download",
  copyLabel: "Copy",
  resetLabel: "Reset",
  uploadLabel: "Upload Image",
  assetsLabel: "Assets",
}; // ─── Styles ──────────────────────────────────
const filledBtn = (bg) => ({
  padding: "12px 30px",
  backgroundColor: bg,
  color: "#000",
  border: "none",
  borderRadius: 30,
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
  fontFamily: "inherit",
  transition: "opacity 0.15s, transform 0.1s",
  whiteSpace: "nowrap",
});
const outlineBtn = {
  padding: "12px 30px",
  backgroundColor: "transparent",
  color: "#fff",
  border: "2px solid #444",
  borderRadius: 30,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "inherit",
  transition: "border-color 0.15s",
  whiteSpace: "nowrap",
};
const ctrl = {
  width: 34,
  height: 34,
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  backgroundColor: "#161616",
  color: "#fff",
  cursor: "pointer",
  fontSize: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "inherit",
  transition: "background 0.15s",
  padding: 0,
};
const sep = {
  display: "inline-block",
  width: 1,
  height: 22,
  backgroundColor: "#2a2a2a",
  alignSelf: "center",
  margin: "0 2px",
};
const textInput = {
  flex: "1 1 120px",
  padding: "10px 14px",
  backgroundColor: "#141414",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  color: "#fff",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  minWidth: 0,
};
const memeCSS = (pos, color, stroke, strokeW, font) => ({
  position: "absolute",
  left: 0,
  right: 0,
  ...(pos === "top" ? { top: "4%" } : { bottom: "4%" }),
  textAlign: "center",
  ...font,
  fontSize: "clamp(16px, 7cqi, 36px)",
  color,
  WebkitTextStroke: `${strokeW}px ${stroke}`,
  paintOrder: "stroke fill",
  textShadow: "0 2px 8px rgba(0,0,0,0.6)",
  padding: "0 10px",
  pointerEvents: "none",
  userSelect: "none",
  lineHeight: 1.15,
  wordBreak: "break-word",
}); // ─── Property Controls ───────────────────────
addPropertyControls(PFPMaker, {
  assets: {
    type: ControlType.Array,
    title: "Assets / Stickers",
    description: "Upload PNG assets that end-users can place on their PFP.",
    control: {
      type: ControlType.File,
      allowedFileTypes: ["png", "jpg", "jpeg", "webp", "gif", "svg"],
    },
  },
  outputSize: {
    type: ControlType.Number,
    title: "Output Size",
    description: "Resolution of the downloaded PNG.",
    defaultValue: 1024,
    min: 256,
    max: 4096,
    step: 128,
    unit: "px",
  },
  roundOutput: {
    type: ControlType.Boolean,
    title: "Round PFP",
    defaultValue: false,
  },
  canvasBg: {
    type: ControlType.Color,
    title: "Canvas BG",
    defaultValue: "#0a0a0a",
  },
  panelBg: {
    type: ControlType.Color,
    title: "Panel BG",
    defaultValue: "#0a0a0a",
  },
  cardBg: {
    type: ControlType.Color,
    title: "Card BG",
    defaultValue: "#141414",
  },
  accent: { type: ControlType.Color, title: "Accent", defaultValue: "#F5A623" },
  memeTextColor: {
    type: ControlType.Color,
    title: "Text Color",
    defaultValue: "#ffffff",
  },
  memeStrokeColor: {
    type: ControlType.Color,
    title: "Text Stroke",
    defaultValue: "#000000",
  },
  memeStrokeWidth: {
    type: ControlType.Number,
    title: "Stroke Width",
    defaultValue: 3,
    min: 0,
    max: 10,
    step: 0.5,
  },
  memeFont: {
    type: ControlType.Font,
    title: "Meme Font",
    controls: "extended",
    defaultFontType: "sans-serif",
    displayTextAlignment: false,
    displayFontSize: true,
    defaultValue: { fontSize: 32, fontWeight: 900 },
  },
  uploadLabel: {
    type: ControlType.String,
    title: "Upload Label",
    defaultValue: "Upload Image",
  },
  downloadLabel: {
    type: ControlType.String,
    title: "Download Label",
    defaultValue: "Download",
  },
  copyLabel: {
    type: ControlType.String,
    title: "Copy Label",
    defaultValue: "Copy",
  },
  resetLabel: {
    type: ControlType.String,
    title: "Reset Label",
    defaultValue: "Reset",
  },
  assetsLabel: {
    type: ControlType.String,
    title: "Assets Label",
    defaultValue: "Assets",
  },
});
export const __FramerMetadata__ = {
  exports: {
    default: {
      type: "reactComponent",
      name: "PFPMaker",
      slots: [],
      annotations: {
        framerSupportedLayoutWidth: "any",
        framerIntrinsicHeight: "620",
        framerSupportedLayoutHeight: "any",
        framerContractVersion: "1",
        framerIntrinsicWidth: "920",
      },
    },
    __FramerMetadata__: { type: "variable" },
  },
};
//# sourceMappingURL=./Pfpmaker.map
