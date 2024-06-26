import dotenv from 'dotenv';
// import express from 'express';
// import https from 'https';
// import fs from 'fs';
//import { io } from './src/methods/communication/socket.io.js';
import {app} from './src/methods/communication/api.express.js';
import conn from './src/methods/db/db.js';
import dashboard from './src/routes/dashboard/dashboard.js';
//import dashboard from './src/routes/dashboard/dashboard.js';

import { authenticateToken } from './src/methods/auth/token.js';

app.use('/dashboard', dashboard);


//GET TIME
function getHours() {
  const date = new Date();
  var hour = date.getHours();
  hour++;
  return hour % 24;
}
function getMinutes() {
  const date = new Date();
  var minute = date.getMinutes();
  return minute.toString();
}
function getDay() {
  return ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][new Date().getDay()];
}

//----------------------------------------------
// Database connection
//----------------------------------------------





app.get('/', (req, res) => {
  res.status(200).send({
    API: "working",
    Connection: "Secured",
    Name: "Attendora",
    version: "0.1.1",
  });
});

app.get('/testdb', async (req, res) => {
  try {
    console.log("calling testdb...");
    const result = await conn.promise().query('SELECT * FROM Etudiant Where Filiere ='+ req.filiere);
    res.status(200).send(result[0]);
    console.log("testdb Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/getstudents', async (req, res) => {
  try {
    console.log("calling getstudents...");
    const result = await conn.promise().query('select NumeroCarteRFID from Etudiant where filiere = "' + req.body.filiere + '"');
    console.log(result[0]);
    let list = {
      count: result[0].length,
    };
    for (let i = 0; i < result[0].length; i++) {
      list = { ...list, [result[0][i].NumeroCarteRFID]: 0 };
    }
    res.status(200).send(list);
    console.log("GetStudent Called, status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.get('/checkTime', (req, res) => {
  let time = getHours() + ":" + getMinutes();
  res.status(200).send({
    time: time,
  });
});

app.post('/createSession', async (req, res) => {
  let arduinoId = req.body.arduinoId;
  let teacherId = req.body.teacherId;
  arduinoId = await conn.promise().query('select salle from Arduino where Numero = ' + arduinoId + ' AND Active = 1');
  const salle = arduinoId[0][0].salle;
  teacherId = await conn.promise().query('select * from Enseignants where NumRFID = "' + teacherId + '"');
  const teacherName = teacherId[0][0].Nom_E;
  teacherId = teacherId[0][0].ID_ens;
  let emploiId = await determineEmploi(teacherId);
  let result = await conn.promise().query('INSERT INTO Seance (Type, Emploi, Enseignant, Salle) VALUES ("Normal", ' + teacherId + ', ' + emploiId + ', "' + salle + '")');
  let elementName = await conn.promise().query('Select * from Emploi where ID_emp = ' + emploiId + '');
  let filiereName = elementName[0][0].filiere;
  elementName = await conn.promise().query('SELECT * from Element where ID_elm = ' + elementName[0][0].Element + '');
  res.status(200).send({
    sessionId: result[0].insertId,
    Element: elementName[0][0].Abreviation,
    teacherName: teacherName,
    salle: salle,
    filiere: filiereName,
  });

  console.log("createSession Called: status ok ✅");
});

app.post('/markAbsent', async (req, res) => {
  try {
    console.log("calling makeAbsent...");
    const absentRFIDs = Object.keys(req.body).filter(key => req.body[key] === 0);
    console.log(req.body.ip);

    // for (let i = 0; i < absentRFIDs.length; i++) {
    //   const studentRFID = absentRFIDs[i];
    //   const studentId = await conn.promise().query('SELECT IDetudiant FROM Etudiant WHERE NumeroCarteRFID = "' + studentRFID + '"');
    //   const sessionId = req.body.sessionId;
    //   await conn.promise().query('INSERT INTO Absence (Etudiant, Seance) VALUES ("' + studentId[0][0].IDetudiant + '", ' + sessionId + ')');
    // }
    const sessionId = parseInt(req.body.sessionId);
    const insertQuery = `INSERT INTO Absence (Etudiant, Seance)
      SELECT IDetudiant, ? AS Seance FROM Etudiant
      WHERE NumeroCarteRFID IN (?)`;

    if (absentRFIDs.length === 0) {
      res.status(200).send({
        status: "2",
      });
      console.log("makeAbsent Called: status ok ✅");
      return;
    } else {
      await conn.promise().query(insertQuery, [sessionId, absentRFIDs]);

      res.status(200).send({
        status: "1",
      });
      console.log("makeAbsent Called: status ok ✅");
    }
  } catch (err) {
    console.log(err);
  }
});

app.post('/teachersSession', async (req, res) => {
  try {
    console.log("calling teachersSession...");
    const teacherId = parseInt(req.body.teacherId);
    const result = await conn.promise().query('SELECT * FROM Seance WHERE Enseignant = ' + teacherId);
    res.status(200).send(result[0]);
    console.log("teachersSession Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/teachersSessionCount', authenticateToken, async (req, res) => {
  try {
    console.log("calling teachersSessionCount...");
    const teacherId = req.body.teacherId;
    const result = await conn.promise().query('SELECT COUNT(*) AS count FROM Seance WHERE Enseignant = ' + teacherId + ' AND Type = "Normal"');
    res.status(200).send(result[0][0]);
    console.log("teachersSessionCount Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/teachername', authenticateToken, async (req, res) => {
  try {
    console.log("calling teachername...");
    const teacherId = req.body.teacherId;
    const result = await conn.promise().query('SELECT * FROM Enseignants WHERE ID_ens = ' + teacherId);
    res.status(200).send(result[0][0]);
    console.log("teachername Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/filierecount', authenticateToken, async (req, res) => {
  try {
    console.log("calling filierecount...");
    const teacherId = req.body.teacherId;
    const result = await conn.promise().query('SELECT COUNT(*) AS count FROM Filiere');
    res.status(200).send(
      { count: result[0][0].count }
    );
    console.log("filierecount Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});
app.post('/studentcount', authenticateToken, async (req, res) => {
  try {
    console.log("calling studentcount...");
    const teacherId = req.body.teacherId;
    const result = await conn.promise().query('SELECT DISTINCT filiere FROM Emploi WHERE Enseignant = "' + teacherId + '"');
    if (result[0].length === 0) {
      res.status(200).send(
        { count: 0 }
      );
      console.log("studentcount Called: status ok ✅");
      return;
    }
    let filarray = "(";
    for (let i = 0; i < result[0].length; i++) {
      filarray = filarray + "\"" + result[0][i].filiere + "\"" + ",";
    }
    filarray = filarray.slice(0, -1);
    filarray += ")";
    const studentCount = await conn.promise().query('SELECT COUNT(*) AS count FROM Etudiant');
    res.status(200).send(
      { count: studentCount[0][0].count }
    );
    console.log("studentcount Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/absenceCount', authenticateToken, async (req, res) => {
  try {
    console.log("calling absenceCount...");
    const result = await conn.promise().query('SELECT COUNT(*) AS count FROM Absence');
    console.log(result[0][0].count);
    res.status(200).send(
      { count: result [0][0].count }
    );
    console.log("absenceCount Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

app.post('/lastAbsentees', authenticateToken, async (req, res) => {
  try {
    console.log("calling lastAbsentees...");
    const result = await conn.promise().query(`
      SELECT Etudiant.Nom_etd AS surname, Etudiant.Prenom_etd AS name, Filiere.ID_filiere AS major, Element.Abreviation AS element, Seance.ID_seance AS id, Seance.Date AS date
      FROM Absence
      INNER JOIN Seance ON Absence.Seance = Seance.ID_seance
      INNER JOIN Etudiant ON Absence.Etudiant = Etudiant.IDetudiant
      INNER JOIN Emploi ON Seance.Emploi = Emploi.ID_emp
      INNER JOIN Filiere ON Emploi.filiere = Filiere.ID_filiere
      INNER JOIN Element ON Emploi.Element = Element.ID_elm
      ORDER BY Absence.Seance DESC
      LIMIT 5
    `);
    console.log(result[0]);
    res.status(200).send(result[0]);
    console.log("lastAbsentees Called: status ok ✅");
  } catch (err) {
    console.log(err);
  }
});

async function determineEmploi(teacherId) {
  const weekday = getDay();
  let result = await conn.promise().query('Select * from Emploi where Enseignant = ' + teacherId + ' AND Jour = "Vendredi"');//"'+weekday+'"
  result = result[0];
  let hours = [];
  for (let i = 0; i < result.length; i++) {
    result[i].HeureDebut = result[i].HeureDebut.split(":");
    hours.push(parseInt(result[i].HeureDebut[0]));
  }
//   const time = parseFloat(getHours()+"."
//   +((getMinutes()*100)/60)
// );;
//   console.log(time)
  const time = 7.8;
  for (let i = 0; i < hours.length; i++) {
    hours[i] = Math.abs(hours[i] - time);
  }
  return hours.indexOf(Math.min(...hours))+1;
}