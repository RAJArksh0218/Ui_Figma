import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";

// Figma Workspace Specific Imports
import { FigmaPreview } from "./components/FigmaPreview";
import { collectPages, createPageLevelJson, generateCodeForPage } from "./utils/figmaToCode";

const DEFAULT_GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || "";
const EXAMPLE_FILE_KEY = "8VV8hCa7NJjw68b6dykdXN";

function App() {
  // Navigation State
  const [workspace, setWorkspace] = useState("screenshot"); // "screenshot" or "figma"

  // Common Configuration
  const [geminiApiKey, setGeminiApiKey] = useState(DEFAULT_GEMINI_KEY);

  // ==========================================
  // WORKSPACE A: SCREENSHOT TO CODE STATES
  // ==========================================
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUiLoading, setIsUiLoading] = useState(false);
  const [activeUiTab, setActiveUiTab] = useState("sam"); // sam, ocr, colors, similarity, json, flutter, html
  const [uiStatus, setUiStatus] = useState("System Ready. Please upload a UI layout screenshot to begin.");
  const [uiPerformanceMetrics, setUiPerformanceMetrics] = useState(null); 
  
  // Real-time rendering tracker for pipeline steps (SAM to Code Synthesis)
  const [liveSteps, setLiveSteps] = useState([]);

  // Screenshot Pipeline Outputs
  const [samPreview, setSamPreview] = useState("");
  const [ocrOutput, setOcrOutput] = useState(null);
  const [colorsOutput, setColorsOutput] = useState([]);
  const [similarityOutput, setSimilarityOutput] = useState("");
  const [uiJsonOutput, setUiJsonOutput] = useState("");
  const [uiFlutterOutput, setUiFlutterOutput] = useState("");
  const [uiHtmlOutput, setUiHtmlOutput] = useState("");

  // ==========================================
  // WORKSPACE B: FIGMA TO CODE STATES
  // ==========================================
  const [figmaToken, setFigmaToken] = useState("");
  const [fileKey, setFileKey] = useState(EXAMPLE_FILE_KEY);
  const [extractedRawJson, setExtractedRawJson] = useState("");
  const [step1Status, setStep1Status] = useState("idle");
  const [step1Message, setStep1Message] = useState("Ready to extract");

  const [pastedJson, setPastedJson] = useState("");
  const [figmaJson, setFigmaJson] = useState(null);
  const [figmaFileName, setFigmaFileName] = useState("");
  const [figmaFormat, setFigmaFormat] = useState("html");
  const [activeFigmaPageId, setActiveFigmaPageId] = useState("");
  const [figmaJsonError, setFigmaJsonError] = useState(null);
  const [imageAssetMessage, setImageAssetMessage] = useState("");

  const [activeFigmaTab, setActiveFigmaTab] = useState("compiler");
  const [figmaCompilerCode, setFigmaCompilerCode] = useState("");
  const [figmaAiCodeCache, setFigmaAiCodeCache] = useState({});
  const [isFigmaAiLoading, setIsFigmaAiLoading] = useState(false);
  const [figmaAiError, setFigmaAiError] = useState(null);

  // Compute Figma values
  const figmaPages = useMemo(() => {
    return figmaJson ? collectPages(figmaJson.document) : [];
  }, [figmaJson]);

  const activeFigmaPage = useMemo(() => {
    if (!figmaPages.length) return null;
    return figmaPages.find((page) => page.id === activeFigmaPageId) || figmaPages[0];
  }, [figmaPages, activeFigmaPageId]);

  const detectedPagesDebugJson = useMemo(() => {
    return JSON.stringify(figmaPages.map(createPageLevelJson), null, 2);
  }, [figmaPages]);

  // ==========================================
  // WORKSPACE A: SCREENSHOT PIPELINE LOGIC
  // ==========================================
  const handleUiFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setSamPreview("");
      setOcrOutput(null);
      setColorsOutput([]);
      setSimilarityOutput("");
      setUiJsonOutput("");
      setUiFlutterOutput("");
      setUiHtmlOutput("");
      setUiPerformanceMetrics(null);
      setLiveSteps([]);
      setUiStatus("New image loaded. Click 'Run Code Engine Pipeline' to start processing.");
    }
  };

  const handleProcessUiPipeline = async () => {
    if (!selectedFile) return;
    setIsUiLoading(true);
    setUiPerformanceMetrics(null);
    setUiStatus("Executing Neural Pipeline...");

    // Refactored Steps: Starts at SAM and ends at Code Synthesis
    const initialSteps = [
      { id: 1, name: "Layout Segmentation (SAM)", status: "processing", duration: null },
      { id: 2, name: "Text Extraction (OCR)", status: "waiting", duration: null },
      { id: 3, name: "Element Color Profiling", status: "waiting", duration: null },
      { id: 4, name: "Dynamic Memory Search (FAISS)", status: "waiting", duration: null },
      { id: 5, name: "UI Blueprint Synthesis", status: "waiting", duration: null },
      { id: 6, name: "Code Synthesis (HTML/Flutter)", status: "waiting", duration: null },
    ];
    setLiveSteps(initialSteps);

    let currentStepId = 1;
    let stepStartTime = Date.now();

    const interval = setInterval(() => {
      setLiveSteps((prevSteps) => {
        return prevSteps.map((step) => {
          if (step.id === currentStepId) {
            const elapsed = ((Date.now() - stepStartTime) / 1000).toFixed(1);
            return { ...step, status: "completed", duration: `${elapsed}s` };
          }
          if (step.id === currentStepId + 1) {
            return { ...step, status: "processing" };
          }
          return step;
        });
      });

      currentStepId++;
      stepStartTime = Date.now();

      if (currentStepId >= 6) {
        clearInterval(interval);
      }
    }, 2500); 

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await axios.post("http://localhost:8000/api/process_ui", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000,
      });

      clearInterval(interval);
      
      // Multi-key mapping to handle flexible backend schemas
      setUiStatus(res.data.status || "Pipeline Execution Completed");
      setUiJsonOutput(res.data.json || res.data.ui_json || "");
      setUiFlutterOutput(res.data.flutter || res.data.flutter_code || res.data.flutterOutput || "");
      setUiHtmlOutput(res.data.html || res.data.html_code || res.data.html_css || res.data.htmlCssOutput || "");
      setSamPreview(res.data.sam_preview ? `data:image/png;base64,${res.data.sam_preview}` : "");
      setOcrOutput(res.data.ocr_text || res.data.ocrText || null);
      setColorsOutput(res.data.colors || []);
      setSimilarityOutput(res.data.similarity || res.data.similarity_logs || res.data.similarityLogs || res.data.faiss_status || "No log generated.");

      // Extract accurate steps, skipping the preprocessing step
      if (res.data.performance_metrics) {
        const filteredSteps = res.data.performance_metrics.steps.filter(step => step.step_id !== 1);
        const accurateSteps = filteredSteps.map((step, index) => ({
          id: index + 1, // Normalized to Steps 1 - 6
          name: step.name,
          status: "completed",
          duration: `${step.duration_sec}s`,
        }));
        setLiveSteps(accurateSteps);
        setUiPerformanceMetrics(res.data.performance_metrics);
      }

      setActiveUiTab("sam"); 
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setUiStatus("Error: Pipeline execution failed.");
      
      setLiveSteps((prevSteps) =>
        prevSteps.map((step) => 
          step.status === "processing" || step.status === "waiting"
            ? { ...step, status: "failed", duration: "Failed" }
            : step
        )
      );
    } finally {
      setIsUiLoading(false);
    }
  };

  // ==========================================
  // WORKSPACE B: FIGMA PIPELINE LOGIC
  // ==========================================
  useEffect(() => {
    setFigmaCodeCache({});
  }, [figmaFormat, figmaFileName]);

  const setFigmaCodeCache = (val) => {
    setFigmaAiCodeCache(val);
  }

  useEffect(() => {
    if (!activeFigmaPage) {
      setFigmaCompilerCode("");
      return;
    }
    try {
      const code = generateCodeForPage(activeFigmaPage, {
        format: figmaFormat,
        componentName: figmaFileName || activeFigmaPage.name || "FigmaExport"
      });
      setFigmaCompilerCode(code);
      setFigmaJsonError(null);
    } catch (error) {
      setFigmaJsonError(error.message || "Error compiling standard code");
      setFigmaCompilerCode("");
    }
  }, [activeFigmaPage, figmaFormat, figmaFileName]);

  useEffect(() => {
    if (activeFigmaTab === "ai" && activeFigmaPage && !figmaAiCodeCache[activeFigmaPage.id] && !isFigmaAiLoading) {
      generateCodeWithGemini(activeFigmaPage);
    }
  }, [activeFigmaTab, activeFigmaPage]);

  const normalizeFigmaFileKey = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const fileMatch = trimmed.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    if (fileMatch?.[1]) return fileMatch[1];
    return trimmed.replace(/^\/+|\/+$/g, "");
  };

  const handleExtractSubmit = async (e) => {
    e.preventDefault();
    setStep1Status("loading");
    setStep1Message("Fetching from Figma API...");
    setExtractedRawJson("");

    try {
      const cleanKey = normalizeFigmaFileKey(fileKey);
      const cleanToken = figmaToken.trim();

      if (!cleanKey || !cleanToken) {
        throw new Error("Enter a valid Figma file key and personal token");
      }

      const res = await axios.get(`http://localhost:8000/figma-api/v1/files/${encodeURIComponent(cleanKey)}`, {
        headers: { "X-Figma-Token": cleanToken }
      });

      const stringified = JSON.stringify(res.data, null, 2);
      setExtractedRawJson(stringified);
      setStep1Status("ready");
      setStep1Message("Figma JSON loaded & auto-parsed!");

      // AUTO-PARSE UPGRADE: Trigger automatic paste parsing
      handlePastedJsonChange(stringified);
    } catch (error) {
      setStep1Status("error");
      setStep1Message(error.response?.data?.detail || error.message || "Unable to extract Figma JSON");
    }
  };

  const handlePastedJsonChange = async (value) => {
    setPastedJson(value);
    if (!value.trim()) {
      setFigmaJson(null);
      setFigmaCompilerCode("");
      setActiveFigmaPageId("");
      setFigmaAiCodeCache({});
      setFigmaJsonError(null);
      setImageAssetMessage("");
      return;
    }

    try {
      const parsed = JSON.parse(value);
      setFigmaJson(parsed);
      setFigmaJsonError(null);
      if (parsed.name && !figmaFileName) {
        setFigmaFileName(parsed.name);
      }

      const foundPages = collectPages(parsed.document);
      if (foundPages.length > 0) {
        setActiveFigmaPageId(foundPages[0].id);
      }

      // Automatically trigger backend asset extraction
      const processed = await extractImageAssetsForFigmaJson(parsed);
      setFigmaJson(processed);
    } catch (err) {
      setFigmaJson(null);
      setFigmaCompilerCode("");
      setActiveFigmaPageId("");
      setFigmaAiCodeCache({});
      setImageAssetMessage("");
      setFigmaJsonError("Invalid JSON structure format.");
    }
  };

  const extractImageAssetsForFigmaJson = async (parsed) => {
    const cleanKey = normalizeFigmaFileKey(fileKey);
    const cleanToken = figmaToken.trim();

    if (!cleanKey || !cleanToken) {
      setImageAssetMessage("Image extraction skipped: No Figma parameters provided.");
      return parsed;
    }

    setImageAssetMessage("Extracting assets from Figma API...");

    try {
      const res = await axios.post("http://localhost:8000/figma-assets/extract", {
        fileKey: cleanKey,
        token: cleanToken,
        figmaJson: parsed
      });

      const count = res.data.assets?.length ?? 0;
      const imageRefCount = res.data.imageRefCount ?? 0;

      if (count > 0) {
        setImageAssetMessage(`✓ Downloaded ${count}/${imageRefCount} images to Vite frontend public directory.`);
      } else {
        setImageAssetMessage("✓ No graphic asset references found in this schema.");
      }

      return res.data.figmaJson;
    } catch (error) {
      setImageAssetMessage(`Asset mapping skipped: ${error.message}`);
      return parsed;
    }
  };

  const generateCodeWithGemini = async (pageNode) => {
    if (!pageNode) return;
    setIsFigmaAiLoading(true);
    setFigmaAiError(null);

    const key = geminiApiKey.trim();
    if (!key) {
      setFigmaAiError("Missing Gemini API Key in configuration.");
      setIsFigmaAiLoading(false);
      return;
    }

    const formatLabel = figmaFormat === "html" 
      ? "HTML + CSS" 
      : figmaFormat === "flutter"
      ? "Flutter Widget"
      : "React TS Component";
    
    const pageLevelJson = createPageLevelJson(pageNode);
    const promptText = `Convert the following Figma JSON schema to clean, responsive ${formatLabel} code. Use relative standard layouts. Clean JSON:\n${JSON.stringify(pageLevelJson, null, 2)}`;

    try {
      const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        contents: [{ parts: [{ text: promptText }] }]
      });

      const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let cleaned = rawText.trim();
      if (cleaned.startsWith("```")) {
        const firstNewline = cleaned.indexOf("\n");
        if (firstNewline !== -1) cleaned = cleaned.substring(firstNewline + 1);
        if (cleaned.endsWith("```")) cleaned = cleaned.substring(0, cleaned.length - 3);
      }

      setFigmaAiCodeCache((prev) => ({ ...prev, [pageNode.id]: cleaned.trim() }));
    } catch (err) {
      setFigmaAiError(err.message || "Error contacting Gemini API");
    } finally {
      setIsFigmaAiLoading(false);
    }
  };

  // Common Helpers
  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert("Copied successfully.");
  };

  return (
    <div className="app-container">
      {/* Universal Dashboard Header */}
      <header className="main-header">
        <div className="logo-section">
          <span className="logo-rocket"></span>
          <h1>UI Image Parser</h1>
        </div>
        
        {/* Navigation Selector */}
        <div className="workspace-toggle-bar">
          <button 
            className={`toggle-btn ${workspace === "screenshot" ? "active" : ""}`}
            onClick={() => setWorkspace("screenshot")}
          >
             Upload Files
          </button>
          <button 
            className={`toggle-btn ${workspace === "figma" ? "active" : ""}`}
            onClick={() => setWorkspace("figma")}
          >
             Figma Compiler Workspace
          </button>
        </div>

        <div className="connection-status">
          <div className="status-indicator"></div>
          <span>API: http://localhost:8000</span>
        </div>
      </header>

      {/* =======================================================
          WORKSPACE 1: SCREENSHOT TO CODE RAG PIPELINE
          ======================================================= */}
      {workspace === "screenshot" && (
        <main className="workspace-grid">
          {/* Left Control Panel */}
          <section className="panel control-panel">
            <div className="panel-header">
              <h2>Source UI Control Panel</h2>
            </div>
            <div className="panel-body">
              <div className="upload-wrapper">
                <label className="file-upload-label">
                  <input type="file" accept="image/*" onChange={handleUiFileChange} />
                  <div className="upload-box-content">
                    <span className="upload-icon">📁</span>
                    <span>Click to Upload UI Screenshot</span>
                  </div>
                </label>
              </div>

              {imagePreview && (
                <div className="source-preview-container">
                  <h4>Uploaded Input Image:</h4>
                  <img src={imagePreview} alt="Uploaded interface" className="source-img" />
                </div>
              )}

              <button
                onClick={handleProcessUiPipeline}
                disabled={isUiLoading || !selectedFile}
                className={`process-button ${isUiLoading ? "btn-loading" : ""}`}
              >
                {isUiLoading ? "Running Pipeline Engine..." : "Run Code Engine Pipeline"}
              </button>

              {/* Enhanced terminal output box with forced vertical scrollbars */}
              <div 
                className="terminal-log" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  height: "190px", 
                  border: "1px solid #334155", 
                  borderRadius: "6px", 
                  backgroundColor: "#0f172a", 
                  overflow: "hidden",
                  marginTop: "15px"
                }}
              >
                {/* Fixed Top Header */}
                <div 
                  className="terminal-header" 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    padding: "8px 12px", 
                    backgroundColor: "#1e293b", 
                    borderBottom: "1px solid #334155" 
                  }}
                >
                  <span className="term-dot red" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", marginRight: "6px" }}></span>
                  <span className="term-dot yellow" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b", marginRight: "6px" }}></span>
                  <span className="term-dot green" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", marginRight: "10px" }}></span>
                  <span className="term-title" style={{ color: "#94a3b8", fontSize: "10px", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.5px" }}>system-logs</span>
                </div>

                {/* Scrollable Container Body */}
                <div 
                  className="terminal-body" 
                  style={{ 
                    flex: 1, 
                    overflowY: "scroll", 
                    padding: "10px", 
                    fontFamily: "monospace", 
                    lineHeight: "1.4"
                  }}
                >
                  <p className="log-text" style={{ color: "#38bdf8", fontWeight: "bold", margin: "0 0 8px 0", fontSize: "11px" }}>
                    {uiStatus}
                  </p>
                  
                  {/* Step Logs */}
                  {liveSteps.length > 0 && (
                    <div className="metrics-profiler" style={{ borderTop: "1px solid #334155", paddingTop: "6px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "6px", letterSpacing: "0.5px" }}>
                        PIPELINE EXECUTION STATUS:
                      </div>
                      
                      {liveSteps.map((step) => {
                        let stepColor = "#64748b"; // waiting
                        let statusMarker = "waiting";
                        
                        if (step.status === "completed") {
                          stepColor = "#34d399"; // Success
                          statusMarker = step.duration;
                        } else if (step.status === "processing") {
                          stepColor = "#fbbf24"; // Running
                          statusMarker = "processing...";
                        } else if (step.status === "failed") {
                          stepColor = "#f87171"; // Error
                          statusMarker = "failed";
                        }

                        return (
                          <div 
                            key={step.id} 
                            style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              fontSize: "11px", 
                              margin: "4px 0", 
                              color: stepColor
                            }}
                          >
                            <span>Step {step.id}: {step.name}</span>
                            <span>{statusMarker}</span>
                          </div>
                        );
                      })}

                      {uiPerformanceMetrics && !isUiLoading && (
                        <div 
                          style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            fontSize: "11px", 
                            margin: "8px 0 0 0", 
                            borderTop: "1px dashed #475569", 
                            paddingTop: "6px", 
                            fontWeight: "bold",
                            color: "#60a5fa"
                          }}
                        >
                          <span>TOTAL ENGINE RUNTIME</span>
                          <span>{uiPerformanceMetrics.total_duration_sec}s</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Right Tabbed Output Panel */}
          <section className="panel output-panel">
            <div className="tabs-header">
              <button className={`tab-btn ${activeUiTab === "sam" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("sam")}> SAM Segmentation</button>
              <button className={`tab-btn ${activeUiTab === "ocr" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("ocr")}>OCR Text</button>
              <button className={`tab-btn ${activeUiTab === "colors" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("colors")}> Colors</button>
              <button className={`tab-btn ${activeUiTab === "similarity" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("similarity")}> Similarity</button>
              <button className={`tab-btn ${activeUiTab === "json" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("json")}> Layout JSON</button>
              <button className={`tab-btn ${activeUiTab === "flutter" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("flutter")}> Flutter Output</button>
              <button className={`tab-btn ${activeUiTab === "html" ? "tab-active" : ""}`} onClick={() => setActiveUiTab("html")}> HTML / CSS Output</button>
            </div>

            <div className="tab-viewport">
              {activeUiTab === "sam" && (
                <div className="viewport-content centered-flex">
                  {samPreview ? (
                    <div className="segmented-preview-container">
                      <img src={samPreview} alt="SAM segmentation output" className="segmented-img" />
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>SAM visual overlay layout results will render here after execution.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "ocr" && (
                <div className="viewport-content code-layout">
                  {ocrOutput ? (
                    <>
                      <button className="copy-btn" onClick={() => copyToClipboard(JSON.stringify(ocrOutput, null, 2))}>Copy OCR Data</button>
                      <pre className="code-block">
                        <code>{JSON.stringify(ocrOutput, null, 2)}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Mapped text strings extracted from EasyOCR will render here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "colors" && (
                <div className="viewport-content centered-flex">
                  {colorsOutput.length > 0 ? (
                    <div className="colors-grid">
                      {colorsOutput.map((color, idx) => (
                        <div key={idx} className="color-swatch-card">
                          <div className="color-preview-circle" style={{ backgroundColor: color }}></div>
                          <div className="color-meta-info">
                            <span className="color-swatch-id">ID: {idx}</span>
                            <span className="color-swatch-hex">{color}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Extracted hexadecimal component colors will display here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "similarity" && (
                <div className="viewport-content centered-flex" style={{ overflowY: "auto" }}>
                  {similarityOutput ? (
                    <div className="similarity-card" style={{ width: "90%", maxWidth: "800px", margin: "20px auto", textAlign: "left" }}>
                      <span className="similarity-icon-big" style={{ display: "block", margin: "0 auto 15px auto" }}></span>
                      <h3 style={{ textAlign: "center", marginBottom: "15px" }}>Vector Search Matching Log</h3>
                      <pre style={{ 
                        backgroundColor: "#0f172a", 
                        padding: "15px", 
                        borderRadius: "6px", 
                        border: "1px solid #334155", 
                        color: "#38bdf8", 
                        fontFamily: "monospace", 
                        fontSize: "12px", 
                        lineHeight: "1.5", 
                        whiteSpace: "pre-wrap" 
                      }}>
                        <code>{similarityOutput}</code>
                      </pre>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Database FAISS and CLIP similarity check logs will display here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "json" && (
                <div className="viewport-content code-layout">
                  {uiJsonOutput ? (
                    <>
                      <button className="copy-btn" onClick={() => copyToClipboard(uiJsonOutput)}>Copy JSON Blueprint</button>
                      <pre className="code-block">
                        <code>{uiJsonOutput}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Generated bounding element JSON hierarchies will render here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "flutter" && (
                <div className="viewport-content code-layout">
                  {uiFlutterOutput ? (
                    <>
                      <button className="copy-btn" onClick={() => copyToClipboard(uiFlutterOutput)}>Copy Dart Code</button>
                      <pre className="code-block">
                        <code>{uiFlutterOutput}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Generated Dart/Flutter widgets implementation code will render here.</p>
                    </div>
                  )}
                </div>
              )}

              {activeUiTab === "html" && (
                <div className="viewport-content code-layout">
                  {uiHtmlOutput ? (
                    <>
                      <button className="copy-btn" onClick={() => copyToClipboard(uiHtmlOutput)}>Copy HTML Code</button>
                      <pre className="code-block">
                        <code>{uiHtmlOutput}</code>
                      </pre>
                    </>
                  ) : (
                    <div className="empty-state">
                      <span className="empty-icon"></span>
                      <p>Generated semantic HTML5 structural layout and CSS code will render here.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </main>
      )}

      {/* =======================================================
          WORKSPACE 2: FIGMA TO CODE COMPILER WORKSPACE
          ======================================================= */}
      {workspace === "figma" && (
        <div className="figma-grid-view">
          
          {/* Left Inputs/Paster Area */}
          <div className="figma-input-side">
            {/* Step 1 Form */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-badge">1</span>
                <h3>Extract Raw Figma JSON (API Link)</h3>
                <span className="step-status">{step1Message}</span>
              </div>
              <form onSubmit={handleExtractSubmit} className="figma-form">
                <div className="form-row">
                  <label>Personal Access Token:</label>
                  <input 
                    type="password" 
                    value={figmaToken} 
                    onChange={(e) => setFigmaToken(e.target.value)} 
                    placeholder="Figma Token..." 
                    className="figma-input"
                  />
                </div>
                <div className="form-row">
                  <label>Figma File Key</label>
                  <input 
                    type="text" 
                    value={fileKey} 
                    onChange={(e) => setFileKey(e.target.value)} 
                    placeholder="File Key..." 
                    className="figma-input"
                  />
                </div>
                <button type="submit" disabled={step1Status === "loading"} className="action-btn-primary">
                  {step1Status === "loading" ? "Fetching..." : "Fetch File Schema"}
                </button>
              </form>

              {extractedRawJson && (
                <div className="form-row">
                  <div className="flex-row-justify">
                    <label>Raw Output:</label>
                    <button className="copy-btn-small" onClick={() => copyToClipboard(extractedRawJson)}>Copy JSON</button>
                  </div>
                  <textarea readOnly value={extractedRawJson} className="figma-raw-output-textarea" />
                </div>
              )}
            </div>

            {/* Step 2 Form */}
            <div className="step-card">
              <div className="step-header">
                <span className="step-badge">2</span>
                <h3>Paste & Compile JSON</h3>
              </div>
              <div className="figma-form">
                <div className="form-row">
                  <label>Figma Schema JSON:</label>
                  <textarea 
                    value={pastedJson} 
                    onChange={(e) => handlePastedJsonChange(e.target.value)} 
                    placeholder="Paste figma json here or use fetched output..." 
                    className="figma-textarea"
                  />
                </div>
                {figmaJsonError && <div className="json-error-log">{figmaJsonError}</div>}
                {imageAssetMessage && <div className="json-success-log">{imageAssetMessage}</div>}
              </div>
            </div>
          </div>

          {/* Right Output Workspace Grid */}
          <div className="figma-output-side">
            <div className="figma-configuration-bar">
              <div className="config-group">
                <label>Component Name:</label>
                <input 
                  type="text" 
                  value={figmaFileName} 
                  onChange={(e) => setFigmaFileName(e.target.value)} 
                  placeholder="ComponentName" 
                  className="dashboard-input"
                />
              </div>

              <div className="config-group">
                <label>Target Language:</label>
                <select 
                  value={figmaFormat} 
                  onChange={(e) => setFigmaFormat(e.target.value)}
                  className="dashboard-select"
                >
                  <option value="html">HTML / CSS</option>
                  <option value="flutter">Flutter Dart</option>
                  <option value="react">React Tailwind</option>
                </select>
              </div>
            </div>

            {/* Split Preview and Code Area */}
            <div className="figma-splits-container">
              {/* Pages & Canvas Preview */}
              <div className="split-view left-split">
                <div className="split-header">Figma Page Navigator</div>
                <div className="split-body">
                  <div className="pages-selection-list">
                    {figmaPages.map((page) => (
                      <button 
                        key={page.id} 
                        className={`page-select-btn ${activeFigmaPageId === page.id ? "selected" : ""}`}
                        onClick={() => setActiveFigmaPageId(page.id)}
                      >
                        📄 {page.name}
                      </button>
                    ))}
                  </div>
                  <div className="interactive-canvas">
                    <FigmaPreview activePage={activeFigmaPage} />
                  </div>
                </div>
              </div>

              {/* Compilation Tab and Code Blocks */}
              <div className="split-view right-split">
                <div className="split-tab-triggers">
                  <button 
                    className={`split-tab-btn ${activeFigmaTab === "compiler" ? "active" : ""}`}
                    onClick={() => setActiveFigmaTab("compiler")}
                  >
                    ⚙️ Standard AST Compiler
                  </button>
                  <button 
                    className={`split-tab-btn ${activeFigmaTab === "ai" ? "active" : ""}`}
                    onClick={() => setActiveFigmaTab("ai")}
                  >
                    ✨ Gemini LLM Refined
                  </button>
                </div>

                <div className="split-tab-body">
                  {activeFigmaTab === "compiler" && (
                    <div className="viewport-content code-layout">
                      {figmaCompilerCode ? (
                        <>
                          <button className="copy-btn" onClick={() => copyToClipboard(figmaCompilerCode)}>Copy Compiled Code</button>
                          <pre className="code-block">
                            <code>{figmaCompilerCode}</code>
                          </pre>
                        </>
                      ) : (
                        <div className="empty-state">
                          <p>Figma Standard AST compiled outputs will display here.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeFigmaTab === "ai" && (
                    <div className="viewport-content code-layout">
                      {isFigmaAiLoading ? (
                        <div className="centered-flex" style={{ height: "100%" }}>
                          <p className="log-text">Gemini Studio API is synthesizing code...</p>
                        </div>
                      ) : figmaAiError ? (
                        <div className="centered-flex" style={{ height: "100%" }}>
                          <p className="log-text">❌ Error: {figmaAiError}</p>
                        </div>
                      ) : activeFigmaPage && figmaAiCodeCache[activeFigmaPage.id] ? (
                        <>
                          <button className="copy-btn" onClick={() => copyToClipboard(figmaAiCodeCache[activeFigmaPage.id])}>Copy Synthesized Code</button>
                          <pre className="code-block">
                            <code>{figmaAiCodeCache[activeFigmaPage.id]}</code>
                          </pre>
                        </>
                      ) : (
                        <div className="empty-state">
                          <p>Gemini LLM model synthesized layouts will display here.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;