# inventory-detector model assets

Place the browser-side detection model here:

```text
public/models/inventory-detector/model.onnx
public/models/inventory-detector/classes.json
public/models/inventory-detector/ort-wasm-simd-threaded.jsep.wasm
```

`model.onnx` is not committed by default. If it is missing, UsAgi-Bar falls back to analyzing the whole uploaded image with `analyze-inventory-image`.

`ort-wasm-simd-threaded.jsep.wasm` is the ONNX Runtime Web runtime file. It must be served as a real `.wasm` file; if a SPA fallback returns `index.html`, the browser reports `expected magic word ... found <!do`.

`classes.json` maps model class IDs to local detection labels. The bundled file assumes a COCO-style YOLO model and marks these target classes when present:

- `bottle`
- `wine glass`
- `cup`

COCO-style models usually do not include `can`, `carton`, `plastic bottle`, or `drink pack` as separate classes. Add those IDs only when using a custom model that actually has them.

YOLO is used only to find crop regions. Product names, category, volume, and alcohol percentage are still inferred from the cropped image by Gemini Vision through the Supabase Edge Function.
