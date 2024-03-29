# XC-DB: An Interactive Visual Browser for Paragliding Flights

This project is meant both:

-   As a demo of the capabilities of [`gdal-async`](https://github.com/mmomtchev/node-gdal-async.git) in a web environment (Node.js/Express) and [`rlayers`](https://github.com/mmomtchev/rlayers.git) as a React framework for creating maps-centered web applications
    -   It is an example of a fully asynchronous map application that interacts with a server and which is entirely implemented as React components that fit nicely in the typical React flow control - allowing for example take advantage of standard React CSS animations
    -   All features on the map are React components and support interaction with the usual React mechanics - even when using more than a thousand of them, the map remains fully responsive and the performance overhead of _rlayers_ compared to raw OpenLayers is minimal
    -   The back-end allows dynamic displaying of 600 million features (the blue point clouds) from an SQL database with on-the-fly generated MVT vector tiles
-   As a tool for intermediate-level cross-country paragliding pilots looking for ideas for long-distance flying in France

An alpha version of this project is currently running at [https://xcdb.velivole.fr](https://xcdb.velivole.fr).

# Prerequisites

In order to install and use this project, besides the source code available here, you will also need:

-   A collection of flight tracks in FAI `.igc` format enriched with sidecar `.json` files containing the metadata (look below for an example)
-   _(optionally)_ A database of the wind conditions covering the period/area of the flight tracks in GRIB format that can be obtained from ERA5 using the provider downloader

-   _(optionally)_ A list of names and coordinates for the possible launch locations in GeoJSON format
    https://data.velivole.fr/data/launch_sites.min.geojson is a good European database

    https://xcdb.velivole.fr/launch_sites.min.geojson is the French-only version used on the alpha version

-   _(optionally)_ A copy of the [SRTM1](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1) data for your area

Required skills to install/use/maintain a site with the project: experienced DevOps engineer

Required skills to work on it: Working knowledge of TypeScript, React and Node.js with a little bit of MySQL, Express and Redux

# Setup

1. Obtain and extract the source code, then install the NPM dependencies

    `npm install`

2. Create a database, a user with permissions for it and edit the configuration file with the settings (change the password):

    `config.json`:

    ```json
    "db": {
        "user": "xcdb",
        "pass": "b045e6a8164d",
        "db": "xcdb",
        "host": "localhost"
    }
    ```

    Also, specify the directory where the raw uncompressed [SRTM1](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1) data can be found and eventually change the API port:

    ```json
    "dbserver": {
        "port": 8040,
        "srtm_dir": "/home/mmom/velivole/dev/data/SRTM1/hgt/unzipped"
    }
    ```

3. Create the tables

    `mysql -u xcdb -p xcdb < tables.sql`

4. Compile the project

    `tsc`
    `npm run lang:compile`

5. Import the flight tracks

    `find igcdir -name *.igc | xargs -P 8 -n 100 node build/back/import.js`

    Use double the number of your CPU-cores for `-P`.

    The importer is smart enough to not add flights already in the database (it is based on hash that remains the same even if the flight track is transformed as long as there is no reduction of points). It expects to find, along each `.igc` flight track, a JSON file with the following information:

    ```json
    {
        "fid": "20245154",
        "date": "2018-07-11T22:00:00.000Z",
        "type": "FAI",
        "points": 28.93,
        "category": "A",
        "glider": "Bright 4",
        "flight_url": "https://parapente.ffvl.fr/cfd/liste/vol/20245154",
        "pilot_name": "MOMTCHIL MOMTCHEV",
        "pilot_url": "https://parapente.ffvl.fr/pilote/8683/2018"
    }
    ```

    The flights will be scored by `igc-xc-score` as they are imported. Only `TRI` and `FAI` flights will be considered - this is something that you can change in `import.ts`.

    Importing the 70 000 flights of the French national paragliding flying league of the last 10 years takes from 4h to 24h depending on the machine.

6. Import the wind

    Edit the extent of the area you are interested in in `config.json`:

    ```json
    "map": {
        "extent": [
            [
                -5,
                55
            ],
            [
                10,
                40
            ]
        ]
    },
    ```

    This example covers France - left to 5°W, top to 55°N, right to 10°E and south to 40°N.

    Then create an account at the Climate Data Store at Copernicus - https://cds.climate.copernicus.eu/api-how-to and install their API client:

    ```shell
    pympip3 install cdsapi
    ```

    Create your `.cdsapirc` as per the instructions on their site.

    Then use the provided downloader by launching:

    ```shell
    node build/back/download_wind 2021 wind-2021.grib
    ```

    Import it in the database:

    ```shell
    node build/back/wind.js wind-2021.grib
    ```

7. Import the names of launch sites

    The provided example file covers France and comes from both the FFVL and Paragliding Earth. Both of them distribute this information for free. If you need to make your own file, inspect the file format which is essentially a GeoJSON with some mandatory properties.

    `node build/back/launches.js launches.min.geojson`

8. Run the route classifier

    `node build/back/classify.js route`

    With 70 000 flights this should take about 6 to 12 hours on a 4 CPU machine.

    **This step should always be run after adding additional flights - in this case it will be much faster.**

9. Run the launch classifier

    `node build/back/classify.js launch`

    This should be under 10 minutes.

    **This step should always be run after adding additional flights - in this case it will be much faster.**

10. Start the backend in development mode

    `node build/back/dbserver.js` (`ts-node src/back/dbserver.ts` for source-level debugging)

11. Start the frontend in development mode

    `REACT_APP_XCDB_SERVER=http://localhost:8040 npm start`

    This last step should open a browser on your local machine with the project.

12. Production build

    In a production environment both the backend and the frontend are transpiled to single-file bundles.

    `npm run build`

    Should produce all the required files.

13. Deployment on a production webserver

    Examine the `npm run deploy` scripts to see which files should be copied. A `dbserver.service` sample file is provided for integration with `systemd`.

    It is recommended that the Express back-end is to be placed behind a reverse proxy such as _nginx_ or _Apache_ that will take care of the SSL encryption. By default, the front-end expects to find its back-end accessible at its own URL with an `api` suffix: `https://yourdomain.dom/api/` - this should lead back to the port configured in `config.json`. This can be modified by defining the `REACT_APP_XCDB_SERVER` variable before building.

    Also, when using a reverse proxy, it should take care of rewriting all URLs starting with `/launch/*` to `/` so that _Apache_/_nginx_ will load `/index.html` when the user requests `/launch/54/route/339/flight/53358`. With _Apache_ this can be achieved with `mod_rewrite`:

    ```
    RewriteEngine On
    RewriteCond %{REQUEST_URI} ^/launch/.*$
    RewriteRule ^ /index.html [L]
    ```
