import os, cv2, json, torch, clip, faiss, easyocr, shutil, re, io, base64, time, traceback, asyncio
import numpy as np
import chromadb
from chromadb.utils import embedding_functions
from pathlib import Path
from PIL import Image
from sentence_transformers import SentenceTransformer
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator

# FastAPI Imports
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import List, Optional
import httpx

# Initialize Models and databases
text_model = SentenceTransformer('all-MiniLM-L6-v2')

client = chromadb.PersistentClient(path="./ui_vector_db")
collection = client.get_or_create_collection(name="ui_components")

# Try importing the Google Generative AI library
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

# --- CONFIGURATION ---
SAM_CHECKPOINT = "sam_vit_b_01ec64.pth"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Set to 95% to strictly prevent false matches on similar chart/layout structures
SIMILARITY_THRESHOLD = 95.0
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE")

# Ensure storage directories exist in parent workspace
for folder in ["../ui_images", "../ui_jsons", "../ui_html", "../ui_images_flutter_code", "../frontend/public/assets"]:
    Path(folder).mkdir(exist_ok=True)

# Initialize Models
print(f"--- System Initializing Backend on {DEVICE} ---")
reader = easyocr.Reader(['en'], gpu=(DEVICE == "cuda"))
sam = sam_model_registry["vit_b"](checkpoint=SAM_CHECKPOINT).to(DEVICE)
mask_generator = SamAutomaticMaskGenerator(model=sam, points_per_side=12, pred_iou_thresh=0.88, min_mask_region_area=500)
clip_model, clip_preprocess = clip.load("ViT-B/32", device=DEVICE)

# Global variables for FAISS Indexing
index = faiss.IndexFlatIP(896)
memory_metadata = []

# Configure Gemini
if GEMINI_AVAILABLE and GEMINI_API_KEY != "YOUR_API_KEY_HERE":
    genai.configure(api_key=GEMINI_API_KEY)
    print("--- Connected to Gemini API successfully ---")

def create_composite_embedding(img_np, ocr_texts, masks):
    # 1. Visual (CLIP)
    img_t = clip_preprocess(Image.fromarray(img_np)).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        vis_emb = clip_model.encode_image(img_t).cpu().numpy()[0]
    
    # 2. Text (SentenceTransformer)
    combined_text = " ".join([t for sublist in ocr_texts for t in sublist])
    text_emb = text_model.encode(combined_text if combined_text else "empty")
    
    # 3. Layout (Normalized BBox centers)
    # Take top 15 masks, normalize to 0-1, pad if fewer than 15
    layout_features = []
    for m in masks[:15]:
        x, y, w, h = m['bbox']
        layout_features.extend([x/1000, y/1000, w/1000, h/1000])
    while len(layout_features) < 60: layout_features.append(0)
    layout_emb = np.array(layout_features[:60])
    
    # 4. Concatenate
    composite = np.concatenate([vis_emb, text_emb, layout_emb])
    return composite / np.linalg.norm(composite)

# --- MEMORY FUNCTIONS ---
def build_faiss_index():
    global memory_metadata, index
    index = faiss.IndexFlatIP(896)
    memory_metadata = []
    
    img_dir = "../ui_images"
    if os.path.exists(img_dir):
        for file in os.listdir(img_dir):
            if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                path = os.path.join(img_dir, file)
                add_to_index(path, file)
    print(f"Dynamic RAG Memory Rebuilt: {len(memory_metadata)} screens registered in FAISS.")

def add_to_index(img_path, filename):
    img = clip_preprocess(Image.open(img_path)).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        emb = clip_model.encode_image(img).cpu().numpy()[0]
    emb /= np.linalg.norm(emb)
    full_emb = np.zeros(896, dtype="float32")
    full_emb[384:] = emb
    index.add(np.array([full_emb]).astype("float32"))
    if filename not in memory_metadata:
        memory_metadata.append(filename)

def save_to_memory(img_np, ui_json_str, flutter, html, ocr_texts, masks):
    try:
        embedding = create_composite_embedding(img_np, ocr_texts, masks)
        timestamp = str(time.time())
        base_name = f"ui_{timestamp}"
        
        # Save files
        img_path = f"../ui_images/{base_name}.png"
        cv2.imwrite(img_path, cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR))
        
        # Save to ChromaDB
        collection.add(
            ids=[base_name],
            embeddings=[embedding.tolist()],
            metadatas=[{
                "json_data": ui_json_str,
                "flutter_code": flutter,
                "html_code": html,
                "filename": f"{base_name}.png"
            }]
        )
        print(f"INFO: Successfully saved image and codes to ChromaDB vector store.")
        return base_name
    except Exception as db_err:
        print(f"WARNING: save_to_memory encountered an error: {str(db_err)}")
        return None

# --- HELPER UTILS ---
def bytes_to_numpy(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

def numpy_to_base64(img_np: np.ndarray) -> str:
    img_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.png', img_bgr)
    return base64.b64encode(buffer).decode('utf-8')

# Recursive helper to find all Image References in Figma JSON tree
def find_image_refs_recursive(obj, refs_set):
    if isinstance(obj, dict):
        if obj.get("type") == "IMAGE" and "imageRef" in obj:
            refs_set.add(obj["imageRef"])
        for val in obj.values():
            find_image_refs_recursive(val, refs_set)
    elif isinstance(obj, list):
        for item in obj:
            find_image_refs_recursive(item, refs_set)

# Recursive helper to replace Figma Image references with downloaded asset paths
def replace_image_paths_recursive(obj, ref_mapping):
    if isinstance(obj, dict):
        if obj.get("type") == "IMAGE" and "imageRef" in obj:
            ref = obj["imageRef"]
            if ref in ref_mapping:
                obj["src"] = ref_mapping[ref]
        for val in obj.values():
            replace_image_paths_recursive(val, ref_mapping)
    elif isinstance(obj, list):
        for item in obj:
            replace_image_paths_recursive(item, ref_mapping)

# --- PIPELINE STEP IMPLEMENTATIONS ---

def step_1_sam(input_img):
    if input_img is None:
        return None, [], None, "No input image available."
    
    img_np = np.array(input_img)
    if img_np.shape[-1] == 4:
        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGBA2RGB)
        
    masks = mask_generator.generate(img_np)
    masks = sorted(masks, key=lambda x: x['area'], reverse=True)[:15]
    
    viz = img_np.copy()
    for idx, m in enumerate(masks):
        np.random.seed(idx)
        color = np.random.randint(60, 230, size=(3,)).tolist()
        
        segment_mask = m['segmentation']
        overlay = viz.copy()
        overlay[segment_mask] = color
        cv2.addWeighted(overlay, 0.35, viz, 0.65, 0, viz)
        
        x, y, w, h = [int(v) for v in m['bbox']]
        cv2.rectangle(viz, (x, y), (x+w, y+h), color, 2)
        cv2.putText(viz, f"ID:{idx}", (x + 5, y + 17), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
        
    return viz, masks, img_np, "Step 1 Done: Mask Generation Finished"

def step_2_ocr(masks, ocr_img):
    if not masks:
        return [], [], "No masks found."
    if ocr_img is None:
        return [], [], "No OCR image found."
        
    ocr_img_np = np.array(ocr_img)
    ocr_results = reader.readtext(ocr_img_np)
    assigned_texts = [[] for _ in range(len(masks))]
    
    for bbox, text, prob in ocr_results:
        xs = [pt[0] for pt in bbox]
        ys = [pt[1] for pt in bbox]
        tx_min, tx_max = min(xs), max(xs)
        ty_min, ty_max = min(ys), max(ys)
        
        best_idx = -1
        max_overlap_area = 0
        
        for idx, m in enumerate(masks):
            mx, my, mw, mh = m['bbox']
            mx_min, my_min, mx_max, my_max = mx, my, mx + mw, my + mh
            
            ix_min = max(tx_min, mx_min)
            iy_min = max(ty_min, my_min)
            ix_max = min(tx_max, mx_max)
            iy_max = min(ty_max, my_max)
            
            if ix_max > ix_min and iy_max > iy_min:
                overlap_area = (ix_max - ix_min) * (iy_max - iy_min)
                if overlap_area > max_overlap_area:
                    max_overlap_area = overlap_area
                    best_idx = idx
                    
        if best_idx != -1:
            assigned_texts[best_idx].append(text)
        else:
            t_cx = (tx_min + tx_max) / 2
            t_cy = (ty_min + ty_max) / 2
            min_dist = float('inf')
            closest_idx = 0
            for idx, m in enumerate(masks):
                mx, my, mw, mh = m['bbox']
                m_cx = mx + mw/2
                m_cy = my + mh/2
                dist = (t_cx - m_cx)**2 + (t_cy - m_cy)**2
                if dist < min_dist:
                    min_dist = dist
                    closest_idx = idx
            assigned_texts[closest_idx].append(text)

    return assigned_texts, assigned_texts, "Step 2 Done: OCR Finished"

def step_3_color(masks, img_np):
    colors = []
    img_h, img_w = img_np.shape[:2]
    
    for m in masks:
        x, y, w, h = [int(v) for v in m["bbox"]]
        x1, y1, x2, y2 = max(0, x), max(0, y), min(img_w, x + w), min(img_h, y + h)
        crop = img_np[y1:y2, x1:x2]

        if crop.size == 0:
            colors.append("#FFFFFF")
            continue

        if len(crop.shape) == 2:
            crop = cv2.cvtColor(crop, cv2.COLOR_GRAY2RGB)
        elif crop.shape[2] == 4:
            crop = cv2.cvtColor(crop, cv2.COLOR_RGBA2RGB)

        mean = crop.mean(axis=(0,1)).astype(int)
        
        r = mean[0] if len(mean) > 0 else 255
        g = mean[1] if len(mean) > 1 else 255
        b = mean[2] if len(mean) > 2 else 255
        
        colors.append('#{:02x}{:02x}{:02x}'.format(r, g, b))

    return colors, colors, "Step 3 Done: Color Extraction Finished"

def step_4_chroma(img_np, ocr_texts, masks):
    logs = "--- CLIP & ChromaDB Similarity Vector Search ---\n"
    try:
        # Compute query composite vector
        query_emb = create_composite_embedding(img_np, ocr_texts, masks)
        
        results = collection.query(
            query_embeddings=[query_emb.tolist()],
            n_results=1
        )
        
        if results and 'ids' in results and len(results['ids']) > 0 and len(results['ids'][0]) > 0:
            distance = results['distances'][0][0]
            similarity_score = (1.0 - distance) * 100
            match_id = results['ids'][0][0]
            
            logs += f"Match Candidate ID: {match_id}\n"
            logs += f"Vector Distance: {distance:.4f} (Similarity Match Score: {similarity_score:.2f}%)\n"
            logs += f"Search Threshold Requirement: < 0.40 distance\n"
            
            # Check similarity threshold (Distance < 0.4 means high similarity)
            if distance < 0.4:
                logs += f"STATUS: Target matched. Retrieving Cached Implementations.\n"
                meta = results['metadatas'][0][0]
                return match_id, meta.get('flutter_code', ''), meta.get('html_code', ''), logs
            else:
                logs += f"STATUS: Low similarity match ({similarity_score:.2f}%). Proceeding with code synthesis pipeline.\n"
        else:
            logs += "STATUS: Vector database empty. Processing as a new screen component.\n"
            
    except Exception as db_err:
        logs += f"ChromaDB Query Error details: {str(db_err)}. Progressing to automatic fallback code generation.\n"
    
    return "New Screen Identified", "", "", logs
    
def step_5_json(masks, texts, colors, img_np):
    if not masks:
        return "{}", "{}", "No elements generated."
    
    elements = []
    for i in range(len(masks)):
        text_val = texts[i] if i < len(texts) else []
        color_val = colors[i] if i < len(colors) else "#FFFFFF"
        bbox_val = masks[i]['bbox'] if 'bbox' in masks[i] else [0, 0, 0, 0]
        elements.append({
            "text": text_val,
            "color": color_val,
            "bbox": bbox_val
        })
        
    ui_json = json.dumps({"elements": elements}, indent=2)
    return ui_json, ui_json, "Step 5 Done: UI JSON Constructed"

def step_6_code(ui_json_str, cached_flutter, cached_html, img_np, match_id, texts, masks):
    if match_id and match_id != "New Screen Identified":
        return cached_flutter, cached_html, f"Database Cache Hit (Matched: {match_id})"
        
    if not GEMINI_AVAILABLE:
        return "/* Gemini module not loaded */", "<!-- Gemini module not loaded -->", "Gemini module not installed."
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_API_KEY_HERE":
        return "/* Missing or invalid GEMINI_API_KEY */", "<!-- Missing or invalid GEMINI_API_KEY -->", "Invalid GEMINI_API_KEY."
        
    pil_img = Image.fromarray(img_np)
    prompt = (
        "You are an expert UI/UX Engineer. You are provided with the raw screenshot of the interface and its structured layout coordinates.\n"
        f"Structured Layout JSON Data: {ui_json_str}\n\n"
        "Guidelines for implementation:\n"
        "1. Study both the provided raw image screenshot and the JSON layout data to understand the visual look (spacing, padding, custom containers, cards, and columns).\n"
        "2. Recreate the interface exactly with modern UI design principles: clean padding, spacing, typography hierarchal levels (titles, subtitles, body content), modern card borders, border radius, and subtle shadows.\n"
        "3. For HTML/CSS: Use a clean layout using CSS Flexbox or Grid. Make it visually appealing with smooth, clean gradients, container boxes, modern sans-serif fonts, and beautiful structured margins.\n"
        "4. For Flutter: Implement a high-fidelity UI using widgets like Card, Row, Column, GridView, Container with BoxDecoration, custom font styling, and colors that match the input values.\n"
        "5. Strictly separate the outputs. Put the Flutter implementation inside ###FLUTTER### markers and the HTML version inside ###HTML### markers."
    )
    
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash",
        "gemini-2.5-flash"
    ]
    response_text = ""
    success_model = ""

    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([pil_img, prompt])
            if response and response.text:
                response_text = response.text
                success_model = model_name
                break
        except Exception:
            continue

    if not response_text:
        return "/* Response synthesis failed or model quota reached */", "<!-- Response synthesis failed or model quota reached -->", "Gemini model execution failed."
        
    try:
        flutter_part, html_part = "", ""
        
        # 1. Parse using structural delimiters
        if "###FLUTTER###" in response_text and "###HTML###" in response_text:
            idx_flutter = response_text.find("###FLUTTER###")
            idx_html = response_text.find("###HTML###")
            
            try:
                if idx_flutter < idx_html:
                    parts = response_text.split("###FLUTTER###")[1].split("###HTML###")
                    flutter_part = parts[0].strip() if len(parts) > 0 else ""
                    html_part = parts[1].strip() if len(parts) > 1 else ""
                else:
                    parts = response_text.split("###HTML###")[1].split("###FLUTTER###")
                    html_part = parts[0].strip() if len(parts) > 0 else ""
                    flutter_part = parts[1].strip() if len(parts) > 1 else ""
            except Exception:
                pass
        
        # 2. Extract codes via regex markdown codeblock findall fallback
        if not flutter_part:
            dart_blocks = re.findall(r"```(?:dart|flutter)(.*?)```", response_text, re.DOTALL | re.IGNORECASE)
            if dart_blocks:
                flutter_part = dart_blocks[0].strip()
            else:
                generic_blocks = re.findall(r"```(.*?)```", response_text, re.DOTALL)
                for block in generic_blocks:
                    if "import " in block or "Widget " in block or "StatelessWidget" in block:
                        flutter_part = block.strip()
                        break
                        
        if not html_part:
            html_blocks = re.findall(r"```html(.*?)```", response_text, re.DOTALL | re.IGNORECASE)
            if html_blocks:
                html_part = html_blocks[0].strip()
            else:
                generic_blocks = re.findall(r"```(.*?)```", response_text, re.DOTALL)
                for block in generic_blocks:
                    if "<div" in block or "<style" in block or "html" in block:
                        html_part = block.strip()
                        break
                        
        # 3. Direct splits fallback
        if not flutter_part and not html_part:
            if "flutter" in response_text.lower() and "html" in response_text.lower():
                split_val = "html" if response_text.lower().find("flutter") < response_text.lower().find("html") else "flutter"
                parts = re.split(rf"(?i){split_val}", response_text, maxsplit=1)
                if len(parts) == 2:
                    if split_val == "html":
                        flutter_part, html_part = parts[0], parts[1]
                    else:
                        html_part, flutter_part = parts[0], parts[1]
                        
        # 4. Ultimate robust fallback: assign the entire text if parsers completely missed code delimiters
        if not flutter_part:
            flutter_part = response_text
        if not html_part:
            html_part = response_text
            
        # Standardized codeblock tag sanitization
        for pattern in [r"###FLUTTER###", r"###HTML###", r"^```dart\s*", r"^```flutter\s*", r"^```html\s*", r"^```\s*", r"```$"]:
            flutter_part = re.sub(pattern, "", flutter_part, flags=re.IGNORECASE | re.MULTILINE).strip()
            html_part = re.sub(pattern, "", html_part, flags=re.IGNORECASE | re.MULTILINE).strip()

        # Save successfully generated output to database cache inside a protective try-except wrapper
        try:
            if flutter_part or html_part:
                save_to_memory(img_np, ui_json_str, flutter_part, html_part, texts, masks)
        except Exception as save_err:
            print(f"Database Cache Write Warning: {str(save_err)}")
            
        return flutter_part, html_part, f"Generated with Gemini ({success_model})"
        
    except Exception as e:
        return str(response_text), str(response_text), f"Processing warning: {str(e)}"

# --- API INITIALIZATION ---
app = FastAPI(title="Unified Visual Layout Synthesis Engine API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas for Figma endpoints
class AssetExtractionPayload(BaseModel):
    fileKey: str
    token: str
    figmaJson: dict

# --- 1. Screenshot UI code engine Route ---
@app.post("/api/process_ui")
async def process_ui(file: UploadFile = File(...)):
    """Unified single-call pipeline executing all 6 steps with detailed timing logs."""
    try:
        steps_log = []
        total_start_time = time.perf_counter()
        
        # Step 0: Read and decode image
        t0 = time.perf_counter()
        contents = await file.read()
        img_np = bytes_to_numpy(contents)
        
        # Explicitly defining pil_img here
        pil_img = Image.fromarray(img_np) 
        
        t_img = time.perf_counter() - t0
        steps_log.append({
            "step_id": 1,
            "name": "Image Preprocessing",
            "duration_sec": round(t_img, 3),
            "status": "Success"
        })
        
        # Step 1: Segment Anything Model (SAM)
        t0 = time.perf_counter()
        viz, masks, raw_np, sam_status = step_1_sam(pil_img)
        t_sam = time.perf_counter() - t0
        steps_log.append({
            "step_id": 2,
            "name": "Layout Segmentation (SAM)",
            "duration_sec": round(t_sam, 3),
            "status": f"Found {len(masks)} element boundaries."
        })
        
        # Step 2: OCR Text Extraction
        t0 = time.perf_counter()
        texts, _, ocr_status = step_2_ocr(masks, pil_img)
        t_ocr = time.perf_counter() - t0
        steps_log.append({
            "step_id": 3,
            "name": "Text Extraction (OCR)",
            "duration_sec": round(t_ocr, 3),
            "status": "Success"
        })
        
        # Step 3: Color Extraction
        t0 = time.perf_counter()
        colors, _, color_status = step_3_color(masks, raw_np)
        t_color = time.perf_counter() - t0
        steps_log.append({
            "step_id": 4,
            "name": "Element Color Profiling",
            "duration_sec": round(t_color, 3),
            "status": "Success"
        })
        
        # Step 4: ChromaDB Lookup (Calculating Database Similarity logs)
        t0 = time.perf_counter()
        match_id, cached_flutter, cached_html, similarity_logs = step_4_chroma(raw_np, texts, masks)
        t_chroma = time.perf_counter() - t0
        steps_log.append({
            "step_id": 5,
            "name": "ChromaDB Memory Search",
            "duration_sec": round(t_chroma, 3),
            "status": "Success"
        })
                
        # Step 5: Structured JSON Blueprint Generation
        t0 = time.perf_counter()
        ui_json, _, json_status = step_5_json(masks, texts, colors, raw_np)
        t_json = time.perf_counter() - t0
        steps_log.append({
            "step_id": 6,
            "name": "UI Blueprint Synthesis",
            "duration_sec": round(t_json, 3),
            "status": "Success"
        })
        
        # Step 6: Code Generation (Gemini or Cache Lookup)
        t0 = time.perf_counter()
        flutter, html, final_status = step_6_code(ui_json, cached_flutter, cached_html, raw_np, match_id, texts, masks)
        t_code = time.perf_counter() - t0
        steps_log.append({
            "step_id": 7,
            "name": "Code Synthesis (HTML/Flutter)",
            "duration_sec": round(t_code, 3),
            "status": final_status
        })
        
        total_duration = time.perf_counter() - total_start_time
        sam_preview_b64 = numpy_to_base64(viz)
        
        # Console confirmation prints for debugging pipeline output values
        print(f"\n--- Code Engine Performance Metrics ---")
        print(f"Similarity Check Log Size: {len(similarity_logs)} characters")
        print(f"Flutter Implementation Code Size: {len(flutter)} characters")
        print(f"HTML Code Size: {len(html)} characters")
        print(f"Total processing time: {round(total_duration, 3)} seconds\n")
        
        # Provide both flat and nested schemas to guarantee compatibility with frontend React state targets
        return {
            "status": final_status,
            "similarity": similarity_logs,
            "similarity_logs": similarity_logs,
            "similarityLogs": similarity_logs,
            "json": ui_json,
            "ui_json": ui_json,
            "uiJson": ui_json,
            "flutter": flutter,
            "flutter_code": flutter,
            "flutterCode": flutter,
            "flutter_output": flutter,
            "flutterOutput": flutter,
            "html": html,
            "html_code": html,
            "htmlCode": html,
            "html_css": html,
            "htmlCss": html,
            "html_css_output": html,
            "htmlCssOutput": html,
            "sam_preview": sam_preview_b64,
            "samPreview": sam_preview_b64,
            "ocr_text": texts,
            "ocrText": texts,
            "colors": colors,
            "performance_metrics": {
                "steps": steps_log,
                "total_duration_sec": round(total_duration, 3)
            }
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Visual code synthesis pipeline failed: {str(e)}")

# --- 2. Figma files proxy Route ---
@app.get("/figma-api/v1/files/{file_key}")
async def proxy_figma_file(file_key: str, x_figma_token: Optional[str] = Header(None)):
    """Acts as a secure local proxy to forward request calls to the Figma API to bypass CORS limitations with automatic retry backoff."""
    if not x_figma_token:
        raise HTTPException(status_code=400, detail="Missing X-Figma-Token header request parameter")
    
    max_retries = 4 
    retry_delay = 10.0  # Time to wait (in seconds) on first retry
    
    async with httpx.AsyncClient() as client:
        for attempt in range(max_retries):
            try:
                response = await client.get(
                    f"https://api.figma.com/v1/files/{file_key}",
                    headers={"X-Figma-Token": x_figma_token},
                    timeout=30.0
                )
                
                # If rate-limited (429), pause and retry
                if response.status_code == 429:
                    if attempt < max_retries - 1:
                        print(f"Figma API rate limit hit. Retrying in {retry_delay} seconds...")
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2  # Double the wait time for the next attempt
                        continue
                
                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=response.text)
                return response.json()
                
            except httpx.RequestError as e:
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                    continue
                raise HTTPException(status_code=500, detail=f"Figma API Proxy call failed: {str(e)}")
        
        # If all retries failed
        raise HTTPException(status_code=429, detail="Figma API Rate Limit exceeded. Please wait a moment before trying again.")

# --- 3. Figma image asset extraction Route ---
@app.post("/figma-assets/extract")
async def extract_figma_assets(payload: AssetExtractionPayload):
    """Parses Figma document payload, downloads high-resolution component fills and saves locally."""
    try:
        fig_json = payload.figmaJson
        refs = set()
        find_image_refs_recursive(fig_json, refs)
        
        if not refs:
            return {"status": "Success", "figmaJson": fig_json, "assets": [], "imageRefCount": 0}
            
        # Retrieve download links mapping from Figma API
        async with httpx.AsyncClient() as client:
            img_res = await client.get(
                f"https://api.figma.com/v1/files/{payload.fileKey}/images",
                headers={"X-Figma-Token": payload.token},
                timeout=20.0
            )
            if img_res.status_code != 200:
                raise HTTPException(status_code=img_res.status_code, detail="Unable to retrieve asset URLs from Figma")
                
            image_urls = img_res.json().get("meta", {}).get("images", {})
            
        ref_mapping = {}
        downloaded_assets = []
        
        # Download each image resource locally to public assets inside Vite frontend
        for ref in refs:
            if ref in image_urls:
                url = image_urls[ref]
                try:
                    img_data = (await client.get(url, timeout=15.0)).content
                    local_filename = f"figma_{ref[:12]}.png"
                    local_path = f"../frontend/public/assets/{local_filename}"
                    
                    with open(local_path, "wb") as f:
                        f.write(img_data)
                        
                    relative_web_path = f"/assets/{local_filename}"
                    ref_mapping[ref] = relative_web_path
                    downloaded_assets.append({"imageRef": ref, "path": relative_web_path})
                except Exception as e:
                    print(f"Warning: Failed to fetch image ref {ref}: {e}")
                    continue
                    
        # Apply rewritten local asset paths back into the Figma JSON tree representation
        replace_image_paths_recursive(fig_json, ref_mapping)
        
        return {
            "status": "Success",
            "figmaJson": fig_json,
            "assets": downloaded_assets,
            "imageRefCount": len(refs),
            "missingRefs": [r for r in refs if r not in ref_mapping]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image extraction processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)