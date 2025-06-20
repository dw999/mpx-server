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
// File name: telecom_lib.js
//
// Ver           Date            Author          Comment
// =======       ===========     ===========     ==========================================
// V1.0.00       2019-11-22      DW              Library of all telecommunications.
// V1.0.01       2022-08-09      DW              Rename function 'sendGmail' to 'sendEmail', and make it more generic. 
// V1.0.02       2025-04-22      DW              Replace Telegram message sending library 'telegram-bot-api' by 'telegramsjs'.
// V1.0.03       2025-06-05      DW              Rewrite for project 'mailer'.  
//#################################################################################################################################

"use strict";
const mailer = require("nodemailer");


exports.sendEmail = async function(smtp_server, port, from, to, user, pass, subject, mail_body) {
  let secure = (port == 465)? true : false; 
  
  let transporter = mailer.createTransport({
    //service: 'gmail',
    host: smtp_server,
    port: port,
    secure: secure,
    auth: {
      user: user, // user of email sender
      pass: pass  // password of email sender
    }
  });

  let mailOptions = {
    from: from, // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: mail_body // plain text body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
      console.log(`Unable to send email to ${to}:`);
      console.log(err);
    }
  });
}



