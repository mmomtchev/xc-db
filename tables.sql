DROP TABLE IF EXISTS wind;
DROP TABLE IF EXISTS point;
DROP TABLE IF EXISTS flight;
DROP TABLE IF EXISTS route;
DROP TABLE IF EXISTS launch;

DROP FUNCTION IF EXISTS distance;

DELIMITER //
CREATE FUNCTION distance ( x0 FLOAT, y0 FLOAT, x1 FLOAT, y1 FLOAT )
RETURNS FLOAT
BEGIN
    DECLARE lat FLOAT;
    DECLARE lng FLOAT;
    DECLARE lat_m FLOAT;

    SET lng = RADIANS(x0) - RADIANS(x1);
    SET lat = RADIANS(y0) - RADIANS(y1);
    SET lat_m = (RADIANS(y0) + RADIANS(y1)) / 2;

    RETURN 6371.009 * SQRT(POWER(lng, 2) + POWER(COS(lat_m) * lat, 2));
END; //
DELIMITER ;

CREATE TABLE launch (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name CHAR(40) NOT NULL,
    sub CHAR(40),
    lat FLOAT,
    lng FLOAT,
    PRIMARY KEY (id)
);

CREATE TABLE route (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE flight (
    id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
    hASh BINARY(16) NOT NULL,
    launch_id MEDIUMINT UNSIGNED,
    route_id MEDIUMINT UNSIGNED,
    p1_lat FLOAT NOT NULL,
    p1_lng FLOAT NOT NULL,
    p2_lat FLOAT NOT NULL,
    p2_lng FLOAT NOT NULL,
    p3_lat FLOAT NOT NULL,
    p3_lng FLOAT NOT NULL,
    score DECIMAL(6,3) NOT NULL,
    distance DECIMAL(6,3) NOT NULL,
    category CHAR(3) NOT NULL,
    wing VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (launch_id) REFERENCES launch (id),
    FOREIGN KEY (route_id) REFERENCES route (id),
    INDEX (launch_id),
    INDEX (route_id)
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
        AVG(distance) AS avg_distance, AVG(score) AS avg_score, MAX(distance) AS max_distance, MAX(score) AS max_score, COUNT(*) AS flights
    FROM flight WHERE route_id IS NOT NULL GROUP BY route_id;
