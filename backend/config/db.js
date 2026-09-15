/* ==========================================================================
   GlowGuide backend — config/db.js
   A single shared MySQL connection pool (mysql2/promise). Every
   controller/service imports `pool` from here rather than opening its
   own connection.
   ========================================================================== */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME columns as 'YYYY-MM-DD' strings, matching the frontend's existing date format
});

module.exports = pool;
