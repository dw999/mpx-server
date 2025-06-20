#!/usr/bin/node

//###
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//# 
//#      http://www.apache.org/licenses/LICENSE-2.0
//# 
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//###

//#################################################################################################################################
// File name: mail-worker.js
//
// Ver           Date            Author          Comment
// =======       ===========     ===========     ==========================================
// V1.0.00       2025-06-02      DW              Get a email sending request, and send out email accordingly. Use it to work-around
//                                               the issue of SMS server blockage by worker mail server/provider.
//#################################################################################################################################

"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cipher = require('./lib/cipher_lib.js');
const wev = require('./lib/webenv_lib.js');
const dbs = require('./lib/db_lib.js');
const telecom = require('./lib/telecom_lib.js');


//*-- Determine which port should be assigned to express.js --*//
let port = 30000;
process.argv.forEach((val, index) => {
  if (val.match(/port=/i)) {
  	let params = val.split("=");
  	let data = parseInt(params[1], 10);
  	if (data > 0 && data <= 65535) {
      port = data;
    }
  }
});

const app = express();

//*-- Disable X-Powered-By header. Note: Disabling the X-Powered-By header does not prevent a sophisticated attacker from determining that an --*//
//*-- app is running Express. It may discourage a casual exploit, but there are other ways to determine an app is running Express.            --*// 
app.disable('x-powered-by');

//*-- Define static resources (such as library files) location for express --*// 
app.use(express.static(__dirname));

//*-- Web page parser to get POST parameters --*// 
app.use(bodyParser.json());  // for parsing application/json
app.use(bodyParser.urlencoded({extended: true}));

//---------------------------------------------------------------------------------------------------------------------------------
// Comand line calling syntax example:
//
// curl -X POST -H 'Content-Type: application/json' \
//     -d '{"token":"123456","tk_iv":"8342sW","to":"xyz1234@gmail.com",....,"port":"465"}' \
//     http://localhost:30000/gateway
//---------------------------------------------------------------------------------------------------------------------------------
app.post('/gateway', (req, res) => {
  try {  
    let token = (typeof(req.body.token) != "string")? "" : wev.base64Decode(req.body.token);
    let tk_iv = (typeof(req.body.tk_iv) != "string")? "" :  wev.base64Decode(req.body.tk_iv);
    let from = (typeof(req.body.from) != "string")? "" : wev.base64Decode(req.body.from);
    let from_iv = (typeof(req.body.from_iv) != "string")? "" : wev.base64Decode(req.body.from_iv);
    let to = (typeof(req.body.to) != "string")? "" : wev.base64Decode(req.body.to);    
    let to_iv = (typeof(req.body.to_iv) != "string")? "" : wev.base64Decode(req.body.to_iv);
    let subject = (typeof(req.body.subject) != "string")? "" : wev.base64Decode(req.body.subject);
    let subject_iv = (typeof(req.body.subject_iv) != "string")? "" : wev.base64Decode(req.body.subject_iv);
    let mail_body = (typeof(req.body.mail_body) != "string")? "" : wev.base64Decode(req.body.mail_body); 
    let mail_body_iv = (typeof(req.body.mail_body_iv) != "string")? "" : wev.base64Decode(req.body.mail_body_iv);
    let m_user = (typeof(req.body.m_user) != "string")? "" : wev.base64Decode(req.body.m_user); 
    let m_user_iv = (typeof(req.body.m_user_iv) != "string")? "" : wev.base64Decode(req.body.m_user_iv);
    let m_pass = (typeof(req.body.m_pass) != "string")? "" : wev.base64Decode(req.body.m_pass); 
    let m_pass_iv = (typeof(req.body.m_pass_iv) != "string")? "" : wev.base64Decode(req.body.m_pass_iv);
    let smtp = (typeof(req.body.smtp) != "string")? "" : wev.base64Decode(req.body.smtp); 
    let smtp_iv = (typeof(req.body.smtp_iv) != "string")? "" : wev.base64Decode(req.body.smtp_iv);
    let port = (typeof(req.body.port) != "string")? "" : req.body.port;
    let aes_key = '';
    let algorithm = "AES-GCM";
    let retval = {status:'1', message:''};
      
    let result = _getMasterPassword();
    result.then((master_passwd) => {
      let result = cipher.aesDecrypt(algorithm, master_passwd, tk_iv, token);    
      result.then((aes_key) => {
        let data = {
          from: from, 
          from_iv: from_iv, 
          to: to, 
          to_iv: to_iv, 
          subject: subject, 
          subject_iv: subject_iv,
          mail_body: mail_body,
          mail_body_iv: mail_body_iv,
          m_user: m_user,
          m_user_iv: m_user_iv,
          m_pass: m_pass,
          m_pass_iv: m_pass_iv,
          smtp: smtp,
          smtp_iv: smtp_iv
        };
        
        let result = _decryptDataSet(algorithm, aes_key, data);
        result.then((rv) => {
          let result = telecom.sendEmail(rv.smtp_server, port, rv.sender, rv.receiver, rv.m_user, rv.m_pass, rv.m_subject, rv.m_body);
          result.then(() => {
            let log = wev.sayCurrentTime() + " --- Send out an email";
            console.log(log);
            res.send(JSON.stringify(retval));                 
          }).catch((error) => {
            let message = "Unable to send out an email. " + error;
            console.log(message); 
            retval = {status:'0', message:message};
            res.send(JSON.stringify(retval));                      
          });          
        }).catch((error) => {
          console.log(error);
          retval = {status:'0', message:error};
          res.send(JSON.stringify(retval));                
        });
      }).catch((error) => {
        let message = "Unable to get token. " + error;
        console.log(message); 
        retval = {status:'0', message:message};
        res.send(JSON.stringify(retval));                            
      });
    }).catch((error) => {
      let message = "Unable to get master password. " + error;
      console.log(message); 
      retval = {status:'0', message:message};
      res.send(JSON.stringify(retval));                      
    });
  }
  catch(e) {
    console.log(e);
    // Make hackers confusing //
    res.status(404);
    res.send('<h1>404 : Page Not Found</h1>');
  }
});


async function _getMasterPassword() {
  let conn, sql, param, data, result;
    
  try {
    conn = await dbs.dbConnect(dbs.selectCookie("MWK"));
    
    sql = `SELECT cur_passwd ` +
          `  FROM master_passwd`;
          
    data = JSON.parse(await dbs.sqlQuery(conn, sql));
    
    if (data.length > 0) {
      result = data[0].cur_passwd;
      
      if (result.trim() == "") {
        result = "K5QO6zfF2H8XUYZz";      // Default value
        
        sql = `UPDATE master_passwd ` +
              `  SET cur_passwd = ?, ` +
              `      last_update = CURRENT_TIMESTAMP()`;
              
        param = [result];
        await dbs.sqlExec(conn, sql, param);      
      }      
    }      
    else {
      result = "K5QO6zfF2H8XUYZz";      // Default value
      
      sql = `INSERT INTO master_passwd ` +
            `(cur_passwd, old_passwd, last_update) ` +
            `VALUES ` +
            `(?, '', CURRENT_TIMESTAMP())`;
            
      param = [result];       
      await dbs.sqlExec(conn, sql, param);
    }
  }
  catch(e) {
    throw e;
  }
  finally {
    await dbs.dbClose(conn);
  }
  
  return result;
}


async function _decryptDataSet(algorithm, aes_key, data) {
  let retval = {};
  
  try {
    let this_from = await cipher.aesDecrypt(algorithm, aes_key, data.from_iv, data.from); 
    let this_to = await cipher.aesDecrypt(algorithm, aes_key, data.to_iv, data.to);
    let this_subject = await cipher.aesDecrypt(algorithm, aes_key, data.subject_iv, data.subject);
    let this_mail_body = await cipher.aesDecrypt(algorithm, aes_key, data.mail_body_iv, data.mail_body);
    let this_m_user = await cipher.aesDecrypt(algorithm, aes_key, data.m_user_iv, data.m_user);
    let this_m_pass = await cipher.aesDecrypt(algorithm, aes_key, data.m_pass_iv, data.m_pass);
    let this_smtp = await cipher.aesDecrypt(algorithm, aes_key, data.smtp_iv, data.smtp); 
  
    retval = {
      sender: this_from, 
      receiver: this_to, 
      m_subject: this_subject, 
      m_body: this_mail_body,
      m_user: this_m_user,
      m_pass: this_m_pass,
      smtp_server: this_smtp
    };    
  }
  catch(e) {
    throw e;
  }
  
  return retval;
}


/* Temporary diable this route
app.post('/update-master-passwd', (req, res) => {
  
});
*/


// Redirect all the invaders to Microsoft :-) //
app.get('/', (req, res) => {
  res.redirect("https://www.microsoft.com");
});


// Redirect all the invaders to Microsoft :-) //
app.post('/', (req, res) => {
  res.redirect("https://www.microsoft.com");
});


app.use(function(req, res, next) {
	res.status(404);
	res.send('<h1>404 - Page Not Found</h1>');
});


app.use(function(req, res, next) {
	res.status(500);
	res.send('<h1>500 - Server Error</h1>');
});


app.listen(port, function() {
  console.log(`Mail worker is started on http://localhost:${port}; press Ctrl-C to terminate.`);
});

