# basemap-builder
Creating a custom vector tiles basemap for web mapping from OS Open Zoomstack. 

## 1. Get OS Open Zoomstack
Go to [the OS Data Hub](https://osdatahub.os.uk/data/downloads/open/OpenZoomstack) and download the GeoPackage version of OS Open Zoomstack.

## 2. Make a list of layers that you want to include
In `layers.txt` make a list of the layers that you want to include in the final basemap. You can get the available layers from the [OS GeoPackage schema](https://docs.os.uk/os-downloads/contextual-or-derived-mapping/os-open-zoomstack/os-open-zoomstack-technical-specification/geopackage-schema). Take time at this stage to get this right, as each layer can take a long time to process.

## 3. Get the England boundary GeoPackage file
We want to reduce the extent of the basemap to only include areas within England. Go to the [GeoPortal](https://geoportal.statistics.gov.uk/), and select Boundaries > Administrative Boundaries > Countries > 2024 Boundaries, select the BFC option. Use the filters to select only England, and download the GeoPackage file (make sure that the filters are included in the download).

## 4. Clip the layers to England and output to single files in a directory
We will use the `clip_parallel.sh` file to clip the selected layers to just the features that fit within the England boundary. Check that the file names match those in that file, and that they are in the same directory as that file. To make the file executable run `chmod +x clip_parallel.sh` from within the termainal. Then run it with `./clip_parallel.sh`.

Depending on the layers that you have selected this could take **several days**. Make sure that your computer doesn't go to sleep by adjusting your battery settings or by running `caffeinate -i` in another terminal - remember to terminate this when the process is finished.

## 5. Re-project each .gpkg file to WGS84 and convert to GeoJSON at the same time
The OS Open Zoomstack GeoPackage is in British National Grid projection, but for most web mapping packages we need the projection to be WGS84 (EPSG:4326), so we need to re-project the coordinates. For the next stages of the process we also would prefer the files to be GeoJSON, so we'll make that conversion at the same time using `convert_gpkg.sh`. To make the file executable run `chmod +x convert_gpkg.sh` from within the termainal. Then run it with `./convert_gpkg.sh`.

## 6. List out the zoom ranges we want each layer at
This is an important step for keeping the map tiles light and quick. We want to describe which zoom ranges we want features to be visible at and only include them in the tiles at those ranges. In `zoom_mapping.json` make a list of the layers, and the zoom range that we want each feature type to appear at. The [OS vector tiles schema](https://docs.os.uk/os-downloads/contextual-or-derived-mapping/os-open-zoomstack/os-open-zoomstack-technical-specification/vector-tiles-schema) is a good starting point, but beware that some of the layers don't exactly map - e.g. `roads` in the vector schema is separated into `roads_local`, `roads_regional` and `roads_national` in the GeoPackage. Similarly watch out for `greenspaces` vs `greenspace`. This matches up a `type` attribute in the GeoJSON file to a zoom range.

To check which types are present in a layer use `get-types.js` - adjust the `inputFile` value to read the right file. To run it run `node get-types.js` in the terminal. 

## 7. Add tippecanoe minzoom and maxzoom properties to each feature
`batch-add-zooms.js` will add minzoom and maxzoom properties to each feature, consistent with the [tippecanoe GeoJSON extension](https://github.com/felt/tippecanoe?tab=readme-ov-file#geojson-extension). To run it run `node batch-add-zooms.js` in the terminal. This will output a new folder of GeoJSON files with the tippecanoe objects added.

## 8. Use tippecanoe to convert that directory into a .mbtiles file
From the terminal run:
```
tippecanoe \
  -o clipped-basemap.mbtiles \
  -Z5 -z14 \
  --no-feature-limit \
  --no-tile-size-limit \
  geojson_layers_with_zooms/*.geojson 
```
To understand the flags used read [the tippecanoe docs](https://github.com/felt/tippecanoe).

## 9. Join that file with other layers (if using)
If you also have other layers to add in to the basemap (e.g. building mask and urban areas mask files) you can use `tile-join` to add those in:

```
tile-join -o combined-basemap.mbtiles england_building_mask5.mbtiles urban_areas_mask2.mbtiles clipped-basemap.mbtiles --no-tile-size-limit 
```

## 10. Convert from .mbtiles to a directory of tiles
```
mb-util combined-basemap.mbtiles base-tiles/ --image_format=pbf 
```
This creates a directory of files in /z/x/y.pbf format. You can use `inspect-tile.js` to select a tile and do a quick check on its contents. To run it run `node inspect-tile.js` in the terminal.

## 11. Preview tiles locally
To preview the tiles in a local project we can set up a simple tile server using `basemap-server.js`. To run it run `node basemap-server.js` in the terminal. Then copy and paste the contents of `testing-style.json` into the `style.json` of your project. You may also need to adjust your project code slightly to use this.
