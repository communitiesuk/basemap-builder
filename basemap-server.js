const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 8000;

const TILE_DIR = path.join(__dirname, "tiles");
const GLYPH_DIR = path.join(__dirname, "glyphs");

app.use(cors());

/* -------------------------
  GLYPHS
------------------------- */
app.get('/fonts/:fontstack/:range.pbf', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  const fontstack = decodeURIComponent(req.params.fontstack);
  const { range } = req.params;

  const glyphPath = path.join(GLYPH_DIR, fontstack, `${range}.pbf`);

  if (!fs.existsSync(glyphPath)) {
    console.log("Missing glyph:", glyphPath);
    return res.status(404).send('Glyph not found');
  }

  res.setHeader('Content-Type', 'application/x-protobuf');

  fs.createReadStream(glyphPath).pipe(res);
});

/* -------------------------
  VECTOR TILES
------------------------- */
app.get('/:z/:x/:y.pbf', (req, res) => {
  const { z, x, y } = req.params;
  const tilePath = path.join(TILE_DIR, z, x, `${y}.pbf`);

  //handles empty tiles 

  const emptyTile = Buffer.from("1f8b0800000000000003", "hex");

  if (!fs.existsSync(tilePath)) {
    console.log("Tile missing, sending empty tile:", tilePath);
    res.setHeader('Content-Type', 'application/x-protobuf');
    res.setHeader('Content-Encoding', 'gzip');
    return res.send(emptyTile);
  }

  res.setHeader('Content-Type', 'application/x-protobuf');
  res.setHeader('Content-Encoding', 'gzip');

  const stream = fs.createReadStream(tilePath);
  stream.on('error', (err) => {
    console.error("Tile stream error:", err);
    res.status(500).send("Tile read error");
  });
  stream.pipe(res);
});



app.listen(PORT, () => {
  console.log(`Tile server running at http://localhost:${PORT}`);
});