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
    id MEDIUMINT NOT NULL AUTO_INCREMENT,
    name CHAR(40) NOT NULL,
    sub CHAR(40),
    lat FLOAT,
    lng FLOAT,
    PRIMARY KEY (id)
);

CREATE TABLE route (
    id MEDIUMINT NOT NULL AUTO_INCREMENT PRIMARY KEY
);

CREATE TABLE flight (
    id MEDIUMINT NOT NULL AUTO_INCREMENT,
    hash BINARY(16) NOT NULL,
    launch_id MEDIUMINT,
    route_id MEDIUMINT,
    p1_lat FLOAT,
    p1_lng FLOAT,
    p2_lat FLOAT,
    p2_lng FLOAT,
    p3_lat FLOAT,
    p3_lng FLOAT,
    score DECIMAL(6.3),
    distance DECIMAL(6.3),
    PRIMARY KEY (id),
    FOREIGN KEY (launch_id) REFERENCES launch (id),
    FOREIGN KEY (route_id) REFERENCES route (id)
);

CREATE TABLE point (
    id MEDIUMINT NOT NULL,
    flight_id MEDIUMINT NOT NULL,
    lat FLOAT NOT NULL,
    lng FLOAT NOT NULL,
    alt FLOAT,
    time TIMESTAMP,
    PRIMARY KEY (id, flight_id),
    FOREIGN KEY (flight_id) REFERENCES flight (id)
);
