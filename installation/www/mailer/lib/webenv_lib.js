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
// File name: webenv_lib.js
//
// Ver           Date            Author          Comment
// =======       ===========     ===========     ==========================================
// V1.0.00       2019-11-12      DW              Common Javascript library for node.js back-end.
// V1.0.01       2023-08-08      DW              Fix a bug on function 'makeUrlAlive', which exclude the last numeric character in
//                                               the link.
// V1.0.02       2023-11-15      DW              Use "cipher.generateTrueRandomStr" to replace "_generateRandomStr". 
// V1.0.03       2024-03-05      DW              Add function "disableEmbedJavascript" which is used to disable embedded javascript
//                                               coding and highlight it with red colour.
// V1.0.04       2024-03-20      DW              Add functions "base64Encode" and "base64Decode".
// V1.0.05       2025-03-13      DW              Add function "minifyJS" which is used to compress JavaScript code block.
// V1.0.06       2025-06-05      DW              Rewrite for project 'mailer'. 
//#################################################################################################################################

"use strict";
const fs = require('fs');
const path = require('node:path');
const dbs = require('../lib/db_lib.js');


function _allTrim(s) {
  if (s == null) {return '';}
  
  if (typeof s != "string") { return s; }
      
  while (s.substring(0,1) == ' ') {
    s = s.substring(1, s.length);
  }
  while (s.substring(s.length-1, s.length) == ' ') {
    s = s.substring(0, s.length-1);
  }
      
  return s;	
}


exports.allTrim = function(s) {      
  return _allTrim(s);	
}


function _padLeft(str, size, filler) {
  try {
    if (typeof(str) == "number") {
      str = str.toString();
    }
    else {
      if (typeof(str) != "string") {
        throw new Error("Passed data cannot be handled.");
      }
    }
    
    if (typeof(size) != "number" || isNaN(size)) {
      throw new Error("Passed data cannot be handled.");
    }
    
    if (typeof(filler) == "number") {
      filler = filler.toString();
    }
    else {
      if (typeof(filler) != "string") {
        throw new Error("Passed data cannot be handled.");
      }
    }
        
    while (str.length < size) {      
       str = filler + str;
    }    
  }
  catch(e) {
    throw e;
  }
  
  return str;  
}


exports.padLeft = function(str, size, filler) {
  try {
    str = _padLeft(str, size, filler);
  }
  catch(e) {
    throw e;
  }
  
  return str;
}


function _padRight(str, size, filler) {
  try {
    if (typeof(str) == "number") {
      str = str.toString();
    }
    else {
      if (typeof(str) != "string") {
        throw new Error("Passed data cannot be handled.");
      }
    }
    
    if (typeof(size) != "number" || isNaN(size)) {
      throw new Error("Passed data cannot be handled.");
    }
    
    if (typeof(filler) == "number") {
      filler = filler.toString();
    }
    else {
      if (typeof(filler) != "string") {
        throw new Error("Passed data cannot be handled.");
      }
    }
        
    while (str.length < size) {      
       str = str + filler;
    }    
  }
  catch(e) {
    throw e;
  }
  
  return str;  
}


exports.padRight = function(str, size, filler) {
  try {
    str = _padRight(str, size, filler);
  }
  catch(e) {
    throw e;
  }
  
  return str;
}


exports.back = function() {
  let result = `<script language="javascript" type="text/javascript">` +
               `  history.go(-1);` + 
               `</script>`;

  return result;
}


exports.reverseStr = function (str) {
  let result = '';
  
  if (typeof(str) === 'string') {
    for (let i = str.length - 1; i >= 0; i--) {
	    result = result + str.charAt(i);
    }
  }
  
  return result;
}


exports.asciiToHex = function(str) {
	let arr1 = [];
  
	for (let n = 0, l = str.length; n < l; n ++) {
		let hex = Number(str.charCodeAt(n)).toString(16);
		arr1.push(hex.toUpperCase());
  }
  
	return arr1.join('');
}


function _isLeapYear(year) {
	//-- Every 400 years in gregorian is leap, but in julian it isn't. --//
	if ((year % 400) == 0) 	{		
		if (year < 1752) 		{
			return false;
		}
		else 		{
			return true;
		}
	}	
	else 	{
		//-- Other centuries are not leap --//
		if ((year % 100) == 0) {
			return false;
		}
		else {
			//-- Normal system: every 4th year is leap --//
			if ((year % 4) == 0) {
				return true;
			}
			else {
				return false;
			}
		}
	}  
}


exports.isLeapYear = function(year) {
  return _isLeapYear(year);
}


async function _fileNameParser(file) {
  let filename, dirs, ext;
  let result = {filename: '', dirs: '', ext: ''};
  
  try {
    if (_allTrim(file) != '') {    
      //-- Note: 'filename' is the file name without extension --//
      let fullname = path.basename(file);
      let parts = fullname.split('.');    
      if (parts.length == 1) {
        filename = fullname;
      }
      else if (parts.length == 2) {
        filename = parts[0];
      }
      else if (parts.length >= 3) {
        filename = parts[0];
        for (let i = 1; i < parts.length - 1; i++) {
          filename += '.' + parts[i];
        }
      }
      
      dirs = path.dirname(file) + '/';        // Fill directory name where the file located
      ext = path.extname(file);               // The file extension with '.' in front of it.
      
      result = {filename: filename, dirs: dirs, ext: ext};
    }
  }
  catch(e) {
    console.log(e.message);
  }
  
  return result;  
}


exports.fileNameParser = async function(file) {
  let result = {filename: '', dirs: '', ext: ''};
  
  try {    
    result = await _fileNameParser(file);
  }
  catch(e) {
    console.log(e.message);
  }
  
  return result;
}


async function _fileExist(file) {
  let result;
  
  try {
    if (fs.existsSync(file)) {
      result = true;
    }
    else {
      result = false;
    }
  } 
  catch(e) {
    console.log(e.message);
    result = false;
  }  
  
  return result;  
}


exports.fileExist = async function(file) {
  let result;
  
  try {
    result = await _fileExist(file); 
  } catch(e) {
    result = false;
  }  
  
  return result;
}


function _fileSize(file) {
  let size = 0;

  try {
    stats = fs.statSync(file);
    size = stats.size;
  }
  catch(e) {
    throw e;
  }

  return size;
}


exports.fileSize = function(file) {
  let size = 0;
  
  try {
    size = _fileSize(file);
  }
  catch(e) {
    console.log(e.message);    
  }
  
  return size;
}


async function _deleteFile(file) {
  let result = true;
  
  try {
    if (_allTrim(file) != '') {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }            
  }
  catch(e) {
    console.log(e.message);
    result = false;
  }
  
  return result;
}


exports.deleteFile = async function(file) {
  let result = true;
  
  try {
    result = await _deleteFile(file);
  }
  catch(e) {
    result = false;    
  }
  
  return result;
} 


exports.copyFile = async function(src, dest) {
  let result = true;
  
  try {
    if (_fileExist(src)) {
      fs.copyFileSync(src, dest, fs.constants.COPYFILE_EXCL, (error) => {
        if (error) {
          console.log(error);
          result = false;
        }
        else {
          result = true;
        }  
      });
    }
    else {
      result = false;
    }
  }
  catch(e) {
    console.log(e.message);
    result = false;
  }
  
  return result;
} 


exports.fileUpload = async function (upload_file, file_path) {
  let file, filename;  

  try {
    file = upload_file.ul_file; 
    //-- Handle UTF-8 file name (mostly Chinese file name) with 'decodeURIComponent' and 'escape'.  --// 
    //-- Assume the uploaded file name has been treated with 'unescape' and 'encodeURIComponent' in --//
    //-- the front end.                                                                             --//  
    filename = file_path + '/' + decodeURIComponent(escape(file.name));
    
    if (await _fileExist(filename)) {
      let new_filename = new Date().getTime() + '_' + decodeURIComponent(escape(file.name)); 
      filename = file_path + '/' +  new_filename;            
    }
    else {
      //-- Change file name if it is too short. It is work-around a mysterious bug as upload a new image --//
      //-- but old image with name 'image.jpg' shown on client side.                                     --//
      let this_filename = decodeURIComponent(escape(file.name));
      if (this_filename.length < 12) {
        let new_filename = new Date().getTime() + '_' + decodeURIComponent(escape(file.name)); 
        filename = file_path + '/' +  new_filename;                    
      }      
    }
        
    //-- Note: Don't use the method on frozen code segment, or else this function will return control --//
    //--       to the caller before the 'mv' operation is finished, let next operations depended on   --//
    //--       the uploaded file fail, like the uploaded file doesn't exist, but actually it exists.  --//  
    /*
    file.mv(filename, (err) => {
      if (err) {
        console.log(err);
        filename = '';
      }
    });
    */
    await file.mv(filename);   
  }
  catch(e) {
    console.log(e.message);
    filename = '';
  }
  
  return filename;
}


exports.makeUrlAlive = function(webpage) {
  return webpage.replace(/(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/img, '<a href="$1">$1</a>');
}


exports.printHeader = function(title) {
  let html;
  
  title = (typeof(title) != 'string')? '' : title;
  
  html = `
  <!doctype html>
  <html>  
  <head>
    <title>${title}</title>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <meta http-equiv='Content-Type' content='text/html; charset=utf-8'> 
  </head>  
  `;
  
  return html;
}


async function _getDecoyCompanyName(conn) {
  let result;
  
  try {
    result = await _getSysSettingValue(conn, 'decoy_company_name');
    if (result == '') {
      result = _getGlobalValue('COMP_NAME');
    }     
  }
  catch(e) {
    throw e;
  }
  
  return result;  
}


exports.getDecoyCompanyName = async function(conn) {
  let result;
  
  try {
    result = await _getDecoyCompanyName(conn);
  }
  catch(e) {
    throw e;
  }
  
  return result;
}


exports.getDecoySiteCopyRight = async function(conn) {
  let company_name, year, result;
  
  try {
    company_name = await _getDecoyCompanyName(conn);
    year = new Date().getFullYear();
    
    result = `Copyright &copy; 2000-${year} ${company_name}`;    
  }
  catch(e) {
    throw e;
  }
  
  return result;  
}


function _sqlInjectionDetect(str) {
  let result = false;
  
  //-- Clearly, this function is not suitable to check a message block --//
  //-- which is freely input by users.                                 --//
  if (str.match(/insert/gi) != null) {
    result = true;
  }
  else if (str.match(/update/gi) != null) {
    result = true;
  }
  else if (str.match(/delete/gi) != null) {
    result = true;
  }
  else if (str.match(/union/gi) != null) {
    result = true;
  }
  else if (str.match(/where/gi) != null) {
    result = true;
  }
  else if (str.match(/outer/gi) != null) {
    result = true;
  }
  else if (str.match(/inner/gi) != null) {
    result = true;
  }
  else if (str.match(/join/gi) != null) {
    result = true;
  }
  else if (str.match(/values/gi) != null) {
    result = true;
  }
  else if (str.match(/alter/gi) != null) {
    result = true;
  }
  else if (str.match(/create/gi) != null) {
    result = true;
  }
  else if (str.match(/between/gi) != null) {
    result = true;
  }
  else if (str.match(/distinct/gi) != null) {
    result = true;
  }
  else if (str.match(/drop/gi) != null) {
    result = true;
  }
  else if (str.match(/group/gi) != null) {
    result = true;
  }
  else if (str.match(/having/gi) != null) {
    result = true;
  }
  else if (str.match(/like/gi) != null) {
    result = true;
  }
    
  return result;
}


exports.sqlInjectionDetect = function(str) {
  return _sqlInjectionDetect(str);
}


function _antiXSScodeEmbed(str) {
  str = str.replace(/<script>/gi, '');
  str = str.replace(/<\/script>/gi, '');
  str = str.replace(/<script/gi, '');
  str = str.replace(/<\/script/gi, '');
  str = str.replace(/%3Cscript/gi, '');
  str = str.replace(/%3Escript/gi, '');
  str = str.replace(/<iframe/gi, '');
  str = str.replace(/3Ciframe/gi, '');
  str = str.replace(/<\/iframe/gi, '');
  str = str.replace(/%3Eiframe/gi, '');
  
  return str;
}


exports.antiXSScodeEmbed = function(str) {
  return _antiXSScodeEmbed(str);
}


exports.disableEmbedJavascript = function(text) {
  let result;
  
  try {
    result = text;
    result = result.replace(/\<script\>/gi, "<font color=red>");
    result = result.replace(/%3Cscript%3E/gi, "<font color=red>");
    result = result.replace(/\<script%3E/gi, "<font color=red>");
    result = result.replace(/%3Cscript\>/gi, "<font color=red>");
    result = result.replace(/\<script /gi, "<font color=red>");
    result = result.replace(/\%3Cscript%20/gi, "<font color=red>");
    result = result.replace(/\%3Cscript /gi, "<font color=red>");
    result = result.replace(/\<\/script\>/gi, "</font>");
    result = result.replace(/\<\/script%3E/gi, "</font>");
    result = result.replace(/%3C\/script%3E/gi, "</font>");
    result = result.replace(/%3C\/script\>/gi, "</font>");
  }
  catch(e) {
    throw e;
  }
  
  return result;  
}


function _sayCurrentTime() {
  let today, curr_time;
  
  try {
    today = new Date();
    curr_time = today.getFullYear() + "-" + _padLeft(today.getMonth() + 1, 2, "0") + "-" + _padLeft(today.getDate(), 2, "0") + " " + 
                _padLeft(today.getHours(), 2, "0") + ":" + _padLeft(today.getMinutes(), 2, "0") + ":" + _padLeft(today.getSeconds(), 2, "0");                        
  }
  catch(e) {
    throw e;
  }
  
  return curr_time;  
} 
 

exports.sayCurrentTime = function() {
  let today, curr_time;
  
  try {
    curr_time = _sayCurrentTime();    
  }
  catch(e) {
    throw e;
  }
  
  return curr_time;
}


function _stripSecondAway(date_time, type) {
  let dt_parts, time, time_parts, result;
  
  try {
    if (type == "DT") {        // Data type is DATETIME
      dt_parts = date_time.split(" ");
      time = _allTrim(dt_parts[1]);
      time_parts = time.split(":");    
      result = dt_parts[0] + " " + time_parts[0] + ":" + time_parts[1];
    }
    else {                     // Then assume data type is TIME  
      time = _allTrim(date_time);
      time_parts = time.split(":");    
      result = time_parts[0] + ":" + time_parts[1];      
    } 
  }
  catch(e) {
    //-- The last resort: garbage in, garbage out. :) --//
    result = date_time;
  }
  
  return result;
}


exports.getCurrentDateTime = async function(conn, options) {
  let sql, data, result;
  
  try {
    options = (typeof(options) != "object" || typeof(options) == "undefined")? {no_sec: false} : (typeof(options.no_sec) != "boolean")? {no_sec: false} : options;
    
    sql = `SELECT DATE_FORMAT(CURRENT_TIMESTAMP(), '%Y-%m-%d %H:%i:%s') AS cdt`;
    data = JSON.parse(await dbs.sqlQuery(conn, sql));
    result = data[0].cdt;
    
    if (options.no_sec) {
      result = _stripSecondAway(result, "DT");
    }
  }
  catch(e) {
    //-- The last resort --//
    result = _sayCurrentTime();
    
    if (options.no_sec) {
      result = _stripSecondAway(result, "DT");
    }
  }
  
  return result;
}


exports.getCurrentTime = async function(conn, options) {  
  let sql, data, result;
  
  try {
    options = (typeof(options) != "object" || typeof(options) == "undefined")? {no_sec: false} : (typeof(options.no_sec) != "boolean")? {no_sec: false} : options;
    
    sql = `SELECT DATE_FORMAT(CURRENT_TIME(), '%H:%i:%s') AS ct`;
    data = JSON.parse(await dbs.sqlQuery(conn, sql));
    result = data[0].ct;
    
    if (options.no_sec) {
      result = _stripSecondAway(result, "T");  
    } 
  }
  catch(e) {
    //-- The last resort --//
    let current_datetime = _sayCurrentTime();
    let datetime_parts = current_datetime.split(" ");
    result = _allTrim(datetime_parts[1]);
    
    if (options.no_sec) {
      result = _stripSecondAway(result, "T");
    }    
  }
  
  return result;
}


exports.setHoursLater = async function(conn, datetime, hour) {
  let sql, param, data, time_add, result;
  
  try {
    time_add = wev.padLeft(hour, 2, "0") + ":00:00";
    
    sql = `SELECT DATE_FORMAT(ADDTIME(?, ?), '%Y-%m-%d %H:%i:%s') AS end_datetime;`;
    param = [datetime, time_add];
    data = JSON.parse(await dbs.sqlQuery(conn, sql, param));
    
    result = _stripSecondAway(data[0].end_datetime, "DT");    
  }
  catch(e) {
    //-- Last resort --//
    let dt_parts = datetime.split(" ");
    let time = _allTrim(dt_parts[1]);
    let time_parts = time.split(":");
    
    if (parseInt(time_parts[0], 10) + hour <= 23) {
      time_parts[0] = _padLeft(parseInt(time_parts[0], 10) + hour, 2, "0");       
    }
    else {
      time_parts[0] = "23";
    }
    
    time = time_parts[0] + ":" + time_parts[1];
    result = dt_parts[0] + " "  + time;
  }
  
  return result;
}


exports.base64Encode = function(u8) {
  try {
    return btoa(String.fromCharCode.apply(null, u8));
  }
  catch(e) {
    console.log(e.message);
  }
}


exports.base64Decode = function(str) {
  try {
    if (typeof(str) == "string") {
      return new Uint8Array(atob(str).split('').map(c => c.charCodeAt(0)));
    }
    else {
      return new Uint8Array();
    }  
  }
  catch(e) {
    console.log(e.message);
  }
  
}

