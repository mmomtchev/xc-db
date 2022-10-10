DROP VIEW IF EXISTS route_info;
DROP VIEW IF EXISTS launch_info;
DROP VIEW IF EXISTS flight_info;
DROP VIEW IF EXISTS route_debug;

DROP TABLE IF EXISTS wind;
DROP TABLE IF EXISTS point;
DROP TABLE IF EXISTS flight_extra;
DROP TABLE IF EXISTS flight;
DROP TABLE IF EXISTS route;
DROP TABLE IF EXISTS launch;
DROP TABLE IF EXISTS launch_official;

DROP FUNCTION IF EXISTS sup;
DROP FUNCTION IF EXISTS great_circle;
DROP FUNCTION IF EXISTS round_to;
DROP FUNCTION IF EXISTS close_to;
DROP FUNCTION IF EXISTS cardinal_direction;
DROP FUNCTION IF EXISTS wind_distribution;

DELIMITER //

-- Great circle distance - more than enough for distances of less than 5km with 10m precision
-- (no need to optimize the SQRT - it is far less expensive than the rest)
-- (yes, MySQL has native support for geography types
-- but it is very ill-suited for this application)
CREATE FUNCTION great_circle ( lat0 DECIMAL(9,6), lng0 DECIMAL(9,6), lat1 DECIMAL(9,6), lng1 DECIMAL(9,6) )
RETURNS DECIMAL(9,6)
BEGIN
    DECLARE lat_d DECIMAL(9,6);
    DECLARE lng_d DECIMAL(9,6);
    DECLARE lat_m DECIMAL(9,6);

    SET lat_d = RADIANS(lat0) - RADIANS(lat1);
    SET lat_m = (RADIANS(lat0) + RADIANS(lat1)) / 2;
    SET lng_d = RADIANS(lng0) - RADIANS(lng1);

    RETURN 6371.009 * SQRT(POWER(lat_d, 2) + POWER(COS(lat_m) * lng_d, 2));
END; //

CREATE FUNCTION sup ( a FLOAT, b FLOAT )
RETURNS FLOAT
BEGIN
    RETURN IF (a > b, a, b);
END; //

CREATE FUNCTION round_to ( a FLOAT, acc FLOAT )
RETURNS FLOAT
BEGIN
    DECLARE multiplier FLOAT;

    SET multiplier = 1 / acc;

    RETURN ROUND(a * multiplier) / multiplier;
END; //

CREATE FUNCTION close_to ( a FLOAT, b FLOAT, acc FLOAT )
RETURNS BOOLEAN
BEGIN
    RETURN ABS(a - b) < acc;
END; //

-- 0:N 1:NE 2:E 3:SE 4:S 5:SW 6:W 7:NW
CREATE FUNCTION cardinal_direction ( direction SMALLINT )
RETURNS TINYINT
BEGIN
    RETURN FLOOR(((direction + 22.5) % 360) / 45);
END; //

-- aggregate the wind distribution in the form of
-- N,NE,E,SE,S,SW,W,NW
-- where each one is the number of occurrences
CREATE AGGREGATE FUNCTION wind_distribution ( val SMALLINT ) RETURNS VARCHAR(128)
BEGIN
    DECLARE CONTINUE HANDLER FOR NOT FOUND
        BEGIN
            DECLARE res VARCHAR(128);
            SET res = (SELECT GROUP_CONCAT(occurrences) FROM
                (SELECT COUNT(cardinal)-1 AS occurrences FROM dist GROUP BY cardinal ORDER BY cardinal ASC) AS aggr);
            DROP TEMPORARY TABLE dist;
            RETURN res;
        END;

    CREATE TEMPORARY TABLE dist (cardinal TINYINT);
    INSERT INTO dist (cardinal) VALUES (0), (1), (2), (3), (4), (5), (6), (7);
    LOOP
        FETCH GROUP NEXT ROW;
        INSERT INTO dist VALUES (cardinal_direction(val));
    END LOOP;
END; //

DELIMITER ;

-- the launch coordinates are defined only by the geometric center of the launch coordinates
-- of all flights that have been classified as having this launch
CREATE TABLE launch (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id)
);

CREATE TABLE launch_official (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL UNIQUE,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    PRIMARY KEY (id)
);

-- the route coordinates are defined only by the geometric center of the route coordinates
-- of all flights that have been classified as following this route
CREATE TABLE route (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE flight (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    hash BINARY(16) UNIQUE NOT NULL,
    launch_id MEDIUMINT UNSIGNED,
    route_id MEDIUMINT UNSIGNED,
    launch_point SMALLINT UNSIGNED NOT NULL,
    landing_point SMALLINT UNSIGNED NOT NULL,
    p1_point SMALLINT UNSIGNED NOT NULL,
    p2_point SMALLINT UNSIGNED NOT NULL,
    p3_point SMALLINT UNSIGNED NOT NULL,
    e1_point SMALLINT UNSIGNED NOT NULL,
    e2_point SMALLINT UNSIGNED NOT NULL,
    type CHAR(3) NOT NULL,
    score DECIMAL(6,3) NOT NULL,
    distance DECIMAL(6,3) NOT NULL,
    category CHAR(3) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (launch_id) REFERENCES launch (id),
    FOREIGN KEY (route_id) REFERENCES route (id),
    INDEX (launch_id),
    INDEX (route_id)
);

CREATE TABLE flight_extra (
    id MEDIUMINT UNSIGNED NOT NULL,
    launch_lat DECIMAL(9,6) NOT NULL,
    launch_lng DECIMAL(9,6) NOT NULL,
    p1_lat DECIMAL(9,6) NOT NULL,
    p1_lng DECIMAL(9,6) NOT NULL,
    p2_lat DECIMAL(9,6) NOT NULL,
    p2_lng DECIMAL(9,6) NOT NULL,
    p3_lat DECIMAL(9,6) NOT NULL,
    p3_lng DECIMAL(9,6) NOT NULL,
    e1_lat DECIMAL(9,6) NOT NULL,
    e1_lng DECIMAL(9,6) NOT NULL,
    e2_lat DECIMAL(9,6) NOT NULL,
    e2_lng DECIMAL(9,6) NOT NULL,
    landing_lat DECIMAL(9,6) NOT NULL,
    landing_lng DECIMAL(9,6) NOT NULL,
    date DATE NOT NULL,
    glider VARCHAR(30) NOT NULL,
    pilot_url VARCHAR(60) NOT NULL,
    flight_url VARCHAR(60) NOT NULL,
    pilot_name VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES flight (id)
);

CREATE TABLE point (
    flight_id MEDIUMINT UNSIGNED NOT NULL,
    id SMALLINT UNSIGNED NOT NULL,
    lat DECIMAL(9,6) NOT NULL,
    lng DECIMAL(9,6) NOT NULL,
    alt SMALLINT NOT NULL,
    time DATETIME NOT NULL,
    PRIMARY KEY (flight_id, id),
    FOREIGN KEY (flight_id) REFERENCES flight (id),
    INDEX (lat, lng)
);

CREATE TABLE wind (
    date DATE NOT NULL,
    lat DECIMAL(5,2) NOT NULL,
    lng DECIMAL(5,2) NOT NULL,
    speed TINYINT UNSIGNED NOT NULL,
    direction SMALLINT UNSIGNED NOT NULL,
    PRIMARY KEY (date, lat, lng),
    INDEX (lat, lng)
);

CREATE VIEW route_info AS
    SELECT route_id AS id,
        AVG(p1_lat) AS c1_lat, AVG(p1_lng) AS c1_lng,
        AVG(p2_lat) AS c2_lat, AVG(p2_lng) AS c2_lng,
        AVG(p3_lat) AS c3_lat, AVG(p3_lng) AS c3_lng,
        AVG(distance) AS avg_distance, AVG(score) AS avg_score, MAX(distance) AS max_distance, MAX(score) AS max_score,
        COUNT(*) AS flights
    FROM flight NATURAL JOIN flight_extra WHERE route_id IS NOT NULL GROUP BY route_id;

-- used only for debugging the classifier
CREATE VIEW route_debug AS
    SELECT flight.id as flight_id, route_info.id as route_id, flight_url,
        great_circle(p1_lat, p1_lng, c1_lat, c1_lng) AS d1,
        great_circle(p2_lat, p2_lng, c2_lat, c2_lng) AS d2,
        great_circle(p3_lat, p3_lng, c3_lat, c3_lng) AS d3
    FROM flight NATURAL JOIN flight_extra FULL JOIN route_info;

CREATE VIEW launch_info AS
    SELECT launch_id AS id,
        AVG(launch_lat) AS lat, AVG(launch_lng) AS lng, SUM(score) AS score, COUNT(*) AS flights
    FROM flight NATURAL JOIN flight_extra WHERE launch_id IS NOT NULL GROUP BY launch_id;

CREATE VIEW flight_info AS
    SELECT
        flight.id AS id, launch_id, route_id,
        launch_point, landing_point, p1_point, p2_point, p3_point, e1_point, e2_point,
        launch_lat, launch_lng, p1_lat, p1_lng, p2_lat, p2_lng, p3_lat, p3_lng, e1_lat, e1_lng, e2_lat, e2_lng,
        type, score, distance, category, glider, pilot_url, flight_url, pilot_name,
        flight_extra.date, MONTH(flight_extra.date) as month,
        wind.direction AS wind_direction
    FROM flight NATURAL LEFT JOIN flight_extra 
    LEFT JOIN wind ON (flight_extra.date = wind.date
        AND ROUND(flight_extra.launch_lat * 4)/4 = wind.lat AND ROUND(flight_extra.launch_lng * 4)/4 = wind.lng);
