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
  const [isIngesting, setIsIngesting] = useState(false);
  const [activeUiTab, setActiveUiTab] = useState("sam"); // sam, ocr, colors, similarity, json, flutter, html
  const [uiStatus, setUiStatus] = useState("System Ready. Please upload a UI layout screenshot to begin.");
  const [uiPerformanceMetrics, setUiPerformanceMetrics] = useState(null); 
  
  // Model Engine & Rationale State + Popup Modal Control
  const [selectedModelEngine, setSelectedModelEngine] = useState("gemini-3.5-flash");
  const [modelSelectionReason, setModelSelectionReason] = useState(
    "Default configuration: Sub-second visual parsing and responsive DOM generation with Gemini 3.5 Flash."
  );
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);

  // Knowledge Base Modal States (3 Options)
  const [isKnowledgeBaseOpen, setIsKnowledgeBaseOpen] = useState(false);
  const [kbTab, setKbTab] = useState("zip"); // "zip" | "doc" | "github"
  const [kbLoading, setKbLoading] = useState(false);
  const [kbMessage, setKbMessage] = useState(null);
  const [githubUrl, setGithubUrl] = useState("");

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
  
  // Visual alignment validation metrics
  const [htmlRenderPreview, setHtmlRenderPreview] = useState("");
  const [clipSimilarity, setClipSimilarity] = useState(null);

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

  const handleBulkIngest = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsIngesting(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) { formData.append("files", files[i]); }
    try {
      const res = await axios.post("http://localhost:8000/api/ingest_folder", formData);
      alert(`Ingestion Complete! Processed: ${res.data.details.processed} images.`);
    } catch (err) {
      alert("Error during folder ingestion.");
    } finally {
      setIsIngesting(false);
    }
  };

  const detectedPagesDebugJson = useMemo(() => {
    return JSON.stringify(figmaPages.map(createPageLevelJson), null, 2);
  }, [figmaPages]);

  // ==========================================
  // KNOWLEDGE BASE MODAL HANDLERS (3 OPTIONS)
  // ==========================================
  
  // Option 1: Ingest ZIP file of images (Runs Steps 1 to 7)
  const handleZipUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setKbLoading(true);
    setKbMessage({ type: "info", text: `Unpacking ${file.name} & running Steps 1-7 for each image...` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8000/api/kb/ingest_zip", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 600000
      });
      setKbMessage({
        type: "success",
        text: `✓ Successfully parsed & indexed ${res.data.details.processed} UI screens into ChromaDB (ui_components)!`
      });
    } catch (err) {
      setKbMessage({
        type: "error",
        text: `Error ingesting ZIP: ${err.response?.data?.detail || err.message}`
      });
    } finally {
      setKbLoading(false);
    }
  };

  // Option 2: Ingest PDF or Excel/CSV document
  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setKbLoading(true);
    setKbMessage({ type: "info", text: `Extracting text and tables from ${file.name}...` });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:8000/api/kb/ingest_doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000
      });
      setKbMessage({
        type: "success",
        text: `✓ Document indexed successfully: ${res.data.chunks_stored} chunks saved in ChromaDB (documents_kb)!`
      });
    } catch (err) {
      setKbMessage({
        type: "error",
        text: `Error ingesting document: ${err.response?.data?.detail || err.message}`
      });
    } finally {
      setKbLoading(false);
    }
  };

  // Option 3: Ingest GitHub Repository Link
  const handleGithubIngest = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) {
      alert("Please enter a valid GitHub repository URL.");
      return;
    }
    setKbLoading(true);
    setKbMessage({ type: "info", text: `Cloning ${githubUrl} and indexing code files...` });

    try {
      const res = await axios.post("http://localhost:8000/api/kb/ingest_github", {
        repo_url: githubUrl.trim(),
        branch: "main"
      }, { timeout: 300000 });
      setKbMessage({
        type: "success",
        text: `✓ Cloned repo! Indexed ${res.data.files_indexed} code files into ChromaDB (code_repo_kb)!`
      });
      setGithubUrl("");
    } catch (err) {
      setKbMessage({
        type: "error",
        text: `Error cloning repository: ${err.response?.data?.detail || err.message}`
      });
    } finally {
      setKbLoading(false);
    }
  };

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
      setHtmlRenderPreview("");
      setClipSimilarity(null);
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

    const initialSteps = [
      { id: 1, name: "Layout Segmentation (SAM)", status: "processing", duration: null },
      { id: 2, name: "Text Extraction (OCR)", status: "waiting", duration: null },
      { id: 3, name: "Element Color Profiling", status: "waiting", duration: null },
      { id: 4, name: "Dynamic Memory Search (FAISS)", status: "waiting", duration: null },
      { id: 5, name: "Visual Alignment Check (CLIP)", status: "waiting", duration: null },
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
      
      setUiStatus(res.data.status || "Pipeline Execution Completed");
      setUiJsonOutput(res.data.json || res.data.ui_json || "");
      setUiFlutterOutput(res.data.flutter || res.data.flutter_code || res.data.flutterOutput || "");
      setUiHtmlOutput(res.data.html || res.data.html_code || res.data.html_css || res.data.htmlCssOutput || "");
      setSamPreview(res.data.sam_preview ? `data:image/png;base64,${res.data.sam_preview}` : "");
      
      const extractedOcr = res.data.ocr_text || res.data.ocrText || null;
      setOcrOutput(extractedOcr);
      setColorsOutput(res.data.colors || []);
      setSimilarityOutput(res.data.similarity || res.data.similarity_logs || res.data.similarityLogs || "No log generated.");
      
      // Update System Engine and Reasoning from backend
      if (res.data.model_engine) {
        setSelectedModelEngine(res.data.model_engine);
        setModelSelectionReason(res.data.model_reason || "Automated routing determined by backend inference manager.");
      }

      // Load reconstructed previews and CLIP alignment scores
      setHtmlRenderPreview(res.data.html_render_preview ? `data:image/png;base64,${res.data.html_render_preview}` : "");
      setClipSimilarity(res.data.clip_similarity !== undefined ? res.data.clip_similarity : null);

      if (res.data.performance_metrics) {
        const backendSteps = res.data.performance_metrics.steps;
        const mappedSteps = initialSteps.map((step, idx) => {
           const correspondingStage = backendSteps.find(s => s.stage === idx + 1);
           return {
             ...step,
             status: "completed",
             duration: correspondingStage ? `${correspondingStage.duration}s` : "0.5s"
           };
        });
        setLiveSteps(mappedSteps);
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
  };

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

  const [ingestProgress, setIngestProgress] = useState({ current_file: "", processed: 0, total: 0 });

  useEffect(() => {
    let interval;
    if (isIngesting) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get("http://localhost:8000/api/ingestion_status");
          setIngestProgress(res.data);
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isIngesting]);

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
        <main className="workspace-grid" style={{ gridTemplateColumns: "420px 1fr" }}>
          
          {/* LEFT CONTROL PANEL */}
          <section className="panel control-panel" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div className="panel-header" style={{ flexShrink: 0 }}>
              <h2>Source UI Control Panel</h2>
            </div>
            
            {/* Scrollable Container Body Wrapper */}
            <div className="panel-body" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              
              {/* KNOWLEDGE BASE MODAL TRIGGER BUTTON (TOP OF CONTROL PANEL) */}
              <button
                onClick={() => {
                  setIsKnowledgeBaseOpen(true);
                  setKbMessage(null);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  border: "1px solid #38bdf8",
                  borderRadius: "6px",
                  color: "#38bdf8",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                  flexShrink: 0
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📚</span>
                  <span>Ingest Knowledge Base (ZIP / Doc / Git)</span>
                </div>
                <span style={{ 
                  background: uiJsonOutput ? "#10b98125" : "#64748b25", 
                  color: uiJsonOutput ? "#34d399" : "#94a3b8", 
                  border: `1px solid ${uiJsonOutput ? "#10b981" : "#475569"}`,
                  padding: "2px 6px", 
                  borderRadius: "4px", 
                  fontSize: "10px" 
                }}>
                  {uiJsonOutput ? "Ready" : "Active"}
                </span>
              </button>

              {/* Terminal Log Container */}
              <div 
                className="terminal-log" 
                style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  height: "330px", 
                  border: "1px solid #334155", 
                  borderRadius: "8px", 
                  backgroundColor: "#0b1329", 
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
                  overflow: "hidden",
                  flexShrink: 0
                }}
              >
                {/* Fixed Top Header */}
                <div 
                  className="terminal-header" 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    padding: "10px 14px", 
                    backgroundColor: "#1e293b", 
                    borderBottom: "1px solid #334155",
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="term-dot red" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", marginRight: "6px" }}></span>
                    <span className="term-dot yellow" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#f59e0b", marginRight: "6px" }}></span>
                    <span className="term-dot green" style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981", marginRight: "10px" }}></span>
                    <span className="term-title" style={{ color: "#cbd5e1", fontSize: "11px", fontWeight: "bold", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                      SYSTEM LOGS & PIPELINE TELEMETRY
                    </span>
                  </div>

                  <span style={{ 
                    fontSize: "9px", 
                    background: "#0284c7", 
                    color: "#ffffff", 
                    padding: "2px 7px", 
                    borderRadius: "4px", 
                    fontWeight: "600", 
                    fontFamily: "monospace" 
                  }}>
                    LIVE STREAM
                  </span>
                </div>

                {/* Scrollable Container Body */}
                <div 
                  className="terminal-body" 
                  style={{ 
                    flex: 1, 
                    overflowY: "auto", 
                    padding: "12px 14px", 
                    fontFamily: "monospace", 
                    lineHeight: "1.45"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", margin: "0 0 10px 0" }}>
                    <span style={{ color: "#38bdf8", fontSize: "12px" }}>❯</span>
                    <p className="log-text" style={{ color: "#38bdf8", fontWeight: "600", margin: 0, fontSize: "11.5px" }}>
                      {uiStatus}
                    </p>
                  </div>
                  
                  {/* Step Logs */}
                  {liveSteps.length > 0 && (
                    <div className="metrics-profiler" style={{ borderTop: "1px solid #1e293b", paddingTop: "8px" }}>
                      <div style={{ color: "#94a3b8", fontSize: "10px", marginBottom: "8px", letterSpacing: "0.6px", fontWeight: "bold" }}>
                        PIPELINE EXECUTION STAGES:
                      </div>
                      
                      {liveSteps.map((step) => {
                        let stepColor = "#64748b";
                        let statusMarker = "waiting";
                        
                        if (step.status === "completed") {
                          stepColor = "#34d399";
                          statusMarker = `✓ ${step.duration}`;
                        } else if (step.status === "processing") {
                          stepColor = "#fbbf24";
                          statusMarker = "processing...";
                        } else if (step.status === "failed") {
                          stepColor = "#f87171";
                          statusMarker = "✗ failed";
                        }

                        return (
                          <div 
                            key={step.id} 
                            style={{ 
                              display: "flex", 
                              justifyContent: "space-between", 
                              fontSize: "11px", 
                              margin: "5px 0", 
                              color: stepColor
                            }}
                          >
                            <span>Stage {step.id}: {step.name}</span>
                            <span style={{ fontWeight: "600" }}>{statusMarker}</span>
                          </div>
                        );
                      })}

                      {/* SYSTEM ENGINE BAR WITH POPUP TRIGGER */}
                      <div 
                        style={{ 
                          marginTop: "12px", 
                          padding: "10px", 
                          backgroundColor: "#111c38", 
                          borderRadius: "6px", 
                          border: "1px solid #1e293b",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#94a3b8", fontSize: "10.5px", fontWeight: "bold" }}>SYNTHESIS ENGINE:</span>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ 
                              color: "#38bdf8", 
                              backgroundColor: "#0369a120", 
                              border: "1px solid #0284c7",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontWeight: "bold", 
                              fontSize: "11px", 
                              fontFamily: "monospace" 
                            }}>
                              {selectedModelEngine}
                            </span>
                            
                            {/* POPUP TRIGGER BUTTON */}
                            <button
                              onClick={() => setIsEngineModalOpen(true)}
                              style={{
                                background: "#0284c7",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                padding: "2px 6px",
                                fontSize: "10px",
                                fontWeight: "bold",
                                cursor: "pointer"
                              }}
                              title="Click to view full Engine details"
                            >
                              🔍 View
                            </button>
                          </div>
                        </div>

                        {/* Short Selection Reason display */}
                        <div style={{ borderTop: "1px dashed #1e293b", paddingTop: "6px", marginTop: "2px" }}>
                          <span style={{ color: "#f59e0b", fontSize: "10px", fontWeight: "bold", display: "block", marginBottom: "3px" }}>
                            SELECTION REASON & CONTEXT:
                          </span>
                          <p style={{ color: "#cbd5e1", fontSize: "10.5px", lineHeight: "1.4", margin: 0 }}>
                            {modelSelectionReason}
                          </p>
                        </div>
                      </div>
                      
                      {isIngesting && (
                        <div className="ingestion-overlay" style={{ marginTop: "10px", padding: "10px", border: "1px dashed #475569", borderRadius: "4px" }}>
                          <div className="progress-card">
                            <span style={{ color: "#38bdf8", fontSize: "11px" }}>Processing Folder...</span>
                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                              Current File: <strong>{ingestProgress.current_file}</strong>
                            </div>
                            <div className="progress-bar-bg" style={{ width: "100%", height: "4px", background: "#334155", borderRadius: "2px", margin: "4px 0" }}>
                              <div 
                                className="progress-bar-fill" 
                                style={{ width: `${(ingestProgress.processed / (ingestProgress.total || 1)) * 100}%`, height: "4px", background: "#10b981", borderRadius: "2px" }}
                              ></div>
                            </div>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{ingestProgress.processed} / {ingestProgress.total} processed.</span>
                          </div>
                        </div>
                      )}

                      {uiPerformanceMetrics && !isUiLoading && (
                        <div 
                          style={{ 
                            display: "flex", 
                            justifyContent: "space-between", 
                            fontSize: "11px", 
                            margin: "10px 0 0 0", 
                            borderTop: "1px dashed #334155", 
                            paddingTop: "8px", 
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

              <div className="upload-wrapper" style={{ flexShrink: 0 }}>
                <label className="file-upload-label">
                  <input type="file" accept="image/*" onChange={handleUiFileChange} />
                  <div className="upload-box-content">
                    <span className="upload-icon">📁</span>
                    <span>Click to Upload UI Screenshot</span>
                  </div>
                </label>
              </div>

              {imagePreview && (
                <div className="source-preview-container" style={{ flexShrink: 0 }}>
                  <h4>Uploaded Input Image:</h4>
                  <img src={imagePreview} alt="Uploaded interface" className="source-img" style={{ maxHeight: "220px", objectFit: "contain" }} />
                </div>
              )}

              <button
                onClick={handleProcessUiPipeline}
                disabled={isUiLoading || !selectedFile}
                className={`process-button ${isUiLoading ? "btn-loading" : ""}`}
                style={{ flexShrink: 0 }}
              >
                {isUiLoading ? "Running Pipeline Engine..." : "Run Code Engine Pipeline"}
              </button>

              <div style={{ borderTop: "1px solid #334155", paddingTop: "15px", flexShrink: 0 }}>
                <label style={{ cursor: "pointer", background: "#1e293b", padding: "10px", display: "block", textAlign: "center", borderRadius: "6px", color: "white" }}>
                  <input type="file" multiple="multiple" webkitdirectory="true" directory="true" onChange={handleBulkIngest} style={{ display: "none" }} />
                  📂 {isIngesting ? "Ingesting Folder..." : "Bulk Ingest UI Folder"}
                </label>
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
                <div className="viewport-content" style={{ overflow: "auto", height: "100%", padding: "20px" }}>
                  {similarityOutput ? (
                    <div className="similarity-container" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                      
                      {/* CLIP Similarity Score Progress Tracker */}
                      {clipSimilarity !== null && (
                        <div className="visual-alignment-metrics" style={{
                          background: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          padding: "20px",
                          textAlign: "center"
                        }}>
                          <h3 style={{ margin: "0 0 10px 0", color: "#f8fafc", fontSize: "16px" }}>Reconstruction Metrics</h3>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "15px" }}>
                            <div className="progress-circle-indicator" style={{
                              position: "relative",
                              width: "120px",
                              height: "120px",
                              borderRadius: "50%",
                              background: `conic-gradient(#10b981 ${clipSimilarity * 3.6}deg, #334155 0deg)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <div style={{
                                width: "100px",
                                height: "100px",
                                borderRadius: "50%",
                                background: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "column"
                              }}>
                                <span style={{ color: "#34d399", fontSize: "24px", fontWeight: "bold" }}>{clipSimilarity}%</span>
                                <span style={{ color: "#94a3b8", fontSize: "9px", textTransform: "uppercase" }}>CLIP Match</span>
                              </div>
                            </div>
                            
                            <div style={{ textAlign: "left" }}>
                              <h4 style={{ color: "#38bdf8", margin: "0 0 5px 0" }}>CLIP Semantic Verification</h4>
                              <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0", maxWidth: "400px" }}>
                                Evaluates structural similarities and color themes between original source inputs and compiled HTML outputs.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Render Visual Comparison Side-by-Side */}
                      {htmlRenderPreview && imagePreview && (
                        <div className="visual-side-by-side" style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "15px",
                        }}>
                          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px" }}>
                            <h4 style={{ color: "#94a3b8", margin: "0 0 8px 0", textAlign: "center", fontSize: "12px" }}>ORIGINAL INPUT VIEW</h4>
                            <img src={imagePreview} alt="Original input mockup" style={{ width: "100%", height: "auto", maxHeight: "400px", objectFit: "contain", borderRadius: "4px" }} />
                          </div>
                          
                          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "10px" }}>
                            <h4 style={{ color: "#94a3b8", margin: "0 0 8px 0", textAlign: "center", fontSize: "12px" }}>HTML OUTPUT RENDER</h4>
                            <img src={htmlRenderPreview} alt="Rendered HTML preview mockup" style={{ width: "100%", height: "auto", maxHeight: "400px", objectFit: "contain", borderRadius: "4px" }} />
                          </div>
                        </div>
                      )}

                      <div className="similarity-card" style={{ width: "100%" }}>
                        <h3 style={{ marginBottom: "15px", color: "#f8fafc", fontSize: "14px" }}>Vector Search Matching Log</h3>
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

      {/* =======================================================
          MODAL 1: KNOWLEDGE BASE INGESTION (3 DISTINCT OPTIONS)
          ======================================================= */}
      {isKnowledgeBaseOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(5px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000
          }}
          onClick={() => setIsKnowledgeBaseOpen(false)}
        >
          <div 
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #38bdf8",
              borderRadius: "10px",
              width: "680px",
              maxWidth: "92vw",
              maxHeight: "88vh",
              padding: "24px",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#f8fafc",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📚</span> Ingest Knowledge Base into ChromaDB
              </h3>
              <button 
                onClick={() => setIsKnowledgeBaseOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "18px",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {/* 3 Modality Selection Option Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              <button
                onClick={() => { setKbTab("zip"); setKbMessage(null); }}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: kbTab === "zip" ? "2px solid #38bdf8" : "1px solid #334155",
                  background: kbTab === "zip" ? "#1e293b" : "#0f172a",
                  color: kbTab === "zip" ? "#38bdf8" : "#94a3b8",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                📦 1. UI Images (ZIP)
              </button>
              <button
                onClick={() => { setKbTab("doc"); setKbMessage(null); }}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: kbTab === "doc" ? "2px solid #38bdf8" : "1px solid #334155",
                  background: kbTab === "doc" ? "#1e293b" : "#0f172a",
                  color: kbTab === "doc" ? "#38bdf8" : "#94a3b8",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                📄 2. PDF / Excel
              </button>
              <button
                onClick={() => { setKbTab("github"); setKbMessage(null); }}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: kbTab === "github" ? "2px solid #38bdf8" : "1px solid #334155",
                  background: kbTab === "github" ? "#1e293b" : "#0f172a",
                  color: kbTab === "github" ? "#38bdf8" : "#94a3b8",
                  fontWeight: "bold",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                🐙 3. GitHub Repo
              </button>
            </div>

            {/* Ingestion Panels */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" }}>
              
              {/* OPTION 1: ZIP UPLOAD */}
              {kbTab === "zip" && (
                <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", fontSize: "13px" }}>📦 Upload ZIP of UI Screenshots</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 14px 0", lineHeight: "1.4" }}>
                    Select a <code>.zip</code> file containing UI images. Every image will automatically run through <strong>Step 1 to Step 7</strong> (SAM Layout, OCR, Color, DesignIR JSON, and Gemini Synthesis) and index in ChromaDB under <code>ui_components</code>.
                  </p>
                  
                  <label style={{ display: "block", cursor: kbLoading ? "not-allowed" : "pointer", background: "#0f172a", padding: "14px", border: "1px dashed #38bdf8", borderRadius: "6px", textAlign: "center" }}>
                    <input type="file" accept=".zip" onChange={handleZipUpload} disabled={kbLoading} style={{ display: "none" }} />
                    <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: "bold" }}>
                      {kbLoading ? "Processing ZIP Archive..." : "📁 Choose .zip archive file to Ingest"}
                    </span>
                  </label>
                </div>
              )}

              {/* OPTION 2: PDF / EXCEL UPLOAD */}
              {kbTab === "doc" && (
                <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", fontSize: "13px" }}>📄 Upload Design Specs (PDF, Excel, CSV)</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 14px 0", lineHeight: "1.4" }}>
                    Extract text schemas, page guidelines, and spreadsheet metadata. Text is transformed into sentence embeddings and stored in ChromaDB under Category 2 (<code>documents_kb</code>).
                  </p>

                  <label style={{ display: "block", cursor: kbLoading ? "not-allowed" : "pointer", background: "#0f172a", padding: "14px", border: "1px dashed #38bdf8", borderRadius: "6px", textAlign: "center" }}>
                    <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleDocUpload} disabled={kbLoading} style={{ display: "none" }} />
                    <span style={{ color: "#38bdf8", fontSize: "12px", fontWeight: "bold" }}>
                      {kbLoading ? "Parsing Document..." : "📁 Upload PDF or Excel/CSV File"}
                    </span>
                  </label>
                </div>
              )}

              {/* OPTION 3: GITHUB REPO LINK */}
              {kbTab === "github" && (
                <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "8px", border: "1px solid #334155" }}>
                  <h4 style={{ margin: "0 0 8px 0", color: "#38bdf8", fontSize: "13px" }}>🐙 Ingest GitHub Repository</h4>
                  <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 14px 0", lineHeight: "1.4" }}>
                    Clones any public GitHub repository, extracts source code files (<code>.dart</code>, <code>.html</code>, <code>.css</code>, <code>.js</code>, <code>.ts</code>, <code>.py</code>), computes code embeddings, and saves them to ChromaDB under Category 3 (<code>code_repo_kb</code>).
                  </p>

                  <form onSubmit={handleGithubIngest} style={{ display: "flex", gap: "8px" }}>
                    <input 
                      type="url"
                      placeholder="https://github.com/username/repository.git"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      disabled={kbLoading}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#ffffff",
                        fontSize: "12px"
                      }}
                      required
                    />
                    <button
                      type="submit"
                      disabled={kbLoading}
                      style={{
                        padding: "10px 16px",
                        background: "#0284c7",
                        border: "none",
                        borderRadius: "6px",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "bold",
                        cursor: kbLoading ? "not-allowed" : "pointer"
                      }}
                    >
                      {kbLoading ? "Cloning..." : "Clone & Ingest"}
                    </button>
                  </form>
                </div>
              )}

              {/* Status and Progress Message Box */}
              {kbMessage && (
                <div style={{
                  padding: "12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  lineHeight: "1.4",
                  border: kbMessage.type === "error" ? "1px solid #ef4444" : kbMessage.type === "success" ? "1px solid #10b981" : "1px solid #38bdf8",
                  backgroundColor: kbMessage.type === "error" ? "#7f1d1d40" : kbMessage.type === "success" ? "#064e3b40" : "#0c4a6e40",
                  color: kbMessage.type === "error" ? "#fca5a5" : kbMessage.type === "success" ? "#6ee7b7" : "#7dd3fc"
                }}>
                  {kbMessage.text}
                </div>
              )}

              {/* Quick Knowledge Base Summary */}
              <div>
                <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "bold", display: "block", marginBottom: "6px" }}>
                  CURRENT IN-MEMORY UI BLUEPRINT:
                </span>
                <pre style={{ 
                  backgroundColor: "#020617", 
                  padding: "12px", 
                  borderRadius: "6px", 
                  border: "1px solid #334155", 
                  color: "#38bdf8", 
                  fontFamily: "monospace", 
                  fontSize: "11px", 
                  maxHeight: "120px", 
                  overflowY: "auto" 
                }}>
                  <code>{uiJsonOutput || "// No active UI screen in memory. Upload an image or ZIP to populate."}</code>
                </pre>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #334155", paddingTop: "12px" }}>
              <button 
                onClick={() => setIsKnowledgeBaseOpen(false)}
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Close Repository
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          MODAL 2: SYNTHESIS ENGINE DETAILS POPUP MODAL
          ======================================================= */}
      {isEngineModalOpen && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999
          }}
          onClick={() => setIsEngineModalOpen(false)}
        >
          <div 
            style={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "10px",
              width: "480px",
              maxWidth: "90vw",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#f8fafc"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚡</span> Synthesis Engine Telemetry
              </h3>
              <button 
                onClick={() => setIsEngineModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "18px",
                  cursor: "pointer",
                  lineHeight: "1"
                }}
              >
                ✕
              </button>
            </div>

            {/* Engine Name */}
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "bold" }}>
                Selected Model Tier
              </span>
              <div style={{ 
                marginTop: "6px",
                padding: "8px 12px", 
                backgroundColor: "#1e293b", 
                borderRadius: "6px",
                border: "1px solid #0284c7",
                color: "#38bdf8",
                fontWeight: "bold",
                fontFamily: "monospace",
                fontSize: "14px"
              }}>
                {selectedModelEngine}
              </div>
            </div>

            {/* Context & Reasoning */}
            <div>
              <span style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", fontWeight: "bold" }}>
                Selection Reason & Routing Context
              </span>
              <div style={{ 
                marginTop: "6px",
                padding: "12px", 
                backgroundColor: "#1e293b", 
                borderRadius: "6px",
                border: "1px solid #334155",
                color: "#cbd5e1",
                fontSize: "12px",
                lineHeight: "1.6"
              }}>
                {modelSelectionReason}
              </div>
            </div>

            {/* Modal Close Button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button 
                onClick={() => setIsEngineModalOpen(false)}
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;