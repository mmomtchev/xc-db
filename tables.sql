DROP VIEW IF EXISTS route_info;
DROP VIEW IF EXISTS launch_info;
DROP VIEW IF EXISTS flight_info;

DROP TABLE IF EXISTS wind;
DROP TABLE IF EXISTS point;
DROP TABLE IF EXISTS flight_extra;
DROP TABLE IF exists flight;
DROP TABLE IF EXISTS route;
DROP TABLE IF EXISTS launch;
DROP TABLE IF EXISTS launch_official;

DROP FUNCTION IF EXISTS sup;
DROP FUNCTION IF EXISTS great_circle;

-- Great circle distance - more than enough for distances of less than 5km
-- (no need to optimize the SQRT - it is far less expensive than the rest)
DELIMITER //
CREATE FUNCTION great_circle ( lat0 FLOAT, lng0 FLOAT, lat1 FLOAT, lng1 FLOAT )
RETURNS FLOAT
BEGIN
    DECLARE lat_d FLOAT;
    DECLARE lng_d FLOAT;
    DECLARE lat_m FLOAT;

    SET lat_d = RADIANS(lat0) - RADIANS(lat1);
    SET lat_m = (RADIANS(lat0) + RADIANS(lat1)) / 2;
    SET lng_d = RADIANS(lng0) - RADIANS(lng1);

    RETURN 6371.009 * SQRT(POWER(lng_d, 2) + POWER(COS(lat_m) * lat_d, 2));
END; //

CREATE FUNCTION sup ( a FLOAT, b FLOAT )
RETURNS FLOAT
BEGIN
    RETURN IF (a > b, a, b);
END; //

DELIMITER ;


CREATE TABLE launch (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id)
);

CREATE TABLE launch_official (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL UNIQUE,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE route (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE flight (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    hash BINARY(16) NOT NULL,
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
    launch_lat FLOAT NOT NULL,
    launch_lng FLOAT NOT NULL,
    p1_lat FLOAT NOT NULL,
    p1_lng FLOAT NOT NULL,
    p2_lat FLOAT NOT NULL,
    p2_lng FLOAT NOT NULL,
    p3_lat FLOAT NOT NULL,
    p3_lng FLOAT NOT NULL,
    e1_lat FLOAT NOT NULL,
    e1_lng FLOAT NOT NULL,
    e2_lat FLOAT NOT NULL,
    e2_lng FLOAT NOT NULL,
    date DATE,
    glider VARCHAR(20) NOT NULL,
    pilot_url VARCHAR(60) NOT NULL,
    flight_url VARCHAR(60) NOT NULL,
    pilot_name VARCHAR(60) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (id) REFERENCES flight (id)
);

CREATE TABLE point (
    flight_id MEDIUMINT UNSIGNED NOT NULL,
    id SMALLINT UNSIGNED NOT NULL,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
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
    PRIMARY KEY (date, lat, lng)
);

CREATE VIEW route_info AS
    SELECT route_id AS id,
        AVG(p1_lat) AS c1_lat, AVG(p1_lng) AS c1_lng, AVG(p2_lat) AS c2_lat, AVG(p2_lng) AS c2_lng, AVG(p3_lat) AS c3_lat, AVG(p3_lng) AS c3_lng,
        AVG(distance) AS avg_distance, AVG(score) AS avg_score, MAX(distance) AS max_distance, MAX(score) AS max_score,
        COUNT(*) AS flights
    FROM flight NATURAL JOIN flight_extra WHERE route_id IS NOT NULL GROUP BY route_id;

CREATE VIEW launch_info AS
    SELECT launch_id AS id,
        AVG(launch_lat) AS lat, AVG(launch_lng) AS lng, SUM(score) AS score, COUNT(*) AS flights
    FROM flight NATURAL JOIN flight_extra WHERE launch_id IS NOT NULL GROUP BY launch_id;

CREATE VIEW flight_info AS
    SELECT 
        flight.id AS id, launch_id, route_id,
        launch_point, landing_point, p1_point, p2_point, p3_point, e1_point, e2_point,
        launch_lat, launch_lng, p1_lat, p1_lng, p2_lat, p2_lng, p3_lat, p3_lng, e1_lat, e1_lng, e2_lat, e2_lng,
        type, score, distance, category, glider, pilot_url, flight_url, pilot_name, date
    FROM flight NATURAL LEFT JOIN flight_extra;
