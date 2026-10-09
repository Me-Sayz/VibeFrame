export const WORKER_SRC = `
var send = self.postMessage.bind(self);
var draw = null, ctx = null, W = 0, H = 0, assets = null;

["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "importScripts", "indexedDB", "caches"].forEach(function (k) {
  try { self[k] = undefined; } catch (e) {}
});

function msg(err) {
  return String((err && err.message) || err);
}

self.onmessage = function (e) {
  var d = e.data;

  if (d.type === "init") {
    try {
      ctx = d.canvas.getContext("2d");
      W = d.width;
      H = d.height;
      assets = Object.create(null);
      (d.assets || []).forEach(function (a) { assets[a.name] = a.bitmap; });
      Object.freeze(assets);
      draw = new Function(d.code + "\\n;return typeof draw === 'function' ? draw : undefined;")();
      if (!draw) throw new Error("Fungsi draw() tidak ditemukan.");
      send({ type: "ready" });
    } catch (err) {
      send({ type: "error", message: msg(err) });
    }
    return;
  }

  if (d.type === "frame" && draw) {
    try {
      if (ctx.reset) ctx.reset();
      else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; }
      ctx.save();
      draw(ctx, d.t, W, H, assets);
      ctx.restore();
      if (d.bitmap) {
        var bmp = ctx.canvas.transferToImageBitmap();
        send({ type: "bitmap", bitmap: bmp }, [bmp]);
      } else {
        send({ type: "done" });
      }
    } catch (err) {
      send({ type: "error", message: msg(err) });
    }
  }
};
`;