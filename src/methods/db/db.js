import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2';
import fs from 'fs';

const conn = mysql.createPool({
    connectionLimit: 10, // Adjust as necessary
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
}, console.log("Connected to database"));

export default conn;