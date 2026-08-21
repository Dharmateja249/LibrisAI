// Stub for the native `canvas` npm package.
// pdfjs-dist imports `canvas` in its Node.js code path (NodeCanvasFactory),
// but we only use pdfjs-dist in the browser ("use client"), so this stub
// prevents Turbopack from failing to resolve the missing native module.
const CanvasStub = {
    createCanvas: () => {
        throw new Error("canvas is not available in the browser bundle");
    },
};

export default CanvasStub;
