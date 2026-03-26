import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { addPropertyControls, ControlType } from "framer";
export function InfoFromSheets(props) {
  const {
    mode,
    sheetId,
    fieldType,
    customRow, // Propiedades de texto nativas
    font,
    textColor,
    opacity,
  } = props;
  const [content, setContent] = useState("");
  const [error, setError] = useState(""); // Función para mapear el tipo de campo a columna y fila
  const getColumnAndRow = (fieldType, customRow) => {
    const fieldMap = {
      dextools: { column: "B", row: 3 },
      dexscreener: { column: "B", row: 4 },
      telegram: { column: "B", row: 5 },
      twitter: { column: "B", row: 6 },
      buy: { column: "B", row: 7 },
      ca: { column: "B", row: 8 },
      other: { column: "B", row: customRow || 9 },
    };
    return fieldMap[fieldType] || fieldMap.dextools;
  };
  useEffect(() => {
    if (sheetId) {
      fetchSheetData();
    }
  }, [sheetId, fieldType, customRow]);
  const fetchSheetData = async () => {
    try {
      setError("");
      const { column, row } = getColumnAndRow(fieldType, customRow);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&range=${column}${row}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al cargar la hoja");
      const text = await response.text();
      const processedText = text.replace(/^"/, "").replace(/"$/, "").trim();
      setContent(processedText);
    } catch (err) {
      setError(
        "Error al cargar los datos. Verifica que la hoja sea p\xfablica"
      );
    }
  };
  const textStyle = {
    ...font,
    color: textColor,
    opacity,
    margin: 0,
    padding: 0,
    width: "100%",
    position: "relative",
    display: "block",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  };
  const handleClick = () => {
    if (mode === "link" && content) {
      let url = content; // Asegurarse de que la URL tenga el protocolo
      if (!/^https?:\/\//i.test(url)) {
        url = "https://" + url;
      }
      window.open(url, "_blank");
    }
    if (mode === "copy" && content) {
      // Copiar al clipboard
      navigator.clipboard
        .writeText(content)
        .then(() => {
          console.log("Copiado al clipboard:", content);
        })
        .catch((err) => {
          console.error("Error al copiar al clipboard:", err); // Fallback para navegadores que no soportan clipboard API
          try {
            const textArea = document.createElement("textarea");
            textArea.value = content;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            console.log("Copiado al clipboard (fallback):", content);
          } catch (fallbackErr) {
            console.error("Error en fallback de copia:", fallbackErr);
          }
        });
    }
  }; // Determinar si necesitamos ancho completo para alineación
  const needsFullWidth = font?.textAlign && font.textAlign !== "left";
  return /*#__PURE__*/ _jsxs("div", {
    style: {
      background: "transparent",
      width:
        mode === "text" ? (needsFullWidth ? "100%" : "fit-content") : "100%",
      height: mode === "text" ? "fit-content" : "100%",
      position: "relative",
      overflow: mode === "text" ? "visible" : "hidden",
      cursor: mode === "link" || mode === "copy" ? "pointer" : "default",
    },
    onClick: handleClick,
    children: [
      error &&
        /*#__PURE__*/ _jsx("div", {
          style: {
            color: "red",
            fontSize: "14px",
            padding: "10px",
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          },
          children: error,
        }),
      !error &&
        content &&
        mode === "text" &&
        /*#__PURE__*/ _jsx("div", { style: textStyle, children: content }),
    ],
  });
}
addPropertyControls(InfoFromSheets, {
  mode: {
    type: ControlType.Enum,
    title: "Mode",
    options: ["text", "link", "copy"],
    optionTitles: ["Text", "Link", "Copy"],
    defaultValue: "text",
  },
  sheetId: { type: ControlType.String, title: "Sheet ID", defaultValue: "" },
  fieldType: {
    type: ControlType.Enum,
    title: "Field Type",
    options: [
      "dextools",
      "dexscreener",
      "telegram",
      "twitter",
      "buy",
      "ca",
      "other",
    ],
    optionTitles: [
      "Dextools",
      "Dexscreener",
      "Telegram",
      "Twitter",
      "Buy",
      "CA",
      "Other",
    ],
    defaultValue: "dextools",
  },
  customRow: {
    type: ControlType.Number,
    title: "Custom Row",
    defaultValue: 9,
    min: 9,
    max: 100,
    step: 1,
    displayStepper: true,
    hidden: (props) => props.fieldType !== "other",
  }, // Controles de texto nativos (solo visible cuando mode === "text")
  font: {
    type: "font",
    controls: "extended",
    defaultValue: { fontSize: 16, lineHeight: 1.5 },
    hidden: (props) => props.mode !== "text",
  },
  textColor: {
    type: ControlType.Color,
    title: "Text Color",
    defaultValue: "#000000",
    hidden: (props) => props.mode !== "text",
  },
  opacity: {
    type: ControlType.Number,
    title: "Opacity",
    defaultValue: 1,
    min: 0,
    max: 1,
    step: 0.01,
    hidden: (props) => props.mode !== "text",
  },
})
/**
 * Info From Sheets
 * A Framer component to display text or links from Google Sheets
 * @copyright Lucena023
 */;
export const __FramerMetadata__ = {
  exports: {
    InfoFromSheets: {
      type: "reactComponent",
      name: "InfoFromSheets",
      slots: [],
      annotations: { framerContractVersion: "1" },
    },
    __FramerMetadata__: { type: "variable" },
  },
};
//# sourceMappingURL=./AutomaticUpdate.map
